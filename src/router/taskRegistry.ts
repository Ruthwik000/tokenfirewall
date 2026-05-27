/**
 * Task configuration registry for Smart Model Selection.
 */

export interface TaskConfiguration {
  /** Stable task identifier, for example "code_generation". */
  taskType: string;
  /** Preferred model for this task. */
  model: string;
  /** Human-readable reason for selecting the model. */
  reason: string;
  /** Keyword hints used by lightweight classifiers. */
  keywords?: string[];
  /** Regex patterns used by pattern detectors. */
  patterns?: RegExp[];
  /** Higher-priority tasks are evaluated first. */
  priority?: number;
  /** Optional token threshold for context-sensitive tasks. */
  contextThreshold?: number;
}

export type TaskRegistration = Omit<TaskConfiguration, "taskType"> & {
  taskType?: string;
};

const BUILT_IN_TASKS: TaskConfiguration[] = [
  {
    taskType: "code_generation",
    model: "claude-3-5-sonnet-20241022",
    reason: "Claude excels at producing maintainable code",
    keywords: ["write code", "create function", "implement", "build", "develop", "program"],
    patterns: [/write.*code/i, /create.*function/i, /implement.*class/i],
    priority: 100,
  },
  {
    taskType: "code_review",
    model: "claude-3-5-sonnet-20241022",
    reason: "Claude is strong at code review, debugging, and refactoring",
    keywords: ["review code", "find bugs", "optimize", "refactor", "improve code", "debug"],
    patterns: [/review.*code/i, /find.*bug/i, /refactor/i, /optimize/i],
    priority: 95,
  },
  {
    taskType: "math_reasoning",
    model: "o1-mini",
    reason: "o1-mini is optimized for mathematical reasoning",
    keywords: ["calculate", "solve", "compute", "equation", "formula", "math"],
    patterns: [/solve.*equation/i, /calculate/i, /mathematical/i],
    priority: 90,
  },
  {
    taskType: "complex_reasoning",
    model: "o1",
    reason: "o1 is suited to deeper logic and step-by-step reasoning",
    keywords: ["analyze", "reason", "logic", "deduce", "infer", "prove", "derive"],
    patterns: [/step.*by.*step/i, /reasoning/i, /logical.*analysis/i],
    priority: 85,
  },
  {
    taskType: "document_analysis",
    model: "gemini-2.5-pro",
    reason: "Gemini has a very large context window for long documents",
    keywords: ["summarize document", "analyze document", "extract from", "review document"],
    patterns: [/summarize.*document/i, /analyze.*pdf/i, /extract.*information/i],
    priority: 80,
    contextThreshold: 50000,
  },
  {
    taskType: "creative_writing",
    model: "gpt-4o",
    reason: "GPT-4o is effective for creative and engaging prose",
    keywords: ["write story", "create content", "blog post", "article", "creative"],
    patterns: [/write.*story/i, /creative.*writing/i, /blog.*post/i],
    priority: 75,
  },
  {
    taskType: "technical_documentation",
    model: "claude-3-5-sonnet-20241022",
    reason: "Claude is strong at technical writing and documentation",
    keywords: ["document", "documentation", "api docs", "technical writing"],
    patterns: [/write.*documentation/i, /create.*docs/i],
    priority: 72,
  },
  {
    taskType: "translation",
    model: "gpt-4o-mini",
    reason: "Translation is usually handled well by a cost-effective model",
    keywords: ["translate", "translation", "convert to"],
    patterns: [/translate.*to/i, /translation/i],
    priority: 70,
  },
  {
    taskType: "simple_chat",
    model: "gpt-4o-mini",
    reason: "GPT-4o-mini is fast and inexpensive for simple conversation",
    keywords: ["hello", "hi", "how are you", "thanks", "thank you", "help"],
    patterns: [/^(hi|hello|hey)/i, /how.*are.*you/i, /thank/i],
    priority: 65,
  },
  {
    taskType: "data_extraction",
    model: "gpt-4o-mini",
    reason: "Structured extraction works well on a cost-effective model",
    keywords: ["extract", "parse", "get data from", "scrape", "pull data"],
    patterns: [/extract.*from/i, /parse.*json/i, /get.*data/i],
    priority: 60,
  },
  {
    taskType: "factual_qa",
    model: "gpt-4o-mini",
    reason: "GPT-4o-mini is efficient for straightforward factual answers",
    keywords: ["what is", "who is", "when did", "where is", "how many"],
    patterns: [/^(what|who|when|where|how|why)\b/i],
    priority: 55,
  },
  {
    taskType: "chinese_language",
    model: "moonshot-v1-32k",
    reason: "Kimi is optimized for Chinese language understanding",
    keywords: ["chinese"],
    patterns: [/[\u4e00-\u9fff]/],
    priority: 98,
  },
];

