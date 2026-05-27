import {
  ModelRouterOptions,
  FailureContext,
  RoutingDecision,
  RoutingStrategy
} from "./types";
import { errorDetector } from "./errorDetector";
import { fallbackStrategy, contextStrategy, costStrategy } from "./routingStrategies";
import { apiKeyManager } from "./apiKeyManager";

const DEFAULT_ROUTING_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_ROUTING_CACHE_SIZE = 1000;

interface CachedRoutingDecision {
  decision: RoutingDecision;
  expiresAt: number;
}

/**
 * Intelligent Model Router
 * Handles automatic retries and model switching on failures
 */
export class ModelRouter {
  private strategy: RoutingStrategy;
  private fallbackMap: Record<string, string[]>;
  private maxRetries: number;
  private crossProviderEnabled: boolean;
  private cacheRoutingDecisions: boolean;
  private routingCacheTtlMs: number;
  private maxRoutingCacheSize: number;
  private decisionCache = new Map<string, CachedRoutingDecision>();

  constructor(options: ModelRouterOptions) {
    this.strategy = options.strategy;
    this.fallbackMap = options.fallbackMap || {};
    this.maxRetries = options.maxRetries ?? 1;
    this.crossProviderEnabled = options.enableCrossProvider ?? false;
    this.cacheRoutingDecisions = options.cacheRoutingDecisions ?? true;
    this.routingCacheTtlMs = options.routingCacheTtlMs ?? DEFAULT_ROUTING_CACHE_TTL_MS;
    this.maxRoutingCacheSize = options.maxRoutingCacheSize ?? DEFAULT_ROUTING_CACHE_SIZE;

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

    if (this.routingCacheTtlMs < 0) {
      throw new Error("TokenFirewall Router: routingCacheTtlMs must be non-negative");
    }

    if (this.maxRoutingCacheSize < 0) {
      throw new Error("TokenFirewall Router: maxRoutingCacheSize must be non-negative");
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
    const cacheKey = this.buildDecisionCacheKey(context, failureType);
    const cachedDecision = this.getCachedDecision(cacheKey);
    if (cachedDecision) {
      return cachedDecision;
    }

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
      const finalDecision = {
        retry: false,
        reason: `Model ${decision.nextModel} has already been attempted`
      };
      this.setCachedDecision(cacheKey, finalDecision);
      return finalDecision;
    }

    // Prevent switching back to original model (circular retry)
    if (decision.retry && decision.nextModel === context.originalModel && context.retryCount > 0) {
      const finalDecision = {
        retry: false,
        reason: `Cannot switch back to original model ${context.originalModel}`
      };
      this.setCachedDecision(cacheKey, finalDecision);
      return finalDecision;
    }

    this.setCachedDecision(cacheKey, decision);
    return { ...decision };
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

  /**
   * Check if cross-provider fallback is enabled
   */
  public isCrossProviderEnabled(): boolean {
    return this.crossProviderEnabled;
  }

  /**
   * Get current routing decision cache size.
   */
  public getRoutingCacheSize(): number {
    return this.decisionCache.size;
  }

  /**
   * Clear cached routing decisions.
   */
  public clearRoutingCache(): void {
    this.decisionCache.clear();
  }

  private buildDecisionCacheKey(
    context: FailureContext,
    failureType: string
  ): string | null {
    if (!this.cacheRoutingDecisions || this.routingCacheTtlMs === 0 || this.maxRoutingCacheSize === 0) {
      return null;
    }

    const attemptedModels = context.attemptedModels.join("|");
    const requestFingerprint = this.getRequestFingerprint(context.requestBody);
    return [
      this.strategy,
      failureType,
      context.provider,
      context.originalModel,
      context.retryCount,
      attemptedModels,
      requestFingerprint
    ].join("::");
  }

  private getRequestFingerprint(requestBody: any): string {
    if (requestBody === null || requestBody === undefined) {
      return "";
    }

    if (typeof requestBody === "string") {
      return requestBody.slice(0, 2048);
    }

    if (typeof requestBody !== "object") {
      return String(requestBody);
    }

    const body = requestBody as {
      prompt?: unknown;
      input?: unknown;
      messages?: Array<{ content?: unknown }>;
      model?: unknown;
    };

    if (typeof body.prompt === "string") {
      return body.prompt.slice(0, 2048);
    }

    if (typeof body.input === "string") {
      return body.input.slice(0, 2048);
    }

    if (Array.isArray(body.messages)) {
      return body.messages
        .map(message => String(message.content ?? ""))
        .join("\n")
        .slice(0, 2048);
    }

    if (typeof body.model === "string") {
      return body.model;
    }

    return "";
  }

  private getCachedDecision(cacheKey: string | null): RoutingDecision | null {
    if (!cacheKey) {
      return null;
    }

    const cached = this.decisionCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    if (cached.expiresAt <= Date.now()) {
      this.decisionCache.delete(cacheKey);
      return null;
    }

    return { ...cached.decision };
  }

  private setCachedDecision(cacheKey: string | null, decision: RoutingDecision): void {
    if (!cacheKey) {
      return;
    }

    while (this.decisionCache.size >= this.maxRoutingCacheSize) {
      const oldestKey = this.decisionCache.keys().next().value;
      if (!oldestKey) {
        break;
      }
      this.decisionCache.delete(oldestKey);
    }

    this.decisionCache.set(cacheKey, {
      decision: { ...decision },
      expiresAt: Date.now() + this.routingCacheTtlMs
    });
  }
}
