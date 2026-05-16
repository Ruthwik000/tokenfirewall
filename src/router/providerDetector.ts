/**
 * Provider Detection Module
 * Detects which LLM provider a model belongs to and resolves API endpoints
 */

const MODEL_PREFIX_MAP: Record<string, string> = {
  // OpenAI
  'gpt-': 'openai',
  'o1': 'openai',
  'o3': 'openai',
  'o4': 'openai',
  'chatgpt-': 'openai',
  // Anthropic
  'claude-': 'anthropic',
  // Gemini
  'gemini-': 'gemini',
  // Grok
  'grok-': 'grok',
  'llama-': 'grok',
  // Kimi
  'moonshot-': 'kimi',
};

const PROVIDER_ENDPOINTS: Record<string, string> = {
  'openai': 'https://api.openai.com/v1/chat/completions',
  'anthropic': 'https://api.anthropic.com/v1/messages',
  'gemini': 'https://generativelanguage.googleapis.com/v1beta/models',
  'grok': 'https://api.x.ai/v1/chat/completions',
  'kimi': 'https://api.moonshot.cn/v1/chat/completions',
};

/**
 * Detect provider from model name
 */
export function detectProvider(modelName: string): string | null {
  if (!modelName || typeof modelName !== 'string') {
    return null;
  }

  const lower = modelName.toLowerCase();

  for (const [prefix, provider] of Object.entries(MODEL_PREFIX_MAP)) {
    if (lower.startsWith(prefix)) {
      return provider;
    }
  }

  return null;
}

/**
 * Get API endpoint URL for a provider
 * For Gemini, the model name must be appended: endpoint/{model}:generateContent
 */
export function getProviderEndpoint(provider: string): string {
  return PROVIDER_ENDPOINTS[provider] || '';
}

/**
 * Build the full request URL for a provider + model
 */
export function buildProviderUrl(provider: string, model: string): string {
  const base = getProviderEndpoint(provider);
  if (!base) {
    return '';
  }

  if (provider === 'gemini') {
    return `${base}/${model}:generateContent`;
  }

  return base;
}

/**
 * Check if two models belong to different providers
 */
export function isCrossProviderSwitch(modelA: string, modelB: string): boolean {
  const providerA = detectProvider(modelA);
  const providerB = detectProvider(modelB);

  if (!providerA || !providerB) {
    return false;
  }

  return providerA !== providerB;
}
