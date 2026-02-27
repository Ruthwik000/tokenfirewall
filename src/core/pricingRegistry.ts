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
    // =========================
    // OpenAI pricing (per 1M tokens)
    // =========================
    
    // ===== GPT-5 (Latest Flagship) =====
    this.register("openai", "gpt-5", { input: 5.0, output: 15.0 });
    this.register("openai", "gpt-5-mini", { input: 1.5, output: 5.0 });
    
    // ===== GPT-4.1 Series =====
    this.register("openai", "gpt-4.1", { input: 3.0, output: 12.0 });
    this.register("openai", "gpt-4.1-mini", { input: 0.8, output: 3.0 });
    
    // ===== GPT-4o (Balanced Multimodal) =====
    this.register("openai", "gpt-4o", { input: 2.5, output: 10.0 });
    this.register("openai", "gpt-4o-mini", { input: 0.15, output: 0.6 });
    
    // ===== Reasoning Models =====
    this.register("openai", "o1", { input: 6.0, output: 18.0 });
    this.register("openai", "o1-mini", { input: 2.0, output: 6.0 });
    
    // ===== Image Generation =====
    this.register("openai", "gpt-image-1", { input: 5.0, output: 0.0 });
    
    // ===== Legacy Models =====
    this.register("openai", "gpt-4-turbo", { input: 10.0, output: 30.0 });
    this.register("openai", "gpt-3.5-turbo", { input: 0.5, output: 1.5 });

    // =========================
    // Anthropic pricing (per 1M tokens)
    // =========================
    
    // ===== Claude 4.5 (Newer Improved) =====
    this.register("anthropic", "claude-opus-4.5", { input: 17.0, output: 85.0 });
    this.register("anthropic", "claude-sonnet-4.5", { input: 4.0, output: 20.0 });
    this.register("anthropic", "claude-haiku-4.5", { input: 1.2, output: 6.0 });
    
    // ===== Classic Claude 4 =====
    this.register("anthropic", "claude-4-opus", { input: 15.0, output: 75.0 });
    this.register("anthropic", "claude-sonnet-4", { input: 3.0, output: 15.0 });
    this.register("anthropic", "claude-haiku-4", { input: 1.0, output: 5.0 });
    
    // ===== Stable Claude 3.5 Fallback =====
    this.register("anthropic", "claude-3-5-sonnet-latest", { input: 3.0, output: 15.0 });
    this.register("anthropic", "claude-3-5-haiku-latest", { input: 0.8, output: 4.0 });
    
    // ===== Legacy Models =====
    this.register("anthropic", "claude-3-5-sonnet-20241022", { input: 3.0, output: 15.0 });
    this.register("anthropic", "claude-3-5-haiku-20241022", { input: 0.8, output: 4.0 });
    this.register("anthropic", "claude-3-opus-20240229", { input: 15.0, output: 75.0 });

    // =========================
    // Google Gemini pricing (per 1M tokens)
    // =========================
    
    // ===== Gemini 3 (Latest Generation) =====
    this.register("gemini", "gemini-3-pro", { input: 3.5, output: 14.0 });
    this.register("gemini", "gemini-3.1-pro", { input: 4.0, output: 16.0 });
    this.register("gemini", "gemini-3-flash", { input: 0.35, output: 1.5 });
    this.register("gemini", "gemini-3-flash-lite", { input: 0.15, output: 0.6 });
    
    // ===== Image Models (Nano Banana Series) =====
    this.register("gemini", "gemini-3-pro-image", { input: 5.0, output: 0.0 });
    this.register("gemini", "gemini-3.1-flash-image", { input: 0.75, output: 0.0 });
    
    // ===== Gemini 2.5 (Stable Production Tier) =====
    this.register("gemini", "gemini-2.5-pro", { input: 2.5, output: 10.0 });
    this.register("gemini", "gemini-2.5-flash", { input: 0.30, output: 1.2 });
    this.register("gemini", "gemini-2.5-flash-lite", { input: 0.10, output: 0.4 });
    
    // Image-capable 2.5
    this.register("gemini", "gemini-2.5-flash-image", { input: 0.5, output: 0.0 });
    
    // ===== Ultra-light / Experimental =====
    this.register("gemini", "gemini-nano-banana", { input: 0.05, output: 0.2 });
    
    // ===== Legacy Models =====
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
    const normalizedProvider = provider.toLowerCase();
    if (!this.pricing.has(normalizedProvider)) {
      this.pricing.set(normalizedProvider, new Map());
    }
    this.pricing.get(normalizedProvider)!.set(model, pricing);
  }

  /**
   * Get pricing for a specific provider and model
   * @throws Error if pricing not found
   */
  public getPricing(provider: string, model: string): ModelPricing {
    const normalizedProvider = provider.toLowerCase();
    const providerPricing = this.pricing.get(normalizedProvider);
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
    const normalizedProvider = provider.toLowerCase();
    return this.pricing.get(normalizedProvider)?.has(model) ?? false;
  }
}

export const pricingRegistry = new PricingRegistry();
