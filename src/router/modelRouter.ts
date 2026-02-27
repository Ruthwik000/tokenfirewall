import {
  ModelRouterOptions,
  FailureContext,
  RoutingDecision,
  RoutingStrategy
} from "./types";
import { errorDetector } from "./errorDetector";
import { fallbackStrategy, contextStrategy, costStrategy } from "./routingStrategies";

/**
 * Intelligent Model Router
 * Handles automatic retries and model switching on failures
 */
export class ModelRouter {
  private strategy: RoutingStrategy;
  private fallbackMap: Record<string, string[]>;
  private maxRetries: number;

  constructor(options: ModelRouterOptions) {
    this.strategy = options.strategy;
    this.fallbackMap = options.fallbackMap || {};
    this.maxRetries = options.maxRetries ?? 1;

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
}
