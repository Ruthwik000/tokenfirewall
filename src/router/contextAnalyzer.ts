/**
 * Conversation-history task analyzer for smart model routing.
 */

export type ContextTaskType =
  | "code_generation"
  | "code_review"
  | "math_reasoning"
  | "complex_reasoning"
  | "document_analysis"
  | "creative_writing"
  | "translation"
  | "simple_chat"
  | "data_extraction"
  | "chinese_language";

export interface ContextMessage {
  role?: string;
  content?: unknown;
}

export interface ContextTaskDefinition {
  taskType: ContextTaskType | string;
  model: string;
  reason: string;
  keywords: string[];
}

export interface ContextAnalyzerOptions {
  taskDefinitions?: ContextTaskDefinition[];
  maxMessages?: number;
  maxCharsPerMessage?: number;
  minimumConfidence?: number;
}

export interface ContextSignal {
  taskType: string;
  confidence: number;
  selectedModel: string;
  reason: string;
  matchedKeywords: string[];
  evidence: string[];
}

export interface ContextAnalysisResult {
  taskType: string;
  confidence: number;
  selectedModel?: string;
  reason: string;
  matchedKeywords: string[];
  evidence: string[];
  messageCount: number;
  signals: ContextSignal[];
}

const DEFAULT_MAX_MESSAGES = 12;
const DEFAULT_MAX_CHARS_PER_MESSAGE = 4000;
const DEFAULT_MINIMUM_CONFIDENCE = 0.28;

export const DEFAULT_CONTEXT_TASKS: ContextTaskDefinition[] = [
  {
    taskType: "code_generation",
    model: "claude-3-5-sonnet-20241022",
    reason: "Recent conversation context indicates implementation or code generation",
    keywords: ["write code", "create function", "implement", "build api", "develop", "component", "endpoint", "typescript", "python"]
  },
  {
    taskType: "code_review",
    model: "claude-3-5-sonnet-20241022",
    reason: "Recent conversation context indicates code review, debugging, or refactoring",
    keywords: ["review", "find bugs", "debug", "refactor", "optimize code", "security review", "fix failing", "regression"]
  },
  {
    taskType: "math_reasoning",
    model: "o1-mini",
    reason: "Recent conversation context indicates math or calculation work",
    keywords: ["calculate", "solve equation", "formula", "derivative", "probability", "math", "compute"]
  },
  {
    taskType: "complex_reasoning",
    model: "o1",
    reason: "Recent conversation context indicates multi-step reasoning or logical analysis",
    keywords: ["step by step", "reason", "deduce", "prove", "root cause", "tradeoff", "logic", "analyze"]
  },
  {
    taskType: "document_analysis",
    model: "gemini-2.5-pro",
    reason: "Recent conversation context indicates document analysis or summarization",
    keywords: ["summarize document", "analyze document", "pdf", "contract", "research paper", "report", "transcript", "extract from"]
  },
  {
    taskType: "creative_writing",
    model: "gpt-4o",
    reason: "Recent conversation context indicates creative writing or content drafting",
    keywords: ["write story", "blog post", "creative", "copywriting", "article", "tone", "product description"]
  },
  {
    taskType: "translation",
    model: "gpt-4o-mini",
    reason: "Recent conversation context indicates translation or localization",
    keywords: ["translate", "translation", "convert to spanish", "convert to french", "localize", "into english"]
  },
  {
    taskType: "simple_chat",
    model: "gpt-4o-mini",
    reason: "Recent conversation context is lightweight chat",
    keywords: ["hello", "hi", "thanks", "quick question", "help me", "what is"]
  },
  {
    taskType: "data_extraction",
    model: "gpt-4o-mini",
    reason: "Recent conversation context indicates structured extraction or parsing",
    keywords: ["extract data", "parse json", "structured output", "csv", "table", "fields", "pull data"]
  },
  {
    taskType: "chinese_language",
    model: "moonshot-v1-32k",
    reason: "Recent conversation context contains Chinese language signals",
    keywords: ["chinese", "mandarin", "中文", "汉语", "普通话", "翻译"]
  }
];

