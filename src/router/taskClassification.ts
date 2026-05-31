/**
 * Manual task classification API for Smart Model Selection.
 *
 * The functions here are deterministic and side-effect-light so callers can
 * classify prompts before routing, or force the next classification to a known
 * task type when application context is stronger than keyword matching.
 */

export type TaskType =
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
  | "question_answering"
  | "technical_documentation";

export interface TaskClassificationContext {
  /** Recent messages or routing context that can help classify short prompts. */
  conversationHistory?: string[];
  /** Extra application metadata, such as route names or document types. */
  metadata?: Record<string, unknown>;
}

export interface TaskAlternative {
  /** Fallback model that may also handle the detected task type. */
  model: string;
  /** Relative confidence for the fallback model. */
  confidence: number;
}

export interface TaskClassification {
  /** Detected or overridden smart-routing task type. */
  taskType: TaskType;
  /** Confidence score between 0 and 1. */
  confidence: number;
  /** Recommended model for the task type. */
  selectedModel: string;
  /** Human-readable reason for selecting the model. */
  reason: string;
  /** Ranked fallback models for callers that need failover. */
  alternatives: TaskAlternative[];
  /** Whether the classification came from matching, override, or fallback. */
  source: "keyword" | "override" | "default";
}

interface TaskRule {
  taskType: TaskType;
  selectedModel: string;
  reason: string;
  keywords: string[];
  patterns: RegExp[];
  alternatives: TaskAlternative[];
}

const TASK_RULES: TaskRule[] = [
  {
    taskType: "code_generation",
    selectedModel: "claude-3-5-sonnet-20241022",
    reason: "Claude is optimized for high-quality code generation.",
    keywords: [
      "write code",
      "create function",
      "implement",
      "build",
      "develop",
      "program",
      "typescript",
      "javascript",
      "python",
    ],
    patterns: [
      /write\s+.*code/i,
      /write\s+.*function/i,
      /create\s+.*function/i,
      /implement\s+.*class/i,
    ],
    alternatives: [
      { model: "gpt-4o", confidence: 0.75 },
      { model: "gpt-4o-mini", confidence: 0.5 },
    ],
  },
  {
    taskType: "code_review",
    selectedModel: "claude-3-5-sonnet-20241022",
    reason: "Claude is strong at code review, refactoring, and bug analysis.",
    keywords: ["review code", "find bugs", "optimize", "refactor", "improve code", "debug"],
    patterns: [/review\s+.*code/i, /find\s+.*bug/i, /refactor/i, /optimize/i],
    alternatives: [
      { model: "gpt-4o", confidence: 0.72 },
      { model: "gpt-4o-mini", confidence: 0.45 },
    ],
  },
  {
    taskType: "math_reasoning",
    selectedModel: "o1-mini",
    reason: "o1-mini is designed for cost-effective mathematical reasoning.",
    keywords: ["calculate", "solve", "compute", "equation", "formula", "math"],
    patterns: [/solve\s+.*equation/i, /calculate/i, /mathematical/i],
    alternatives: [
      { model: "o1", confidence: 0.8 },
      { model: "gpt-4o", confidence: 0.55 },
    ],
  },
  {
    taskType: "complex_reasoning",
    selectedModel: "o1",
    reason: "o1 is best suited for complex reasoning and logic-heavy prompts.",
    keywords: ["analyze", "reason", "logic", "deduce", "infer", "prove", "derive"],
    patterns: [/step\s+.*by\s+.*step/i, /reasoning/i, /logical\s+.*analysis/i],
    alternatives: [
      { model: "o1-mini", confidence: 0.7 },
      { model: "gpt-4o", confidence: 0.58 },
    ],
  },
  {
    taskType: "document_analysis",
    selectedModel: "gemini-2.5-pro",
    reason: "Gemini handles document analysis with a large context window.",
    keywords: ["summarize document", "analyze document", "extract from", "review document"],
    patterns: [/summarize\s+.*document/i, /analyze\s+.*pdf/i, /extract\s+.*information/i],
    alternatives: [
      { model: "gpt-4o", confidence: 0.68 },
      { model: "claude-3-5-sonnet-20241022", confidence: 0.66 },
    ],
  },
  {
    taskType: "creative_writing",
    selectedModel: "gpt-4o",
    reason: "GPT-4o is a strong fit for creative and engaging prose.",
    keywords: ["write story", "create content", "blog post", "article", "creative"],
    patterns: [/write\s+.*story/i, /creative\s+.*writing/i, /blog\s+.*post/i],
    alternatives: [
      { model: "claude-3-5-sonnet-20241022", confidence: 0.7 },
      { model: "gpt-4o-mini", confidence: 0.5 },
    ],
  },
  {
    taskType: "translation",
    selectedModel: "gpt-4o-mini",
    reason: "Translation is usually handled well by a cost-effective model.",
    keywords: ["translate", "translation", "convert to"],
    patterns: [/translate\s+.*to/i, /translation/i],
    alternatives: [
      { model: "gpt-4o", confidence: 0.62 },
      { model: "kimi-k2", confidence: 0.5 },
    ],
  },
  {
    taskType: "simple_chat",
    selectedModel: "gpt-4o-mini",
    reason: "Simple chat works well on a fast, low-cost model.",
    keywords: ["hello", "hi", "how are you", "thanks", "thank you", "help"],
    patterns: [/^(hi|hello|hey)\b/i, /how\s+.*are\s+.*you/i, /thank/i],
    alternatives: [
      { model: "gpt-4o", confidence: 0.55 },
      { model: "claude-3-5-haiku", confidence: 0.5 },
    ],
  },
  {
    taskType: "data_extraction",
    selectedModel: "gpt-4o-mini",
    reason: "Structured extraction and parsing are cost-effective on GPT-4o mini.",
    keywords: ["extract", "parse", "get data from", "scrape", "pull data"],
    patterns: [/extract\s+.*from/i, /parse\s+.*json/i, /get\s+.*data/i],
    alternatives: [
      { model: "gpt-4o", confidence: 0.65 },
      { model: "gemini-2.5-flash", confidence: 0.58 },
    ],
  },
  {
    taskType: "chinese_language",
    selectedModel: "kimi-k2",
    reason: "Kimi is optimized for Chinese language understanding.",
    keywords: ["chinese", "中文", "汉语", "普通话"],
    patterns: [/[\u4e00-\u9fff]/],
    alternatives: [
      { model: "gpt-4o", confidence: 0.68 },
      { model: "gpt-4o-mini", confidence: 0.5 },
    ],
  },
  {
    taskType: "question_answering",
    selectedModel: "gpt-4o-mini",
    reason: "Factual question answering is typically low-cost and fast.",
    keywords: ["what is", "who is", "when did", "where is", "how many"],
    patterns: [/^(what|who|when|where|how|why)\b/i],
    alternatives: [
      { model: "gpt-4o", confidence: 0.6 },
      { model: "claude-3-5-haiku", confidence: 0.52 },
    ],
  },
  {
    taskType: "technical_documentation",
    selectedModel: "claude-3-5-sonnet-20241022",
    reason: "Claude is strong at clear technical documentation.",
    keywords: ["document", "documentation", "api docs", "technical writing"],
    patterns: [/write\s+.*documentation/i, /create\s+.*docs/i],
    alternatives: [
      { model: "gpt-4o", confidence: 0.68 },
      { model: "gpt-4o-mini", confidence: 0.42 },
    ],
  },
];

