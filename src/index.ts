import { BudgetGuardOptions, ProviderAdapter, ModelPricing, BudgetStatus } from "./core/types";
import { BudgetManager } from "./core/budgetManager";
import { pricingRegistry } from "./core/pricingRegistry";
import { adapterRegistry } from "./registry";
import { patchGlobalFetch, setBudgetManager, setModelRouter } from "./interceptors/fetchInterceptor";
import { patchProvider } from "./interceptors/sdkInterceptor";
import { listAvailableModels, ModelInfo, ListModelsOptions } from "./introspection/modelLister";
import { contextRegistry } from "./introspection/contextRegistry";
import { ModelRouter } from "./router/modelRouter";
import { ModelRouterOptions, ApiKeyConfig } from "./router/types";
import { apiKeyManager } from "./router/apiKeyManager";

let globalBudgetManager: BudgetManager | null = null;
let globalModelRouter: ModelRouter | null = null;

/**
 * Create and configure a budget guard
 * @param options - Budget configuration options
 * @returns Budget manager instance
 */
export function createBudgetGuard(options: BudgetGuardOptions): BudgetManager {
  // Warn if overwriting existing budget guard
  if (globalBudgetManager) {
    console.warn('TokenFirewall: Creating new budget guard will replace existing one. Previous budget state will be lost.');
  }

  const manager = new BudgetManager(options);
  globalBudgetManager = manager;
  setBudgetManager(manager);
  return manager;
}

/**
 * Patch global fetch to intercept LLM API calls
 */
export { patchGlobalFetch };

/**
 * Patch a specific provider SDK
 * @param providerName - Name of the provider to patch
 */
export { patchProvider };

/**
 * Register a custom provider adapter
 * @param adapter - Provider adapter implementation
 */
export function registerAdapter(adapter: ProviderAdapter): void {
  adapterRegistry.register(adapter);
}

/**
 * Register custom pricing for a provider and model
 * @param provider - Provider name
 * @param model - Model name
 * @param pricing - Pricing configuration (per 1M tokens)
 */
export function registerPricing(provider: string, model: string, pricing: ModelPricing): void {
  // Validate inputs
  if (!provider || typeof provider !== 'string' || provider.trim() === '') {
    throw new Error('TokenFirewall: Provider must be a non-empty string');
  }
  if (!model || typeof model !== 'string' || model.trim() === '') {
    throw new Error('TokenFirewall: Model must be a non-empty string');
  }
  if (!pricing || typeof pricing !== 'object') {
    throw new Error('TokenFirewall: Pricing must be an object');
  }
  if (typeof pricing.input !== 'number' || pricing.input < 0 || !isFinite(pricing.input) || isNaN(pricing.input)) {
    throw new Error('TokenFirewall: Pricing input must be a non-negative finite number');
  }
  if (typeof pricing.output !== 'number' || pricing.output < 0 || !isFinite(pricing.output) || isNaN(pricing.output)) {
    throw new Error('TokenFirewall: Pricing output must be a non-negative finite number');
  }

  pricingRegistry.register(provider.toLowerCase(), model, pricing);
}

/**
 * Register custom context limit for a provider and model
 * @param provider - Provider name
 * @param model - Model name
 * @param contextLimit - Context window size in tokens
 */
export function registerContextLimit(provider: string, model: string, contextLimit: number): void {
  // Validate inputs
  if (!provider || typeof provider !== 'string' || provider.trim() === '') {
    throw new Error('TokenFirewall: Provider must be a non-empty string');
  }
  if (!model || typeof model !== 'string' || model.trim() === '') {
    throw new Error('TokenFirewall: Model must be a non-empty string');
  }
  if (typeof contextLimit !== 'number' || contextLimit <= 0 || !isFinite(contextLimit) || isNaN(contextLimit)) {
    throw new Error('TokenFirewall: Context limit must be a positive finite number');
  }

  contextRegistry.register(provider.toLowerCase(), model, { tokens: contextLimit });
}

/**
 * Register multiple models for a provider at once
 * Useful for dynamic model discovery or custom provider setup
 * @param provider - Provider name
 * @param models - Array of model configurations
 */
