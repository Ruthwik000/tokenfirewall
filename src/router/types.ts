/**
 * Type definitions for the Intelligent Model Router
 */

/**
 * Routing strategy types
 */
export type RoutingStrategy = "fallback" | "context" | "cost";

/**
 * Failure types detected by error detector
 */
export type FailureType =
  | "rate_limit"
  | "context_overflow"
  | "model_unavailable"
  | "access_denied"
  | "unknown";

/**
 * API key configuration for cross-provider fallback
 */
export interface ApiKeyConfig {
  openai?: string;
  anthropic?: string;
  gemini?: string;
  grok?: string;
  kimi?: string;
  [key: string]: string | undefined;
}

/**
 * Configuration options for model router
 */
export interface ModelRouterOptions {
  /** Routing strategy to use */
  strategy: RoutingStrategy;
  /** Map of primary models to fallback models */
  fallbackMap?: Record<string, string[]>;
  /** Maximum number of retry attempts (default: 1) */
  maxRetries?: number;
  /** API keys for cross-provider fallback */
  apiKeys?: ApiKeyConfig;
  /** Enable cross-provider fallback (default: false) */
  enableCrossProvider?: boolean;
}

/**
 * Context information about a failed request
 */
export interface FailureContext {
  /** The error that occurred */
  error: unknown;
  /** Original model that failed */
  originalModel: string;
  /** Request body sent to API */
  requestBody: any;
  /** Provider name */
  provider: string;
  /** Current retry attempt count */
  retryCount: number;
  /** Models already attempted */
  attemptedModels: string[];
}

/**
 * Decision made by routing strategy
 */
export interface RoutingDecision {
  /** Whether to retry the request */
  retry: boolean;
  /** Next model to try (if retry is true) */
  nextModel?: string;
  /** Reason for the decision */
  reason: string;
}

/**
 * Router event for logging
 */
export interface RouterEvent {
  /** Original model that failed */
  originalModel: string;
  /** Next model to try */
  nextModel: string;
  /** Reason for switching */
  reason: string;
  /** Current attempt number */
  attempt: number;
  /** Maximum retries allowed */
  maxRetries: number;
}
