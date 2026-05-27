export interface KeywordTaskDefinition {
  taskType: string;
  keywords: string[];
  model: string;
  reason: string;
}

export interface KeywordDetectionOptions {
  taskDefinitions?: KeywordTaskDefinition[];
  maxPromptLength?: number;
  minimumConfidence?: number;
}

export interface KeywordDetectionResult {
  taskType: string;
  confidence: number;
  selectedModel: string;
  reason: string;
  matchedKeywords: string[];
}

const DEFAULT_MAX_PROMPT_LENGTH = 20_000;
const DEFAULT_MINIMUM_CONFIDENCE = 0.18;

export const DEFAULT_KEYWORD_TASKS: KeywordTaskDefinition[] = [
  {
    taskType: "code_generation",
    keywords: ["write code", "create function", "implement", "build api", "develop", "program"],
    model: "claude-3-5-sonnet-20241022",
    reason: "Claude is preferred for implementation and code generation tasks"
  },
  {
    taskType: "code_review",
    keywords: ["review code", "find bugs", "debug", "refactor", "optimize code", "security review"],
    model: "claude-3-5-sonnet-20241022",
    reason: "Claude is preferred for code review and refactoring tasks"
  },
  {
    taskType: "math_reasoning",
    keywords: ["calculate", "solve equation", "formula", "derivative", "probability", "math"],
    model: "o1-mini",
    reason: "o1-mini is preferred for math and calculation tasks"
  },
  {
    taskType: "complex_reasoning",
    keywords: ["reason step by step", "deduce", "prove", "logic puzzle", "analyze tradeoff", "root cause"],
    model: "o1",
    reason: "o1 is preferred for complex reasoning and logic tasks"
  },
  {
    taskType: "document_analysis",
    keywords: ["summarize document", "analyze document", "extract from", "research paper", "contract", "pdf"],
    model: "gemini-2.5-pro",
    reason: "Gemini is preferred for long document analysis"
  },
  {
    taskType: "creative_writing",
    keywords: ["write story", "blog post", "creative", "copywriting", "product description", "tone"],
    model: "gpt-4o",
    reason: "GPT-4o is preferred for creative writing tasks"
  },
  {
    taskType: "translation",
    keywords: ["translate", "translation", "convert to spanish", "convert to french", "localize"],
    model: "gpt-4o-mini",
    reason: "GPT-4o mini is preferred for lightweight translation tasks"
  },
  {
    taskType: "simple_chat",
    keywords: ["hello", "thanks", "quick question", "explain simply", "what is"],
    model: "gpt-4o-mini",
    reason: "GPT-4o mini is preferred for lightweight chat tasks"
  },
  {
    taskType: "data_extraction",
    keywords: ["extract data", "parse json", "structured output", "csv", "table", "fields"],
    model: "gpt-4o-mini",
    reason: "GPT-4o mini is preferred for structured extraction tasks"
  },
  {
    taskType: "chinese_language",
    keywords: ["chinese", "mandarin", "中文", "汉语", "翻译成中文"],
    model: "moonshot-v1-32k",
    reason: "Kimi is preferred for Chinese language tasks"
  }
];

/**
 * Detect the likely task type by matching documented smart-routing keywords.
 */
export function detectByKeywords(
  prompt: string,
  options: KeywordDetectionOptions = {}
): KeywordDetectionResult | null {
  if (typeof prompt !== "string" || prompt.trim() === "") {
    return null;
  }

  const maxPromptLength = options.maxPromptLength ?? DEFAULT_MAX_PROMPT_LENGTH;
  const minimumConfidence = options.minimumConfidence ?? DEFAULT_MINIMUM_CONFIDENCE;
  const normalizedPrompt = normalizePrompt(prompt.slice(0, maxPromptLength));
  const taskDefinitions = options.taskDefinitions ?? DEFAULT_KEYWORD_TASKS;

  let bestResult: KeywordDetectionResult | null = null;

  for (const definition of taskDefinitions) {
    const matchedKeywords = getMatchedKeywords(normalizedPrompt, definition.keywords);
    if (matchedKeywords.length === 0) {
      continue;
    }

    const confidence = calculateConfidence(matchedKeywords, definition.keywords.length);
    if (confidence < minimumConfidence) {
      continue;
    }

    if (!bestResult || confidence > bestResult.confidence) {
      bestResult = {
        taskType: definition.taskType,
        confidence,
        selectedModel: definition.model,
        reason: definition.reason,
        matchedKeywords
      };
    }
  }

  return bestResult;
}

function normalizePrompt(prompt: string): string {
  return prompt.toLowerCase().replace(/\s+/g, " ");
}

function getMatchedKeywords(prompt: string, keywords: string[]): string[] {
  const seen = new Set<string>();
  return keywords
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean)
    .filter((keyword) => {
      if (seen.has(keyword) || !prompt.includes(keyword)) {
        return false;
      }
      seen.add(keyword);
      return true;
    });
}

function calculateConfidence(matchedKeywords: string[], totalKeywords: number): number {
  const coverage = matchedKeywords.length / Math.max(totalKeywords, 1);
  const matchBoost = Math.min(matchedKeywords.length * 0.16, 0.64);
  return Number(Math.min(0.95, 0.2 + coverage * 0.45 + matchBoost).toFixed(2));
}
