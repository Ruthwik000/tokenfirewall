import { NormalizedUsage, CostBreakdown } from "./core/types";
import { RouterEvent } from "./router/types";

/**
 * Structured logger for LLM usage and costs
 */
export class Logger {
  /**
   * Log usage and cost information
   */
  public logUsage(usage: NormalizedUsage, cost: CostBreakdown): void {
    const timestamp = new Date().toISOString();
    
    console.log(
      JSON.stringify({
        timestamp,
        provider: usage.provider,
        model: usage.model,
        tokens: {
          input: usage.inputTokens,
          output: usage.outputTokens,
          total: usage.totalTokens,
        },
        cost: {
          input: cost.inputCost.toFixed(6),
          output: cost.outputCost.toFixed(6),
          total: cost.totalCost.toFixed(6),
        },
      })
    );
  }

  /**
   * Log router event (model switching)
   */
  public logRouterEvent(event: RouterEvent): void {
    console.log(
      `[TOKENFIREWALL ROUTER]\n` +
      `Original: ${event.originalModel}\n` +
      `Switched: ${event.nextModel}\n` +
      `Reason: ${event.reason}\n` +
      `Attempt: ${event.attempt}/${event.maxRetries}`
    );
  }
}

export const logger = new Logger();
