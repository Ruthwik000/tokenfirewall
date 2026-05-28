export type TaskType =
  | "chat"
  | "code"
  | "math"
  | "reasoning"
  | "summarization"
  | "extraction"
  | "translation"
  | "vision"
  | string;

export interface TaskClassifierMessage {
  role?: string;
  content: string;
}

export interface TaskClassifierInput {
  prompt?: string;
  messages?: TaskClassifierMessage[];
  headers?: Record<string, string | string[] | undefined>;
  metadata?: Record<string, unknown>;
}

export interface TaskDefinition {
  type: TaskType;
  keywords?: string[];
  patterns?: RegExp[];
  signals?: string[];
  recommendedModels?: string[];
  weight?: number;
}

export interface TaskClassifierOptions {
  definitions?: TaskDefinition[];
  maxInputChars?: number;
  minConfidence?: number;
  multiTaskMargin?: number;
}

export interface TaskMatch {
  type: TaskType;
  confidence: number;
  score: number;
  matchedKeywords: string[];
  matchedPatterns: string[];
  matchedSignals: string[];
  recommendedModels: string[];
}

export interface TaskClassification {
  primaryTask: TaskType;
  confidence: number;
  matches: TaskMatch[];
  multiTask: boolean;
  truncated: boolean;
  analyzedChars: number;
}

const DEFAULT_MAX_INPUT_CHARS = 12000;
const DEFAULT_MIN_CONFIDENCE = 0.18;
const DEFAULT_MULTI_TASK_MARGIN = 0.2;

