import { FailureContext, RoutingDecision, FailureType } from "./types";
import { contextRegistry } from "../introspection/contextRegistry";
import { pricingRegistry } from "../core/pricingRegistry";

/**
 * Fallback routing strategy
 * Uses predefined fallback map to select next model
 */
export function fallbackStrategy(
  context: FailureContext,
  failureType: FailureType,
  fallbackMap: Record<string, string[]>
): RoutingDecision {
  const { originalModel, attemptedModels } = context;

  // Get fallback list for this model
  const fallbacks = fallbackMap[originalModel];

  if (!fallbacks || fallbacks.length === 0) {
    return {
      retry: false,
      reason: `No fallback models configured for ${originalModel}`
    };
  }

  // Find first fallback that hasn't been attempted
  const nextModel = fallbacks.find(model => !attemptedModels.includes(model));

  if (!nextModel) {
    return {
      retry: false,
      reason: "All fallback models have been attempted"
    };
  }

  return {
    retry: true,
    nextModel,
    reason: `Fallback from ${originalModel} due to ${failureType}`
  };
}

/**
 * Context-based routing strategy
 * Selects model with larger context window when context overflow occurs
 */
export function contextStrategy(
  context: FailureContext,
  failureType: FailureType
): RoutingDecision {
  const { originalModel, provider, attemptedModels } = context;

  // Only applicable for context overflow
  if (failureType !== "context_overflow") {
    return {
      retry: false,
      reason: `Context strategy only applies to context_overflow, got ${failureType}`
    };
  }

  // Get current model's context limit
  const currentLimit = contextRegistry.getContextLimit(provider, originalModel);

  if (currentLimit === undefined) {
    return {
      retry: false,
      reason: `No context limit information for ${originalModel}`
    };
  }

  // Find models from same provider with larger context
  const availableModels = contextRegistry.getModelsForProvider(provider);
  
  if (!availableModels || availableModels.length === 0) {
    return {
      retry: false,
      reason: `No alternative models found for provider ${provider}`
    };
  }

  // Filter models with larger context that haven't been attempted
  const largerContextModels = availableModels
    .filter((model: string) => {
      const limit = contextRegistry.getContextLimit(provider, model);
      return (
        limit !== undefined &&
        limit > currentLimit &&
        !attemptedModels.includes(model) &&
        model !== originalModel // Don't suggest the same model
      );
    })
    .sort((a: string, b: string) => {
      const limitA = contextRegistry.getContextLimit(provider, a) || 0;
      const limitB = contextRegistry.getContextLimit(provider, b) || 0;
      return limitA - limitB; // Sort ascending (smallest upgrade first)
    });

  if (largerContextModels.length === 0) {
    return {
      retry: false,
      reason: "No models with larger context window available"
    };
  }

  const nextModel = largerContextModels[0];
  const nextLimit = contextRegistry.getContextLimit(provider, nextModel);

  return {
    retry: true,
    nextModel,
    reason: `Upgrading from ${currentLimit} to ${nextLimit} tokens context`
  };
}

/**
 * Cost-based routing strategy
 * Selects cheaper model from same provider
 */
