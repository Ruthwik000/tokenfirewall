/**
 * Example 2: Multiple Providers - Unified Budget Tracking
 * 
 * This example shows how to:
 * - Track costs across multiple LLM providers
 * - Use a single budget for all providers
 * - Compare costs between providers
 */

const { createBudgetGuard, patchGlobalFetch, getBudgetStatus } = require("../dist/index.js");

// Set up unified budget for all providers
createBudgetGuard({
  monthlyLimit: 50,
  mode: "warn"  // Just warn, don't block
});

patchGlobalFetch();

async function callOpenAI() {
  console.log("📞 Calling OpenAI (GPT-4o-mini)...");
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say hello in 5 words" }]
    })
  });

  const data = await response.json();
  console.log("   Response:", data.choices[0].message.content);
}

async function callAnthropic() {
  console.log("\n📞 Calling Anthropic (Claude 3.5 Haiku)...");
  
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 50,
      messages: [{ role: "user", content: "Say hello in 5 words" }]
    })
  });

  const data = await response.json();
  console.log("   Response:", data.content[0].text);
}

async function callGemini() {
  console.log("\n📞 Calling Google Gemini (1.5 Flash)...");
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Say hello in 5 words" }] }]
      })
    }
  );

  const data = await response.json();
  console.log("   Response:", data.candidates[0].content.parts[0].text);
}

async function callGrok() {
  console.log("\n📞 Calling Grok (via X.AI)...");
  
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "grok-beta",
      messages: [{ role: "user", content: "Say hello in 5 words" }]
    })
  });

  const data = await response.json();
  console.log("   Response:", data.choices[0].message.content);
}

async function main() {
  console.log("🔥 TokenFirewall - Multiple Providers Example\n");
  console.log("=".repeat(60) + "\n");

  try {
    // Call different providers - all tracked under one budget
    if (process.env.OPENAI_API_KEY) await callOpenAI();
    if (process.env.ANTHROPIC_API_KEY) await callAnthropic();
    if (process.env.GEMINI_API_KEY) await callGemini();
    if (process.env.XAI_API_KEY) await callGrok();

    // Show unified budget status
    console.log("\n" + "=".repeat(60));
    console.log("\n📊 Unified Budget Status (All Providers):");
    const status = getBudgetStatus();
    console.log(`   Total Spent: $${status.totalSpent.toFixed(4)}`);
    console.log(`   Remaining: $${status.remaining.toFixed(2)}`);
    console.log(`   Usage: ${status.percentageUsed.toFixed(2)}%`);
    console.log("\n" + "=".repeat(60));

  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

main();

// 💡 Key Points:
// - One budget tracks all providers automatically
// - No need to configure each provider separately
// - Costs are calculated using provider-specific pricing
// - Works with OpenAI, Anthropic, Gemini, Grok, Kimi, and custom providers
