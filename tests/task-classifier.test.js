const assert = require("assert");
const {
  TaskClassifier,
  classifyTask,
  DEFAULT_TASK_DEFINITIONS
} = require("../dist/index.js");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("detects code tasks with keyword and pattern evidence", () => {
  const result = classifyTask("Please debug this TypeScript function:\n```ts\nfunction run() { throw new Error('x') }\n```");

  assert.strictEqual(result.primaryTask, "code");
  assert(result.confidence > 0.5);
  assert(result.matches[0].matchedKeywords.includes("debug"));
  assert(result.matches[0].matchedPatterns.length >= 1);
  assert(result.matches[0].recommendedModels.length >= 1);
});

test("fuses headers and metadata with prompt text", () => {
  const classifier = new TaskClassifier();
  const result = classifier.classify({
    prompt: "Return valid JSON with the customer name and ticket category.",
    headers: {
      "x-tokenfirewall-task": "structured-output extraction"
    },
    metadata: {
      tags: ["json", "schema"]
    }
  });

  assert.strictEqual(result.primaryTask, "extraction");
  assert(result.matches[0].matchedSignals.includes("extraction"));
  assert(result.matches[0].matchedKeywords.includes("json"));
});

test("keeps close secondary matches for multi-task prompts", () => {
  const result = classifyTask("Summarize this Python traceback and suggest the code fix.");
  const types = result.matches.map(match => match.type);

  assert(types.includes("summarization"));
  assert(types.includes("code"));
  assert.strictEqual(result.multiTask, true);
});

test("supports custom task definitions", () => {
  const classifier = new TaskClassifier({
    definitions: [
      {
        type: "legal",
        keywords: ["contract", "indemnity"],
        signals: ["legal"],
        recommendedModels: ["gpt-5"]
      }
    ]
  });
  const result = classifier.classify({
    prompt: "Review this contract indemnity clause.",
    metadata: { task: "legal" }
  });

  assert.strictEqual(result.primaryTask, "legal");
  assert.deepStrictEqual(result.matches[0].recommendedModels, ["gpt-5"]);
});

test("bounds long inputs and reports truncation", () => {
  const classifier = new TaskClassifier({ maxInputChars: 32 });
  const result = classifier.classify("code ".repeat(100));

  assert.strictEqual(result.truncated, true);
  assert.strictEqual(result.analyzedChars, 32);
});

test("exports immutable default definitions for consumers", () => {
  assert(Array.isArray(DEFAULT_TASK_DEFINITIONS));
  assert(DEFAULT_TASK_DEFINITIONS.some(definition => definition.type === "reasoning"));
});
