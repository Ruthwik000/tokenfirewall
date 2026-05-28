// Mock global fetch BEFORE requiring the module
let interceptedUrl = "";
let interceptedHeaders = null;
let interceptedBody = null;

globalThis.fetch = async (input, init) => {
  interceptedUrl = typeof input === 'string' ? input : input.url;
  interceptedHeaders = init?.headers;
  if (init?.body) {
    interceptedBody = JSON.parse(init.body);
  }
  return { 
    ok: true, 
    json: async () => ({}),
    clone: function() { return this; }
  };
};

const {
  createModelRouter,
  registerApiKeys,
  patchGlobalFetch,
  disableModelRouter,
  unpatchGlobalFetch,
} = require("../dist/index.js");

const { extractPrompt, classifyTask } = require("../dist/router/smartRouter.js");

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

const testResults = { total: 0, passed: 0, failed: 0, errors: [] };

function recordTest(name, passed, error = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    log(`  ✓ ${name}`, 'green');
  } else {
    testResults.failed++;
    log(`  ✗ ${name}`, 'red');
    if (error) {
      testResults.errors.push({ test: name, error: error.message || error });
    }
  }
}

function section(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70));
}

// Test 1: Extract Prompt
async function testExtractPrompt() {
  section('TEST SUITE 1: Prompt Extraction');
  
  // Test OpenAI/Anthropic structure
  try {
    const openaiBody = {
      messages: [{ role: "user", content: "Write a function" }]
    };
    const prompt = extractPrompt(openaiBody, "openai");
    recordTest('Extract from OpenAI', prompt === "Write a function");
  } catch (err) {
    recordTest('Extract from OpenAI', false, err);
  }

  // Test Gemini structure
  try {
    const geminiBody = {
      contents: [{ parts: [{ text: "Hello Gemini" }] }]
    };
    const prompt = extractPrompt(geminiBody, "gemini");
    recordTest('Extract from Gemini', prompt === "Hello Gemini");
  } catch (err) {
    recordTest('Extract from Gemini', false, err);
  }
}

// Test 2: Task Classification
async function testClassification() {
  section('TEST SUITE 2: Task Classification');
  try {
    const detection1 = classifyTask("Write a Python function to sort");
    recordTest('Classify code generation', detection1 && detection1.taskType === 'code_generation');
    
    const detection2 = classifyTask("Calculate the math equation 2+2");
    recordTest('Classify math reasoning', detection2 && detection2.taskType === 'math_reasoning');
    
    const detection3 = classifyTask("summarize this document please");
    recordTest('Classify document analysis', detection3 && detection3.taskType === 'document_analysis');

    const detection4 = classifyTask("hi how are you");
    recordTest('Classify simple chat', detection4 && detection4.taskType === 'simple_chat');
  } catch (err) {
    recordTest('Task Classification tests', false, err);
  }
}
// Test 3: Fetch Interceptor Smart Routing
async function testFetchIntegration() {
  section('TEST SUITE 3: Fetch Interception integration');
  
  interceptedUrl = "";
  interceptedHeaders = null;
  interceptedBody = null;

  registerApiKeys({
    anthropic: 'test-anthropic',
    openai: 'test-openai'
  });

  createModelRouter({
    strategy: "smart",
    enableCrossProvider: true,
  });

  patchGlobalFetch();
  try {
    // We send an OpenAI request with a code prompt
    // The smart router should intercept it, classify it as 'code_generation',
    // and since default code_generation is 'claude-3-5-sonnet-20241022' (Anthropic),
    // it should cross-provider fallback it to anthropic!
    await globalThis.fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer test-key"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: "write code for sorting" }]
      })
    });

    const isAnthropicUrl = interceptedUrl.includes("api.anthropic.com");
    const isClaudeModel = interceptedBody.model === "claude-3-5-sonnet-20241022";
    
    recordTest('Fetch Interceptor correctly overrides model', isClaudeModel);
    recordTest('Fetch Interceptor correctly handles cross-provider URL override', isAnthropicUrl);
  } catch (err) {
    recordTest('Fetch Interception integration', false, err);
  } finally {
    disableModelRouter();
  }
}

async function runAllTests() {
  console.clear();
  log('\n╔════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║        Smart Routing - Test Suite                                  ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════╝\n', 'cyan');
  
  await testExtractPrompt();
  await testClassification();
  await testFetchIntegration();

  section('TEST SUMMARY');
  log(`Total Tests:    ${testResults.total}`, 'cyan');
  log(`Passed:         ${testResults.passed}`, 'green');
  log(`Failed:         ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
  
  if (testResults.errors.length > 0) {
    console.log('\n' + '─'.repeat(70));
    log('FAILED TESTS:', 'red');
    testResults.errors.forEach((err, idx) => {
      log(`${idx + 1}. ${err.test}`, 'red');
      log(`   ${err.error}`, 'yellow');
    });
  }

  process.exit(testResults.failed > 0 ? 1 : 0);
}

runAllTests();
