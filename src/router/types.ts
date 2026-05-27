/**
 * Type definitions for the Intelligent Model Router
 */

/**
 * Routing strategy types
 */
export type RoutingStrategy = "fallback" | "context" | "cost" | "smart";

/**
 * Built-in smart routing task types documented for model selection.
 */
export type BuiltInTaskType =
  | "code_generation"
  | "code_review"
  | "math_reasoning"
  | "complex_reasoning"
  | "document_analysis"
  | "creative_writing"
  | "translation"
  | "simple_chat"
  | "data_extraction"
  | "chinese_language"
  | "factual_qa"
  | "technical_documentation";

/**
 * Task type accepted by the smart router. String intersections preserve
 * autocomplete for built-ins while allowing user-defined task names.
 */
export type TaskType = BuiltInTaskType | (string & {});

/**
 * Detection method that produced a smart routing classification.
 */
export type TaskDetectionMethod =
  | "keyword"
  | "pattern"
  | "language"
  | "context"
  | "manual"
  | "custom";

/**
 * Model preference for a task type.
 */
export interface TaskModelPreference {
  /** Primary model recommended for this task */
  model: string;
  /** Optional provider name when the model can be ambiguous */
  provider?: string;
  /** Optional priority for tie-breaking; higher wins */
  priority?: number;
  /** Optional reason shown in analytics/debug output */
  reason?: string;
}

/**
 * Custom task definition used by the smart router.
 */
export interface TaskClassificationConfig {
  /** Keywords that indicate this task */
  keywords?: string[];
  /** String or RegExp patterns that indicate this task */
  patterns?: Array<string | RegExp>;
  /** Preferred model for this task */
  model: string;
  /** Optional fallback models for this task */
  alternatives?: TaskModelPreference[];
  /** Minimum confidence required before selecting this task */
  confidenceThreshold?: number;
}

/**
 * Result produced by task classification.
 */
export interface TaskClassification {
  /** Detected task type */
  taskType: TaskType;
  /** Confidence from 0 to 1 */
  confidence: number;
  /** Selected model for the request */
  selectedModel: string;
  /** Human-readable reason for the classification */
  reason: string;
  /** Detection method that produced the classification */
  method?: TaskDetectionMethod;
  /** Alternative model candidates */
  alternatives?: TaskModelPreference[];
}

/**
 * Options for the smart routing strategy.
 */
export interface SmartRouterOptions {
  /** Default model used when confidence is below the threshold */
  defaultModel?: string;
  /** Minimum confidence required to use a classified task route */
  confidenceThreshold?: number;
  /** Per-task model overrides */
  modelOverrides?: Partial<Record<BuiltInTaskType, string>> & Record<string, string>;
  /** Custom task definitions keyed by task type */
  taskClassification?: Record<string, TaskClassificationConfig>;
  /** Cache task detections for repeated prompts (default: true for implementations) */
  cacheDetections?: boolean;
  /** Detection cache TTL in milliseconds */
  detectionCacheTtlMs?: number;
  /** Enable task analytics collection */
  enableAnalytics?: boolean;
  /** Optional custom async detector invoked before built-in detection */
  customDetector?: (
    prompt: string,
    context?: Record<string, unknown>
  ) => Promise<TaskClassification | null> | TaskClassification | null;
}

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
  /** Smart routing options used when strategy is "smart" */
  smart?: SmartRouterOptions;
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
