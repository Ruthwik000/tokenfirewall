import { TaskClassification, TaskClassificationRule } from "./types";

interface ScoredRule {
  taskType: string;
  rule: Required<Pick<TaskClassificationRule, "model">> &
    Omit<TaskClassificationRule, "model">;
}

const DEFAULT_RULES: Record<string, TaskClassificationRule> = {
  code_generation: {
    model: "claude-3-5-sonnet-20241022",
    reason: "Code generation task detected",
    keywords: [
      "write code",
      "create function",
      "implement",
      "build",
      "develop",
      "program"
    ],
    patterns: [/write.*code/i, /create.*function/i, /implement.*class/i],
    priority: 10
  },
  code_review: {
    model: "claude-3-5-sonnet-20241022",
    reason: "Code review or refactoring task detected",
    keywords: ["review code", "find bugs", "refactor", "debug", "optimize"],
    patterns: [/review.*code/i, /find.*bug/i, /refactor/i, /debug/i],
    priority: 9
  },
  math_reasoning: {
    model: "o1-mini",
    reason: "Math or reasoning task detected",
    keywords: ["calculate", "solve", "equation", "formula", "math"],
    patterns: [/solve.*equation/i, /calculate/i, /mathematical/i],
    priority: 8
  },
  document_analysis: {
    model: "gemini-2.5-pro",
    reason: "Long document or summarization task detected",
    keywords: ["summarize document", "analyze document", "extract from"],
    patterns: [/summarize.*document/i, /analyze.*pdf/i, /extract.*information/i],
    priority: 7
  },
  creative_writing: {
    model: "gpt-4o",
    reason: "Creative writing task detected",
    keywords: ["write story", "blog post", "article", "creative"],
    patterns: [/write.*story/i, /creative.*writing/i, /blog.*post/i],
    priority: 6
  },
  translation: {
    model: "gpt-4o-mini",
    reason: "Translation task detected",
    keywords: ["translate", "translation", "convert to"],
    patterns: [/translate.*to/i, /translation/i],
    priority: 5
  },
  simple_chat: {
    model: "gpt-4o-mini",
    reason: "Simple chat task detected",
    keywords: ["hello", "hi", "thanks", "thank you", "help"],
    patterns: [/^(hi|hello|hey)\b/i, /how.*are.*you/i, /thank/i],
    priority: 1
  }
};

/**
 * Lightweight rule-based classifier for smart model routing.
 */
export class TaskClassifier {
  private rules: ScoredRule[];
  private modelOverrides: Record<string, string>;

  constructor(
    taskClassification: Record<string, TaskClassificationRule> = {},
    modelOverrides: Record<string, string> = {}
  ) {
    const mergedRules = {
      ...DEFAULT_RULES,
      ...taskClassification
    };

    this.rules = Object.entries(mergedRules)
      .map(([taskType, rule]) => this.normalizeRule(taskType, rule))
      .sort((a, b) => (b.rule.priority ?? 0) - (a.rule.priority ?? 0));

    this.modelOverrides = modelOverrides;
  }

  /**
   * Classify a provider request body and select the best task model.
   */
  public classify(requestBody: unknown): TaskClassification | null {
    const prompt = this.extractPrompt(requestBody).trim();

    if (!prompt) {
      return null;
    }

    const normalizedPrompt = prompt.toLowerCase();
    let best: TaskClassification | null = null;
    let bestScore = 0;

    for (const { taskType, rule } of this.rules) {
      const keywordMatches = (rule.keywords ?? []).filter(keyword =>
        normalizedPrompt.includes(keyword.toLowerCase())
      ).length;

      const patternMatches = (rule.patterns ?? []).filter(pattern =>
        pattern.test(prompt)
      ).length;

      if (keywordMatches === 0 && patternMatches === 0) {
        continue;
      }

      const score = keywordMatches + patternMatches * 2 + (rule.priority ?? 0) / 100;
      const confidence = Math.min(0.99, 0.6 + keywordMatches * 0.12 + patternMatches * 0.18);

      if (score > bestScore) {
        bestScore = score;
        best = {
          taskType,
          confidence,
          selectedModel: this.modelOverrides[taskType] ?? rule.model,
          reason: rule.reason ?? `Matched smart-routing task "${taskType}"`
        };
      }
    }

    return best;
  }

  private normalizeRule(taskType: string, rule: TaskClassificationRule): ScoredRule {
    if (!rule.model || typeof rule.model !== "string" || rule.model.trim() === "") {
      throw new Error(
        `TokenFirewall Router: smart task "${taskType}" requires a non-empty model`
      );
    }

    return {
      taskType,
      rule: {
        ...rule,
        model: rule.model
      }
    };
  }

  private extractPrompt(value: unknown): string {
    if (!value || typeof value !== "object") {
      return "";
    }

    const body = value as Record<string, unknown>;
    const directPrompt = this.firstString(body.prompt, body.input, body.text);

    if (directPrompt) {
      return directPrompt;
    }

    if (Array.isArray(body.messages)) {
      return body.messages
        .map(message => {
          if (!message || typeof message !== "object") {
            return "";
          }
          return this.extractContent((message as Record<string, unknown>).content);
        })
        .filter(Boolean)
        .join("\n");
    }

    if (Array.isArray(body.contents)) {
      return body.contents
        .map(content => {
          if (!content || typeof content !== "object") {
            return "";
          }
          const parts = (content as Record<string, unknown>).parts;
          if (!Array.isArray(parts)) {
            return "";
          }
          return parts
            .map(part =>
              part && typeof part === "object"
                ? this.firstString((part as Record<string, unknown>).text)
                : ""
            )
            .filter(Boolean)
            .join("\n");
        })
        .filter(Boolean)
        .join("\n");
    }

    return "";
  }

  private extractContent(content: unknown): string {
    if (typeof content === "string") {
      return content;
    }

    if (!Array.isArray(content)) {
      return "";
    }

    return content
      .map(part =>
        part && typeof part === "object"
          ? this.firstString((part as Record<string, unknown>).text)
          : ""
      )
      .filter(Boolean)
      .join("\n");
  }

  private firstString(...values: unknown[]): string {
    for (const value of values) {
      if (typeof value === "string" && value.trim() !== "") {
        return value;
      }
    }
    return "";
  }
}
