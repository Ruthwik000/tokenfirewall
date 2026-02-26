/**
 * SDK-specific interceptors for providers that need direct patching
 * Currently placeholder - most providers work via fetch interception
 */

const patchedProviders = new Set<string>();

/**
 * Patch a specific provider SDK
 * @param providerName - Name of the provider to patch
 */
export function patchProvider(providerName: string): void {
  if (patchedProviders.has(providerName)) {
    return;
  }

  switch (providerName.toLowerCase()) {
    case "openai":
      // OpenAI SDK uses fetch internally - covered by fetch interceptor
      break;
    case "anthropic":
      // Anthropic SDK uses fetch internally - covered by fetch interceptor
      break;
    case "gemini":
      // Gemini SDK uses fetch internally - covered by fetch interceptor
      break;
    case "grok":
      // Grok uses fetch - covered by fetch interceptor
      break;
    case "kimi":
      // Kimi uses fetch - covered by fetch interceptor
      break;
    default:
      console.warn(`TokenFirewall: Provider "${providerName}" not recognized`);
  }

  patchedProviders.add(providerName);
}
