import { ProviderAdapter, NormalizedUsage } from "../core/types";

interface KimiResponse {
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
 * Kimi adapter - normalizes Kimi (Moonshot AI) API responses
 * Kimi uses OpenAI-compatible format
 */
export const kimiAdapter: ProviderAdapter = {
  name: "kimi",

  detect(response: unknown): boolean {
    if (!response || typeof response !== "object") {
      return false;
    }

    const resp = response as KimiResponse;
    return (
      typeof resp.id === "string" &&
      typeof resp.model === "string" &&
      resp.model.startsWith("moonshot") &&
      resp.usage !== undefined
    );
  },

  normalize(response: unknown): NormalizedUsage {
    const resp = response as KimiResponse;

    if (!resp.usage || !resp.model) {
      throw new Error("TokenFirewall: Invalid Kimi response format");
    }

    return {
      provider: "kimi",
      model: resp.model,
      inputTokens: resp.usage.prompt_tokens ?? 0,
      outputTokens: resp.usage.completion_tokens ?? 0,
      totalTokens: resp.usage.total_tokens ?? 0,
    };
  },
};
