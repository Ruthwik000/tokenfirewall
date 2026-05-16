/**
 * Example 8: Cross-Provider Fallback
 *
 * Demonstrates automatic fallback across different LLM providers.
 * If GPT-4o fails, automatically retries with Claude, then Gemini —
 * all transparent to the caller with a unified budget.
 *
 * Prerequisites:
 *   npm install tokenfirewall
 *   Set environment variables: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY
 */

const {
  createBudgetGuard,
  createModelRouter,
  registerApiKeys,
  patchGlobalFetch,
  getBudgetStatus,
  isCrossProviderEnabled,
} = require("tokenfirewall");

// 1. Register API keys for all the providers you want to fallback between
registerApiKeys({
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
});

// 2. Create budget guard — costs are tracked across ALL providers
createBudgetGuard({
  monthlyLimit: 50, // $50 USD total budget
  mode: "block",
});

// 3. Create model router with cross-provider fallback chains
createModelRouter({
  strategy: "fallback",
  fallbackMap: {
    // If GPT-4o fails → try Claude 3.5 Sonnet → then Gemini 2.5 Pro
    "gpt-4o": ["claude-3-5-sonnet-20241022", "gemini-2.5-pro"],
    // If Claude fails → try GPT-4o-mini → then Gemini
    "claude-3-5-sonnet-20241022": ["gpt-4o-mini", "gemini-2.5-pro"],
    // If Gemini fails → try GPT-4o-mini → then Claude Haiku
    "gemini-2.5-pro": ["gpt-4o-mini", "claude-3-5-haiku-20241022"],
  },
  maxRetries: 2,
  enableCrossProvider: true, // <-- enable cross-provider fallback
});

// 4. Patch global fetch
patchGlobalFetch();

console.log("Cross-provider enabled:", isCrossProviderEnabled());

// 5. Make a normal API call — fallback is fully transparent
async function main() {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: "What is the capital of France?" }],
        max_tokens: 100,
      }),
    });

    const data = await response.json();
    console.log("\nResponse:", data.choices?.[0]?.message?.content);

    // Budget is tracked across all providers
    const status = getBudgetStatus();
    console.log("\nBudget status:", status);

    // If GPT-4o failed, the response was automatically:
    //   1. Transformed to Claude/Gemini format
    //   2. Sent to the fallback provider
    //   3. Response transformed back to OpenAI format
    //   4. Returned as if GPT-4o answered — fully transparent!
  } catch (error) {
    console.error("All providers failed:", error.message);
  }
}

main();
