/**
 * Manual task classification API tests.
 *
 * Run after building:
 *   node tests/manual-classification.test.js
 */

const assert = require("assert");
const {
  classifyTask,
  overrideTaskType,
  listTaskTypes,
} = require("../dist/index.js");

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("classifyTask detects code generation prompts", () => {
  const result = classifyTask("Write a TypeScript function to validate API keys");

  assert.strictEqual(result.taskType, "code_generation");
  assert.strictEqual(result.selectedModel, "claude-3-5-sonnet-20241022");
  assert.strictEqual(result.source, "keyword");
  assert.ok(result.confidence >= 0.7);
  assert.ok(result.alternatives.length > 0);
});

test("classifyTask uses conversation context when prompt is short", () => {
  const result = classifyTask("Can you do that?", {
    conversationHistory: ["We need to solve this equation step by step."],
  });

  assert.strictEqual(result.taskType, "math_reasoning");
  assert.strictEqual(result.selectedModel, "o1-mini");
});

test("overrideTaskType forces only the next classification", () => {
  overrideTaskType("technical_documentation");

  const forced = classifyTask("Hello there");
  const next = classifyTask("Hello there");

  assert.strictEqual(forced.taskType, "technical_documentation");
  assert.strictEqual(forced.confidence, 1);
  assert.strictEqual(forced.source, "override");
  assert.strictEqual(next.taskType, "simple_chat");
  assert.strictEqual(next.source, "keyword");
});

test("classifyTask rejects empty prompts", () => {
  assert.throws(
    () => classifyTask("   "),
    /prompt must be a non-empty string/,
  );
});

test("overrideTaskType rejects unknown task types", () => {
  assert.throws(
    () => overrideTaskType("unknown_task"),
    /Unknown task type/,
  );
});

test("listTaskTypes exposes built-in task labels", () => {
  const types = listTaskTypes();

  assert.ok(types.includes("code_generation"));
  assert.ok(types.includes("math_reasoning"));
  assert.ok(types.includes("technical_documentation"));
  assert.strictEqual(new Set(types).size, types.length);
});
