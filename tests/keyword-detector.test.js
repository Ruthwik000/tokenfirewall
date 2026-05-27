/**
 * Keyword detector tests.
 *
 * Run: node tests/keyword-detector.test.js
 */

const { detectByKeywords } = require("../dist/index.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  const codeResult = detectByKeywords("Please write code to implement a REST API endpoint");
  assert(codeResult, "code generation prompt should be classified");
  assert(codeResult.taskType === "code_generation", "should detect code_generation");
  assert(codeResult.selectedModel === "claude-3-5-sonnet-20241022", "should recommend Claude for code");
  assert(codeResult.confidence >= 0.5, "code confidence should include multiple keyword matches");
  assert(codeResult.matchedKeywords.includes("write code"), "should report matched keyword");

  const mathResult = detectByKeywords("Can you solve equation x^2 + 2x and calculate the roots?");
  assert(mathResult, "math prompt should be classified");
  assert(mathResult.taskType === "math_reasoning", "should detect math_reasoning");
  assert(mathResult.selectedModel === "o1-mini", "should recommend o1-mini for math");

  const customResult = detectByKeywords("route this urgent support ticket", {
    taskDefinitions: [
      {
        taskType: "support_triage",
        keywords: ["urgent support", "ticket"],
        model: "gpt-4o-mini",
        reason: "Support triage is lightweight"
      }
    ]
  });
  assert(customResult, "custom keyword definitions should be supported");
  assert(customResult.taskType === "support_triage", "should classify custom task type");
  assert(customResult.matchedKeywords.length === 2, "should return custom keyword matches");

  const ignoredResult = detectByKeywords("hello", {
    minimumConfidence: 0.9
  });
  assert(ignoredResult === null, "minimumConfidence should filter weak matches");

  const emptyResult = detectByKeywords("   ");
  assert(emptyResult === null, "empty prompts should not classify");

  const longPrompt = `${"noise ".repeat(5000)} write code`;
  const boundedResult = detectByKeywords(longPrompt, { maxPromptLength: 100 });
  assert(boundedResult === null, "maxPromptLength should bound scanning");

  console.log("Keyword detector tests passed.");
} catch (error) {
  console.error("Keyword detector tests failed:", error.message);
  process.exit(1);
}
