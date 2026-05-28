/**
 * Context analyzer tests.
 *
 * Run: node tests/context-analyzer.test.js
 */

const { analyzeContext } = require("../dist/index.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  const contextualCode = analyzeContext([
    { role: "user", content: "Can you help me design the endpoint?" },
    { role: "assistant", content: "Sure, what should it do?" },
    { role: "user", content: "Implement the TypeScript API handler and create function tests for it." },
  ]);
  assert(contextualCode.taskType === "code_generation", "recent code context should win");
  assert(contextualCode.selectedModel === "claude-3-5-sonnet-20241022", "code context should recommend Claude");
  assert(contextualCode.confidence >= 0.4, "code context should have useful confidence");
  assert(contextualCode.matchedKeywords.includes("implement"), "matched keywords should include evidence");

  const olderGreetingRecentMath = analyzeContext([
    { role: "user", content: "hello, quick question" },
    { role: "assistant", content: "Hi!" },
    { role: "user", content: "Please calculate the probability and solve equation x + 4 = 9." },
  ]);
  assert(olderGreetingRecentMath.taskType === "math_reasoning", "recent math context should outrank older chat");
  assert(olderGreetingRecentMath.selectedModel === "o1-mini", "math context should recommend o1-mini");

  const custom = analyzeContext("Prior messages keep mentioning urgent legal discovery review", {
    taskDefinitions: [
      {
        taskType: "legal_review",
        model: "gemini-2.5-pro",
        reason: "Legal history needs long context",
        keywords: ["legal discovery", "review"],
      },
    ],
  });
  assert(custom.taskType === "legal_review", "custom context definitions should be supported");
  assert(custom.matchedKeywords.length === 2, "custom keywords should be returned");

  const empty = analyzeContext([]);
  assert(empty.taskType === "unknown", "empty context should return unknown");
  assert(empty.confidence === 0, "empty context confidence should be zero");

  const bounded = analyzeContext([
    { role: "user", content: "implement the handler" },
    { role: "user", content: "calculate the formula" },
  ], {
    maxMessages: 1,
  });
  assert(bounded.taskType === "math_reasoning", "maxMessages should bound analysis to recent turns");

  console.log("Context analyzer tests passed.");
} catch (error) {
  console.error("Context analyzer tests failed:", error.message);
  process.exit(1);
}
