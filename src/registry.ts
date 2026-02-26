import { ProviderAdapter, NormalizedUsage } from "./core/types";
import { adapters } from "./adapters";

/**
 * Adapter registry - manages provider detection and normalization
 */
class AdapterRegistry {
  private adapters: ProviderAdapter[] = [...adapters];

  /**
   * Register a custom adapter
   */
  public register(adapter: ProviderAdapter): void {
    this.adapters.push(adapter);
  }

  /**
   * Detect and normalize a response using registered adapters
   * @returns NormalizedUsage or null if no adapter matches
   */
  public process(response: unknown, request?: unknown): NormalizedUsage | null {
    for (const adapter of this.adapters) {
      try {
        if (adapter.detect(response)) {
          return adapter.normalize(response, request);
        }
      } catch (error) {
        // If normalize throws, log warning and try next adapter
        console.warn(`TokenFirewall: Adapter "${adapter.name}" failed to normalize response:`, error);
        continue;
      }
    }
    return null;
  }
}

export const adapterRegistry = new AdapterRegistry();
