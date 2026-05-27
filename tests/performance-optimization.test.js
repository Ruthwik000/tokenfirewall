/**
 * Smart routing performance optimization tests.
 *
 * Run: node tests/performance-optimization.test.js
 */

const { createModelRouter, disableModelRouter } = require("../dist/index.js");

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createContext(prompt = "Review this function for bugs") {
  return {
    error: { status: 429 },
    originalModel: "gpt-4o",
    requestBody: {
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    },
    provider: "openai",
    retryCount: 0,
    attemptedModels: ["gpt-4o"],
  };
}

async function run() {
  console.clear();
  log("\nSmart Routing Performance Optimization Tests\n", "cyan");

  const router = createModelRouter({
    strategy: "fallback",
    fallbackMap: {
      "gpt-4o": ["gpt-4o-mini", "claude-3-5-sonnet-20241022"],
    },
    maxRetries: 2,
    routingCacheTtlMs: 5 * 60 * 1000,
    maxRoutingCacheSize: 64,
  });

  const firstDecision = router.handleFailure(createContext());
  assert(firstDecision.retry === true, "first routing decision should retry");
  assert(firstDecision.nextModel === "gpt-4o-mini", "first fallback should be gpt-4o-mini");
  assert(router.getRoutingCacheSize() === 1, "first decision should populate the cache");

  firstDecision.nextModel = "mutated-model";
  const cachedDecision = router.handleFailure(createContext());
  assert(
    cachedDecision.nextModel === "gpt-4o-mini",
    "cached decisions should be returned as defensive copies"
  );

  router.handleFailure(createContext("Summarize this invoice"));
  assert(router.getRoutingCacheSize() === 2, "different prompts should get distinct cache entries");

  const iterations = 25000;
  const context = createContext();
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    router.handleFailure(context);
  }
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
  const averageMs = elapsedMs / iterations;

  assert(
    averageMs < 10,
    `routing overhead averaged ${averageMs.toFixed(4)}ms, expected under 10ms`
  );

  router.clearRoutingCache();
  assert(router.getRoutingCacheSize() === 0, "clearRoutingCache should empty cached decisions");

  disableModelRouter();

  log("  ✓ decision cache stores repeated routing results", "green");
  log("  ✓ cached decisions are defensive copies", "green");
  log("  ✓ repeated routing overhead stays below 10ms", "green");
  log(`\nAverage routing overhead: ${averageMs.toFixed(4)}ms over ${iterations} iterations\n`, "cyan");
}

run().catch(error => {
  disableModelRouter();
  log(`\nPerformance optimization test failed: ${error.message}`, "red");
  process.exit(1);
});
