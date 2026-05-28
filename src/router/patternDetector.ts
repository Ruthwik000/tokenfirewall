/**
 * Bounded regex-based task detector for smart model routing.
 */

export type PatternTaskType =
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

export interface PatternDefinition {
  taskType: PatternTaskType | string;
  model: string;
  reason: string;
  priority: number;
  patterns: RegExp[];
  keywords?: string[];
}

export interface PatternDetectorOptions {
  patterns?: PatternDefinition[];
  maxPromptLength?: number;
  timeoutMs?: number;
  minimumConfidence?: number;
}

export interface PatternDetectionResult {
  taskType: string;
  confidence: number;
  selectedModel?: string;
  reason: string;
  matchedPatterns: string[];
  matchedKeywords: string[];
  timedOut: boolean;
  elapsedMs: number;
}

const DEFAULT_MAX_PROMPT_LENGTH = 20_000;
const DEFAULT_TIMEOUT_MS = 25;
const DEFAULT_MINIMUM_CONFIDENCE = 0.35;

export const DEFAULT_PATTERN_TASKS: PatternDefinition[] = [
  {
    taskType: "chinese_language",
    model: "moonshot-v1-32k",
    reason: "Kimi is optimized for Chinese language tasks",
    priority: 100,
    patterns: [/[\u4e00-\u9fff]/u],
    keywords: ["chinese", "mandarin", "中文", "汉语", "普通话"]
  },
  {
    taskType: "code_generation",
    model: "claude-3-5-sonnet-20241022",
    reason: "Claude is preferred for implementation and code generation",
    priority: 95,
    patterns: [
      /\b(?:write|create|build|implement|generate|develop)\b[\s\S]{0,80}\b(?:code|function|class|component|api|script|program)\b/i,
      /\b(?:function|class|component|api|script)\b[\s\S]{0,80}\b(?:javascript|typescript|python|java|go|rust|react|node)\b/i
    ],
    keywords: ["write code", "create function", "implement", "build", "develop", "program"]
  },
  {
    taskType: "code_review",
    model: "claude-3-5-sonnet-20241022",
    reason: "Claude is preferred for code review, debugging, and refactoring",
    priority: 90,
    patterns: [
      /\b(?:review|debug|refactor|optimize|improve)\b[\s\S]{0,80}\b(?:code|function|class|component|implementation)\b/i,
      /\b(?:find|fix)\b[\s\S]{0,80}\b(?:bug|bugs|issue|regression|defect)\b/i
    ],
    keywords: ["review code", "find bugs", "debug", "refactor", "optimize"]
  },
  {
    taskType: "math_reasoning",
    model: "o1-mini",
    reason: "o1-mini is preferred for mathematical reasoning",
    priority: 85,
    patterns: [
      /\b(?:solve|calculate|compute|evaluate|derive)\b[\s\S]{0,80}\b(?:equation|formula|integral|derivative|probability|interest|matrix)\b/i,
      /(?:\d+\s*[+\-*/^=]\s*){2,}/
    ],
    keywords: ["calculate", "solve", "compute", "equation", "formula", "math"]
  },
  {
    taskType: "complex_reasoning",
    model: "o1",
    reason: "o1 is preferred for complex reasoning and logical analysis",
    priority: 80,
    patterns: [
      /\b(?:step[\s-]*by[\s-]*step|reasoning|logical analysis|deduce|infer|prove)\b/i,
      /\b(?:analyze|reason|diagnose)\b[\s\S]{0,80}\b(?:root cause|tradeoff|strategy|system failure|business problem)\b/i
    ],
    keywords: ["analyze", "reason", "logic", "deduce", "infer", "prove", "derive"]
  },
  {
    taskType: "document_analysis",
    model: "gemini-2.5-pro",
    reason: "Gemini is preferred for long document analysis",
    priority: 75,
    patterns: [
      /\b(?:summarize|analyse|analyze|review|extract)\b[\s\S]{0,80}\b(?:document|pdf|paper|contract|report|transcript)\b/i,
      /\b(?:long|large|multi-page|hundred-page)\b[\s\S]{0,80}\b(?:document|pdf|paper|report)\b/i
    ],
    keywords: ["summarize document", "analyze document", "analyze pdf", "extract from", "review document"]
  },
  {
    taskType: "creative_writing",
    model: "gpt-4o",
    reason: "GPT-4o is preferred for creative writing tasks",
    priority: 65,
    patterns: [
      /\b(?:write|create|draft)\b[\s\S]{0,80}\b(?:story|poem|blog post|article|copy|product description)\b/i,
      /\b(?:creative writing|engaging content|marketing copy)\b/i
    ],
    keywords: ["write story", "blog post", "creative", "copywriting", "article"]
  },
  {
    taskType: "translation",
    model: "gpt-4o-mini",
    reason: "GPT-4o mini is cost-effective for translation tasks",
    priority: 60,
    patterns: [
      /\b(?:translate|translation|convert)\b[\s\S]{0,80}\b(?:to|from|into)\b/i,
      /\b(?:spanish|french|german|hindi|japanese|korean|english)\b[\s\S]{0,80}\b(?:translation|translate)\b/i
    ],
    keywords: ["translate", "translation", "convert to"]
  },
  {
    taskType: "data_extraction",
    model: "gpt-4o-mini",
    reason: "GPT-4o mini is preferred for structured data extraction",
    priority: 55,
    patterns: [
      /\b(?:extract|parse|pull|get)\b[\s\S]{0,80}\b(?:data|emails?|dates?|json|fields?|values?)\b/i,
      /\b(?:scrape|parse json|get data from)\b/i
    ],
    keywords: ["extract", "parse", "get data from", "scrape", "pull data"]
  },
  {
    taskType: "simple_chat",
    model: "gpt-4o-mini",
    reason: "GPT-4o mini is preferred for lightweight chat",
    priority: 40,
    patterns: [/^\s*(?:hi|hello|hey|thanks|thank you)\b/i, /\bhow[\s\S]{0,20}are[\s\S]{0,20}you\b/i],
    keywords: ["hello", "hi", "how are you", "thanks", "thank you", "help"]
  }
];