export function costStrategy(
  context: FailureContext,
  failureType: FailureType
): RoutingDecision {
  const { originalModel, provider, attemptedModels } = context;

  // Get current model's pricing
  let currentPricing;
  try {
    currentPricing = pricingRegistry.getPricing(provider, originalModel);
  } catch (error) {
    return {
      retry: false,
      reason: `No pricing information for ${originalModel}`
    };
  }

  // Calculate average cost for current model
  const currentAvgCost = (currentPricing.input + currentPricing.output) / 2;

  // Get all models for this provider
  const providerModels = getProviderModels(provider);

  if (providerModels.length === 0) {
    return {
      retry: false,
      reason: `No alternative models found for provider ${provider}`
    };
  }

  // Find cheaper models that haven't been attempted
  const cheaperModels = providerModels
    .filter((model: string) => {
      if (attemptedModels.includes(model) || model === originalModel) {
        return false;
      }

      try {
        const pricing = pricingRegistry.getPricing(provider, model);
        const avgCost = (pricing.input + pricing.output) / 2;
        return avgCost < currentAvgCost;
      } catch {
        return false;
      }
    })
    .sort((a: string, b: string) => {
      const pricingA = pricingRegistry.getPricing(provider, a);
      const pricingB = pricingRegistry.getPricing(provider, b);
      const avgCostA = (pricingA.input + pricingA.output) / 2;
      const avgCostB = (pricingB.input + pricingB.output) / 2;
      return avgCostA - avgCostB; // Sort ascending (cheapest first)
    });

  if (cheaperModels.length === 0) {
    return {
      retry: false,
      reason: "No cheaper models available"
    };
  }

  const nextModel = cheaperModels[0];

  return {
    retry: true,
    nextModel,
    reason: `Switching to cheaper model due to ${failureType}`
  };
}

/**
 * Helper to get known models for a provider
 * Uses context registry for dynamic model discovery, falls back to static list
 */
function getProviderModels(provider: string): string[] {
  // First, try to get models from context registry (dynamic)
  const registeredModels = contextRegistry.getModelsForProvider(provider);
  
  if (registeredModels && registeredModels.length > 0) {
    return registeredModels;
  }
  
  // Fallback to static list if no models registered
  // This ensures the router works even without model discovery
  const knownModels: Record<string, string[]> = {
    openai: [
      // ===== Flagship / Chat =====
      "gpt-5",
      "gpt-5-mini",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4o",
      "gpt-4o-mini",
      // ===== Reasoning =====
      "o1",
      "o1-mini",
      // ===== Image Generation =====
      "gpt-image-1"
    ],
    anthropic: [
      // ===== Claude 4.5 (Newer Improved) =====
      "claude-opus-4.5",
      "claude-sonnet-4.5",
      "claude-haiku-4.5",
      // ===== Classic Claude 4 =====
      "claude-4-opus",
      "claude-sonnet-4",
      "claude-haiku-4",
      // ===== Stable Claude 3.5 Fallback =====
      "claude-3-5-sonnet-latest",
      "claude-3-5-haiku-latest"
    ],
    gemini: [
      // ===== Gemini 3 (Latest Generation) =====
      "gemini-3-pro",              // Flagship reasoning - Most capable
      "gemini-3.1-pro",            // Enhanced reasoning - Latest improved 3.x
      "gemini-3-flash",            // Fast multimodal - Optimized for latency
      "gemini-3-flash-lite",       // Cost-efficient flash variant
      "gemini-3-pro-image",        // High-quality image - Nano Banana Pro
      "gemini-3.1-flash-image",    // Latest image model - Nano Banana 2
      // ===== Gemini 2.5 (Stable Production Tier) =====
      "gemini-2.5-pro",            // Stable reasoning - 2.5 generation flagship
      "gemini-2.5-flash",          // Fast multimodal - Default in many workflows
      "gemini-2.5-flash-lite",     // Cost-efficient - Lighter, cheaper variant
      "gemini-2.5-flash-image",    // Image generation - Nano Banana (Cloud)
      // ===== Ultra-light / Experimental =====
      "gemini-nano-banana"         // Ultra-light multimodal
    ],
    grok: [
      "grok-3",
      "grok-2",
      "grok-2-mini",
      "grok-vision"
    ],
    kimi: [
      "moonshot-v1-8k",
      "moonshot-v1-32k",
      "moonshot-v1-128k"
    ],
    meta: [
      "llama-3.3-70b",
      "llama-3.1-405b",
      "llama-3.1-70b",
      "llama-3.1-8b"
    ],
    mistral: [
      "mistral-large-latest",
      "mistral-medium-latest",
      "mistral-small-latest",
      "mixtral-8x7b",
      "mixtral-8x22b"
    ],
    cohere: [
      "command-r-plus",
      "command-r",
      "command-light"
    ]
  };

  return knownModels[provider.toLowerCase()] || [];
}
