import { FailureType } from "./types";

/**
 * Detects and classifies API failures
 */
export class ErrorDetector {
  /**
   * Detect failure type from error
   * @param error - The error object
   * @returns Classified failure type
   */
  public detectFailureType(error: unknown): FailureType {
    // Handle HTTP errors
    if (this.isHttpError(error)) {
      return this.classifyHttpError(error);
    }

    // Handle API response errors
    if (this.isApiError(error)) {
      return this.classifyApiError(error);
    }

    // Handle Error objects
    if (error instanceof Error) {
      return this.classifyErrorMessage(error.message);
    }

    return "unknown";
  }

  /**
   * Check if error is an HTTP error with status code
   */
  private isHttpError(error: unknown): error is { status: number } {
    return (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as any).status === "number"
    );
  }

  /**
   * Classify HTTP error by status code
   */
  private classifyHttpError(error: { status: number }): FailureType {
    switch (error.status) {
      case 429:
        return "rate_limit";
      case 404:
        return "model_unavailable";
      case 403:
        return "access_denied";
      case 400:
        // 400 can be context overflow or other issues
        return "unknown";
      default:
        return "unknown";
    }
  }

  /**
   * Check if error is an API error with response body
   */
  private isApiError(error: unknown): error is { response?: { data?: any } } {
    return (
      typeof error === "object" &&
      error !== null &&
      "response" in error
    );
  }

  /**
   * Classify API error by response body
   */
  private classifyApiError(error: { response?: { data?: any } }): FailureType {
    const data = error.response?.data;
    
    if (!data) {
      return "unknown";
    }

    // Check for context overflow indicators
    if (this.isContextOverflow(data)) {
      return "context_overflow";
    }

    // Check for rate limit indicators
    if (this.isRateLimit(data)) {
      return "rate_limit";
    }

    // Check for model unavailable indicators
    if (this.isModelUnavailable(data)) {
      return "model_unavailable";
    }

    return "unknown";
  }

  /**
   * Classify error by message content
   */
  private classifyErrorMessage(message: string): FailureType {
    const lowerMessage = message.toLowerCase();

    // Context overflow patterns
    if (
      lowerMessage.includes("context") &&
      (lowerMessage.includes("length") ||
        lowerMessage.includes("limit") ||
        lowerMessage.includes("exceeded") ||
        lowerMessage.includes("too long"))
    ) {
      return "context_overflow";
    }

    // Rate limit patterns
    if (
      lowerMessage.includes("rate limit") ||
      lowerMessage.includes("too many requests") ||
      lowerMessage.includes("quota exceeded")
    ) {
      return "rate_limit";
    }

    // Model unavailable patterns
    if (
      lowerMessage.includes("model") &&
      (lowerMessage.includes("not found") ||
        lowerMessage.includes("unavailable") ||
        lowerMessage.includes("does not exist"))
    ) {
      return "model_unavailable";
    }

    // Access denied patterns
    if (
      lowerMessage.includes("access denied") ||
      lowerMessage.includes("unauthorized") ||
      lowerMessage.includes("forbidden")
    ) {
      return "access_denied";
    }

    return "unknown";
  }

  /**
   * Check if error indicates context overflow
   */
  private isContextOverflow(data: any): boolean {
    if (typeof data === "string") {
      return this.classifyErrorMessage(data) === "context_overflow";
    }

    if (typeof data === "object" && data !== null) {
      const errorMessage = data.error?.message || data.message || "";
      const errorType = data.error?.type || data.type || "";
      const errorCode = data.error?.code || data.code || "";

      return (
        errorType === "invalid_request_error" &&
        (errorCode === "context_length_exceeded" ||
          errorMessage.toLowerCase().includes("context"))
      );
    }

    return false;
  }

  /**
   * Check if error indicates rate limit
   */
  private isRateLimit(data: any): boolean {
    if (typeof data === "string") {
      return this.classifyErrorMessage(data) === "rate_limit";
    }

    if (typeof data === "object" && data !== null) {
      const errorType = data.error?.type || data.type || "";
      const errorCode = data.error?.code || data.code || "";

      return (
        errorType === "rate_limit_error" ||
        errorCode === "rate_limit_exceeded" ||
        errorCode === "429"
      );
    }

    return false;
  }

  /**
   * Check if error indicates model unavailable
   */
  private isModelUnavailable(data: any): boolean {
    if (typeof data === "string") {
      return this.classifyErrorMessage(data) === "model_unavailable";
    }

    if (typeof data === "object" && data !== null) {
      const errorMessage = data.error?.message || data.message || "";
      const errorCode = data.error?.code || data.code || "";

      return (
        errorCode === "model_not_found" ||
        errorMessage.toLowerCase().includes("model") &&
        errorMessage.toLowerCase().includes("not found")
      );
    }

    return false;
  }
}

export const errorDetector = new ErrorDetector();
