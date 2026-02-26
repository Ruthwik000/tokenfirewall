import { ProviderAdapter, NormalizedUsage } from "../core/types";

interface GeminiResponse {
  candidates?: Array<{
    content?: unknown;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  modelVersion?: string;
}

/**
 * Gemini adapter - normalizes Google Gemini API responses
 */
export const geminiAdapter: ProviderAdapter = {
  name: "gemini",

  detect(response: unknown): boolean {
    if (!response || typeof response !== "object") {
      return false;
    }

    const resp = response as GeminiResponse;
    return (
      Array.isArray(resp.candidates) &&
      resp.usageMetadata !== undefined &&
      typeof resp.usageMetadata === "object"
    );
  },

  normalize(response: unknown, request?: unknown): NormalizedUsage {
    const resp = response as GeminiResponse;

    if (!resp.usageMetadata) {
      throw new Error("TokenFirewall: Invalid Gemini response format");
    }

    // Extract model from request or use default
    let model = "gemini-1.5-flash";
    if (request && typeof request === "object") {
      const req = request as { model?: string };
      if (req.model) {
        model = req.model;
      }
    }
    if (resp.modelVersion) {
      model = resp.modelVersion;
    }

    return {
      provider: "gemini",
      model,
      inputTokens: resp.usageMetadata.promptTokenCount ?? 0,
      outputTokens: resp.usageMetadata.candidatesTokenCount ?? 0,
      totalTokens: resp.usageMetadata.totalTokenCount ?? 0,
    };
  },
};
