/**
 * Final QA smoke suite for release readiness.
 *
 * Run:
 *   npm run build
 *   node tests/final-qa.test.js
 */

const assert = require("assert");

const {
  createBudgetGuard,
  createModelRouter,
  disableModelRouter,
  exportBudgetState,
  getBudgetStatus,
  importBudgetState,
  isCrossProviderEnabled,
  resetBudget,
} = require("../dist/index.js");
const { detectProvider, buildProviderUrl, isCrossProviderSwitch } = require("../dist/router/providerDetector.js");
const { appendApiKeyToUrl, buildProviderHeaders } = require("../dist/router/providerHeaders.js");
const { transformRequest } = require("../dist/router/requestTransformer.js");
const { transformResponse } = require("../dist/router/responseTransformer.js");

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test("budget guard tracks, exports, resets, and imports state", async () => {
  const manager = createBudgetGuard({ monthlyLimit: 0.5, mode: "block" });

  await manager.track(0.125);
  assert.strictEqual(getBudgetStatus().totalSpent, 0.125);
  assert.strictEqual(exportBudgetState().limit, 0.5);

  resetBudget();
  assert.strictEqual(getBudgetStatus().totalSpent, 0);

  importBudgetState({ totalSpent: 0.25 });
  assert.strictEqual(getBudgetStatus().remaining, 0.25);
});

test("router validation rejects invalid fallback config and routes rate limits", () => {
  assert.throws(
    () => createModelRouter({ strategy: "fallback", fallbackMap: {} }),
    /fallback strategy requires fallbackMap/
  );

  const router = createModelRouter({
    strategy: "fallback",
    fallbackMap: {
      "gpt-4o": ["claude-3-5-sonnet-latest", "gemini-2.5-pro"],
    },
    enableCrossProvider: true,
    maxRetries: 2,
    apiKeys: {
      anthropic: "test-anthropic-key",
      gemini: "test-gemini-key",
    },
  });

  assert.strictEqual(isCrossProviderEnabled(), true);
  const decision = router.handleFailure({
    error: { status: 429 },
    originalModel: "gpt-4o",
    provider: "openai",
    requestBody: { model: "gpt-4o", messages: [{ role: "user", content: "hello" }] },
    retryCount: 0,
    attemptedModels: ["gpt-4o"],
  });

  assert.strictEqual(decision.retry, true);
  assert.strictEqual(decision.nextModel, "claude-3-5-sonnet-latest");

  disableModelRouter();
  assert.strictEqual(isCrossProviderEnabled(), false);
});

test("provider detection, URLs, headers, and API key placement stay stable", () => {
  assert.strictEqual(detectProvider("gpt-4o-mini"), "openai");
  assert.strictEqual(detectProvider("claude-3-5-sonnet-latest"), "anthropic");
  assert.strictEqual(detectProvider("gemini-2.5-pro"), "gemini");
  assert.strictEqual(isCrossProviderSwitch("gpt-4o", "gemini-2.5-pro"), true);
  assert.strictEqual(isCrossProviderSwitch("gpt-4o", "gpt-4o-mini"), false);

  assert.strictEqual(
    buildProviderUrl("gemini", "gemini-2.5-pro"),
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent"
  );
  assert.strictEqual(buildProviderHeaders("anthropic", "key")["x-api-key"], "key");
  assert.strictEqual(buildProviderHeaders("openai", "key").Authorization, "Bearer key");
  assert.strictEqual(
    appendApiKeyToUrl("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?alt=sse", "gemini", "key"),
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?alt=sse&key=key"
  );
});

test("request transforms preserve prompt intent across provider formats", () => {
  const openAIRequest = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "Keep answers concise." },
      { role: "user", content: "Review this function for bugs." },
    ],
    temperature: 0.2,
    max_tokens: 256,
  };

  const anthropicRequest = transformRequest(
    openAIRequest,
    "openai",
    "anthropic",
    "claude-3-5-sonnet-latest"
  );

  assert.strictEqual(anthropicRequest.model, "claude-3-5-sonnet-latest");
  assert.strictEqual(anthropicRequest.system, "Keep answers concise.");
  assert.strictEqual(anthropicRequest.messages[0].content, "Review this function for bugs.");
  assert.strictEqual(anthropicRequest.max_tokens, 256);

  const geminiRequest = transformRequest(openAIRequest, "openai", "gemini", "gemini-2.5-pro");
  assert.strictEqual(geminiRequest.contents[0].role, "user");
  assert.strictEqual(geminiRequest.contents[1].parts[0].text, "Review this function for bugs.");
  assert.strictEqual(geminiRequest.generationConfig.temperature, 0.2);
});

test("response transforms preserve text and usage metadata", () => {
  const anthropicResponse = {
    id: "msg_123",
    content: [{ type: "text", text: "Looks good." }],
    model: "claude-3-5-sonnet-latest",
    stop_reason: "end_turn",
    usage: { input_tokens: 12, output_tokens: 3 },
  };

  const openAIResponse = transformResponse(
    anthropicResponse,
    "anthropic",
    "openai",
    "claude-3-5-sonnet-latest"
  );
  assert.strictEqual(openAIResponse.choices[0].message.content, "Looks good.");
  assert.strictEqual(openAIResponse.usage.total_tokens, 15);

  const geminiResponse = transformResponse(openAIResponse, "openai", "gemini", "gpt-4o");
  assert.strictEqual(geminiResponse.candidates[0].content.parts[0].text, "Looks good.");
  assert.strictEqual(geminiResponse.usageMetadata.totalTokenCount, 15);
});

(async () => {
  let passed = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      passed += 1;
      console.log(`✓ ${name}`);
    } catch (error) {
      console.error(`✗ ${name}`);
      console.error(error);
      process.exit(1);
    }
  }

  console.log(`Final QA smoke suite passed (${passed}/${tests.length}).`);
})();
