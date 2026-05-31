/**
 * Routing performance regression tests.
 *
 * Run: node tests/routing-performance.test.js
 */

const { createModelRouter } = require("../dist/index.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createFailureContext(originalModel) {
  return {
    error: { status: 429 },
    originalModel,
    requestBody: {
      messages: [{ role: "user", content: "Summarize this document" }]
    },
    provider: "openai",
    retryCount: 0,
    attemptedModels: [originalModel]
  };
}

function measureAverageMs(callback, iterations) {
  const start = process.hrtime.bigint();
  for (let index = 0; index < iterations; index++) {
    callback();
  }
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
  return elapsedMs / iterations;
}

function testRepeatedFallbackDecisionsUseCache() {
  const router = createModelRouter({
    strategy: "fallback",
    fallbackMap: {
      "gpt-4o": ["gpt-4o-mini", "gpt-4.1-mini"]
    },
    maxRetries: 2
  });
  const context = createFailureContext("gpt-4o");

  const firstDecision = router.handleFailure(context);
  assert(firstDecision.retry === true, "first decision should retry");
  assert(firstDecision.nextModel === "gpt-4o-mini", "first fallback should be selected");

  const averageMs = measureAverageMs(() => {
    const decision = router.handleFailure(context);
    assert(decision.nextModel === "gpt-4o-mini", "cached decision should remain stable");
  }, 5000);

  const stats = router.getRoutingCacheStats();
  assert(stats.size === 1, "router should cache one repeated decision");
  assert(stats.hits >= 5000, "repeated decisions should hit the cache");
  assert(stats.misses === 1, "only the initial decision should miss");
  assert(averageMs < 10, `average routing overhead should stay below 10ms, got ${averageMs}ms`);

  console.log(`Repeated fallback routing average: ${averageMs.toFixed(4)}ms`);
}

function testDecisionCacheSizeIsBounded() {
  const router = createModelRouter({
    strategy: "fallback",
    fallbackMap: {
      "gpt-a": ["gpt-a-mini"],
      "gpt-b": ["gpt-b-mini"],
      "gpt-c": ["gpt-c-mini"]
    },
    maxRetries: 2,
    decisionCacheSize: 2
  });

  router.handleFailure(createFailureContext("gpt-a"));
  router.handleFailure(createFailureContext("gpt-b"));
  router.handleFailure(createFailureContext("gpt-c"));

  const stats = router.getRoutingCacheStats();
  assert(stats.size === 2, "cache should evict the oldest decision when full");
  assert(stats.maxSize === 2, "cache stats should expose the configured bound");

  router.clearRoutingDecisionCache();
  const clearedStats = router.getRoutingCacheStats();
  assert(clearedStats.size === 0, "clear should remove cached decisions");
  assert(clearedStats.hits === 0, "clear should reset hit counter");
  assert(clearedStats.misses === 0, "clear should reset miss counter");
}

function run() {
  testRepeatedFallbackDecisionsUseCache();
  testDecisionCacheSizeIsBounded();
  console.log("Routing performance tests passed");
}

run();
