/**
 * TokenFirewall request header parsing tests.
 *
 * Run: node tests/request-headers.test.js
 */

const {
  TOKEN_FIREWALL_SMART_ROUTING_HEADER,
  TOKEN_FIREWALL_TAGS_HEADER,
  TOKEN_FIREWALL_TASK_TYPE_HEADER,
  hasTokenFirewallHeaderHints,
  parseTokenFirewallHeaders,
} = require("../dist/index.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertDeepEqual(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message}\nExpected: ${expectedJson}\nActual:   ${actualJson}`);
  }
}

try {
  const objectHints = parseTokenFirewallHeaders({
    "X-TokenFirewall-Task-Type": " code_generation ",
    "X-TokenFirewall-Smart-Routing": "enabled",
    "X-TokenFirewall-Tags": "prod, premium, PROD, api",
  });

  assertDeepEqual(objectHints, {
    taskType: "code_generation",
    smartRouting: true,
    tags: ["prod", "premium", "api"],
  }, "object headers should parse task type, smart routing, and tags");
  assert(hasTokenFirewallHeaderHints(objectHints), "object hints should be detected");

  const disabledHints = parseTokenFirewallHeaders(new Headers({
    [TOKEN_FIREWALL_TASK_TYPE_HEADER]: "simple_chat",
    [TOKEN_FIREWALL_SMART_ROUTING_HEADER]: "off",
    [TOKEN_FIREWALL_TAGS_HEADER]: "support,internal",
  }));

  assertDeepEqual(disabledHints, {
    taskType: "simple_chat",
    smartRouting: false,
    tags: ["support", "internal"],
  }, "Headers instances should parse case-insensitive controls");

  const tupleHints = parseTokenFirewallHeaders([
    [TOKEN_FIREWALL_TASK_TYPE_HEADER, "math_reasoning"],
    [TOKEN_FIREWALL_SMART_ROUTING_HEADER, "1"],
    [TOKEN_FIREWALL_TAGS_HEADER, "analysis,priority"],
  ]);

  assertDeepEqual(tupleHints, {
    taskType: "math_reasoning",
    smartRouting: true,
    tags: ["analysis", "priority"],
  }, "header tuples should parse controls");

  const invalidHints = parseTokenFirewallHeaders({
    [TOKEN_FIREWALL_TASK_TYPE_HEADER]: "   ",
    [TOKEN_FIREWALL_SMART_ROUTING_HEADER]: "maybe",
    [TOKEN_FIREWALL_TAGS_HEADER]: " , , ",
  });

  assertDeepEqual(invalidHints, {
    smartRouting: undefined,
    tags: [],
  }, "empty and invalid values should be ignored safely");
  assert(!hasTokenFirewallHeaderHints(invalidHints), "empty hints should not be detected");

  console.log("Request header parsing tests passed.");
} catch (error) {
  console.error("Request header parsing tests failed:", error.message);
  process.exit(1);
}
