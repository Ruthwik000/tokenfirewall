const assert = require("assert");
const { createModelRouter, disableModelRouter } = require("../dist/index.js");

function rateLimitError() {
  return {
    status: 429,
    response: { data: { error: { message: "rate limit exceeded" } } }
  };
}

function route(router, requestBody, attemptedModels = ["gpt-4o-mini"]) {
  return router.handleFailure({
    error: rateLimitError(),
    originalModel: "gpt-4o-mini",
    requestBody,
    provider: "openai",
    retryCount: 0,
    attemptedModels
  });
}

try {
  const router = createModelRouter({
    strategy: "smart",
    maxRetries: 2,
    smartRouting: {
      confidenceThreshold: 0.3,
      taskModelMap: {
        code: "gpt-4.1",
        math: "o1-mini"
      },
      fallbackModels: ["gpt-4.1-mini"]
    }
  });

  const codeDecision = route(router, {
    messages: [
      {
        role: "user",
        content: "Please debug this TypeScript function bug and add a unit test."
      }
    ]
  });
  assert.equal(codeDecision.retry, true);
  assert.equal(codeDecision.nextModel, "gpt-4.1");
  assert.match(codeDecision.reason, /Smart routing selected code model/);

  const mathDecision = route(router, {
    prompt: "Solve this probability equation and explain the statistics."
  });
  assert.equal(mathDecision.retry, true);
  assert.equal(mathDecision.nextModel, "o1-mini");

  const fallbackRouter = createModelRouter({
    strategy: "smart",
    maxRetries: 1,
    smartRouting: {
      confidenceThreshold: 0.9,
      fallbackModels: ["gpt-4.1-mini"]
    }
  });
  const fallbackDecision = route(fallbackRouter, {
    messages: [{ role: "user", content: "Hello there." }]
  });
  assert.equal(fallbackDecision.retry, true);
  assert.equal(fallbackDecision.nextModel, "gpt-4.1-mini");
  assert.match(fallbackDecision.reason, /fallback model/);

  const attemptedDecision = route(router, {
    input: "Refactor this code and debug the failing function."
  }, ["gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini"]);
  assert.equal(attemptedDecision.retry, false);
  assert.match(attemptedDecision.reason, /could not find an eligible model/);

  assert.throws(() => {
    createModelRouter({
      strategy: "smart",
      smartRouting: { confidenceThreshold: 1.5 }
    });
  }, /confidenceThreshold must be between 0 and 1/);

  console.log("smart-strategy tests passed");
} finally {
  disableModelRouter();
}
