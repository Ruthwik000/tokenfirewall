const assert = require("assert");
const { detectLanguage } = require("../dist/index.js");

const cases = [
  {
    name: "detects TypeScript from typed declarations",
    input: "interface User { id: string; active: boolean }",
    language: "typescript"
  },
  {
    name: "detects Python from function syntax",
    input: "def normalize_user(row):\n    import pandas as pd\n    return row",
    language: "python"
  },
  {
    name: "detects Go from package and func syntax",
    input: "package main\n\nfunc handler() error { return nil }",
    language: "go"
  },
  {
    name: "detects SQL from query shape",
    input: "SELECT id, email FROM users WHERE active = true",
    language: "sql"
  },
  {
    name: "extracts nested chat messages",
    input: {
      messages: [
        { role: "user", content: "Please fix this pytest failure in my Flask app" }
      ]
    },
    language: "python"
  }
];

for (const testCase of cases) {
  const result = detectLanguage(testCase.input);
  assert.equal(result.language, testCase.language, testCase.name);
  assert(result.confidence > 0.3, `${testCase.name} should be confident`);
  assert(result.matchedSignals.length > 0, `${testCase.name} should include signals`);
}

const unknown = detectLanguage("Can you help me think through this vague idea?");
assert.equal(unknown.language, "unknown");
assert(unknown.confidence > 0);

const bounded = detectLanguage(`${"x".repeat(20000)} def late_signal(): pass`);
assert.equal(bounded.language, "unknown");

console.log("language-detector tests passed");
