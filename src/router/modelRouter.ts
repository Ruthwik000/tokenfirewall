import {
  ModelRouterOptions,
  FailureContext,
  RoutingDecision,
  RoutingStrategy,
  SmartRoutingOptions
} from "./types";
import { errorDetector } from "./errorDetector";
import {
  fallbackStrategy,
  contextStrategy,
  costStrategy,
  smartStrategy
} from "./routingStrategies";
import { apiKeyManager } from "./apiKeyManager";

/**
 * Intelligent Model Router
 * Handles automatic retries and model switching on failures
 */
export class ModelRouter {
  private strategy: RoutingStrategy;
  private fallbackMap: Record<string, string[]>;
  private maxRetries: number;
  private crossProviderEnabled: boolean;
  private smartRouting: SmartRoutingOptions;

  constructor(options: ModelRouterOptions) {
    this.strategy = options.strategy;
    this.fallbackMap = options.fallbackMap || {};
    this.maxRetries = options.maxRetries ?? 1;
    this.crossProviderEnabled = options.enableCrossProvider ?? false;
    this.smartRouting = options.smartRouting || {};

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

    if (this.strategy === "smart") {
      const threshold = this.smartRouting.confidenceThreshold;
      if (
        threshold !== undefined &&
        (typeof threshold !== "number" || threshold < 0 || threshold > 1)
      ) {
        throw new Error(
          "TokenFirewall Router: smartRouting.confidenceThreshold must be between 0 and 1"
        );
      }

      this.validateModelMap("smartRouting.taskModelMap", this.smartRouting.taskModelMap);
      this.validateModelList("smartRouting.fallbackModels", this.smartRouting.fallbackModels);
    }
  }

  private validateModelMap(name: string, value?: Record<string, string>): void {
    if (value === undefined) {
      return;
    }

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`TokenFirewall Router: ${name} must be an object`);
    }

    for (const [task, model] of Object.entries(value)) {
      if (!task.trim() || typeof model !== "string" || !model.trim()) {
        throw new Error(
          `TokenFirewall Router: ${name} entries must map non-empty task names to model names`
        );
      }
    }
  }

  private validateModelList(name: string, value?: string[]): void {
    if (value === undefined) {
      return;
    }

    if (!Array.isArray(value)) {
      throw new Error(`TokenFirewall Router: ${name} must be an array`);
    }

    for (const model of value) {
      if (typeof model !== "string" || !model.trim()) {
        throw new Error(
          `TokenFirewall Router: ${name} must only contain non-empty model names`
        );
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
        return smartStrategy(context, failureType as any, this.smartRouting);

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
}
