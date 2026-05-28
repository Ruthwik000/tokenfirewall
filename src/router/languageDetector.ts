export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  matchedSignals: string[];
}

interface LanguageRule {
  language: string;
  patterns: RegExp[];
  keywords: string[];
}

const MAX_SCAN_LENGTH = 12000;

const LANGUAGE_RULES: LanguageRule[] = [
  {
    language: "typescript",
    patterns: [/\binterface\s+\w+/i, /\btype\s+\w+\s*=/i, /:\s*(string|number|boolean)\b/i],
    keywords: ["typescript", "tsx", "tsconfig", "readonly", "implements"]
  },
  {
    language: "javascript",
    patterns: [/\bconst\s+\w+\s*=/i, /\bfunction\s+\w+\s*\(/i, /=>\s*[{(]/],
    keywords: ["javascript", "node", "react", "promise", "async"]
  },
  {
    language: "python",
    patterns: [/\bdef\s+\w+\s*\(/i, /\bimport\s+\w+/i, /\bclass\s+\w+:/i],
    keywords: ["python", "pytest", "django", "flask", "pandas"]
  },
  {
    language: "go",
    patterns: [/\bpackage\s+\w+/i, /\bfunc\s+\w+\s*\(/i, /\bgo\s+test\b/i],
    keywords: ["golang", "goroutine", "gofmt", "interface{}", "go.mod"]
  },
  {
    language: "rust",
    patterns: [/\bfn\s+\w+\s*\(/i, /\blet\s+mut\b/i, /\bimpl\s+\w+/i],
    keywords: ["rust", "cargo", "borrow", "trait", "lifetime"]
  },
  {
    language: "sql",
    patterns: [/\bselect\s+.+\s+from\b/i, /\binsert\s+into\b/i, /\bwhere\s+\w+\s*=/i],
    keywords: ["sql", "postgres", "mysql", "sqlite", "query"]
  },
  {
    language: "shell",
    patterns: [/#!\/(?:usr\/bin\/env\s+)?(?:ba|z)?sh/i, /\bnpm\s+(ci|run)\b/i, /\bdocker\s+compose\b/i],
    keywords: ["bash", "shell", "terminal", "cli", "docker"]
  },
  {
    language: "markdown",
    patterns: [/^#{1,6}\s+\S/m, /\[[^\]]+\]\([^)]+\)/, /```[\s\S]*?```/],
    keywords: ["markdown", "readme", "mdx", "frontmatter", "table"]
  }
];

export function detectLanguage(input: unknown): LanguageDetectionResult {
  const text = extractText(input).slice(0, MAX_SCAN_LENGTH);
  const normalized = text.toLowerCase();

  if (!normalized.trim()) {
    return { language: "unknown", confidence: 0, matchedSignals: [] };
  }

  const ranked = LANGUAGE_RULES
    .map(rule => {
      const matchedPatterns = rule.patterns
        .filter(pattern => pattern.test(text))
        .map(pattern => pattern.source);
      const matchedKeywords = rule.keywords
        .filter(keyword => normalized.includes(keyword.toLowerCase()));
      const score = matchedPatterns.length * 2 + matchedKeywords.length;

      return {
        language: rule.language,
        score,
        matchedSignals: [...matchedKeywords, ...matchedPatterns]
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score === 0) {
    return { language: "unknown", confidence: 0.15, matchedSignals: [] };
  }

  return {
    language: best.language,
    confidence: Math.min(0.98, 0.3 + best.score * 0.12),
    matchedSignals: best.matchedSignals
  };
}

function extractText(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(extractText).filter(Boolean).join(" ");
  }

  if (typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  return [
    record.prompt,
    record.input,
    record.query,
    record.text,
    record.content,
    record.messages
  ]
    .map(extractText)
    .filter(Boolean)
    .join(" ");
}
