/**
 * Task registry tests.
 *
 * Run: npm run build && node tests/task-registry.test.js
 */

const assert = require("assert");
const { TaskRegistry, taskRegistry } = require("../dist/index.js");

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("registers all built-in smart routing tasks", () => {
  const tasks = taskRegistry.getAllTasks();
  const taskTypes = tasks.map(task => task.taskType);

  assert.ok(tasks.length >= 12);
  assert.ok(taskTypes.includes("code_generation"));
  assert.ok(taskTypes.includes("document_analysis"));
  assert.ok(taskTypes.includes("chinese_language"));
  assert.ok(taskTypes.includes("technical_documentation"));
});

test("returns tasks ordered by priority", () => {
  const registry = new TaskRegistry([
    {
      taskType: "low_priority",
      model: "gpt-4o-mini",
      reason: "Low priority",
      priority: 1,
    },
    {
      taskType: "high_priority",
      model: "gpt-4o",
      reason: "High priority",
      priority: 99,
    },
  ]);

  assert.deepStrictEqual(
    registry.getAllTasks().map(task => task.taskType),
    ["high_priority", "low_priority"]
  );
});

test("supports custom task registration", () => {
  const registry = new TaskRegistry([]);

  registry.registerTask("legal_analysis", {
    model: "gpt-4o",
    reason: "Complex legal reasoning",
    keywords: ["legal", "contract", "clause"],
    patterns: [/legal.*analysis/i],
    priority: 8,
  });

  const task = registry.getTask("legal_analysis");
  assert.ok(registry.hasTask("legal_analysis"));
  assert.strictEqual(task.model, "gpt-4o");
  assert.strictEqual(task.patterns[0].test("legal contract analysis"), true);
});

test("defensively copies returned task arrays", () => {
  const registry = new TaskRegistry([]);

  registry.registerTask("simple", {
    model: "gpt-4o-mini",
    reason: "Simple test task",
    keywords: ["hello"],
    patterns: [/hello/i],
  });

  const task = registry.getTask("simple");
  task.keywords.push("mutated");
  task.patterns.push(/mutated/i);

  const freshTask = registry.getTask("simple");
  assert.deepStrictEqual(freshTask.keywords, ["hello"]);
  assert.strictEqual(freshTask.patterns.length, 1);
});

test("validates required task fields", () => {
  const registry = new TaskRegistry([]);

  assert.throws(
    () => registry.registerTask("bad", { model: "", reason: "missing model" }),
    /model must be a non-empty string/
  );

  assert.throws(
    () => registry.registerTask("bad", { model: "gpt-4o", reason: "" }),
    /reason must be a non-empty string/
  );

  assert.throws(
    () => registry.registerTask("bad", {
      model: "gpt-4o",
      reason: "invalid patterns",
      patterns: ["not-regex"],
    }),
    /patterns must be an array of RegExp/
  );
});

console.log("Task registry tests passed.");
