import { ProviderAdapter, NormalizedUsage } from "../core/types";

interface AnthropicResponse {
  id?: string;
  type?: string;
  model?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

/**
 * Anthropic adapter - normalizes Anthropic API responses
 */
export const anthropicAdapter: ProviderAdapter = {
  name: "anthropic",

  detect(response: unknown): boolean {
    if (!response || typeof response !== "object") {
      return false;
    }

    const resp = response as AnthropicResponse;
    return (
      typeof resp.id === "string" &&
      resp.type === "message" &&
      typeof resp.model === "string" &&
      resp.usage !== undefined
    );
  },

  normalize(response: unknown): NormalizedUsage {
    const resp = response as AnthropicResponse;

    if (!resp.usage || !resp.model) {
      throw new Error("TokenFirewall: Invalid Anthropic response format");
    }

    const inputTokens = resp.usage.input_tokens ?? 0;
    const outputTokens = resp.usage.output_tokens ?? 0;

    return {
      provider: "anthropic",
      model: resp.model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  },
};
