import { ProviderAdapter, NormalizedUsage } from "../core/types";

interface OpenAIResponse {
  id?: string;
  object?: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * OpenAI adapter - normalizes OpenAI API responses
 */
export const openaiAdapter: ProviderAdapter = {
  name: "openai",

  detect(response: unknown): boolean {
    if (!response || typeof response !== "object") {
      return false;
    }

    const resp = response as OpenAIResponse;
    
    // Check basic OpenAI structure
    const hasBasicStructure = (
      typeof resp.id === "string" &&
      typeof resp.object === "string" &&
      typeof resp.model === "string" &&
      resp.usage !== undefined &&
      typeof resp.usage === "object"
    );

    if (!hasBasicStructure) {
      return false;
    }

    // Exclude Grok and Llama models (they have their own adapter)
    if (resp.model && (resp.model.startsWith("grok") || resp.model.includes("llama"))) {
      return false;
    }

    // Exclude Kimi models (they have their own adapter)
    if (resp.model && resp.model.startsWith("moonshot")) {
      return false;
    }

    return true;
  },

  normalize(response: unknown): NormalizedUsage {
    const resp = response as OpenAIResponse;

    if (!resp.usage || !resp.model) {
      throw new Error("TokenFirewall: Invalid OpenAI response format");
    }

    return {
      provider: "openai",
      model: resp.model,
      inputTokens: resp.usage.prompt_tokens ?? 0,
      outputTokens: resp.usage.completion_tokens ?? 0,
      totalTokens: resp.usage.total_tokens ?? 0,
    };
  },
};
