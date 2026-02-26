import { adapterRegistry } from "../registry";
import { calculateCost } from "../core/costEngine";
import { logger } from "../logger";
import { BudgetManager } from "../core/budgetManager";

let isPatched = false;
let budgetManager: BudgetManager | null = null;
const originalFetch = globalThis.fetch;

/**
 * Set the budget manager for fetch interception
 */
export function setBudgetManager(manager: BudgetManager | null): void {
  budgetManager = manager;
}

/**
 * Patch global fetch to intercept LLM API calls
 */
export function patchGlobalFetch(): void {
  if (isPatched) {
    return;
  }

  const interceptedFetch = async function (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ): Promise<Response> {
    const response = await originalFetch(input, init);

    // Try to clone response for tracking (may fail for some responses)
    let clonedResponse;
    try {
      clonedResponse = response.clone();
    } catch (error) {
      // If cloning fails, just return original response without tracking
      console.warn('TokenFirewall: Failed to clone response for tracking');
      return response;
    }

    // Process response and track budget BEFORE returning
    try {
      const responseData = await clonedResponse.json();
      
      // Try to process with adapter registry
      const normalizedUsage = adapterRegistry.process(responseData);

      if (normalizedUsage) {
        // Calculate cost
        const cost = calculateCost(normalizedUsage);

        // Track budget if manager exists - MUST await to enforce blocking
        if (budgetManager) {
          await budgetManager.track(cost.totalCost);
        }

        // Log usage
        logger.logUsage(normalizedUsage, cost);
      }
    } catch (error) {
      // If it's a budget error, re-throw it
      if (error instanceof Error && error.message.includes('TokenFirewall: Budget exceeded')) {
        throw error;
      }
      // Otherwise, not JSON or not an LLM response - ignore silently
    }

    return response;
  };

  globalThis.fetch = interceptedFetch as typeof fetch;
  isPatched = true;
}

/**
 * Restore original fetch
 */
export function unpatchGlobalFetch(): void {
  if (isPatched) {
    globalThis.fetch = originalFetch;
    isPatched = false;
  }
}
