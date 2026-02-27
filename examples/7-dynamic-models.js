/**
 * Example 7: Dynamic Model Registration
 * 
 * Demonstrates how to dynamically register models for use with the router
 * This is useful when you want the router to use models discovered from your API key
 */

const {
  createBudgetGuard,
  createModelRouter,
  registerModels,
  registerContextLimit,
  registerPricing,
  patchGlobalFetch
} = require("../dist/index.js");

async function main() {
  console.log("=== TokenFirewall: Dynamic Model Registration ===\n");

  // 1. Create budget guard
  createBudgetGuard({
    monthlyLimit: 10.0,
    mode: "block"
  });
  console.log("✓ Budget guard created\n");

  // 2. Register models dynamically (e.g., from API discovery)
  console.log("--- Registering Custom Models ---");
  
  // Option A: Register individual models
  registerContextLimit("my-provider", "my-model-large", 128000);
  registerPricing("my-provider", "my-model-large", {
    input: 5.0,   // $5 per 1M input tokens
    output: 15.0  // $15 per 1M output tokens
  });
  console.log("✓ Registered: my-model-large");

  registerContextLimit("my-provider", "my-model-small", 32000);
  registerPricing("my-provider", "my-model-small", {
    input: 1.0,   // $1 per 1M input tokens
    output: 3.0   // $3 per 1M output tokens
  });
  console.log("✓ Registered: my-model-small\n");

  // Option B: Register multiple models at once
  console.log("--- Bulk Registration ---");
  
  registerModels("gemini", [
    {
      name: "gemini-2.5-flash",
      contextLimit: 1000000,
      pricing: { input: 0.075, output: 0.30 }
    },
    {
      name: "gemini-2.5-pro",
      contextLimit: 2000000,
      pricing: { input: 1.25, output: 5.0 }
    },
    {
      name: "gemini-2.0-flash",
      contextLimit: 1000000,
      pricing: { input: 0.10, output: 0.40 }
    }
  ]);
  console.log("✓ Registered 3 Gemini models with pricing and context limits\n");

  // 3. Create router with cost strategy
  // Router will now use the dynamically registered models
  createModelRouter({
    strategy: "cost",
    maxRetries: 2
  });
  console.log("✓ Router created with cost strategy");
  console.log("  Router will use dynamically registered models\n");

  // 4. Example: Simulating model discovery from API
  console.log("--- Simulating API Model Discovery ---");
  
  // In a real scenario, you would:
  // 1. Call the provider's API to list available models
  // 2. Extract model names, context limits, and pricing
  // 3. Register them dynamically
  
  const discoveredModels = [
    { name: "gpt-4o", contextLimit: 128000, pricing: { input: 2.5, output: 10.0 } },
    { name: "gpt-4o-mini", contextLimit: 128000, pricing: { input: 0.15, output: 0.60 } },
    { name: "gpt-3.5-turbo", contextLimit: 16385, pricing: { input: 0.50, output: 1.50 } }
  ];
  
  registerModels("openai", discoveredModels);
  console.log(`✓ Registered ${discoveredModels.length} OpenAI models from discovery\n`);

  // 5. Patch global fetch
  patchGlobalFetch();
  console.log("✓ Global fetch patched\n");

  // 6. Show benefits
  console.log("--- Benefits of Dynamic Registration ---");
  console.log("✓ Router uses only models available to your API key");
  console.log("✓ Automatic fallback to cheaper models");
  console.log("✓ Context-aware routing with actual limits");
  console.log("✓ No hardcoded model lists");
  console.log("✓ Works with custom providers");
  console.log("✓ Easy to update when new models are released\n");

  // 7. Example usage pattern
  console.log("--- Recommended Usage Pattern ---");
  console.log(`
// 1. Discover models from provider API
const models = await discoverModels(apiKey);

// 2. Register them dynamically
registerModels("provider-name", models.map(m => ({
  name: m.id,
  contextLimit: m.context_window,
  pricing: {
    input: m.input_price_per_1m,
    output: m.output_price_per_1m
  }
})));

// 3. Create router - it will use discovered models
createModelRouter({
  strategy: "cost",  // or "context" or "fallback"
  maxRetries: 2
});

// 4. Make API calls - router handles everything
const response = await fetch(apiUrl, requestOptions);
  `);

  console.log("\n✓ Dynamic model registration complete!");
  console.log("✓ Router is ready to use your specific models\n");
}

main().catch(console.error);
