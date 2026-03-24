/**
 * Request Transformer
 * Converts LLM request formats between providers
 * Supports: OpenAI ↔ Anthropic ↔ Gemini ↔ Grok ↔ Kimi
 *
 * Note: This covers basic text chat completions (Option 1 MVP).
 * Streaming, function calling, and vision are not yet supported.
 */

interface Message {
  role: string;
  content: string;
}

/**
 * Normalize any provider's request to an internal common format (OpenAI-shaped)
 * This makes it easy to then convert to any target format.
 */
function normalizeToCommon(request: any, sourceProvider: string): {
  messages: Message[];
  model: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
} {
  switch (sourceProvider) {
    case 'anthropic': {
      const messages: Message[] = [];
      // Anthropic has a separate `system` field
      if (request.system) {
        messages.push({ role: 'system', content: request.system });
      }
      if (Array.isArray(request.messages)) {
        for (const msg of request.messages) {
          messages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          });
        }
      }
      return {
        messages,
        model: request.model || '',
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        top_p: request.top_p,
      };
    }

    case 'gemini': {
      const messages: Message[] = [];
      if (Array.isArray(request.contents)) {
        for (const content of request.contents) {
          const role = content.role === 'model' ? 'assistant' : 'user';
          const text = Array.isArray(content.parts)
            ? content.parts.map((p: any) => p.text || '').join('')
            : '';
          messages.push({ role, content: text });
        }
      }
      return {
        messages,
        model: '',
        temperature: request.generationConfig?.temperature,
        max_tokens: request.generationConfig?.maxOutputTokens,
        top_p: request.generationConfig?.topP,
      };
    }

    // OpenAI, Grok, Kimi all use OpenAI-compatible format
    default:
      return {
        messages: (request.messages || []).map((m: any) => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
        model: request.model || '',
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        top_p: request.top_p,
      };
  }
}

/**
 * Convert the common (OpenAI-shaped) format to a target provider's format
 */
function commonToTarget(
  common: ReturnType<typeof normalizeToCommon>,
  targetProvider: string,
  targetModel: string
): any {
  switch (targetProvider) {
    case 'anthropic': {
      // Extract system message
      const systemMsg = common.messages.find(m => m.role === 'system');
      const nonSystemMsgs = common.messages.filter(m => m.role !== 'system');

      const result: any = {
        model: targetModel,
        messages: nonSystemMsgs.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        max_tokens: common.max_tokens || 1024,
      };

      if (systemMsg) {
        result.system = systemMsg.content;
      }
      if (common.temperature !== undefined) {
        result.temperature = common.temperature;
      }
      if (common.top_p !== undefined) {
        result.top_p = common.top_p;
      }

      return result;
    }

    case 'gemini': {
      // Gemini uses `contents` array; system messages become a leading user turn
      const contents: any[] = [];

      for (const msg of common.messages) {
        if (msg.role === 'system') {
          // Gemini doesn't have a system role; prepend as a user message
          contents.push({
            role: 'user',
            parts: [{ text: msg.content }],
          });
        } else {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          });
        }
      }

      const result: any = { contents };

      const genConfig: any = {};
      if (common.temperature !== undefined) genConfig.temperature = common.temperature;
      if (common.max_tokens !== undefined) genConfig.maxOutputTokens = common.max_tokens;
      if (common.top_p !== undefined) genConfig.topP = common.top_p;

      if (Object.keys(genConfig).length > 0) {
        result.generationConfig = genConfig;
      }

      return result;
    }

    // OpenAI, Grok, Kimi — all use OpenAI-compatible format
    default:
      const result: any = {
        model: targetModel,
        messages: common.messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      };

      if (common.temperature !== undefined) result.temperature = common.temperature;
      if (common.max_tokens !== undefined) result.max_tokens = common.max_tokens;
      if (common.top_p !== undefined) result.top_p = common.top_p;

      return result;
  }
}

/**
 * Transform a request from one provider's format to another
 */
export function transformRequest(
  originalRequest: any,
  sourceProvider: string,
  targetProvider: string,
  targetModel: string
): any {
  // Same provider — just swap model name
  if (sourceProvider === targetProvider) {
    if (targetProvider === 'gemini') {
      // Gemini model is in URL, not body — just return the body as-is
      return { ...originalRequest };
    }
    return { ...originalRequest, model: targetModel };
  }

  // Cross-provider: normalize → convert
  const common = normalizeToCommon(originalRequest, sourceProvider);
  return commonToTarget(common, targetProvider, targetModel);
}
