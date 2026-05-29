export type TokenTimestamp = number | Date;

export interface TokenCleanupRecord<TMetadata = unknown> {
  id: string;
  expiresAt: TokenTimestamp;
  revokedAt?: TokenTimestamp | null;
  metadata?: TMetadata;
}

export interface TokenCleanupStoreOptions {
  revokedTokenMaxAgeMs?: number;
  onCleanup?: (result: TokenCleanupResult) => void;
}

export interface TokenCleanupOptions {
  now?: TokenTimestamp;
  revokedTokenMaxAgeMs?: number;
}

export interface TokenCleanupResult {
  expired: number;
  revoked: number;
  total: number;
  remaining: number;
}

const DEFAULT_REVOKED_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function normalizeTimestamp(value: TokenTimestamp, fieldName: string): number {
  const timestamp = value instanceof Date ? value.getTime() : value;

  if (typeof timestamp !== "number" || Number.isNaN(timestamp) || !Number.isFinite(timestamp)) {
    throw new Error(`TokenFirewall: ${fieldName} must be a valid timestamp`);
  }

  return timestamp;
}

function normalizeMaxAge(value: number): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value) || value < 0) {
    throw new Error("TokenFirewall: revokedTokenMaxAgeMs must be a non-negative finite number");
  }

  return value;
}

/**
 * In-memory token cleanup helper for applications that track expired or revoked
 * token identifiers alongside TokenFirewall.
 */
export class TokenCleanupStore<TMetadata = unknown> {
  private records = new Map<string, TokenCleanupRecord<TMetadata>>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private readonly revokedTokenMaxAgeMs: number;
  private readonly onCleanup?: (result: TokenCleanupResult) => void;

  constructor(options: TokenCleanupStoreOptions = {}) {
    this.revokedTokenMaxAgeMs = normalizeMaxAge(
      options.revokedTokenMaxAgeMs ?? DEFAULT_REVOKED_TOKEN_MAX_AGE_MS,
    );
    this.onCleanup = options.onCleanup;
  }

  public upsert(record: TokenCleanupRecord<TMetadata>): void {
    if (!record.id || typeof record.id !== "string" || record.id.trim() === "") {
      throw new Error("TokenFirewall: token cleanup record id must be a non-empty string");
    }

    normalizeTimestamp(record.expiresAt, "expiresAt");

    if (record.revokedAt !== undefined && record.revokedAt !== null) {
      normalizeTimestamp(record.revokedAt, "revokedAt");
    }

    this.records.set(record.id, { ...record });
  }

  public delete(id: string): boolean {
    return this.records.delete(id);
  }

  public get(id: string): TokenCleanupRecord<TMetadata> | undefined {
    const record = this.records.get(id);
    return record ? { ...record } : undefined;
  }

  public list(): TokenCleanupRecord<TMetadata>[] {
    return Array.from(this.records.values(), (record) => ({ ...record }));
  }

  public size(): number {
    return this.records.size;
  }

  public cleanup(options: TokenCleanupOptions = {}): TokenCleanupResult {
    const now = normalizeTimestamp(options.now ?? Date.now(), "now");
    const revokedTokenMaxAgeMs = normalizeMaxAge(
      options.revokedTokenMaxAgeMs ?? this.revokedTokenMaxAgeMs,
    );
    let expired = 0;
    let revoked = 0;

    for (const [id, record] of this.records.entries()) {
      const expiresAt = normalizeTimestamp(record.expiresAt, "expiresAt");
      const revokedAt =
        record.revokedAt === undefined || record.revokedAt === null
          ? null
          : normalizeTimestamp(record.revokedAt, "revokedAt");

      if (expiresAt <= now) {
        this.records.delete(id);
        expired++;
        continue;
      }

      if (revokedAt !== null && now - revokedAt >= revokedTokenMaxAgeMs) {
        this.records.delete(id);
        revoked++;
      }
    }

    const result = {
      expired,
      revoked,
      total: expired + revoked,
      remaining: this.records.size,
    };

    if (result.total > 0) {
      this.onCleanup?.(result);
    }

    return result;
  }

  public startAutoCleanup(intervalMs: number): void {
    if (typeof intervalMs !== "number" || Number.isNaN(intervalMs) || !Number.isFinite(intervalMs) || intervalMs <= 0) {
      throw new Error("TokenFirewall: cleanup interval must be a positive finite number");
    }

    this.stopAutoCleanup();
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, intervalMs);

    if (typeof this.cleanupTimer.unref === "function") {
      this.cleanupTimer.unref();
    }
  }

  public stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

export function createTokenCleanupStore<TMetadata = unknown>(
  options?: TokenCleanupStoreOptions,
): TokenCleanupStore<TMetadata> {
  return new TokenCleanupStore<TMetadata>(options);
}