export const DEFAULT_TASK_DEFINITIONS: TaskDefinition[] = [
  {
    type: "code",
    keywords: [
      "code",
      "function",
      "typescript",
      "javascript",
      "python",
      "rust",
      "debug",
      "compile",
      "refactor",
      "test",
      "api",
      "component"
    ],
    patterns: [
      /```[\s\S]*?```/i,
      /\b(class|interface|function|const|let|def|fn)\s+[A-Za-z0-9_]+/i,
      /\b(error|exception|stack trace|traceback)\b/i
    ],
    signals: ["code", "debug", "programming"],
    recommendedModels: ["gpt-5", "claude-sonnet-4.5", "gpt-4.1"]
  },
  {
    type: "math",
    keywords: [
      "calculate",
      "equation",
      "algebra",
      "probability",
      "derivative",
      "integral",
      "matrix",
      "statistics",
      "solve"
    ],
    patterns: [
      /\b\d+\s*[\+\-\*\/\^]\s*\d+\b/,
      /\b(sin|cos|tan|log|sqrt)\s*\(/i,
      /[∫∑√≈≤≥]/
    ],
    signals: ["math", "calculation"],
    recommendedModels: ["gpt-5", "o1", "gpt-4.1"]
  },
  {
    type: "reasoning",
    keywords: [
      "reason",
      "analyze",
      "compare",
      "evaluate",
      "strategy",
      "tradeoff",
      "why",
      "plan",
      "decision"
    ],
    patterns: [
      /\b(step by step|think through|pros and cons|root cause)\b/i
    ],
    signals: ["reasoning", "analysis"],
    recommendedModels: ["gpt-5", "claude-opus-4.5", "o1"]
  },
  {
    type: "summarization",
    keywords: [
      "summarize",
      "summary",
      "tldr",
      "condense",
      "recap",
      "brief",
      "key points"
    ],
    patterns: [
      /\b(tl;?dr|executive summary|summarize this)\b/i
    ],
    signals: ["summary", "summarization"],
    recommendedModels: ["gpt-5-mini", "gpt-4.1-mini", "claude-haiku-4.5"]
  },
  {
    type: "extraction",
    keywords: [
      "extract",
      "parse",
      "json",
      "csv",
      "fields",
      "entities",
      "schema",
      "structured"
    ],
    patterns: [
      /\b(return|output)\s+(valid\s+)?json\b/i,
      /\bextract\s+[A-Za-z0-9_,\s]+from\b/i
    ],
    signals: ["extraction", "structured-output"],
    recommendedModels: ["gpt-4.1", "gpt-5-mini", "gemini-2.5-flash"]
  },
  {
    type: "translation",
    keywords: [
      "translate",
      "translation",
      "language",
      "spanish",
      "hindi",
      "french",
      "german",
      "chinese"
    ],
    patterns: [
      /\btranslate\s+.+\s+to\s+[A-Za-z]+\b/i
    ],
    signals: ["translation", "language"],
    recommendedModels: ["gpt-4.1-mini", "gemini-2.5-flash", "claude-haiku-4.5"]
  },
  {
    type: "vision",
    keywords: [
      "image",
      "screenshot",
      "photo",
      "diagram",
      "ocr",
      "visual",
      "chart"
    ],
    patterns: [
      /\b(describe|inspect|analyze)\s+(this\s+)?(image|screenshot|photo|diagram)\b/i
    ],
    signals: ["vision", "image"],
    recommendedModels: ["gpt-4o", "gemini-2.5-flash", "claude-sonnet-4.5"]
  },
  {
    type: "chat",
    keywords: [
      "chat",
      "reply",
      "message",
      "email",
      "conversation",
      "casual",
      "tone"
    ],
    patterns: [
      /\b(write|draft|reply to)\s+(an?\s+)?(email|message|response)\b/i
    ],
    signals: ["chat", "conversation"],
    recommendedModels: ["gpt-5-mini", "gpt-4.1-mini", "claude-haiku-4.5"]
  }
];

export class TaskClassifier {
  private readonly definitions: TaskDefinition[];
  private readonly maxInputChars: number;
  private readonly minConfidence: number;
  private readonly multiTaskMargin: number;

  constructor(options: TaskClassifierOptions = {}) {
    this.definitions = normalizeDefinitions(options.definitions || DEFAULT_TASK_DEFINITIONS);
    this.maxInputChars = options.maxInputChars ?? DEFAULT_MAX_INPUT_CHARS;
    this.minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
    this.multiTaskMargin = options.multiTaskMargin ?? DEFAULT_MULTI_TASK_MARGIN;
  }

  public classify(input: string | TaskClassifierInput): TaskClassification {
    const normalizedInput = normalizeInput(input, this.maxInputChars);
    const haystack = normalizedInput.text.toLowerCase();
    const signals = normalizedInput.signals.map(signal => signal.toLowerCase());

    const matches = this.definitions
      .map(definition => this.scoreDefinition(definition, haystack, signals))
      .filter(match => match.confidence >= this.minConfidence)
      .sort((a, b) => {
        if (b.confidence !== a.confidence) {
          return b.confidence - a.confidence;
        }
        return b.score - a.score;
      });

    const fallbackMatch: TaskMatch = {
      type: "chat",
      confidence: 0.1,
      score: 0.1,
      matchedKeywords: [],
      matchedPatterns: [],
      matchedSignals: [],
      recommendedModels: ["gpt-5-mini", "gpt-4.1-mini"]
    };

    const rankedMatches = matches.length > 0 ? matches : [fallbackMatch];
    const primary = rankedMatches[0];
    const secondary = rankedMatches[1];
    const multiTask = Boolean(
      secondary && primary.confidence - secondary.confidence <= this.multiTaskMargin
    );

    return {
      primaryTask: primary.type,
      confidence: primary.confidence,
      matches: rankedMatches,
      multiTask,
      truncated: normalizedInput.truncated,
      analyzedChars: normalizedInput.text.length
    };
  }

  private scoreDefinition(
    definition: TaskDefinition,
    haystack: string,
    signals: string[]
  ): TaskMatch {
    const matchedKeywords = matchKeywords(definition.keywords || [], haystack);
    const matchedPatterns = matchPatterns(definition.patterns || [], haystack);
    const matchedSignals = matchSignals(definition.signals || [], signals);
    const weight = definition.weight ?? 1;

    const keywordScore = Math.min(matchedKeywords.length * 0.16, 0.48);
    const patternScore = Math.min(matchedPatterns.length * 0.24, 0.48);
    const signalScore = Math.min(matchedSignals.length * 0.22, 0.44);
    const score = (keywordScore + patternScore + signalScore) * weight;
    const confidence = clamp(Number(score.toFixed(3)), 0, 0.99);

    return {
      type: definition.type,
      confidence,
      score,
      matchedKeywords,
      matchedPatterns,
      matchedSignals,
      recommendedModels: [...(definition.recommendedModels || [])]
    };
  }
}

export function classifyTask(
  input: string | TaskClassifierInput,
  options?: TaskClassifierOptions
): TaskClassification {
  return new TaskClassifier(options).classify(input);
}

function normalizeDefinitions(definitions: TaskDefinition[]): TaskDefinition[] {
  if (!Array.isArray(definitions) || definitions.length === 0) {
    throw new Error("TaskClassifier: definitions must be a non-empty array");
  }

  return definitions.map(definition => {
    if (!definition || typeof definition !== "object") {
      throw new Error("TaskClassifier: each definition must be an object");
    }
    if (!definition.type || typeof definition.type !== "string") {
      throw new Error("TaskClassifier: each definition requires a string type");
    }

    return {
      ...definition,
      keywords: [...(definition.keywords || [])],
      patterns: [...(definition.patterns || [])],
      signals: [...(definition.signals || [])],
      recommendedModels: [...(definition.recommendedModels || [])]
    };
  });
}

function normalizeInput(
  input: string | TaskClassifierInput,
  maxInputChars: number
): { text: string; signals: string[]; truncated: boolean } {
  if (maxInputChars <= 0 || !Number.isFinite(maxInputChars)) {
    throw new Error("TaskClassifier: maxInputChars must be a positive finite number");
  }

  if (typeof input === "string") {
    const text = input.slice(0, maxInputChars);
    return {
      text,
      signals: [],
      truncated: input.length > text.length
    };
  }

  if (!input || typeof input !== "object") {
    throw new Error("TaskClassifier: input must be a string or input object");
  }

  const parts: string[] = [];
  if (input.prompt) {
    parts.push(input.prompt);
  }
  if (input.messages) {
    for (const message of input.messages) {
      if (message && typeof message.content === "string") {
        parts.push(message.content);
      }
    }
  }

  const rawText = parts.join("\n");
  const text = rawText.slice(0, maxInputChars);

  return {
    text,
    signals: collectSignals(input),
    truncated: rawText.length > text.length
  };
}

function collectSignals(input: TaskClassifierInput): string[] {
  const signals = new Set<string>();

  for (const value of Object.values(input.headers || {})) {
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (typeof item === "string") {
        splitSignalValue(item).forEach(signal => signals.add(signal));
      }
    }
  }

  for (const value of Object.values(input.metadata || {})) {
    if (typeof value === "string") {
      splitSignalValue(value).forEach(signal => signals.add(signal));
    } else if (Array.isArray(value)) {
      value
        .filter((item): item is string => typeof item === "string")
        .forEach(item => splitSignalValue(item).forEach(signal => signals.add(signal)));
    }
  }

  return [...signals];
}

function splitSignalValue(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function matchKeywords(keywords: string[], haystack: string): string[] {
  return keywords.filter(keyword => {
    const needle = keyword.toLowerCase();
    return haystack.includes(needle);
  });
}

function matchPatterns(patterns: RegExp[], haystack: string): string[] {
  return patterns
    .filter(pattern => pattern.test(haystack))
    .map(pattern => pattern.source);
}

function matchSignals(expectedSignals: string[], signals: string[]): string[] {
  return expectedSignals.filter(expected => {
    const normalizedExpected = expected.toLowerCase();
    return signals.some(signal => signal === normalizedExpected || signal.includes(normalizedExpected));
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
