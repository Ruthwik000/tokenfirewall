export interface TaskAnalyticsEvent {
  id: string;
  taskType: string;
  confidence?: number;
  model?: string;
  provider?: string;
  latencyMs?: number;
  success: boolean;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface TaskAnalyticsRecord {
  taskType: string;
  confidence?: number;
  model?: string;
  provider?: string;
  latencyMs?: number;
  success?: boolean;
  timestamp?: number | Date;
  metadata?: Record<string, unknown>;
}

export interface TaskAnalyticsSummary {
  totalClassifications: number;
  successCount: number;
  failureCount: number;
  averageConfidence: number;
  averageLatencyMs: number;
  taskCounts: Record<string, number>;
  modelUsage: Record<string, number>;
  providerUsage: Record<string, number>;
  recentEvents: TaskAnalyticsEvent[];
}

export interface TaskAnalyticsOptions {
  maxEvents?: number;
}

const DEFAULT_MAX_EVENTS = 1000;

export class TaskAnalytics {
  private readonly maxEvents: number;
  private events: TaskAnalyticsEvent[] = [];
  private nextId = 1;

  constructor(options: TaskAnalyticsOptions = {}) {
    const maxEvents = options.maxEvents ?? DEFAULT_MAX_EVENTS;
    if (!Number.isInteger(maxEvents) || maxEvents <= 0) {
      throw new Error("TaskAnalytics: maxEvents must be a positive integer");
    }
    this.maxEvents = maxEvents;
  }

  public recordClassification(record: TaskAnalyticsRecord): TaskAnalyticsEvent {
    const event = normalizeRecord(record, this.nextId++);
    this.events.push(event);

    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents);
    }

    return { ...event, metadata: cloneMetadata(event.metadata) };
  }

  public getAnalytics(limit = 10): TaskAnalyticsSummary {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new Error("TaskAnalytics: recent event limit must be a non-negative integer");
    }

    const taskCounts: Record<string, number> = {};
    const modelUsage: Record<string, number> = {};
    const providerUsage: Record<string, number> = {};
    let confidenceTotal = 0;
    let confidenceCount = 0;
    let latencyTotal = 0;
    let latencyCount = 0;
    let successCount = 0;

    for (const event of this.events) {
      taskCounts[event.taskType] = (taskCounts[event.taskType] || 0) + 1;

      if (event.model) {
        modelUsage[event.model] = (modelUsage[event.model] || 0) + 1;
      }
      if (event.provider) {
        providerUsage[event.provider] = (providerUsage[event.provider] || 0) + 1;
      }
      if (event.confidence !== undefined) {
        confidenceTotal += event.confidence;
        confidenceCount += 1;
      }
      if (event.latencyMs !== undefined) {
        latencyTotal += event.latencyMs;
        latencyCount += 1;
      }
      if (event.success) {
        successCount += 1;
      }
    }

    return {
      totalClassifications: this.events.length,
      successCount,
      failureCount: this.events.length - successCount,
      averageConfidence: roundMetric(confidenceCount ? confidenceTotal / confidenceCount : 0),
      averageLatencyMs: roundMetric(latencyCount ? latencyTotal / latencyCount : 0),
      taskCounts,
      modelUsage,
      providerUsage,
      recentEvents: this.events
        .slice(Math.max(this.events.length - limit, 0))
        .map(event => ({ ...event, metadata: cloneMetadata(event.metadata) }))
    };
  }

  public reset(): void {
    this.events = [];
    this.nextId = 1;
  }
}

export const taskAnalytics = new TaskAnalytics();

function normalizeRecord(record: TaskAnalyticsRecord, sequence: number): TaskAnalyticsEvent {
  if (!record || typeof record !== "object") {
    throw new Error("TaskAnalytics: record must be an object");
  }

  const taskType = normalizeNonEmptyString(record.taskType, "taskType");
  const confidence = normalizeOptionalNumber(record.confidence, "confidence", 0, 1);
  const latencyMs = normalizeOptionalNumber(record.latencyMs, "latencyMs", 0);
  const model = normalizeOptionalString(record.model);
  const provider = normalizeOptionalString(record.provider);
  const timestamp = normalizeTimestamp(record.timestamp);

  return {
    id: `task-${timestamp}-${sequence}`,
    taskType,
    confidence,
    model,
    provider,
    latencyMs,
    success: record.success ?? true,
    timestamp,
    metadata: cloneMetadata(record.metadata)
  };
}

function normalizeNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`TaskAnalytics: ${fieldName} must be a non-empty string`);
  }
  return value.trim();
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  return value.trim();
}

function normalizeOptionalNumber(
  value: unknown,
  fieldName: string,
  min: number,
  max?: number
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < min) {
    throw new Error(`TaskAnalytics: ${fieldName} must be a finite number >= ${min}`);
  }
  if (max !== undefined && value > max) {
    throw new Error(`TaskAnalytics: ${fieldName} must be <= ${max}`);
  }
  return value;
}

function normalizeTimestamp(value: number | Date | undefined): number {
  if (value === undefined) {
    return Date.now();
  }
  const timestamp = value instanceof Date ? value.getTime() : value;
  if (!Number.isFinite(timestamp) || timestamp < 0) {
    throw new Error("TaskAnalytics: timestamp must be a valid non-negative time");
  }
  return timestamp;
}

function cloneMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }
  return { ...metadata };
}

function roundMetric(value: number): number {
  return Number(value.toFixed(4));
}
