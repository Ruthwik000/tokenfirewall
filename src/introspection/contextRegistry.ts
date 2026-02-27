/**
 * Context window registry for LLM models
 * Maintains static mapping of model -> context limits
 */

interface ContextLimit {
  tokens: number;
}

class ContextRegistry {
  private limits: Map<string, Map<string, ContextLimit>> = new Map();

  constructor() {
    this.initializeContextLimits();
  }

  /**
   * Initialize known context limits for supported models
   */
  private initializeContextLimits(): void {
    // OpenAI context limits
    // ===== GPT-5 (Latest Flagship) =====
    this.register("openai", "gpt-5", { tokens: 256000 });
    this.register("openai", "gpt-5-mini", { tokens: 256000 });
    
    // ===== GPT-4.1 Series =====
    this.register("openai", "gpt-4.1", { tokens: 200000 });
    this.register("openai", "gpt-4.1-mini", { tokens: 200000 });
    
    // ===== GPT-4o (Balanced Multimodal) =====
    this.register("openai", "gpt-4o", { tokens: 128000 });
    this.register("openai", "gpt-4o-mini", { tokens: 128000 });
    
    // ===== Reasoning Models =====
    this.register("openai", "o1", { tokens: 200000 });
    this.register("openai", "o1-mini", { tokens: 128000 });
    
    // ===== Image Generation =====
    this.register("openai", "gpt-image-1", { tokens: 128000 });
    
    // ===== Legacy Models =====
    this.register("openai", "gpt-4-turbo", { tokens: 128000 });
    this.register("openai", "gpt-4", { tokens: 8192 });
    this.register("openai", "gpt-3.5-turbo", { tokens: 16385 });
    this.register("openai", "gpt-3.5-turbo-16k", { tokens: 16385 });

    // Anthropic context limits
    // ===== Claude 4.5 (Newer Improved) =====
    this.register("anthropic", "claude-opus-4.5", { tokens: 200000 });
    this.register("anthropic", "claude-sonnet-4.5", { tokens: 200000 });
    this.register("anthropic", "claude-haiku-4.5", { tokens: 200000 });
    
    // ===== Classic Claude 4 =====
    this.register("anthropic", "claude-4-opus", { tokens: 200000 });
    this.register("anthropic", "claude-sonnet-4", { tokens: 200000 });
    this.register("anthropic", "claude-haiku-4", { tokens: 200000 });
    
    // ===== Stable Claude 3.5 Fallback =====
    this.register("anthropic", "claude-3-5-sonnet-latest", { tokens: 200000 });
    this.register("anthropic", "claude-3-5-haiku-latest", { tokens: 200000 });
    
    // ===== Legacy Models =====
    this.register("anthropic", "claude-3-5-sonnet-20241022", { tokens: 200000 });
    this.register("anthropic", "claude-3-5-haiku-20241022", { tokens: 200000 });
    this.register("anthropic", "claude-3-opus-20240229", { tokens: 200000 });
    this.register("anthropic", "claude-3-sonnet-20240229", { tokens: 200000 });
    this.register("anthropic", "claude-3-haiku-20240307", { tokens: 200000 });

    // Gemini context limits (updated with latest models)
    // ===== Gemini 3 (Latest Generation) =====
    this.register("gemini", "gemini-3-pro", { tokens: 2097152 });
    this.register("gemini", "gemini-3.1-pro", { tokens: 2097152 });
    this.register("gemini", "gemini-3-flash", { tokens: 1048576 });
    this.register("gemini", "gemini-3-flash-lite", { tokens: 1048576 });
    this.register("gemini", "gemini-3-pro-image", { tokens: 2097152 });
    this.register("gemini", "gemini-3.1-flash-image", { tokens: 1048576 });
    
    // ===== Gemini 2.5 (Stable Production Tier) =====
    this.register("gemini", "gemini-2.5-pro", { tokens: 2097152 });
    this.register("gemini", "gemini-2.5-flash", { tokens: 1048576 });
    this.register("gemini", "gemini-2.5-flash-lite", { tokens: 1048576 });
    this.register("gemini", "gemini-2.5-flash-image", { tokens: 1048576 });
    
    // ===== Ultra-light / Experimental =====
    this.register("gemini", "gemini-nano-banana", { tokens: 524288 });
    
    // ===== Legacy Models =====
    this.register("gemini", "gemini-2.0-flash", { tokens: 1048576 });
    this.register("gemini", "gemini-2.0-flash-exp", { tokens: 1048576 });
    this.register("gemini", "gemini-1.5-pro", { tokens: 2097152 });
    this.register("gemini", "gemini-1.5-flash", { tokens: 1048576 });
    this.register("gemini", "gemini-1.0-pro", { tokens: 32768 });

    // Grok context limits
    this.register("grok", "grok-beta", { tokens: 131072 });
    this.register("grok", "grok-vision-beta", { tokens: 131072 });
    this.register("grok", "grok-2-1212", { tokens: 131072 });
    this.register("grok", "grok-2-vision-1212", { tokens: 131072 });

    // Llama models via Grok
    this.register("grok", "llama-3.1-70b", { tokens: 131072 });
    this.register("grok", "llama-3.1-8b", { tokens: 131072 });
    this.register("grok", "llama-3.2-90b-vision", { tokens: 131072 });
    this.register("grok", "llama-3.3-70b", { tokens: 131072 });

    // Kimi context limits
    this.register("kimi", "moonshot-v1-8k", { tokens: 8192 });
    this.register("kimi", "moonshot-v1-32k", { tokens: 32768 });
    this.register("kimi", "moonshot-v1-128k", { tokens: 131072 });
  }

  /**
   * Register context limit for a model
   */
  public register(provider: string, model: string, limit: ContextLimit): void {
    const normalizedProvider = provider.toLowerCase();
    if (!this.limits.has(normalizedProvider)) {
      this.limits.set(normalizedProvider, new Map());
    }
    this.limits.get(normalizedProvider)!.set(model, limit);
  }

  /**
   * Get context limit for a model
   * Returns undefined if not found (does not throw)
   */
  public getContextLimit(provider: string, model: string): number | undefined {
    const normalizedProvider = provider.toLowerCase();
    const providerLimits = this.limits.get(normalizedProvider);
    if (!providerLimits) {
      return undefined;
    }

    const limit = providerLimits.get(model);
    return limit?.tokens;
  }

  /**
   * Check if provider is supported
   */
  public isProviderSupported(provider: string): boolean {
    return this.limits.has(provider.toLowerCase());
  }

  /**
   * Get all models for a provider
   * Returns array of model names
   */
  public getModelsForProvider(provider: string): string[] {
    const normalizedProvider = provider.toLowerCase();
    const providerLimits = this.limits.get(normalizedProvider);
    if (!providerLimits) {
      return [];
    }

    return Array.from(providerLimits.keys());
  }
}

export const contextRegistry = new ContextRegistry();
