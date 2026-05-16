/**
 * Response Transformer
 * Converts LLM responses back to the caller's expected provider format
 *
 * The caller originally made a request to Provider A, but a fallback sent it
 * to Provider B. We need to transform Provider B's response to look like
 * Provider A's response so the caller's code works transparently.
 */

/**
 * Normalize any provider response to OpenAI-shaped format (internal common format)
 */
function normalizeResponseToCommon(response: any, provider: string, model: string): any {
  switch (provider) {
    case 'anthropic':
      return {
        id: response.id || `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: response.model || model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: extractAnthropicContent(response),
          },
          finish_reason: mapAnthropicStopReason(response.stop_reason),
        }],
        usage: {
          prompt_tokens: response.usage?.input_tokens || 0,
          completion_tokens: response.usage?.output_tokens || 0,
          total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
        },
      };

    case 'gemini':
      const candidate = response.candidates?.[0];
      return {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: candidate?.content?.parts?.[0]?.text || '',
          },
          finish_reason: mapGeminiFinishReason(candidate?.finishReason),
        }],
        usage: {
          prompt_tokens: response.usageMetadata?.promptTokenCount || 0,
          completion_tokens: response.usageMetadata?.candidatesTokenCount || 0,
          total_tokens: response.usageMetadata?.totalTokenCount || 0,
        },
      };

    // OpenAI, Grok, Kimi — already in OpenAI-compatible format
    default:
      return response;
  }
}

/**
 * Convert OpenAI-shaped common format to a target provider's response format
 */
function commonToTargetResponse(common: any, targetProvider: string): any {
  switch (targetProvider) {
    case 'anthropic':
      return {
        id: common.id,
        type: 'message',
        role: 'assistant',
        content: [{
          type: 'text',
          text: common.choices?.[0]?.message?.content || '',
        }],
        model: common.model,
        stop_reason: common.choices?.[0]?.finish_reason === 'stop' ? 'end_turn' : common.choices?.[0]?.finish_reason,
        usage: {
          input_tokens: common.usage?.prompt_tokens || 0,
          output_tokens: common.usage?.completion_tokens || 0,
        },
      };

    case 'gemini':
      return {
        candidates: [{
          content: {
            parts: [{
              text: common.choices?.[0]?.message?.content || '',
            }],
            role: 'model',
          },
          finishReason: 'STOP',
        }],
        usageMetadata: {
          promptTokenCount: common.usage?.prompt_tokens || 0,
          candidatesTokenCount: common.usage?.completion_tokens || 0,
          totalTokenCount: common.usage?.total_tokens || 0,
        },
      };

    // OpenAI, Grok, Kimi — already OpenAI-compatible
    default:
      return common;
  }
}

/**
 * Transform a response from one provider's format to another
 * Used when a cross-provider fallback occurred and the caller expects
 * the original provider's response format.
 */
export function transformResponse(
  response: any,
  sourceProvider: string,
  targetProvider: string,
  targetModel: string
): any {
  // Same provider — return as-is
  if (sourceProvider === targetProvider) {
    return response;
  }

  // Normalize the actual response (from sourceProvider) to common OpenAI format
  const common = normalizeResponseToCommon(response, sourceProvider, targetModel);

  // Convert from common format to what the caller expects (targetProvider format)
  return commonToTargetResponse(common, targetProvider);
}

// --- Helpers ---

function extractAnthropicContent(response: any): string {
  if (Array.isArray(response.content)) {
    return response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');
  }
  return '';
}

function mapAnthropicStopReason(reason: string | undefined): string {
  switch (reason) {
    case 'end_turn': return 'stop';
    case 'max_tokens': return 'length';
    case 'stop_sequence': return 'stop';
    default: return reason || 'stop';
  }
}

function mapGeminiFinishReason(reason: string | undefined): string {
  switch (reason) {
    case 'STOP': return 'stop';
    case 'MAX_TOKENS': return 'length';
    case 'SAFETY': return 'content_filter';
    default: return 'stop';
  }
}
