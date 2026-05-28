import {
  ModelRouterOptions,
  FailureContext,
  RoutingDecision,
  RoutingStrategy,
  TaskClassificationRule
} from "./types";
import { errorDetector } from "./errorDetector";
import { fallbackStrategy, contextStrategy, costStrategy } from "./routingStrategies";
import { apiKeyManager } from "./apiKeyManager";
import { detectProvider } from "./providerDetector";
import { TaskClassifier } from "./taskClassifier";

/**
 * Intelligent Model Router
 * Handles automatic retries and model switching on failures
 */
export class ModelRouter {
  private strategy: RoutingStrategy;
  private fallbackMap: Record<string, string[]>;
  private maxRetries: number;
  private crossProviderEnabled: boolean;
  private taskClassifier: TaskClassifier | null;
  private taskClassification?: Record<string, TaskClassificationRule>;
  private confidenceThreshold: number;
  private defaultModel?: string;

  constructor(options: ModelRouterOptions) {
    this.strategy = options.strategy;
    this.fallbackMap = options.fallbackMap || {};
    this.maxRetries = options.maxRetries ?? 1;
    this.crossProviderEnabled = options.enableCrossProvider ?? false;
    this.taskClassification = options.taskClassification;
    this.confidenceThreshold = options.confidenceThreshold ?? 0.7;
    this.defaultModel = options.defaultModel;
    this.taskClassifier =
      options.strategy === "smart"
        ? new TaskClassifier(
            options.taskClassification,
            options.modelOverrides
          )
        : null;

    // Register API keys if provided
    if (options.apiKeys) {
      apiKeyManager.registerKeys(options.apiKeys);
    }

    this.validateOptions();
  }

  /**
   * Validate router configuration
   */
  private validateOptions(): void {
    if (this.maxRetries < 0) {
      throw new Error("TokenFirewall Router: maxRetries must be non-negative");
    }

    if (this.maxRetries > 5) {
      console.warn(
        "TokenFirewall Router: maxRetries > 5 may cause excessive API calls"
      );
    }

    if (this.confidenceThreshold < 0 || this.confidenceThreshold > 1) {
      throw new Error(
        "TokenFirewall Router: confidenceThreshold must be between 0 and 1"
      );
    }

    if (
      this.defaultModel !== undefined &&
      (typeof this.defaultModel !== "string" || this.defaultModel.trim() === "")
    ) {
      throw new Error(
        "TokenFirewall Router: defaultModel must be a non-empty string when provided"
      );
    }

    if (this.strategy === "smart") {
      this.validateTaskClassification();
    }

    if (this.strategy === "fallback") {
      if (Object.keys(this.fallbackMap).length === 0) {
        throw new Error(
          "TokenFirewall Router: fallback strategy requires fallbackMap configuration. " +
          "Provide at least one fallback mapping or use a different strategy."
        );
      }
      
      // Validate fallback map structure
      for (const [model, fallbacks] of Object.entries(this.fallbackMap)) {
        if (!Array.isArray(fallbacks) || fallbacks.length === 0) {
          throw new Error(
            `TokenFirewall Router: fallbackMap for "${model}" must be a non-empty array`
          );
        }
        
        // Validate each fallback model name
        for (const fallbackModel of fallbacks) {
          if (typeof fallbackModel !== 'string' || fallbackModel.trim() === '') {
            throw new Error(
              `TokenFirewall Router: fallbackMap for "${model}" contains invalid model name (empty or whitespace)`
            );
          }
        }
      }
    }
  }

  /**
   * Handle a failed request and decide on retry strategy
   * @param context - Context about the failed request
   * @returns Routing decision
   */
  public handleFailure(context: FailureContext): RoutingDecision {
    // Check if max retries exceeded
    if (context.retryCount >= this.maxRetries) {
      return {
        retry: false,
        reason: `Max retries (${this.maxRetries}) exceeded`
      };
    }

    // Detect failure type
    const failureType = errorDetector.detectFailureType(context.error);

    // Select routing strategy
    const decision = this.selectStrategy(context, failureType);

    // Validate decision
    if (decision.retry && !decision.nextModel) {
      throw new Error(
        "TokenFirewall Router: Invalid decision - retry=true but no nextModel specified"
      );
    }

    // Prevent retrying same model
    if (decision.retry && context.attemptedModels.includes(decision.nextModel!)) {
      return {
        retry: false,
        reason: `Model ${decision.nextModel} has already been attempted`
      };
    }

    // Prevent switching back to original model (circular retry)
    if (decision.retry && decision.nextModel === context.originalModel && context.retryCount > 0) {
      return {
        retry: false,
        reason: `Cannot switch back to original model ${context.originalModel}`
      };
    }

    return decision;
  }

  /**
   * Select and execute routing strategy
   */
  private selectStrategy(
    context: FailureContext,
    failureType: string
  ): RoutingDecision {
    switch (this.strategy) {
      case "fallback":
        return fallbackStrategy(context, failureType as any, this.fallbackMap);

      case "context":
        return contextStrategy(context, failureType as any);

      case "cost":
        return costStrategy(context, failureType as any);

      case "smart":
        return this.smartStrategy(context, failureType);

      default:
        throw new Error(
          `TokenFirewall Router: Unknown strategy "${this.strategy}"`
        );
    }
  }

  /**
   * Get maximum retries configured
   */
  public getMaxRetries(): number {
    return this.maxRetries;
  }

  /**
   * Get current strategy
   */
  public getStrategy(): RoutingStrategy {
    return this.strategy;
  }

  /**
   * Check if cross-provider fallback is enabled
   */
  public isCrossProviderEnabled(): boolean {
    return this.crossProviderEnabled;
  }

  /**
   * Validate custom smart-routing rules.
   */
  private validateTaskClassification(): void {
    if (!this.taskClassification) {
      return;
    }

    for (const [taskType, rule] of Object.entries(this.taskClassification)) {
      if (!rule || typeof rule !== "object") {
        throw new Error(
          `TokenFirewall Router: smart task "${taskType}" must be an object`
        );
      }
    }
  }

  /**
   * Task-aware model selection for smart routing.
   */
  private smartStrategy(
    context: FailureContext,
    failureType: string
  ): RoutingDecision {
    const classification = this.taskClassifier?.classify(context.requestBody);
    const selectedModel =
      classification && classification.confidence >= this.confidenceThreshold
        ? classification.selectedModel
        : this.defaultModel;

    if (!selectedModel) {
      const confidence = classification
        ? ` (confidence ${classification.confidence.toFixed(2)})`
        : "";
      return {
        retry: false,
        reason: `Smart strategy could not classify request above threshold${confidence}`
      };
    }

    const selectedProvider = detectProvider(selectedModel);
    if (
      selectedProvider &&
      selectedProvider !== context.provider &&
      !this.crossProviderEnabled
    ) {
      return {
        retry: false,
        reason:
          `Smart strategy selected ${selectedModel}, but cross-provider routing is disabled`
      };
    }

    return {
      retry: true,
      nextModel: selectedModel,
      reason: classification
        ? `${classification.reason} after ${failureType}`
        : `Using default smart-routing model after ${failureType}`
    };
  }
}
