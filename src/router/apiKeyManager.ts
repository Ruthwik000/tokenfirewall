/**
 * API Key Manager
 * Stores and retrieves API keys for different LLM providers
 */

export class ApiKeyManager {
  private keys: Map<string, string> = new Map();

  /**
   * Register an API key for a provider
   */
  public registerKey(provider: string, apiKey: string): void {
    if (!provider || typeof provider !== 'string' || provider.trim() === '') {
      throw new Error('TokenFirewall: Provider must be a non-empty string');
    }
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
      throw new Error(`TokenFirewall: Invalid API key for provider "${provider}"`);
    }
    this.keys.set(provider.toLowerCase(), apiKey);
  }

  /**
   * Get API key for a provider
   */
  public getKey(provider: string): string | undefined {
    return this.keys.get(provider.toLowerCase());
  }

  /**
   * Check if a key exists for a provider
   */
  public hasKey(provider: string): boolean {
    return this.keys.has(provider.toLowerCase());
  }

  /**
   * Register multiple keys at once
   */
  public registerKeys(keys: Record<string, string | undefined>): void {
    for (const [provider, key] of Object.entries(keys)) {
      if (key !== undefined && key !== null && key !== '') {
        this.registerKey(provider, key);
      }
    }
  }

  /**
   * Get list of providers that have keys registered
   */
  public getRegisteredProviders(): string[] {
    return Array.from(this.keys.keys());
  }
}

export const apiKeyManager = new ApiKeyManager();
