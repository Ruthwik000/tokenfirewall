/**
 * Smart router tests.
 *
 * Run after building TypeScript:
 *   npm run build && node tests/smart-router.test.js
 */

const assert = require("assert");
const { createModelRouter, disableModelRouter } = require("../dist/index.js");

function failureContext(requestBody, overrides = {}) {
  return {
    error: { status: 429 },
    originalModel: "gpt-4o",
    requestBody,
    provider: "openai",
    retryCount: 0,
    attemptedModels: ["gpt-4o"],
    ...overrides
  };
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  } finally {
    disableModelRouter();
  }
}

test("smart strategy routes code tasks to the classifier-selected model", () => {
  const router = createModelRouter({
    strategy: "smart",
    enableCrossProvider: true,
    maxRetries: 1
  });

  const decision = router.handleFailure(
    failureContext({
      messages: [
        {
          role: "user",
          content: "Write code for a TypeScript rate limiter"
        }
      ]
    })
  );

  assert.strictEqual(decision.retry, true);
  assert.strictEqual(decision.nextModel, "claude-3-5-sonnet-20241022");
  assert.match(decision.reason, /Code generation/);
});

test("smart strategy blocks cross-provider routing unless enabled", () => {
  const router = createModelRouter({
    strategy: "smart",
    maxRetries: 1
  });

  const decision = router.handleFailure(
    failureContext({
      messages: [
        {
          role: "user",
          content: "Implement a JavaScript helper function"
        }
      ]
    })
  );

  assert.strictEqual(decision.retry, false);
  assert.match(decision.reason, /cross-provider routing is disabled/);
});

test("smart strategy uses default model when confidence is below threshold", () => {
  const router = createModelRouter({
    strategy: "smart",
    confidenceThreshold: 0.99,
    defaultModel: "gpt-4o-mini",
    maxRetries: 1
  });

  const decision = router.handleFailure(
    failureContext({
      messages: [
        {
          role: "user",
          content: "This message has no strong routing signal"
        }
      ]
    })
  );

  assert.strictEqual(decision.retry, true);
  assert.strictEqual(decision.nextModel, "gpt-4o-mini");
});

test("smart strategy validates confidence threshold", () => {
  assert.throws(
    () =>
      createModelRouter({
        strategy: "smart",
        confidenceThreshold: 2
      }),
    /confidenceThreshold must be between 0 and 1/
  );
});

test("smart strategy supports custom task rules and model overrides", () => {
  const router = createModelRouter({
    strategy: "smart",
    enableCrossProvider: true,
    taskClassification: {
      sql_generation: {
        model: "gpt-4o",
        reason: "SQL task detected",
        keywords: ["write sql"],
        priority: 20
      }
    },
    modelOverrides: {
      sql_generation: "claude-3-5-sonnet-20241022"
    },
    maxRetries: 1
  });

  const decision = router.handleFailure(
    failureContext({
      messages: [
        {
          role: "user",
          content: "Write SQL to aggregate monthly revenue by customer"
        }
      ]
    })
  );

  assert.strictEqual(decision.retry, true);
  assert.strictEqual(decision.nextModel, "claude-3-5-sonnet-20241022");
  assert.match(decision.reason, /SQL task detected/);
});

console.log("smart router tests passed");
