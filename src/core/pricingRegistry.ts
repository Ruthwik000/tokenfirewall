import { ModelPricing } from "./types";

/**
 * Centralized pricing registry for all LLM providers
 */
class PricingRegistry {
  private pricing: Map<string, Map<string, ModelPricing>> = new Map();

  constructor() {
    this.initializeDefaultPricing();
  }

  /**
   * Initialize default pricing for supported providers
   */
  private initializeDefaultPricing(): void {
    // OpenAI pricing (per 1M tokens)
    this.register("openai", "gpt-4o", { input: 2.5, output: 10.0 });
    this.register("openai", "gpt-4o-mini", { input: 0.15, output: 0.6 });
    this.register("openai", "gpt-4-turbo", { input: 10.0, output: 30.0 });
    this.register("openai", "gpt-3.5-turbo", { input: 0.5, output: 1.5 });

    // Anthropic pricing (per 1M tokens)
    this.register("anthropic", "claude-3-5-sonnet-20241022", { input: 3.0, output: 15.0 });
    this.register("anthropic", "claude-3-5-haiku-20241022", { input: 0.8, output: 4.0 });
    this.register("anthropic", "claude-3-opus-20240229", { input: 15.0, output: 75.0 });

    // Google Gemini pricing (per 1M tokens)
    this.register("gemini", "gemini-2.0-flash-exp", { input: 0.0, output: 0.0 });
    this.register("gemini", "gemini-1.5-pro", { input: 1.25, output: 5.0 });
    this.register("gemini", "gemini-1.5-flash", { input: 0.075, output: 0.3 });

    // Grok pricing (per 1M tokens)
    this.register("grok", "grok-beta", { input: 5.0, output: 15.0 });
    this.register("grok", "grok-vision-beta", { input: 5.0, output: 15.0 });
    this.register("grok", "grok-2-1212", { input: 2.0, output: 10.0 });
    this.register("grok", "grok-2-vision-1212", { input: 2.0, output: 10.0 });
    
    // Llama models via Grok API (per 1M tokens)
    this.register("grok", "llama-3.1-70b", { input: 0.5, output: 0.8 });
    this.register("grok", "llama-3.1-8b", { input: 0.1, output: 0.1 });
    this.register("grok", "llama-3.2-90b-vision", { input: 0.6, output: 0.9 });
    this.register("grok", "llama-3.3-70b", { input: 0.5, output: 0.8 });

    // Kimi pricing (per 1M tokens)
    this.register("kimi", "moonshot-v1-8k", { input: 0.12, output: 0.12 });
    this.register("kimi", "moonshot-v1-32k", { input: 0.24, output: 0.24 });
    this.register("kimi", "moonshot-v1-128k", { input: 0.6, output: 0.6 });
  }

  /**
   * Register pricing for a provider and model
   */
  public register(provider: string, model: string, pricing: ModelPricing): void {
    if (!this.pricing.has(provider)) {
      this.pricing.set(provider, new Map());
    }
    this.pricing.get(provider)!.set(model, pricing);
  }

  /**
   * Get pricing for a specific provider and model
   * @throws Error if pricing not found
   */
  public getPricing(provider: string, model: string): ModelPricing {
    const providerPricing = this.pricing.get(provider);
    if (!providerPricing) {
      throw new Error(`TokenFirewall: No pricing found for provider "${provider}"`);
    }

    const modelPricing = providerPricing.get(model);
    if (!modelPricing) {
      throw new Error(`TokenFirewall: No pricing found for model "${model}" from provider "${provider}"`);
    }

    return modelPricing;
  }

  /**
   * Check if pricing exists for a provider and model
   */
  public hasPricing(provider: string, model: string): boolean {
    return this.pricing.get(provider)?.has(model) ?? false;
  }
}

export const pricingRegistry = new PricingRegistry();
