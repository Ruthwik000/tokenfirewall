import { NormalizedUsage, CostBreakdown } from "./types";
import { pricingRegistry } from "./pricingRegistry";

/**
 * Pure function to calculate cost from normalized usage
 * Pricing is per 1M tokens
 */
export function calculateCost(usage: NormalizedUsage): CostBreakdown {
  try {
    const pricing = pricingRegistry.getPricing(usage.provider, usage.model);

    const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
    const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      inputCost,
      outputCost,
      totalCost,
    };
  } catch (error) {
    // If pricing not found, log warning and return zero cost
    console.warn(`TokenFirewall: ${error instanceof Error ? error.message : 'Unknown pricing error'} - tracking with $0 cost`);
    
    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
    };
  }
}
