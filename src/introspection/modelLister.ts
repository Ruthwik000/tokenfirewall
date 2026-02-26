import { contextRegistry } from "./contextRegistry";

/**
 * Model information with context limits and budget usage
 */
export interface ModelInfo {
  model: string;
  contextLimit?: number;
  budgetUsagePercentage?: number;
}

/**
 * Options for listing available models
 */
export interface ListModelsOptions {
  provider: string;
  apiKey: string;
  baseURL?: string;
  includeBudgetUsage?: boolean;
  budgetManager?: any; // Optional budget manager instance
}

/**
 * List available models for a provider
 */
export async function listAvailableModels(
  options: ListModelsOptions
): Promise<ModelInfo[]> {
  const { provider, apiKey, baseURL, includeBudgetUsage, budgetManager } = options;

  const providerLower = provider.toLowerCase();

  let models: string[] = [];

  try {
    switch (providerLower) {
      case "openai":
        models = await listOpenAIModels(apiKey, baseURL);
        break;
      case "anthropic":
        models = await listAnthropicModels();
        break;
      case "gemini":
        models = await listGeminiModels(apiKey, baseURL);
        break;
      case "grok":
        models = await listGrokModels(apiKey, baseURL);
        break;
      case "kimi":
        models = await listKimiModels(apiKey, baseURL);
        break;
      default:
        console.warn(`TokenFirewall: Provider "${provider}" not supported for model listing`);
        return [];
    }
  } catch (error) {
    console.warn(`TokenFirewall: Failed to list models for ${provider}:`, error);
    return [];
  }

  return enrichModelsWithMetadata(providerLower, models, includeBudgetUsage, budgetManager);
}

/**
 * Enrich model list with context limits and budget usage
 */
function enrichModelsWithMetadata(
  provider: string,
  models: string[],
  includeBudgetUsage?: boolean,
  budgetManager?: any
): ModelInfo[] {
  let budgetPercentage: number | undefined;

  if (includeBudgetUsage && budgetManager) {
    const status = budgetManager.getStatus();
    budgetPercentage = status ? status.percentageUsed : undefined;
  }

  return models.map((model) => {
    const contextLimit = contextRegistry.getContextLimit(provider, model);

    const info: ModelInfo = {
      model,
    };

    if (contextLimit !== undefined) {
      info.contextLimit = contextLimit;
    }

    if (budgetPercentage !== undefined) {
      info.budgetUsagePercentage = budgetPercentage;
    }

    return info;
  });
}

// Remove the circular dependency function
// function getBudgetUsagePercentage(): number | undefined {
//   try {
//     const { getBudgetStatus } = require("../index");
//     const status = getBudgetStatus();
//     return status ? status.percentageUsed : undefined;
//   } catch {
//     return undefined;
//   }
// }

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

/**
 * List OpenAI models
 */
async function listOpenAIModels(apiKey: string, baseURL?: string): Promise<string[]> {
  const url = baseURL || "https://api.openai.com/v1/models";

  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = (await response.json()) as { data?: Array<{ id: string }> };

  if (!data.data || !Array.isArray(data.data)) {
    return [];
  }

  return data.data.map((model) => model.id);
}

/**
 * List Anthropic models
 * Note: Anthropic does not provide a models endpoint
 */
async function listAnthropicModels(): Promise<string[]> {
  console.warn("TokenFirewall: Anthropic does not provide a model listing API");
  
  return [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307",
  ];
}

/**
 * List Gemini models
 */
async function listGeminiModels(apiKey: string, baseURL?: string): Promise<string[]> {
  const url = baseURL || `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  const response = await fetchWithTimeout(url, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = (await response.json()) as { models?: Array<{ name: string }> };

  if (!data.models || !Array.isArray(data.models)) {
    return [];
  }

  return data.models
    .filter((model) => model.name.includes("gemini"))
    .map((model) => {
      const parts = model.name.split("/");
      return parts[parts.length - 1];
    });
}

/**
 * List Grok models
 */
async function listGrokModels(apiKey: string, baseURL?: string): Promise<string[]> {
  const url = baseURL || "https://api.x.ai/v1/models";

  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Grok API error: ${response.status}`);
  }

  const data = (await response.json()) as { data?: Array<{ id: string }> };

  if (!data.data || !Array.isArray(data.data)) {
    return [];
  }

  return data.data.map((model) => model.id);
}

/**
 * List Kimi models
 */
async function listKimiModels(apiKey: string, baseURL?: string): Promise<string[]> {
  const url = baseURL || "https://api.moonshot.cn/v1/models";

  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Kimi API error: ${response.status}`);
  }

  const data = (await response.json()) as { data?: Array<{ id: string }> };

  if (!data.data || !Array.isArray(data.data)) {
    return [];
  }

  return data.data.map((model) => model.id);
}