/**
 * Detect a prompt's task type with bounded regex and keyword matching.
 */
export function detectByPatterns(
  prompt: string,
  options: PatternDetectorOptions = {}
): PatternDetectionResult {
  const startedAt = Date.now();
  const timeoutMs = Math.max(0, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const maxPromptLength = Math.max(0, options.maxPromptLength ?? DEFAULT_MAX_PROMPT_LENGTH);
  const minimumConfidence = options.minimumConfidence ?? DEFAULT_MINIMUM_CONFIDENCE;

  if (typeof prompt !== "string" || prompt.trim() === "") {
    return createUnknownResult("Prompt is empty or not a string", false, startedAt);
  }

  const source = prompt.slice(0, maxPromptLength);
  const lowerSource = source.toLowerCase();
  const definitions = [...(options.patterns ?? DEFAULT_PATTERN_TASKS)].sort(
    (a, b) => b.priority - a.priority
  );

  let timedOut = false;
  let best: PatternDetectionResult | null = null;

  for (const definition of definitions) {
    if (Date.now() - startedAt > timeoutMs) {
      timedOut = true;
      break;
    }

    const matchedPatterns: string[] = [];
    for (const pattern of definition.patterns) {
      if (Date.now() - startedAt > timeoutMs) {
        timedOut = true;
        break;
      }
      pattern.lastIndex = 0;
      if (pattern.test(source)) {
        matchedPatterns.push(pattern.toString());
      }
    }

    const matchedKeywords = (definition.keywords ?? [])
      .filter((keyword) => lowerSource.includes(keyword.toLowerCase()));
    const confidence = calculateConfidence(matchedPatterns.length, matchedKeywords.length);

    if (confidence <= 0) {
      continue;
    }

    const candidate: PatternDetectionResult = {
      taskType: definition.taskType,
      confidence,
      selectedModel: definition.model,
      reason: definition.reason,
      matchedPatterns,
      matchedKeywords,
      timedOut,
      elapsedMs: Date.now() - startedAt
    };

    if (
      !best ||
      candidate.confidence > best.confidence ||
      (candidate.confidence === best.confidence &&
        definition.priority > getPriority(best.taskType, definitions))
    ) {
      best = candidate;
    }

    if (timedOut) {
      break;
    }
  }

  if (!best || best.confidence < minimumConfidence) {
    return createUnknownResult(
      timedOut ? "Pattern detection timed out before a confident match" : "No confident pattern match",
      timedOut,
      startedAt
    );
  }

  return {
    ...best,
    timedOut,
    elapsedMs: Date.now() - startedAt
  };
}

function calculateConfidence(patternMatches: number, keywordMatches: number): number {
  const score = patternMatches * 0.56 + keywordMatches * 0.12;
  return Number(Math.min(0.99, score).toFixed(2));
}

function getPriority(taskType: string, definitions: PatternDefinition[]): number {
  return definitions.find((definition) => definition.taskType === taskType)?.priority ?? -1;
}

function createUnknownResult(
  reason: string,
  timedOut: boolean,
  startedAt: number
): PatternDetectionResult {
  return {
    taskType: "unknown",
    confidence: 0,
    reason,
    matchedPatterns: [],
    matchedKeywords: [],
    timedOut,
    elapsedMs: Date.now() - startedAt
  };
}
