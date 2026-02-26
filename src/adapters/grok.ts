import { ProviderAdapter, NormalizedUsage } from "../core/types";

interface GrokResponse {
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
 * Grok adapter - normalizes Grok API responses
 * Grok uses OpenAI-compatible format and supports both Grok and Llama models
 */
export const grokAdapter: ProviderAdapter = {
  name: "grok",

  detect(response: unknown): boolean {
    if (!response || typeof response !== "object") {
      return false;
    }

    const resp = response as GrokResponse;
    return (
      typeof resp.id === "string" &&
      typeof resp.model === "string" &&
      (resp.model.startsWith("grok") || resp.model.includes("llama")) &&
      resp.usage !== undefined
    );
  },

  normalize(response: unknown): NormalizedUsage {
    const resp = response as GrokResponse;

    if (!resp.usage || !resp.model) {
      throw new Error("TokenFirewall: Invalid Grok response format");
    }

    return {
      provider: "grok",
      model: resp.model,
      inputTokens: resp.usage.prompt_tokens ?? 0,
      outputTokens: resp.usage.completion_tokens ?? 0,
      totalTokens: resp.usage.total_tokens ?? 0,
    };
  },
};
