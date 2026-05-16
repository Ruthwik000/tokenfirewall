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

    // Extract model from request context or use default
    let model = "gemini-1.5-flash";
    if (request && typeof request === "object") {
      const req = request as { url?: string; model?: string };

      // Try to extract model from the Gemini URL: /models/MODEL_NAME:generateContent
      if (req.url) {
        const match = req.url.match(/\/models\/([^/:]+)[:/]/);
        if (match) {
          model = match[1];
        }
      }

      // Fallback: explicit model field in request body
      if (!model || model === "gemini-1.5-flash") {
        if (req.model) {
          model = req.model;
        }
      }
    }
    
    // modelVersion in the response always wins if present (most accurate)
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
