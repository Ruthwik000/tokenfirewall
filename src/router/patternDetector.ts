/**
 * Regex-based task detector for smart model routing.
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
  | "chinese_language"
  | "factual_qa"
  | "technical_documentation";

export interface PatternDefinition {
  /** Stable task identifier returned by the detector. */
  taskType: PatternTaskType;
  /** Recommended model for this task type. */
  model: string;
  /** Human-readable routing reason. */
  reason: string;
  /** Higher priority wins ties between similar confidence scores. */
  priority: number;
  /** Bounded regex patterns used for intent matching. */
  patterns: RegExp[];
  /** Lower-cost literal hints used to boost confidence. */
  keywords: string[];
}

export interface PatternDetectorOptions {
  /** Maximum time budget in milliseconds. Defaults to 25ms. */
  timeoutMs?: number;
  /** Maximum prompt slice to scan. Defaults to 20000 characters. */
  maxPromptLength?: number;
  /** Custom task definitions. Defaults to built-in smart-routing tasks. */
  patterns?: PatternDefinition[];
}

export interface PatternDetectionResult {
  taskType: PatternTaskType | "unknown";
  model?: string;
  reason: string;
  confidence: number;
  matchedPatterns: string[];
  matchedKeywords: string[];
  timedOut: boolean;
  elapsedMs: number;
}

const DEFAULT_TIMEOUT_MS = 25;
const DEFAULT_MAX_PROMPT_LENGTH = 20000;
const MIN_RECOMMENDATION_CONFIDENCE = 0.35;

export const defaultPatternDefinitions: PatternDefinition[] = [
  {
    taskType: "chinese_language",
    model: "moonshot-v1-32k",
    reason: "Kimi is optimized for Chinese language understanding",
    priority: 100,
    patterns: [/[\u4e00-\u9fff]/u],
    keywords: ["chinese", "中文", "汉语", "普通话"],
  },
  {
    taskType: "code_generation",
    model: "claude-3-5-sonnet-20241022",
    reason: "Claude excels at code generation",
    priority: 95,
    patterns: [
      /\b(?:write|create|build|implement|generate|develop)\b[\s\S]{0,80}\b(?:code|function|class|component|api|script|program)\b/i,
      /\b(?:function|class|component|api|script)\b[\s\S]{0,80}\b(?:in|using)\b[\s\S]{0,40}\b(?:javascript|typescript|python|java|go|rust|react|node)\b/i,
    ],
    keywords: ["write code", "create function", "implement", "build", "develop", "program"],
  },
  {
    taskType: "code_review",
    model: "claude-3-5-sonnet-20241022",
    reason: "Claude is strong at code review, debugging, and refactoring",
    priority: 90,
    patterns: [
      /\b(?:review|debug|refactor|optimize|improve)\b[\s\S]{0,80}\b(?:code|function|class|component|implementation)\b/i,
      /\b(?:find|fix)\b[\s\S]{0,80}\b(?:bug|bugs|issue|regression|defect)\b/i,
    ],
    keywords: ["review code", "find bugs", "debug", "refactor", "improve code", "optimize"],
  },
  {
    taskType: "math_reasoning",
    model: "o1-mini",
    reason: "o1-mini is designed for mathematical reasoning",
    priority: 85,
    patterns: [
      /\b(?:solve|calculate|compute|evaluate|derive)\b[\s\S]{0,80}\b(?:equation|formula|integral|derivative|probability|interest|matrix)\b/i,
      /(?:\d+\s*[+\-*/^=]\s*){2,}/,
    ],
    keywords: ["calculate", "solve", "compute", "equation", "formula", "math"],
  },
  {
    taskType: "complex_reasoning",
    model: "o1",
    reason: "o1 is suited to complex reasoning and logical analysis",
    priority: 80,
    patterns: [
      /\b(?:step[\s-]*by[\s-]*step|reasoning|logical analysis|deduce|infer|prove)\b/i,
      /\b(?:analyze|reason|diagnose)\b[\s\S]{0,80}\b(?:root cause|tradeoff|strategy|system failure|business problem)\b/i,
    ],
    keywords: ["analyze", "reason", "logic", "deduce", "infer", "prove", "derive"],
  },
  {
    taskType: "document_analysis",
    model: "gemini-2.5-pro",
    reason: "Gemini has a large context window for document analysis",
    priority: 75,
    patterns: [
      /\b(?:summarize|analyse|analyze|review|extract)\b[\s\S]{0,80}\b(?:document|pdf|paper|contract|report|transcript)\b/i,
      /\b(?:long|large|multi-page|hundred-page)\b[\s\S]{0,80}\b(?:document|pdf|paper|report)\b/i,
    ],
    keywords: ["summarize document", "analyze document", "analyze pdf", "extract from", "review document"],
  },
  {
    taskType: "technical_documentation",
    model: "claude-3-5-sonnet-20241022",
    reason: "Claude performs well on technical documentation",
    priority: 70,
    patterns: [
      /\b(?:write|create|generate|update)\b[\s\S]{0,80}\b(?:documentation|docs|api docs|readme|technical guide)\b/i,
      /\b(?:document)\b[\s\S]{0,80}\b(?:codebase|api|function|system|architecture)\b/i,
    ],
    keywords: ["document", "documentation", "api docs", "technical writing", "create docs"],
  },
  {
    taskType: "creative_writing",
    model: "gpt-4o",
    reason: "GPT-4o is strong at creative and engaging prose",
    priority: 65,
    patterns: [
      /\b(?:write|create|draft)\b[\s\S]{0,80}\b(?:story|poem|blog post|article|copy|product description)\b/i,
      /\b(?:creative writing|engaging content|marketing copy)\b/i,
    ],
    keywords: ["write story", "create content", "blog post", "article", "creative"],
  },
  {
    taskType: "translation",
    model: "gpt-4o-mini",
    reason: "Translation is usually cost-effective on GPT-4o-mini",
    priority: 60,
    patterns: [
      /\b(?:translate|translation|convert)\b[\s\S]{0,80}\b(?:to|from|into)\b/i,
      /\b(?:spanish|french|german|hindi|japanese|korean|english)\b[\s\S]{0,80}\b(?:translation|translate)\b/i,
    ],
    keywords: ["translate", "translation", "convert to"],
  },
  {
    taskType: "data_extraction",
    model: "gpt-4o-mini",
    reason: "Structured extraction works well on GPT-4o-mini",
    priority: 55,
    patterns: [
      /\b(?:extract|parse|pull|get)\b[\s\S]{0,80}\b(?:data|emails?|dates?|json|fields?|values?)\b/i,
      /\b(?:scrape|parse json|get data from)\b/i,
    ],
    keywords: ["extract", "parse", "get data from", "scrape", "pull data"],
  },
  {
    taskType: "factual_qa",
    model: "gpt-4o-mini",
    reason: "Straightforward factual questions are cost-effective on GPT-4o-mini",
    priority: 50,
    patterns: [/^\s*(?:what|who|when|where|how many|why)\b/i],
    keywords: ["what is", "who is", "when did", "where is", "how many"],
  },
  {
    taskType: "simple_chat",
    model: "gpt-4o-mini",
    reason: "Simple chat is fast and inexpensive on GPT-4o-mini",
    priority: 40,
    patterns: [/^\s*(?:hi|hello|hey|thanks|thank you)\b/i, /\bhow[\s\S]{0,20}are[\s\S]{0,20}you\b/i],
    keywords: ["hello", "hi", "how are you", "thanks", "thank you", "help"],
  },
];

