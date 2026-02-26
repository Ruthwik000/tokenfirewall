/**
 * Example 4: Custom Provider - Add Your Own LLM
 * 
 * This example shows how to:
 * - Register a custom LLM provider adapter
 * - Set custom pricing
 * - Track usage for self-hosted or new providers
 */

const { 
  createBudgetGuard, 
  patchGlobalFetch, 
  registerAdapter,
  registerPricing,
  getBudgetStatus
} = require("../dist/index.js");

// Step 1: Register custom adapter for your LLM provider
// Example: Ollama (self-hosted)
registerAdapter({
  name: "ollama",
  
  // Detect if response is from your provider
  detect: (response) => {
    return response && 
           typeof response === "object" && 
           response.model && 
           response.prompt_eval_count !== undefined;
  },
  
  // Normalize response to standard format
  normalize: (response) => {
    return {
      provider: "ollama",
      model: response.model,
      inputTokens: response.prompt_eval_count || 0,
      outputTokens: response.eval_count || 0,
      totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
    };
  }
});

// Step 2: Register pricing for your models
// For self-hosted: use $0 but still track usage
registerPricing("ollama", "llama3.2", {
  input: 0.0,   // Free (self-hosted)
  output: 0.0
});

// For paid custom providers: set actual costs
registerPricing("ollama", "custom-model", {
  input: 0.5,   // $0.50 per 1M input tokens
  output: 1.0   // $1.00 per 1M output tokens
});

// Step 3: Set up tracking
createBudgetGuard({
  monthlyLimit: 100,
  mode: "warn"
});

patchGlobalFetch();

// Step 4: Use your custom provider
async function main() {
  console.log("🔥 TokenFirewall - Custom Provider Example\n");
  console.log("=".repeat(60) + "\n");

  try {
    console.log("📞 Calling custom Ollama provider...\n");

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        prompt: "Why is the sky blue?",
        stream: false
      })
    });

    const data = await response.json();
    console.log("✅ Response:", data.response.substring(0, 100) + "...");

    // Check budget status
    const status = getBudgetStatus();
    console.log("\n📊 Budget Status:");
    console.log(`   Spent: $${status.totalSpent.toFixed(4)}`);
    console.log(`   Usage tracked even for free models!`);

  } catch (error) {
    console.log("ℹ️  Make sure Ollama is running: ollama serve");
    console.log("   Or replace with your own custom provider\n");
  }

  console.log("\n" + "=".repeat(60));
}

main();

// 💡 Key Points:
// - Works with ANY LLM provider (self-hosted, new APIs, etc.)
// - detect() identifies your provider's response format
// - normalize() converts to standard { provider, model, inputTokens, outputTokens }
// - Set pricing to $0 for free/self-hosted models
// - Usage is still tracked and logged even at $0 cost

// 🔧 Other Custom Provider Examples:
// 
// Example: Hugging Face Inference API
// registerAdapter({
//   name: "huggingface",
//   detect: (response) => response?.model && response?.usage,
//   normalize: (response) => ({
//     provider: "huggingface",
//     model: response.model,
//     inputTokens: response.usage.prompt_tokens || 0,
//     outputTokens: response.usage.completion_tokens || 0,
//     totalTokens: response.usage.total_tokens || 0
//   })
// });
//
// Example: Azure OpenAI (if different format)
// registerAdapter({
//   name: "azure-openai",
//   detect: (response) => response?.id && response?.object === "chat.completion",
//   normalize: (response) => ({
//     provider: "azure-openai",
//     model: response.model,
//     inputTokens: response.usage.prompt_tokens || 0,
//     outputTokens: response.usage.completion_tokens || 0,
//     totalTokens: response.usage.total_tokens || 0
//   })
// });
