/**
 * Provider Headers Builder
 * Builds correct authentication and content headers for each LLM provider
 */

/**
 * Build request headers for a specific provider
 */
export function buildProviderHeaders(
  provider: string,
  apiKey: string
): Record<string, string> {
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  switch (provider) {
    case 'openai':
      return {
        ...baseHeaders,
        'Authorization': `Bearer ${apiKey}`,
      };

    case 'anthropic':
      return {
        ...baseHeaders,
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      };

    case 'gemini':
      // Gemini uses API key as URL query parameter, not in headers
      return baseHeaders;

    case 'grok':
      return {
        ...baseHeaders,
        'Authorization': `Bearer ${apiKey}`,
      };

    case 'kimi':
      return {
        ...baseHeaders,
        'Authorization': `Bearer ${apiKey}`,
      };

    default:
      // Default to Bearer token for unknown providers
      return {
        ...baseHeaders,
        'Authorization': `Bearer ${apiKey}`,
      };
  }
}

/**
 * Build the full URL for a provider, appending API key if needed (e.g., Gemini)
 */
export function appendApiKeyToUrl(url: string, provider: string, apiKey: string): string {
  if (provider === 'gemini') {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}key=${apiKey}`;
  }
  return url;
}
