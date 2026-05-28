import { detectProvider } from "./providerDetector";

export interface TaskClassificationConfig {
  [taskType: string]: {
    model: string;
    reason: string;
    keywords?: string[];
    patterns?: RegExp[];
    priority?: number;
  };
}

export interface TaskDetection {
  taskType: string;
  confidence: number;
  selectedModel: string;
  reason: string;
}

export const defaultTaskClassification: TaskClassificationConfig = {
  code_generation: {
    model: "claude-3-5-sonnet-20241022",
    reason: "Claude excels at code generation",
    keywords: ["write code", "create function", "implement", "build", "develop", "program"],
    patterns: [/write.*code/i, /create.*function/i, /implement.*class/i, /write.*function/i],
    priority: 10
  },
  math_reasoning: {
    model: "o1-mini",
    reason: "o1 designed for reasoning",
    keywords: ["calculate", "solve", "compute", "equation", "formula", "math"],
    patterns: [/solve.*equation/i, /calculate/i, /mathematical/i],
    priority: 9
  },
  document_analysis: {
    model: "gemini-2.5-pro",
    reason: "Gemini has 2M token context window",
    keywords: ["summarize document", "analyze document", "extract from", "review document"],
    patterns: [/summarize.*document/i, /analyze.*pdf/i, /extract.*information/i],
    priority: 8
  },
  simple_chat: {
    model: "gpt-4o-mini",
    reason: "Cost-effective for simple conversation",
    keywords: ["hello", "hi", "how are you", "thanks", "thank you", "help"],
    patterns: [/^(hi|hello|hey)/i, /how.*are.*you/i, /thank/i],
    priority: 1
  }
};

export function extractPrompt(requestBody: any, provider: string | null): string {
  if (!requestBody) return "";
  let promptText = "";

  try {
    if ((provider === "openai" || provider === "anthropic") && Array.isArray(requestBody.messages)) {
      const msgs = requestBody.messages;
      if (msgs.length > 0) {
        promptText = msgs[msgs.length - 1].content || "";
      }
    } else if (provider === "gemini" && Array.isArray(requestBody.contents)) {
      const contents = requestBody.contents;
      if (contents.length > 0) {
        const parts = contents[contents.length - 1].parts;
        if (Array.isArray(parts) && parts.length > 0) {
          promptText = parts[parts.length - 1].text || "";
        }
      }
    }
  } catch (e) {
    // Parsing failed, return empty string
  }

  return promptText;
}

export function classifyTask(
  prompt: string,
  config: TaskClassificationConfig = defaultTaskClassification,
  confidenceThreshold: number = 0.7
): TaskDetection | null {
  if (!prompt) return null;

  let bestMatch: TaskDetection | null = null;
  let highestConfidence = 0;

  for (const [taskType, rules] of Object.entries(config)) {
    let confidence = 0;
    
    // Keyword matching
    if (rules.keywords) {
      const matchedKeywords = rules.keywords.filter(kw => prompt.toLowerCase().includes(kw.toLowerCase()));
      if (matchedKeywords.length > 0) {
        confidence += 0.5 + (0.1 * matchedKeywords.length);
      }
    }

    // Pattern matching
    if (rules.patterns) {
      for (const pattern of rules.patterns) {
        if (pattern.test(prompt)) {
          confidence += 0.8;
          break;
        }
      }
    }

    // Cap confidence
    confidence = Math.min(confidence, 1.0);

    if (confidence >= confidenceThreshold && confidence > highestConfidence) {
      highestConfidence = confidence;
      bestMatch = {
        taskType,
        confidence,
        selectedModel: rules.model,
        reason: rules.reason
      };
    }
  }

  return bestMatch;
}
