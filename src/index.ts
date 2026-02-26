import { BudgetGuardOptions, ProviderAdapter, ModelPricing, BudgetStatus } from "./core/types";
import { BudgetManager } from "./core/budgetManager";
import { pricingRegistry } from "./core/pricingRegistry";
import { adapterRegistry } from "./registry";
import { patchGlobalFetch, setBudgetManager } from "./interceptors/fetchInterceptor";
import { patchProvider } from "./interceptors/sdkInterceptor";
import { listAvailableModels, ModelInfo, ListModelsOptions } from "./introspection/modelLister";
import { contextRegistry } from "./introspection/contextRegistry";

let globalBudgetManager: BudgetManager | null = null;

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
  if (!provider || typeof provider !== 'string') {
    throw new Error('TokenFirewall: Provider must be a non-empty string');
  }
  if (!model || typeof model !== 'string') {
    throw new Error('TokenFirewall: Model must be a non-empty string');
  }
  if (!pricing || typeof pricing !== 'object') {
    throw new Error('TokenFirewall: Pricing must be an object');
  }
  if (typeof pricing.input !== 'number' || pricing.input < 0 || !isFinite(pricing.input)) {
    throw new Error('TokenFirewall: Pricing input must be a non-negative number');
  }
  if (typeof pricing.output !== 'number' || pricing.output < 0 || !isFinite(pricing.output)) {
    throw new Error('TokenFirewall: Pricing output must be a non-negative number');
  }

  pricingRegistry.register(provider, model, pricing);
}

/**
 * Register custom context limit for a provider and model
 * @param provider - Provider name
 * @param model - Model name
 * @param contextLimit - Context window size in tokens
 */
export function registerContextLimit(provider: string, model: string, contextLimit: number): void {
  // Validate inputs
  if (!provider || typeof provider !== 'string') {
    throw new Error('TokenFirewall: Provider must be a non-empty string');
  }
  if (!model || typeof model !== 'string') {
    throw new Error('TokenFirewall: Model must be a non-empty string');
  }
  if (typeof contextLimit !== 'number' || contextLimit <= 0 || !isFinite(contextLimit)) {
    throw new Error('TokenFirewall: Context limit must be a positive number');
  }

  contextRegistry.register(provider, model, { tokens: contextLimit });
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
