/**
 * Example 6: Intelligent Model Router
 * 
 * Demonstrates automatic retry and model switching on failures
 */

const {
  createBudgetGuard,
  createModelRouter,
  patchGlobalFetch,
  getBudgetStatus
} = require("../dist/index.js");

async function main() {
  console.log("=== TokenFirewall: Intelligent Model Router ===\n");

  // 1. Create budget guard
  const budgetGuard = createBudgetGuard({
    monthlyLimit: 1.0, // $1.00 limit
    mode: "block"
  });

  // 2. Create model router with fallback strategy
  const router = createModelRouter({
    strategy: "fallback",
    fallbackMap: {
      "gpt-4o": ["gpt-4o-mini", "gpt-3.5-turbo"],
      "claude-3-5-sonnet-20241022": ["claude-3-5-haiku-20241022"],
      "gemini-2.0-flash-exp": ["gemini-1.5-flash"]
    },
    maxRetries: 2
  });

  console.log("✓ Router configured with fallback strategy");
  console.log("✓ Max retries: 2\n");

  // 3. Patch global fetch
  patchGlobalFetch();

  // 4. Example: Simulate API call that might fail
  console.log("--- Example 1: Fallback Strategy ---");
  console.log("If gpt-4o fails, router will try:");
  console.log("  1. gpt-4o-mini");
  console.log("  2. gpt-3.5-turbo\n");

  // 5. Example: Context-based routing
  console.log("--- Example 2: Context Strategy ---");
  
  const contextRouter = createModelRouter({
    strategy: "context",
    maxRetries: 1
  });

  console.log("✓ Context strategy: Upgrades to larger context on overflow");
  console.log("  Example: gpt-4o-mini → gpt-4o (if context exceeded)\n");

  // 6. Example: Cost-based routing
  console.log("--- Example 3: Cost Strategy ---");
  
  const costRouter = createModelRouter({
    strategy: "cost",
    maxRetries: 1
  });

  console.log("✓ Cost strategy: Switches to cheaper model on failure");
  console.log("  Example: gpt-4o → gpt-4o-mini (if rate limited)\n");

  // 7. Show budget status
  const status = getBudgetStatus();
  console.log("--- Budget Status ---");
  console.log(`Spent: $${status.totalSpent.toFixed(4)}`);
  console.log(`Limit: $${status.limit.toFixed(2)}`);
  console.log(`Remaining: $${status.remaining.toFixed(4)}`);
  console.log(`Usage: ${status.percentageUsed.toFixed(1)}%`);

  console.log("\n✓ Router is now active and will handle failures automatically");
  console.log("✓ All LLM API calls will be retried with fallback models");
}

main().catch(console.error);
