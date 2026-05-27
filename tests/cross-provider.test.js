/**
 * Cross-Provider Fallback Tests
 * 
 * Comprehensive test suite for the cross-provider fallback feature.
 * Tests all transformations, routing logic, and error handling.
 * 
 * Run: node tests/cross-provider.test.js
 */

const {
  createBudgetGuard,
  createModelRouter,
  registerApiKeys,
  patchGlobalFetch,
  isCrossProviderEnabled,
  getBudgetStatus,
  resetBudget,
  disableModelRouter,
} = require("../dist/index.js");

// Test utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
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
      testResults.errors.push({ test: name, error: error.message });
    }
  }
}

function section(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70));
}

// ============================================================================
// TEST SUITE 1: Request Transformations
// ============================================================================

async function testRequestTransformations() {
  section('TEST SUITE 1: Request Transformations');
  
  const { transformRequest } = require('../dist/router/requestTransformer.js');
  
  // Test 1.1: OpenAI → Anthropic
  try {
    const openaiReq = {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
      ],
      temperature: 0.7,
      max_tokens: 100,
    };
    
    const anthropicReq = transformRequest(openaiReq, 'openai', 'anthropic', 'claude-3-5-sonnet-20241022');
    
    const checks = [
      anthropicReq.model === 'claude-3-5-sonnet-20241022',
      anthropicReq.system === 'You are helpful',
      anthropicReq.messages.length === 1,
      anthropicReq.messages[0].role === 'user',
      anthropicReq.max_tokens === 100,
    ];
    
    recordTest('OpenAI → Anthropic transformation', checks.every(c => c));
  } catch (error) {
    recordTest('OpenAI → Anthropic transformation', false, error);
  }
  
  // Test 1.2: OpenAI → Gemini
  try {
    const openaiReq = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
      temperature: 0.5,
      max_tokens: 50,
    };
    
    const geminiReq = transformRequest(openaiReq, 'openai', 'gemini', 'gemini-2.5-pro');
    
    const checks = [
      Array.isArray(geminiReq.contents),
      geminiReq.contents.length === 1,
      geminiReq.contents[0].role === 'user',
      geminiReq.generationConfig?.temperature === 0.5,
    ];
    
    recordTest('OpenAI → Gemini transformation', checks.every(c => c));
  } catch (error) {
    recordTest('OpenAI → Gemini transformation', false, error);
  }
  
  // Test 1.3: Anthropic → OpenAI
  try {
    const anthropicReq = {
      model: 'claude-3-5-sonnet-20241022',
      system: 'Be concise',
      messages: [{ role: 'user', content: 'Test' }],
      max_tokens: 100,
    };
    
    const openaiReq = transformRequest(anthropicReq, 'anthropic', 'openai', 'gpt-4o');
    
    const checks = [
      openaiReq.model === 'gpt-4o',
      Array.isArray(openaiReq.messages),
      openaiReq.messages.some(m => m.role === 'system'),
    ];
    
    recordTest('Anthropic → OpenAI transformation', checks.every(c => c));
  } catch (error) {
    recordTest('Anthropic → OpenAI transformation', false, error);
  }
}

// ============================================================================
// TEST SUITE 2: Response Transformations
// ============================================================================

