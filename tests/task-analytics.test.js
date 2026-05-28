const assert = require("assert");
const { TaskAnalytics, taskAnalytics } = require("../dist/index.js");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("records classification events and summarizes counts", () => {
  const analytics = new TaskAnalytics();

  analytics.recordClassification({
    taskType: "code",
    confidence: 0.9,
    model: "gpt-5",
    provider: "openai",
    latencyMs: 120,
    timestamp: 1000
  });
  analytics.recordClassification({
    taskType: "summary",
    confidence: 0.7,
    model: "gpt-5-mini",
    provider: "openai",
    latencyMs: 80,
    success: false,
    timestamp: 2000
  });

  const summary = analytics.getAnalytics();

  assert.strictEqual(summary.totalClassifications, 2);
  assert.strictEqual(summary.successCount, 1);
  assert.strictEqual(summary.failureCount, 1);
  assert.deepStrictEqual(summary.taskCounts, { code: 1, summary: 1 });
  assert.strictEqual(summary.modelUsage["gpt-5"], 1);
  assert.strictEqual(summary.providerUsage.openai, 2);
  assert.strictEqual(summary.averageConfidence, 0.8);
  assert.strictEqual(summary.averageLatencyMs, 100);
});

test("bounds retained events while preserving aggregate over retained window", () => {
  const analytics = new TaskAnalytics({ maxEvents: 2 });

  analytics.recordClassification({ taskType: "chat", timestamp: 1 });
  analytics.recordClassification({ taskType: "code", timestamp: 2 });
  analytics.recordClassification({ taskType: "code", timestamp: 3 });

  const summary = analytics.getAnalytics(5);

  assert.strictEqual(summary.totalClassifications, 2);
  assert.deepStrictEqual(summary.taskCounts, { code: 2 });
  assert.deepStrictEqual(summary.recentEvents.map(event => event.taskType), ["code", "code"]);
});

test("limits recent event output", () => {
  const analytics = new TaskAnalytics();

  analytics.recordClassification({ taskType: "chat", timestamp: 1 });
  analytics.recordClassification({ taskType: "code", timestamp: 2 });
  analytics.recordClassification({ taskType: "math", timestamp: 3 });

  const summary = analytics.getAnalytics(2);

  assert.deepStrictEqual(summary.recentEvents.map(event => event.taskType), ["code", "math"]);
});

test("validates unsafe record values", () => {
  const analytics = new TaskAnalytics();

  assert.throws(() => analytics.recordClassification({ taskType: "" }), /taskType/);
  assert.throws(() => analytics.recordClassification({ taskType: "code", confidence: 1.5 }), /confidence/);
  assert.throws(() => analytics.recordClassification({ taskType: "code", latencyMs: -1 }), /latencyMs/);
  assert.throws(() => new TaskAnalytics({ maxEvents: 0 }), /maxEvents/);
});

test("resets default analytics singleton", () => {
  taskAnalytics.reset();
  taskAnalytics.recordClassification({ taskType: "chat", timestamp: 1 });
  assert.strictEqual(taskAnalytics.getAnalytics().totalClassifications, 1);
  taskAnalytics.reset();
  assert.strictEqual(taskAnalytics.getAnalytics().totalClassifications, 0);
});
