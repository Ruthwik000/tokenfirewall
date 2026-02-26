/**
 * Example 5: Model Discovery - Find Available Models
 * 
 * This example shows how to:
 * - List available models from a provider
 * - See context window limits
 * - Check budget usage percentage
 * - Choose the right model for your needs
 */

const { 
  listModels,
  createBudgetGuard,
  patchGlobalFetch,
  getBudgetStatus
} = require("../dist/index.js");

async function discoverModels() {
  console.log("🔥 TokenFirewall - Model Discovery Example\n");
  console.log("=".repeat(60) + "\n");

  // Set up budget tracking (optional for discovery)
  createBudgetGuard({
    monthlyLimit: 100,
    mode: "warn"
  });
  patchGlobalFetch();

  // Example 1: Discover OpenAI models
  if (process.env.OPENAI_API_KEY) {
    console.log("🔍 Discovering OpenAI models...\n");

    const models = await listModels({
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      includeBudgetUsage: true  // Include current budget usage %
    });

    // Filter to GPT models only
    const gptModels = models
      .filter(m => m.model.includes("gpt"))
      .slice(0, 5);

    gptModels.forEach(model => {
      console.log(`📦 ${model.model}`);
      if (model.contextLimit) {
        console.log(`   Context: ${model.contextLimit.toLocaleString()} tokens`);
      }
      if (model.budgetUsagePercentage !== undefined) {
        console.log(`   Budget Used: ${model.budgetUsagePercentage.toFixed(2)}%`);
      }
      console.log();
    });
  }

  // Example 2: Discover Gemini models
  if (process.env.GEMINI_API_KEY) {
    console.log("=".repeat(60) + "\n");
    console.log("🔍 Discovering Gemini models...\n");

    const models = await listModels({
      provider: "gemini",
      apiKey: process.env.GEMINI_API_KEY
    });

    models.slice(0, 5).forEach(model => {
      console.log(`📦 ${model.model}`);
      if (model.contextLimit) {
        console.log(`   Context: ${model.contextLimit.toLocaleString()} tokens`);
      }
      console.log();
    });
  }

  // Example 3: Compare context limits across providers
  console.log("=".repeat(60) + "\n");
  console.log("📊 Context Limit Comparison:\n");

  const providers = [
    { name: "openai", key: process.env.OPENAI_API_KEY },
    { name: "gemini", key: process.env.GEMINI_API_KEY },
    { name: "grok", key: process.env.XAI_API_KEY }
  ];

  for (const provider of providers) {
    if (!provider.key) continue;

    try {
      const models = await listModels({
        provider: provider.name,
        apiKey: provider.key
      });

      const modelsWithContext = models.filter(m => m.contextLimit);
      
      if (modelsWithContext.length > 0) {
        const maxContext = Math.max(...modelsWithContext.map(m => m.contextLimit));
        const maxModel = modelsWithContext.find(m => m.contextLimit === maxContext);
        console.log(`${provider.name.toUpperCase()}:`);
        console.log(`   Largest: ${maxModel.model}`);
        console.log(`   Context: ${maxContext.toLocaleString()} tokens\n`);
      }
    } catch (error) {
      console.log(`${provider.name.toUpperCase()}: Failed to fetch models\n`);
    }
  }

  console.log("=".repeat(60));
}

discoverModels();

// 💡 Key Points:
// - listModels() fetches real-time model availability
// - Context limits help you choose the right model for your task
// - includeBudgetUsage shows how much of your budget is used
// - Works with OpenAI, Anthropic, Gemini, Grok, and Kimi
// - Anthropic returns a static list (no API endpoint available)

// 🎯 Use Cases:
// - Choose models based on context window needs
// - Find the most cost-effective model
// - Check which models are available in your region
// - Monitor budget usage while selecting models