/**
 * Stores built-in and custom smart-routing task configurations.
 */
export class TaskRegistry {
  private tasks: Map<string, TaskConfiguration> = new Map();

  constructor(initialTasks: TaskConfiguration[] = BUILT_IN_TASKS) {
    for (const task of initialTasks) {
      this.registerTask(task.taskType, task);
    }
  }

  /**
   * Register or replace a task configuration.
   */
  public registerTask(taskType: string, config: TaskRegistration): void {
    const normalizedTaskType = this.normalizeTaskType(taskType);
    const taskConfig: TaskConfiguration = {
      ...config,
      taskType: normalizedTaskType,
    };

    this.validateTask(taskConfig);
    this.tasks.set(normalizedTaskType, this.cloneTask(taskConfig));
  }

  /**
   * Get a task configuration by type.
   */
  public getTask(taskType: string): TaskConfiguration | undefined {
    const task = this.tasks.get(this.normalizeTaskType(taskType));
    return task ? this.cloneTask(task) : undefined;
  }

  /**
   * Get all tasks sorted by priority, highest first.
   */
  public getAllTasks(): TaskConfiguration[] {
    return Array.from(this.tasks.values())
      .map(task => this.cloneTask(task))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Check whether a task type is registered.
   */
  public hasTask(taskType: string): boolean {
    return this.tasks.has(this.normalizeTaskType(taskType));
  }

  /**
   * Validate a task configuration.
   */
  public validateTask(task: TaskConfiguration): void {
    if (!task.taskType || typeof task.taskType !== "string" || task.taskType.trim() === "") {
      throw new Error("TokenFirewall TaskRegistry: taskType must be a non-empty string");
    }

    if (!task.model || typeof task.model !== "string" || task.model.trim() === "") {
      throw new Error(`TokenFirewall TaskRegistry: model must be a non-empty string for task "${task.taskType}"`);
    }

    if (!task.reason || typeof task.reason !== "string" || task.reason.trim() === "") {
      throw new Error(`TokenFirewall TaskRegistry: reason must be a non-empty string for task "${task.taskType}"`);
    }

    if (task.keywords !== undefined && !this.isStringArray(task.keywords)) {
      throw new Error(`TokenFirewall TaskRegistry: keywords must be an array of strings for task "${task.taskType}"`);
    }

    if (task.patterns !== undefined && !task.patterns.every(pattern => pattern instanceof RegExp)) {
      throw new Error(`TokenFirewall TaskRegistry: patterns must be an array of RegExp instances for task "${task.taskType}"`);
    }

    if (task.priority !== undefined && (!Number.isFinite(task.priority) || task.priority < 0)) {
      throw new Error(`TokenFirewall TaskRegistry: priority must be a non-negative number for task "${task.taskType}"`);
    }

    if (task.contextThreshold !== undefined && (!Number.isFinite(task.contextThreshold) || task.contextThreshold < 0)) {
      throw new Error(
        `TokenFirewall TaskRegistry: contextThreshold must be a non-negative number for task "${task.taskType}"`
      );
    }
  }

  private normalizeTaskType(taskType: string): string {
    return taskType.trim().toLowerCase();
  }

  private isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(item => typeof item === "string" && item.trim() !== "");
  }

  private cloneTask(task: TaskConfiguration): TaskConfiguration {
    return {
      ...task,
      keywords: task.keywords ? [...task.keywords] : undefined,
      patterns: task.patterns ? [...task.patterns] : undefined,
    };
  }
}

export const taskRegistry = new TaskRegistry();
export const builtInTasks = BUILT_IN_TASKS.map(task => ({ ...task }));
