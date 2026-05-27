/**
 * Router type definition smoke tests.
 *
 * Run: node tests/router-types.test.js
 */

const { createModelRouter, disableModelRouter } = require("../dist/index.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  const smartRouter = createModelRouter({
    strategy: "smart",
    smart: {
      defaultModel: "gpt-4o-mini",
      confidenceThreshold: 0.75,
      modelOverrides: {
        code_generation: "claude-3-5-sonnet-20241022",
        math_reasoning: "o1-mini",
      },
      cacheDetections: true,
      enableAnalytics: true,
    },
  });

  assert(smartRouter.getStrategy() === "smart", "smart strategy should be accepted");
  disableModelRouter();

  const fallbackRouter = createModelRouter({
    strategy: "fallback",
    fallbackMap: {
      "gpt-4o": ["gpt-4o-mini"],
    },
  });

  assert(fallbackRouter.getStrategy() === "fallback", "existing strategies should still work");
  disableModelRouter();

  console.log("Router type definition smoke tests passed.");
} catch (error) {
  disableModelRouter();
  console.error("Router type definition smoke tests failed:", error.message);
  process.exit(1);
}
