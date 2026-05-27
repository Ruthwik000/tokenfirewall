/**
 * Smart router configuration validator tests.
 *
 * Run: node tests/smart-router-validator.test.js
 */

const {
  assertValidSmartRouterOptions,
  validateSmartRouterOptions,
} = require("../dist/index.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  const valid = validateSmartRouterOptions({
    defaultModel: "gpt-4o-mini",
    confidenceThreshold: 0.7,
    cacheDetections: true,
    detectionCacheTtlMs: 60_000,
    enableAnalytics: false,
    modelOverrides: {
      code_generation: "claude-3-5-sonnet-20241022",
    },
    taskClassification: {
      support_triage: {
        keywords: ["support", "ticket"],
        patterns: [/urgent/i, "escalate"],
        model: "gpt-4o-mini",
        confidenceThreshold: 0.55,
      },
    },
  });

  assert(valid.valid, "valid smart router config should pass");
  assert(valid.errors.length === 0, "valid config should not return errors");

  const invalid = validateSmartRouterOptions({
    defaultModel: "",
    confidenceThreshold: 1.2,
    cacheDetections: "yes",
    detectionCacheTtlMs: 0,
    modelOverrides: {
      code_generation: "",
    },
    taskClassification: {
      "": {
        keywords: ["ok"],
        patterns: [42],
        model: "",
        confidenceThreshold: -0.1,
      },
    },
  });

  assert(!invalid.valid, "invalid smart router config should fail");
  assert(invalid.errors.some((error) => error.includes("defaultModel")), "should flag defaultModel");
  assert(invalid.errors.some((error) => error.includes("confidenceThreshold")), "should flag threshold");
  assert(invalid.errors.some((error) => error.includes("cacheDetections")), "should flag boolean fields");
  assert(invalid.errors.some((error) => error.includes("detectionCacheTtlMs")), "should flag cache TTL");
  assert(invalid.errors.some((error) => error.includes("modelOverrides.code_generation")), "should flag model override values");
  assert(invalid.errors.some((error) => error.includes("taskClassification cannot contain an empty task type")), "should flag empty task type");
  assert(invalid.errors.some((error) => error.includes(".model")), "should flag task model");
  assert(invalid.errors.some((error) => error.includes(".patterns")), "should flag invalid patterns");

  let threw = false;
  try {
    assertValidSmartRouterOptions({
      confidenceThreshold: Number.NaN,
    });
  } catch (error) {
    threw = error.message.includes("TokenFirewall Smart Router:");
  }
  assert(threw, "assertValidSmartRouterOptions should throw a helpful error");

  console.log("Smart router validator tests passed.");
} catch (error) {
  console.error("Smart router validator tests failed:", error.message);
  process.exit(1);
}
