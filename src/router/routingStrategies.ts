import {
  FailureContext,
  RoutingDecision,
  FailureType,
  SmartRoutingOptions
} from "./types";
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

const DEFAULT_SMART_TASK_MODELS: Record<string, string> = {
  code: "gpt-4.1",
  analysis: "gpt-4o",
  math: "o1-mini",
  summarization: "gpt-4o-mini",
  chat: "gpt-4o-mini"
};

const SMART_TASK_KEYWORDS: Record<string, string[]> = {
  code: [
    "bug",
    "code",
    "debug",
    "function",
    "refactor",
    "stack trace",
    "typescript",
    "unit test"
  ],
  analysis: [
    "analyze",
    "compare",
    "evaluate",
    "explain",
    "insight",
    "recommend",
    "tradeoff"
  ],
  math: [
    "calculate",
    "equation",
    "math",
    "probability",
    "proof",
    "solve",
    "statistics"
  ],
  summarization: [
    "brief",
    "condense",
    "notes",
    "recap",
    "summarize",
    "summary",
    "tl;dr"
  ],
  chat: [
    "chat",
    "conversation",
    "friendly",
    "reply",
    "rewrite",
    "tone"
  ]
};

/**
 * Smart routing strategy
 * Classifies the request body and selects a task-specific model.
 */
export function smartStrategy(
  context: FailureContext,
  failureType: FailureType,
  options: SmartRoutingOptions = {}
): RoutingDecision {
  const confidenceThreshold = options.confidenceThreshold ?? 0.35;
  const taskModelMap = {
    ...DEFAULT_SMART_TASK_MODELS,
    ...(options.taskModelMap || {})
  };

  const classification = classifyRequestTask(context.requestBody);

  if (classification.confidence >= confidenceThreshold) {
    const nextModel = taskModelMap[classification.task];

    if (nextModel && !context.attemptedModels.includes(nextModel)) {
      return {
        retry: true,
        nextModel,
        reason:
          `Smart routing selected ${classification.task} model ` +
          `after ${failureType} (confidence ${classification.confidence.toFixed(2)})`
      };
    }
  }

  const fallbackModel = (options.fallbackModels || [])
    .find(model => model !== context.originalModel && !context.attemptedModels.includes(model));

  if (fallbackModel) {
    return {
      retry: true,
      nextModel: fallbackModel,
      reason:
        `Smart routing used fallback model after ${failureType}; ` +
        `task confidence was ${classification.confidence.toFixed(2)}`
    };
  }

  return {
    retry: false,
    reason:
      `Smart routing could not find an eligible model ` +
      `(task=${classification.task}, confidence=${classification.confidence.toFixed(2)})`
  };
}

function classifyRequestTask(requestBody: unknown): { task: string; confidence: number } {
  const text = extractPromptText(requestBody).toLowerCase();

  if (!text) {
    return { task: "chat", confidence: 0 };
  }

  const scores = Object.entries(SMART_TASK_KEYWORDS)
    .map(([task, keywords]) => ({
      task,
      score: keywords.reduce((total, keyword) => {
        return total + (text.includes(keyword) ? 1 : 0);
      }, 0),
      keywordCount: keywords.length
    }))
    .sort((a, b) => b.score - a.score);

  const best = scores[0];
  if (!best || best.score === 0) {
    return { task: "chat", confidence: 0.2 };
  }

  return {
    task: best.task,
    confidence: Math.min(0.95, 0.25 + best.score / Math.max(best.keywordCount, 1))
  };
}

function extractPromptText(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(extractPromptText).filter(Boolean).join(" ");
  }

  if (typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  const direct = [
    record.prompt,
    record.input,
    record.query,
    record.text,
    record.content
  ]
    .map(extractPromptText)
    .filter(Boolean);

  const messages = Array.isArray(record.messages)
    ? record.messages.map(message => {
        if (typeof message === "string") {
          return message;
        }
        if (message && typeof message === "object") {
          return extractPromptText((message as Record<string, unknown>).content);
        }
        return "";
      })
    : [];

  return [...direct, ...messages].filter(Boolean).join(" ");
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