const TASK_RULE_MAP = new Map<TaskType, TaskRule>(
  TASK_RULES.map((rule) => [rule.taskType, rule]),
);

let nextOverrideTaskType: TaskType | null = null;

function normalizePrompt(prompt: string): string {
  return prompt.toLowerCase().replace(/\s+/g, " ").trim();
}

function validatePrompt(prompt: string): void {
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new Error("TokenFirewall: prompt must be a non-empty string");
  }
}

function validateTaskType(taskType: string): TaskType {
  if (!TASK_RULE_MAP.has(taskType as TaskType)) {
    throw new Error(`TokenFirewall: Unknown task type "${taskType}"`);
  }

  return taskType as TaskType;
}

function scoreRule(rule: TaskRule, prompt: string, contextText: string): number {
  const searchable = `${prompt} ${contextText}`;
  const keywordHits = rule.keywords.filter((keyword) => searchable.includes(keyword)).length;
  const patternHits = rule.patterns.filter((pattern) => pattern.test(searchable)).length;

  if (keywordHits === 0 && patternHits === 0) {
    return 0;
  }

  return Math.min(0.95, 0.55 + keywordHits * 0.1 + patternHits * 0.15);
}

function contextToText(context?: TaskClassificationContext): string {
  if (!context) return "";

  const history = Array.isArray(context.conversationHistory)
    ? context.conversationHistory.join(" ")
    : "";
  const metadata = context.metadata ? Object.values(context.metadata).join(" ") : "";

  return normalizePrompt(`${history} ${metadata}`);
}

function buildClassification(
  rule: TaskRule,
  confidence: number,
  source: TaskClassification["source"],
): TaskClassification {
  return {
    taskType: rule.taskType,
    confidence,
    selectedModel: rule.selectedModel,
    reason: rule.reason,
    alternatives: rule.alternatives,
    source,
  };
}

/**
 * Classify a prompt into one of TokenFirewall's built-in smart-routing task types.
 *
 * @param prompt - User prompt or request text to classify.
 * @param context - Optional conversation or metadata context.
 * @returns Deterministic task classification with selected model guidance.
 */
export function classifyTask(prompt: string, context?: TaskClassificationContext): TaskClassification {
  validatePrompt(prompt);

  if (nextOverrideTaskType) {
    const override = nextOverrideTaskType;
    nextOverrideTaskType = null;
    return buildClassification(TASK_RULE_MAP.get(override)!, 1, "override");
  }

  const normalizedPrompt = normalizePrompt(prompt);
  const contextText = contextToText(context);
  let bestRule = TASK_RULE_MAP.get("simple_chat")!;
  let bestScore = 0;

  for (const rule of TASK_RULES) {
    const score = scoreRule(rule, normalizedPrompt, contextText);
    if (score > bestScore) {
      bestRule = rule;
      bestScore = score;
    }
  }

  if (bestScore === 0) {
    return buildClassification(bestRule, 0.4, "default");
  }

  return buildClassification(bestRule, bestScore, "keyword");
}

/**
 * Override the task type used by the next classifyTask() call.
 *
 * @param taskType - Built-in task type to force for the next classification.
 */
export function overrideTaskType(taskType: TaskType): void {
  nextOverrideTaskType = validateTaskType(taskType);
}

/**
 * List the task types accepted by classifyTask() and overrideTaskType().
 */
export function listTaskTypes(): TaskType[] {
  return TASK_RULES.map((rule) => rule.taskType);
}