async function testResponseTransformations() {
  section('TEST SUITE 2: Response Transformations');
  
  const { transformResponse } = require('../dist/router/responseTransformer.js');
  
  // Test 2.1: Anthropic → OpenAI
  try {
    const anthropicResp = {
      id: 'msg-123',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello!' }],
      model: 'claude-3-5-sonnet-20241022',
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 },
    };
    
    const openaiResp = transformResponse(anthropicResp, 'anthropic', 'openai', 'claude-3-5-sonnet-20241022');
    
    const checks = [
      openaiResp.object === 'chat.completion',
      openaiResp.choices?.length === 1,
      openaiResp.choices[0].message.content === 'Hello!',
      openaiResp.usage.prompt_tokens === 10,
      openaiResp.usage.completion_tokens === 5,
    ];
    
    recordTest('Anthropic → OpenAI response transformation', checks.every(c => c));
  } catch (error) {
    recordTest('Anthropic → OpenAI response transformation', false, error);
  }
  
  // Test 2.2: Gemini → OpenAI
  try {
    const geminiResp = {
      candidates: [{
        content: {
          parts: [{ text: 'Response text' }],
          role: 'model',
        },
        finishReason: 'STOP',
      }],
      usageMetadata: {
        promptTokenCount: 15,
        candidatesTokenCount: 8,
        totalTokenCount: 23,
      },
    };
    
    const openaiResp = transformResponse(geminiResp, 'gemini', 'openai', 'gemini-2.5-pro');
    
    const checks = [
      openaiResp.object === 'chat.completion',
      openaiResp.choices?.length === 1,
      openaiResp.choices[0].message.content === 'Response text',
      openaiResp.usage.total_tokens === 23,
    ];
    
    recordTest('Gemini → OpenAI response transformation', checks.every(c => c));
  } catch (error) {
    recordTest('Gemini → OpenAI response transformation', false, error);
  }
}

// ============================================================================
// TEST SUITE 3: Provider Detection
// ============================================================================

async function testProviderDetection() {
  section('TEST SUITE 3: Provider Detection');
  
  const { detectProvider, isCrossProviderSwitch } = require('../dist/router/providerDetector.js');
  
  // Test OpenAI models
  const openaiModels = ['gpt-4o', 'gpt-4o-mini', 'o1'];
  openaiModels.forEach(model => {
    try {
      const provider = detectProvider(model);
      recordTest(`Detect ${model} as OpenAI`, provider === 'openai');
    } catch (error) {
      recordTest(`Detect ${model} as OpenAI`, false, error);
    }
  });
  
  // Test Anthropic models
  const anthropicModels = ['claude-3-5-sonnet-20241022', 'claude-opus-4.5'];
  anthropicModels.forEach(model => {
    try {
      const provider = detectProvider(model);
      recordTest(`Detect ${model} as Anthropic`, provider === 'anthropic');
    } catch (error) {
      recordTest(`Detect ${model} as Anthropic`, false, error);
    }
  });
  
  // Test cross-provider detection
  try {
    const testCases = [
      { a: 'gpt-4o', b: 'gpt-4o-mini', expected: false },
      { a: 'gpt-4o', b: 'claude-3-5-sonnet-20241022', expected: true },
    ];
    
    testCases.forEach(test => {
      const result = isCrossProviderSwitch(test.a, test.b);
      recordTest(
        `Cross-provider: ${test.a} → ${test.b} = ${test.expected}`,
        result === test.expected
      );
    });
  } catch (error) {
    recordTest('Cross-provider detection', false, error);
  }
}

// ============================================================================
// TEST SUITE 4: Error Detection
// ============================================================================

async function testErrorDetection() {
  section('TEST SUITE 4: Error Detection');
  
  const { errorDetector } = require('../dist/router/errorDetector.js');
  
  const testCases = [
    { name: 'HTTP 429 (rate limit)', error: { status: 429 }, expected: 'rate_limit' },
    { name: 'HTTP 403 (access denied)', error: { status: 403 }, expected: 'access_denied' },
    { name: 'HTTP 404 (model unavailable)', error: { status: 404 }, expected: 'model_unavailable' },
    {
      name: 'HTTP 400 with context overflow',
      error: {
        status: 400,
        response: {
          data: {
            error: { type: 'invalid_request_error', code: 'context_length_exceeded' },
          },
        },
      },
      expected: 'context_overflow',
    },
  ];
  
  testCases.forEach(test => {
    try {
      const detected = errorDetector.detectFailureType(test.error);
      recordTest(test.name, detected === test.expected);
    } catch (error) {
      recordTest(test.name, false, error);
    }
  });
}

