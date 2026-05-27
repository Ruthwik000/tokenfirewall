/**
 * Pattern detector tests.
 *
 * Run: node tests/pattern-detector.test.js
 */

const { detectByPatterns } = require("../dist/index.js");

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

const results = { total: 0, passed: 0, failed: 0, errors: [] };

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function record(name, passed, detail = "") {
  results.total += 1;
  if (passed) {
    results.passed += 1;
    log(`  ✓ ${name}`, "green");
  } else {
    results.failed += 1;
    results.errors.push({ name, detail });
    log(`  ✗ ${name}${detail ? `: ${detail}` : ""}`, "red");
  }
}

function expectTask(name, prompt, expectedTask) {
  const detection = detectByPatterns(prompt);
  record(
    name,
    detection.taskType === expectedTask && detection.confidence > 0,
    `expected ${expectedTask}, got ${detection.taskType}`
  );
}

console.log("\n" + "=".repeat(70));
log("PATTERN DETECTOR TESTS", "cyan");
console.log("=".repeat(70));

expectTask(
  "Detects code generation prompts",
  "Write a TypeScript function that validates API keys",
  "code_generation"
);

expectTask(
  "Detects code review prompts",
  "Please review this code and find potential bugs",
  "code_review"
);

expectTask(
  "Detects math reasoning prompts",
  "Solve this equation and calculate the compound interest",
  "math_reasoning"
);

expectTask(
  "Detects document analysis prompts",
  "Analyze this PDF document and extract the key findings",
  "document_analysis"
);

expectTask(
  "Detects simple chat prompts",
  "Hello, thanks for your help",
  "simple_chat"
);

expectTask(
  "Detects data extraction prompts",
  "Extract all email addresses and dates from this text",
  "data_extraction"
);

expectTask(
  "Detects Chinese language prompts",
  "请帮我写一个排序算法",
  "chinese_language"
);

const unknown = detectByPatterns("   ");
record(
  "Empty prompt returns unknown",
  unknown.taskType === "unknown" && unknown.confidence === 0,
  `got ${unknown.taskType} with confidence ${unknown.confidence}`
);

const longInput = `${"x".repeat(100000)} Write code for a function`;
const bounded = detectByPatterns(longInput, { timeoutMs: 5, maxPromptLength: 1000 });
record(
  "Long input scan stays bounded",
  bounded.elapsedMs < 100 && Array.isArray(bounded.matchedPatterns),
  `elapsed ${bounded.elapsedMs}ms`
);

console.log("\n" + "-".repeat(70));
log(`Passed: ${results.passed}/${results.total}`, results.failed === 0 ? "green" : "red");

if (results.failed > 0) {
  console.error(results.errors);
  process.exit(1);
}