export function registerModels(
  provider: string,
  models: Array<{ name: string; contextLimit?: number; pricing?: ModelPricing }>
): void {
  // Validate inputs
  if (!provider || typeof provider !== 'string' || provider.trim() === '') {
    throw new Error('TokenFirewall: Provider must be a non-empty string');
  }
  if (!Array.isArray(models) || models.length === 0) {
    throw new Error('TokenFirewall: Models must be a non-empty array');
  }

  // Normalize provider name to lowercase
  const normalizedProvider = provider.toLowerCase();

  // Register each model
  for (const model of models) {
    if (!model.name || typeof model.name !== 'string' || model.name.trim() === '') {
      throw new Error('TokenFirewall: Each model must have a valid name');
    }

    // Register context limit if provided
    if (model.contextLimit !== undefined) {
      registerContextLimit(normalizedProvider, model.name, model.contextLimit);
    }

    // Register pricing if provided
    if (model.pricing !== undefined) {
      registerPricing(normalizedProvider, model.name, model.pricing);
    }
  }
}

/**
 * Register API keys for cross-provider fallback
 * @param keys - Object mapping provider names to API keys
 */
export function registerApiKeys(keys: ApiKeyConfig): void {
  if (!keys || typeof keys !== 'object') {
    throw new Error('TokenFirewall: Keys must be an object mapping provider names to API keys');
  }
  apiKeyManager.registerKeys(keys);
}

/**
 * Check if cross-provider fallback is enabled
 * @returns true if a model router exists with cross-provider enabled
 */
export function isCrossProviderEnabled(): boolean {
  return globalModelRouter?.isCrossProviderEnabled() ?? false;
}

/**
 * Get current budget status
 * @returns Budget status or null if no budget guard is active
 */
export function getBudgetStatus(): BudgetStatus | null {
  return globalBudgetManager ? globalBudgetManager.getStatus() : null;
}

/**
 * Reset budget tracking
 */
export function resetBudget(): void {
  if (globalBudgetManager) {
    globalBudgetManager.reset();
  }
}

/**
 * Export budget state for persistence
 */
export function exportBudgetState(): { totalSpent: number; limit: number; mode: string } | null {
  if (globalBudgetManager) {
    return globalBudgetManager.exportState();
  }
  return null;
}

/**
 * Import budget state from persistence
 */
export function importBudgetState(state: { totalSpent: number }): void {
  if (!globalBudgetManager) {
    throw new Error('TokenFirewall: Cannot import budget state - no budget guard exists. Call createBudgetGuard() first.');
  }
  globalBudgetManager.importState(state);
}

/**
 * Create and configure a model router for automatic retries and fallbacks
 * @param options - Router configuration options
 * @returns Model router instance
 */
export function createModelRouter(options: ModelRouterOptions): ModelRouter {
  const router = new ModelRouter(options);
  globalModelRouter = router;
  setModelRouter(router);
  return router;
}

/**
 * Disable model router
 */
export function disableModelRouter(): void {
  globalModelRouter = null;
  setModelRouter(null);
}

/**
 * List available models for a provider with context limits and budget usage
 * @param options - Provider configuration and options
 * @returns Array of model information
 */
export async function listModels(options: Omit<ListModelsOptions, 'budgetManager'>): Promise<ModelInfo[]> {
  // Pass the global budget manager to avoid circular dependency
  return listAvailableModels({
    ...options,
    budgetManager: globalBudgetManager
  });
}

// Keep the original export for backward compatibility
export { listAvailableModels };

// Export types for TypeScript users
export type {
  BudgetGuardOptions,
  ProviderAdapter,
  ModelPricing,
  NormalizedUsage,
  CostBreakdown,
  BudgetStatus,
  ModelInfo,
  ListModelsOptions,
} from "./core/types";

export type { ModelInfo as ModelInfoType, ListModelsOptions as ListModelsOptionsType } from "./introspection/modelLister";

export type {
  ModelRouterOptions,
  RoutingStrategy,
  FailureType,
  FailureContext,
  RoutingDecision,
  RouterEvent,
  ApiKeyConfig
} from "./router/types";

/**
 * Model configuration for bulk registration
 */
export interface ModelConfig {
  name: string;
  contextLimit?: number;
  pricing?: ModelPricing;
}