/**
 * Analyze recent conversation history and infer the most likely smart-routing task.
 */
export function analyzeContext(
  history: ContextMessage[] | string,
  options: ContextAnalyzerOptions = {}
): ContextAnalysisResult {
  const messages = normalizeHistory(history, options);
  if (messages.length === 0) {
    return createUnknownResult("Conversation history is empty", 0);
  }

  const definitions = options.taskDefinitions ?? DEFAULT_CONTEXT_TASKS;
  const minimumConfidence = options.minimumConfidence ?? DEFAULT_MINIMUM_CONFIDENCE;
  const signals = definitions
    .map((definition) => analyzeTask(definition, messages))
    .filter((signal): signal is ContextSignal => signal !== null)
    .sort((a, b) => b.confidence - a.confidence);

  const best = signals[0];
  if (!best || best.confidence < minimumConfidence) {
    return {
      ...createUnknownResult("No confident context match", messages.length),
      signals
    };
  }

  return {
    taskType: best.taskType,
    confidence: best.confidence,
    selectedModel: best.selectedModel,
    reason: best.reason,
    matchedKeywords: best.matchedKeywords,
    evidence: best.evidence,
    messageCount: messages.length,
    signals
  };
}

function normalizeHistory(
  history: ContextMessage[] | string,
  options: ContextAnalyzerOptions
): string[] {
  const maxMessages = Math.max(1, options.maxMessages ?? DEFAULT_MAX_MESSAGES);
  const maxChars = Math.max(1, options.maxCharsPerMessage ?? DEFAULT_MAX_CHARS_PER_MESSAGE);

  if (typeof history === "string") {
    const text = normalizeContent(history).slice(0, maxChars);
    return text ? [text] : [];
  }

  if (!Array.isArray(history)) {
    return [];
  }

  const usableMessages = history.some((message) => message.role !== "assistant")
    ? history.filter((message) => message.role !== "assistant")
    : history;

  return usableMessages
    .slice(-maxMessages)
    .map((message) => normalizeContent(message.content).slice(0, maxChars))
    .filter(Boolean);
}

function normalizeContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join(" ")
      .trim();
  }

  if (content && typeof content === "object" && "text" in content) {
    return String((content as { text?: unknown }).text ?? "").trim();
  }

  return "";
}

function analyzeTask(
  definition: ContextTaskDefinition,
  messages: string[]
): ContextSignal | null {
  const seen = new Set<string>();
  const matchedKeywords: string[] = [];
  const evidence: string[] = [];
  let weightedScore = 0;

  messages.forEach((message, index) => {
    const normalized = normalizeText(message);
    if (!normalized) {
      return;
    }

    const recencyWeight = 1 + index / Math.max(messages.length, 1);
    for (const rawKeyword of definition.keywords) {
      const keyword = normalizeText(rawKeyword);
      if (!keyword || !normalized.includes(keyword)) {
        continue;
      }

      weightedScore += recencyWeight;
      if (!seen.has(keyword)) {
        seen.add(keyword);
        matchedKeywords.push(rawKeyword);
      }
      if (evidence.length < 3) {
        evidence.push(trimEvidence(message));
      }
    }
  });

  if (matchedKeywords.length === 0) {
    return null;
  }

  const coverage = matchedKeywords.length / Math.max(definition.keywords.length, 1);
  const score = 0.16 + coverage * 0.44 + Math.min(weightedScore * 0.11, 0.38);
  const confidence = Number(Math.min(0.98, score).toFixed(2));

  return {
    taskType: definition.taskType,
    confidence,
    selectedModel: definition.model,
    reason: definition.reason,
    matchedKeywords,
    evidence: Array.from(new Set(evidence))
  };
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function trimEvidence(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 160 ? `${normalized.slice(0, 157)}...` : normalized;
}

function createUnknownResult(reason: string, messageCount: number): ContextAnalysisResult {
  return {
    taskType: "unknown",
    confidence: 0,
    reason,
    matchedKeywords: [],
    evidence: [],
    messageCount,
    signals: []
  };
}
