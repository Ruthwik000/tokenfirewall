/**
 * Example 1: Basic Usage - Budget Protection
 * 
 * This example shows the core functionality:
 * - Setting up a monthly budget
 * - Automatic cost tracking
 * - Budget enforcement (block mode)
 */

const { createBudgetGuard, patchGlobalFetch, getBudgetStatus } = require("../dist/index.js");

// Step 1: Create a budget guard with a monthly limit
createBudgetGuard({
  monthlyLimit: 100,  // $100 USD per month
  mode: "block"       // Throw error when budget exceeded
});

// Step 2: Patch global fetch to intercept all LLM API calls
patchGlobalFetch();

// Step 3: Use any LLM API normally - tokenfirewall tracks everything automatically
async function main() {
  console.log("🔥 TokenFirewall - Basic Usage Example\n");

  try {
    // Make an OpenAI API call
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: "What is the capital of France?" }
        ]
      })
    });

    const data = await response.json();
    console.log("✅ Response:", data.choices[0].message.content);

    // Check budget status
    const status = getBudgetStatus();
    console.log("\n📊 Budget Status:");
    console.log(`   Spent: $${status.totalSpent.toFixed(4)}`);
    console.log(`   Remaining: $${status.remaining.toFixed(2)}`);
    console.log(`   Usage: ${status.percentageUsed.toFixed(2)}%`);

  } catch (error) {
    if (error.message.includes("TokenFirewall: Budget exceeded")) {
      console.error("❌ Budget limit reached! Request blocked.");
    } else {
      console.error("❌ Error:", error.message);
    }
  }
}

main();

// 💡 Key Points:
// - tokenfirewall automatically logs usage to console
// - Costs are calculated based on actual token usage
// - In "block" mode, requests are rejected when budget is exceeded
// - In "warn" mode (alternative), requests proceed but warnings are logged
