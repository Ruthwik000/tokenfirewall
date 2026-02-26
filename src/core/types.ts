/**
 * Unified usage contract that all providers must normalize to
 */
export interface NormalizedUsage {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Cost breakdown for a single LLM call
 */
export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

/**
 * Provider adapter interface - all adapters must implement this
 */
export interface ProviderAdapter {
  name: string;
  detect(response: unknown): boolean;
  normalize(response: unknown, request?: unknown): NormalizedUsage;
}

/**
 * Pricing configuration for a specific model
 */
export interface ModelPricing {
  input: number;
  output: number;
}

/**
 * Budget guard configuration
 */
export interface BudgetGuardOptions {
  monthlyLimit: number;
  mode?: "warn" | "block";
}

/**
 * Budget status information
 */
export interface BudgetStatus {
  totalSpent: number;
  limit: number;
  remaining: number;
  percentageUsed: number;
}

/**
 * Model information with context limits and budget usage
 */
export interface ModelInfo {
  model: string;
  contextLimit?: number;
  budgetUsagePercentage?: number;
}

/**
 * Options for listing available models
 */
export interface ListModelsOptions {
  provider: string;
  apiKey: string;
  baseURL?: string;
  includeBudgetUsage?: boolean;
}