/**
 * Detect a prompt's task type with bounded regex and keyword matching.
 */
export function detectByPatterns(
  prompt: string,
  options: PatternDetectorOptions = {}
): PatternDetectionResult {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxPromptLength = options.maxPromptLength ?? DEFAULT_MAX_PROMPT_LENGTH;

  if (typeof prompt !== "string" || prompt.trim() === "") {
    return createUnknownResult("Prompt is empty or not a string", false, startedAt);
  }

  const source = prompt.slice(0, Math.max(0, maxPromptLength));
  const lowerSource = source.toLowerCase();
  const definitions = [...(options.patterns ?? defaultPatternDefinitions)].sort(
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

    const matchedKeywords = definition.keywords.filter((keyword) =>
      lowerSource.includes(keyword.toLowerCase())
    );

    const confidence = calculateConfidence(matchedPatterns.length, matchedKeywords.length);
    if (confidence <= 0) {
      continue;
    }

    const candidate: PatternDetectionResult = {
      taskType: definition.taskType,
      model: definition.model,
      reason: definition.reason,
      confidence,
      matchedPatterns,
      matchedKeywords,
      timedOut,
      elapsedMs: Date.now() - startedAt,
    };

    if (
      best === null ||
      candidate.confidence > best.confidence ||
      (candidate.confidence === best.confidence &&
        definition.priority > getDefinitionPriority(best.taskType, definitions))
    ) {
      best = candidate;
    }

    if (timedOut) {
      break;
    }
  }

  if (best && best.confidence >= MIN_RECOMMENDATION_CONFIDENCE) {
    return {
      ...best,
      timedOut,
      elapsedMs: Date.now() - startedAt,
    };
  }

  return createUnknownResult(
    timedOut ? "Pattern detection timed out before a confident match" : "No confident pattern match",
    timedOut,
    startedAt
  );
}

function calculateConfidence(patternMatches: number, keywordMatches: number): number {
  const score = patternMatches * 0.55 + keywordMatches * 0.12;
  return Math.min(0.99, Number(score.toFixed(2)));
}

function getDefinitionPriority(
  taskType: PatternTaskType | "unknown",
  definitions: PatternDefinition[]
): number {
  return definitions.find((definition) => definition.taskType === taskType)?.priority ?? -1;
}

function createUnknownResult(
  reason: string,
  timedOut: boolean,
  startedAt: number
): PatternDetectionResult {
  return {
    taskType: "unknown",
    reason,
    confidence: 0,
    matchedPatterns: [],
    matchedKeywords: [],
    timedOut,
    elapsedMs: Date.now() - startedAt,
  };
}