// ============================================================================
// TEST SUITE 5: Routing Strategies
// ============================================================================

async function testRoutingStrategies() {
  section('TEST SUITE 5: Routing Strategies');
  
  const { fallbackStrategy } = require('../dist/router/routingStrategies.js');
  
  // Test fallback strategy
  try {
    const fallbackMap = {
      'gpt-4o': ['claude-3-5-sonnet-20241022', 'gemini-2.5-pro'],
    };
    
    const context = {
      error: { status: 429 },
      originalModel: 'gpt-4o',
      requestBody: {},
      provider: 'openai',
      retryCount: 0,
      attemptedModels: ['gpt-4o'],
    };
    
    const decision = fallbackStrategy(context, 'rate_limit', fallbackMap);
    
    recordTest(
      'Fallback strategy: first fallback',
      decision.retry && decision.nextModel === 'claude-3-5-sonnet-20241022'
    );
  } catch (error) {
    recordTest('Fallback strategy: first fallback', false, error);
  }
}

// ============================================================================
// TEST SUITE 6: Integration Tests
// ============================================================================

async function testIntegration() {
  section('TEST SUITE 6: Integration Tests');
  
  // Test setup
  try {
    resetBudget();
    
    registerApiKeys({
      openai: 'mock-openai-key',
      anthropic: 'mock-anthropic-key',
      gemini: 'mock-gemini-key',
    });
    
    createBudgetGuard({
      monthlyLimit: 10.0,
      mode: 'block',
    });
    
    createModelRouter({
      strategy: 'fallback',
      fallbackMap: {
        'gpt-4o': ['claude-3-5-sonnet-20241022', 'gemini-2.5-pro'],
      },
      maxRetries: 2,
      enableCrossProvider: true,
    });
    
    const isEnabled = isCrossProviderEnabled();
    
    recordTest('Setup cross-provider router', isEnabled === true);
  } catch (error) {
    recordTest('Setup cross-provider router', false, error);
  }
  
  // Test budget status
  try {
    const status = getBudgetStatus();
    const checks = [
      status !== null,
      status.limit === 10.0,
      status.totalSpent === 0,
    ];
    
    recordTest('Budget status check', checks.every(c => c));
  } catch (error) {
    recordTest('Budget status check', false, error);
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.clear();
  log('\n╔════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║        Cross-Provider Fallback - Test Suite                       ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════╝\n', 'cyan');
  
  const startTime = Date.now();
  
  try {
    await testRequestTransformations();
    await testResponseTransformations();
    await testProviderDetection();
    await testErrorDetection();
    await testRoutingStrategies();
    await testIntegration();
  } catch (error) {
    log(`\nFatal error: ${error.message}`, 'red');
    console.error(error);
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Print summary
  section('TEST SUMMARY');
  log(`Total Tests:    ${testResults.total}`, 'cyan');
  log(`Passed:         ${testResults.passed}`, 'green');
  log(`Failed:         ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
  log(`Duration:       ${duration}s`, 'cyan');
  
  const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  log(`Pass Rate:      ${passRate}%`, passRate === '100.0' ? 'green' : 'yellow');
  
  if (testResults.errors.length > 0) {
    console.log('\n' + '─'.repeat(70));
    log('FAILED TESTS:', 'red');
    testResults.errors.forEach((err, idx) => {
      log(`${idx + 1}. ${err.test}`, 'red');
      log(`   ${err.error}`, 'yellow');
    });
  }
  
  console.log('\n' + '═'.repeat(70));
  
  if (testResults.failed === 0) {
    log('🎉 ALL TESTS PASSED!', 'green');
    log('Cross-provider fallback is working correctly.', 'green');
  } else {
    log(`⚠️  ${testResults.failed} TEST(S) FAILED`, 'red');
  }
  
  console.log('');
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
