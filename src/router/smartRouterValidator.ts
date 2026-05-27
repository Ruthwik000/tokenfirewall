export interface SmartRouterValidationOptions {
  defaultModel?: string;
  confidenceThreshold?: number;
  modelOverrides?: Record<string, string>;
  taskClassification?: Record<string, SmartRouterTaskConfig>;
  cacheDetections?: boolean;
  detectionCacheTtlMs?: number;
  enableAnalytics?: boolean;
}

export interface SmartRouterTaskConfig {
  keywords?: string[];
  patterns?: Array<string | RegExp>;
  model: string;
  confidenceThreshold?: number;
}

export interface SmartRouterValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate smart-router configuration before it reaches routing logic.
 */
export function validateSmartRouterOptions(
  options: SmartRouterValidationOptions
): SmartRouterValidationResult {
  const errors: string[] = [];

  if (!options || typeof options !== "object" || Array.isArray(options)) {
    return {
      valid: false,
      errors: ["Smart router options must be an object"]
    };
  }

  validateOptionalModel("defaultModel", options.defaultModel, errors);
  validateConfidenceThreshold("confidenceThreshold", options.confidenceThreshold, errors);
  validateBoolean("cacheDetections", options.cacheDetections, errors);
  validateBoolean("enableAnalytics", options.enableAnalytics, errors);
  validateCacheTtl(options.detectionCacheTtlMs, errors);
  validateModelOverrides(options.modelOverrides, errors);
  validateTaskClassification(options.taskClassification, errors);

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Throw a single helpful error when smart-router configuration is invalid.
 */
export function assertValidSmartRouterOptions(options: SmartRouterValidationOptions): void {
  const result = validateSmartRouterOptions(options);
  if (!result.valid) {
    throw new Error(`TokenFirewall Smart Router: ${result.errors.join("; ")}`);
  }
}

function validateOptionalModel(
  field: string,
  value: string | undefined,
  errors: string[]
): void {
  if (value !== undefined && !isNonEmptyString(value)) {
    errors.push(`${field} must be a non-empty string when provided`);
  }
}

function validateConfidenceThreshold(
  field: string,
  value: number | undefined,
  errors: string[]
): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
    errors.push(`${field} must be a number between 0 and 1`);
  }
}

function validateBoolean(field: string, value: boolean | undefined, errors: string[]): void {
  if (value !== undefined && typeof value !== "boolean") {
    errors.push(`${field} must be a boolean when provided`);
  }
}

function validateCacheTtl(value: number | undefined, errors: string[]): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    errors.push("detectionCacheTtlMs must be a positive number when provided");
  }
}

function validateModelOverrides(
  overrides: Record<string, string> | undefined,
  errors: string[]
): void {
  if (overrides === undefined) {
    return;
  }

  if (!isPlainObject(overrides)) {
    errors.push("modelOverrides must be an object mapping task types to model names");
    return;
  }

  for (const [taskType, model] of Object.entries(overrides)) {
    if (!isNonEmptyString(taskType)) {
      errors.push("modelOverrides cannot contain an empty task type");
    }
    if (!isNonEmptyString(model)) {
      errors.push(`modelOverrides.${taskType} must be a non-empty model name`);
    }
  }
}

function validateTaskClassification(
  taskClassification: Record<string, SmartRouterTaskConfig> | undefined,
  errors: string[]
): void {
  if (taskClassification === undefined) {
    return;
  }

  if (!isPlainObject(taskClassification)) {
    errors.push("taskClassification must be an object keyed by task type");
    return;
  }

  for (const [taskType, config] of Object.entries(taskClassification)) {
    if (!isNonEmptyString(taskType)) {
      errors.push("taskClassification cannot contain an empty task type");
    }
    validateTaskConfig(taskType, config, errors);
  }
}

function validateTaskConfig(
  taskType: string,
  config: SmartRouterTaskConfig,
  errors: string[]
): void {
  if (!isPlainObject(config)) {
    errors.push(`taskClassification.${taskType} must be an object`);
    return;
  }

  if (!isNonEmptyString(config.model)) {
    errors.push(`taskClassification.${taskType}.model must be a non-empty string`);
  }

  validateConfidenceThreshold(
    `taskClassification.${taskType}.confidenceThreshold`,
    config.confidenceThreshold,
    errors
  );

  if (config.keywords !== undefined && !isStringArray(config.keywords)) {
    errors.push(`taskClassification.${taskType}.keywords must be an array of strings`);
  }

  if (config.patterns !== undefined && !isPatternArray(config.patterns)) {
    errors.push(`taskClassification.${taskType}.patterns must contain only strings or RegExp values`);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isPatternArray(value: unknown): value is Array<string | RegExp> {
  return Array.isArray(value) && value.every((pattern) =>
    isNonEmptyString(pattern) || pattern instanceof RegExp
  );
}
