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
    this.register("openai", "gpt-4o", { tokens: 128000 });
    this.register("openai", "gpt-4o-mini", { tokens: 128000 });
    this.register("openai", "gpt-4-turbo", { tokens: 128000 });
    this.register("openai", "gpt-4", { tokens: 8192 });
    this.register("openai", "gpt-3.5-turbo", { tokens: 16385 });
    this.register("openai", "gpt-3.5-turbo-16k", { tokens: 16385 });

    // Anthropic context limits
    this.register("anthropic", "claude-3-5-sonnet-20241022", { tokens: 200000 });
    this.register("anthropic", "claude-3-5-haiku-20241022", { tokens: 200000 });
    this.register("anthropic", "claude-3-opus-20240229", { tokens: 200000 });
    this.register("anthropic", "claude-3-sonnet-20240229", { tokens: 200000 });
    this.register("anthropic", "claude-3-haiku-20240307", { tokens: 200000 });

    // Gemini context limits (updated with latest models)
    this.register("gemini", "gemini-2.5-flash", { tokens: 1048576 });
    this.register("gemini", "gemini-2.5-pro", { tokens: 2097152 });
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
    if (!this.limits.has(provider)) {
      this.limits.set(provider, new Map());
    }
    this.limits.get(provider)!.set(model, limit);
  }

  /**
   * Get context limit for a model
   * Returns undefined if not found (does not throw)
   */
  public getContextLimit(provider: string, model: string): number | undefined {
    const providerLimits = this.limits.get(provider);
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
    return this.limits.has(provider);
  }
}

export const contextRegistry = new ContextRegistry();
