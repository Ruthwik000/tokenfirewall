import { BudgetGuardOptions, BudgetStatus } from "./types";

/**
 * Budget manager - encapsulates all budget tracking state
 */
export class BudgetManager {
  private totalSpent: number = 0;
  private limit: number;
  private mode: "warn" | "block";
  private trackingLock: Promise<void> = Promise.resolve();

  constructor(options: BudgetGuardOptions) {
    // Validate monthly limit
    if (typeof options.monthlyLimit !== 'number' || isNaN(options.monthlyLimit) || !isFinite(options.monthlyLimit)) {
      throw new Error('TokenFirewall: monthlyLimit must be a valid number');
    }

    if (options.monthlyLimit <= 0) {
      throw new Error('TokenFirewall: monthlyLimit must be greater than 0');
    }

    // Validate mode
    const mode = options.mode ?? "block";
    if (mode !== "warn" && mode !== "block") {
      throw new Error('TokenFirewall: mode must be either "warn" or "block"');
    }

    this.limit = options.monthlyLimit;
    this.mode = mode;
  }

  /**
   * Track a new cost and enforce budget limits
   * Uses locking to prevent race conditions
   * @throws Error if budget exceeded in block mode
   */
  public async track(cost: number): Promise<void> {
    // Validate cost parameter
    if (typeof cost !== 'number' || isNaN(cost) || !isFinite(cost)) {
      throw new Error('TokenFirewall: Cost must be a valid number');
    }

    if (cost < 0) {
      throw new Error('TokenFirewall: Cost cannot be negative');
    }

    // Wait for any pending tracking to complete
    await this.trackingLock;

    // Create new lock for this tracking operation
    let releaseLock: () => void;
    this.trackingLock = new Promise((resolve) => {
      releaseLock = resolve;
    });

    try {
      // Check if this would exceed budget BEFORE adding
      const projectedTotal = this.totalSpent + cost;

      if (projectedTotal > this.limit) {
        const message = `TokenFirewall: Budget exceeded! Would spend $${projectedTotal.toFixed(4)} of $${this.limit.toFixed(2)} limit`;

        if (this.mode === "block") {
          // In block mode, DON'T track the cost and throw error
          throw new Error(message);
        } else {
          console.warn(message);
        }
      }

      // Only commit the cost if we didn't throw
      this.totalSpent += cost;
    } finally {
      // Release the lock
      releaseLock!();
    }
  }

  /**
   * Get current budget status
   */
  public getStatus(): BudgetStatus {
    const remaining = Math.max(0, this.limit - this.totalSpent);
    const percentageUsed = (this.totalSpent / this.limit) * 100;

    return {
      totalSpent: this.totalSpent,
      limit: this.limit,
      remaining,
      percentageUsed,
    };
  }

  /**
   * Reset budget tracking (useful for monthly resets)
   */
  public reset(): void {
    this.totalSpent = 0;
  }

  /**
   * Export budget state for persistence
   */
  public exportState(): { totalSpent: number; limit: number; mode: string } {
    return {
      totalSpent: this.totalSpent,
      limit: this.limit,
      mode: this.mode,
    };
  }

  /**
   * Import budget state from persistence
   * Validates state before importing
   */
  public importState(state: { totalSpent: number }): void {
    // Validate totalSpent
    if (typeof state.totalSpent !== 'number' || isNaN(state.totalSpent) || !isFinite(state.totalSpent)) {
      throw new Error('TokenFirewall: Invalid budget state - totalSpent must be a valid number');
    }

    if (state.totalSpent < 0) {
      throw new Error('TokenFirewall: Invalid budget state - totalSpent cannot be negative');
    }

    // Allow importing state that exceeds limit (user may have increased limit)
    // Just warn if it's suspicious
    if (state.totalSpent > this.limit * 10) {
      console.warn(`TokenFirewall: Imported totalSpent (${state.totalSpent}) is much larger than current limit (${this.limit})`);
    }

    this.totalSpent = state.totalSpent;
  }
}
