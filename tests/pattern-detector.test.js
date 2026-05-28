/**
 * Pattern detector tests.
 *
 * Run: node tests/pattern-detector.test.js
 */

const { detectByPatterns } = require("../dist/index.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  const code = detectByPatterns("Please implement a TypeScript API endpoint for uploads");
  assert(code.taskType === "code_generation", "should detect code generation");
  assert(code.selectedModel === "claude-3-5-sonnet-20241022", "code should route to Claude");
  assert(code.matchedPatterns.length > 0, "code should include matched regex");

  const review = detectByPatterns("Find bugs in this component and refactor code safely");
  assert(review.taskType === "code_review", "should detect code review");

  const math = detectByPatterns("Can you calculate the probability and solve equation x + 2 = 5?");
  assert(math.taskType === "math_reasoning", "should detect math");
  assert(math.selectedModel === "o1-mini", "math should route to o1-mini");

  const document = detectByPatterns("Summarize this large PDF report and extract key findings");
  assert(document.taskType === "document_analysis", "should detect document analysis");
  assert(document.selectedModel === "gemini-2.5-pro", "documents should route to Gemini");

  const chinese = detectByPatterns("请把这段中文总结一下");
  assert(chinese.taskType === "chinese_language", "Chinese text should get priority");
  assert(chinese.selectedModel === "moonshot-v1-32k", "Chinese should route to Kimi");

  const extraction = detectByPatterns("Parse JSON and extract email fields into a table");
  assert(extraction.taskType === "data_extraction", "should detect data extraction");

  const custom = detectByPatterns("Escalate this urgent support incident", {
    patterns: [
      {
        taskType: "support_triage",
        model: "gpt-4o-mini",
        reason: "Support triage is lightweight",
        priority: 1,
        patterns: [/urgent[\s\S]{0,40}support/i],
        keywords: ["incident"],
      },
    ],
  });
  assert(custom.taskType === "support_triage", "custom patterns should be supported");
  assert(custom.matchedKeywords.includes("incident"), "custom keywords should be reported");

  const bounded = detectByPatterns(`${"noise ".repeat(1000)} implement code`, {
    maxPromptLength: 20,
  });
  assert(bounded.taskType === "unknown", "maxPromptLength should bound scanning");

  const empty = detectByPatterns("   ");
  assert(empty.taskType === "unknown", "empty prompt should return unknown");

  console.log("Pattern detector tests passed.");
} catch (error) {
  console.error("Pattern detector tests failed:", error.message);
  process.exit(1);
}
