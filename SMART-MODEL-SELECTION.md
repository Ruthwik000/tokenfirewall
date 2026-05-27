# Smart Model Selection - Task-Type Based Routing

## Overview

Smart Model Selection is an intelligent routing system that automatically selects the optimal LLM model based on the **type of task** being performed, not just text length or cost. Different LLMs excel at different tasks - Claude for code, o1 for reasoning, Gemini for long documents, etc.

This feature can reduce costs by 50-90% while **improving output quality** by routing each task to the model that performs best for that specific type of work.

---

## Table of Contents

- [The Problem](#the-problem)
- [How It Works](#how-it-works)
- [Task Types](#task-types)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Task Detection Methods](#task-detection-methods)
- [Real-World Examples](#real-world-examples)
- [API Reference](#api-reference)
- [Analytics & Monitoring](#analytics--monitoring)
- [Cost Savings Analysis](#cost-savings-analysis)
- [Best Practices](#best-practices)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)

---

## The Problem

### Current State: One-Size-Fits-All

Most applications use a single model for all tasks:

```javascript
// Everything goes to GPT-4o
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  body: JSON.stringify({
    model: "gpt-4o",  // $2.50 input / $10.00 output per 1M tokens
    messages: [{ role: "user", content: prompt }]
  })
});
```

**Problems with this approach:**

1. **Massive Cost Waste**
   - Using GPT-4o for simple greetings: 16x more expensive than needed
   - Using GPT-4o for code: Claude produces better results
   - Using GPT-4o for math: o1 models are specifically designed for reasoning

2. **Suboptimal Quality**
   - GPT-4o for code generation: Good, but Claude is better
   - GPT-4o for long documents: 128K context limit, Gemini has 2M
   - GPT-4o for Chinese: Decent, but Kimi is optimized for it

3. **Reliability Issues**
   - Long documents fail due to context limits
   - Complex reasoning tasks get incorrect answers
   - No automatic optimization

### The Solution: Task-Type Based Routing

Route each request to the model that excels at that specific task type:

- 🎨 **Code Generation** → Claude (best code quality)
- 🧮 **Math/Reasoning** → o1/o1-mini (designed for reasoning)
- 📚 **Long Documents** → Gemini (2M token context)
- 💬 **Simple Chat** → GPT-4o-mini (cost-effective)
- ✍️ **Creative Writing** → GPT-4o (best creativity)
- 🌏 **Chinese Language** → Kimi (optimized for Chinese)

**Result:** Lower costs + Better quality + Higher reliability

---

## How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Request Arrives                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Task Classification Engine                      │
│  • Keyword Analysis                                          │
│  • Pattern Matching (Regex)                                  │
│  • Semantic Analysis                                         │
│  • Context Analysis (conversation history)                   │
│  • Language Detection                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Task Type Identified                            │
│  Example: "code_generation" (95% confidence)                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Model Selection                                 │
│  Task: code_generation → Model: claude-3-5-sonnet            │
│  Reason: "Claude excels at code generation"                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Request Routing                                 │
│  • Route to selected model                                   │
│  • Log decision for analytics                                │
│  • Track cost and performance                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Response & Learning                             │
│  • Return response to user                                   │
│  • Track actual cost vs estimated                            │
│  • Update confidence scores                                  │
│  • Improve future classifications                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Task Types

### Built-in Task Classifications

#### 1. Code Generation
**Best Model:** Claude 3.5 Sonnet  
**Why:** Claude consistently produces higher quality, more maintainable code  
**Keywords:** write code, create function, implement, build, develop, program  
**Patterns:** `/write.*code/i`, `/create.*function/i`, `/implement.*class/i`  
**Cost:** $3.00 input / $15.00 output per 1M tokens  

**Example Prompts:**
- "Write a Python function to validate email addresses"
- "Create a React component for user authentication"
- "Implement a binary search tree in JavaScript"

---

#### 2. Code Review & Refactoring
**Best Model:** Claude 3.5 Sonnet  
**Why:** Excellent at analyzing code structure and suggesting improvements  
**Keywords:** review code, find bugs, optimize, refactor, improve code, debug  
**Patterns:** `/review.*code/i`, `/find.*bug/i`, `/refactor/i`, `/optimize/i`  
**Cost:** $3.00 input / $15.00 output per 1M tokens  

**Example Prompts:**
- "Review this code and suggest improvements: [code]"
- "Find potential bugs in this function"
- "Refactor this code to be more efficient"

---

#### 3. Math & Calculations
**Best Model:** o1-mini  
**Why:** Designed specifically for mathematical reasoning with chain-of-thought  
**Keywords:** calculate, solve, compute, equation, formula, math  
**Patterns:** `/solve.*equation/i`, `/calculate/i`, `/mathematical/i`  
**Cost:** $3.00 input / $12.00 output per 1M tokens  

**Example Prompts:**
- "Solve this equation: 2x² + 5x - 3 = 0"
- "Calculate the compound interest for $10,000 at 5% over 10 years"
- "Find the derivative of x³ + 2x² - 5x + 7"

---

#### 4. Complex Reasoning & Logic
**Best Model:** o1  
**Why:** Advanced reasoning model with extended thinking time  
**Keywords:** analyze, reason, logic, deduce, infer, prove, derive  
**Patterns:** `/step.*by.*step/i`, `/reasoning/i`, `/logical.*analysis/i`  
**Cost:** $15.00 input / $60.00 output per 1M tokens  

**Example Prompts:**
- "Analyze this business problem and provide a logical solution"
- "Prove this mathematical theorem step by step"
- "Deduce the root cause of this system failure"

---

#### 5. Document Analysis & Summarization
**Best Model:** Gemini 2.5 Pro  
**Why:** 2M token context window handles very long documents  
**Keywords:** summarize document, analyze document, extract from, review document  
**Patterns:** `/summarize.*document/i`, `/analyze.*pdf/i`, `/extract.*information/i`  
**Cost:** $1.25 input / $10.00 output per 1M tokens  
**Context Threshold:** Automatically selected when input > 50,000 tokens  

**Example Prompts:**
- "Summarize this 100-page legal document"
- "Extract key findings from this research paper"
- "Analyze this contract and highlight important clauses"

---

#### 6. Creative Writing
**Best Model:** GPT-4o  
**Why:** Best for creative, engaging, human-like content  
**Keywords:** write story, create content, blog post, article, creative  
**Patterns:** `/write.*story/i`, `/creative.*writing/i`, `/blog.*post/i`  
**Cost:** $2.50 input / $10.00 output per 1M tokens  

**Example Prompts:**
- "Write a short story about a time traveler"
- "Create a blog post about AI trends in 2026"
- "Write engaging product descriptions for an e-commerce site"

---

#### 7. Translation
**Best Model:** GPT-4o-mini  
**Why:** Simple task, cost-effective model is sufficient  
**Keywords:** translate, translation, convert to  
**Patterns:** `/translate.*to/i`, `/translation/i`  
**Cost:** $0.15 input / $0.60 output per 1M tokens  

**Example Prompts:**
- "Translate this text to Spanish"
- "Convert this document from English to French"
- "Translate: Hello, how are you?"

---

#### 8. Simple Chat & Conversation
**Best Model:** GPT-4o-mini  
**Why:** Fast, cost-effective for basic interactions  
**Keywords:** hello, hi, how are you, thanks, thank you, help  
**Patterns:** `/^(hi|hello|hey)/i`, `/how.*are.*you/i`, `/thank/i`  
**Cost:** $0.15 input / $0.60 output per 1M tokens  

**Example Prompts:**
- "Hi, how are you?"
- "Thanks for your help!"
- "Can you help me with something?"

---

#### 9. Data Extraction & Parsing
**Best Model:** GPT-4o-mini  
**Why:** Structured tasks work well with cost-effective models  
**Keywords:** extract, parse, get data from, scrape, pull data  
**Patterns:** `/extract.*from/i`, `/parse.*json/i`, `/get.*data/i`  
**Cost:** $0.15 input / $0.60 output per 1M tokens  

**Example Prompts:**
- "Extract all email addresses from this text"
- "Parse this JSON and get the user names"
- "Pull all dates from this document"

---

#### 10. Chinese Language Tasks
**Best Model:** Kimi (Moonshot v1-32k)  
**Why:** Optimized specifically for Chinese language understanding  
**Keywords:** 中文, 汉语, 普通话, Chinese  
**Patterns:** `/[\u4e00-\u9fa5]/` (Chinese characters)  
**Cost:** $0.50 input / $0.50 output per 1M tokens  

**Example Prompts:**
- "请帮我写一个排序算法" (Write a sorting algorithm)
- "翻译这段文字" (Translate this text)
- "分析这份中文文档" (Analyze this Chinese document)

---

#### 11. Question Answering (Factual)
**Best Model:** GPT-4o-mini  
**Why:** Fast, accurate for straightforward factual questions  
**Keywords:** what is, who is, when did, where is, how many  
**Patterns:** `/^(what|who|when|where|how|why)/i`  
**Cost:** $0.15 input / $0.60 output per 1M tokens  

**Example Prompts:**
- "What is the capital of France?"
- "Who invented the telephone?"
- "When did World War II end?"

---

#### 12. Technical Documentation
**Best Model:** Claude 3.5 Sonnet  
**Why:** Excellent at technical writing and documentation  
**Keywords:** document, documentation, API docs, technical writing  
**Patterns:** `/write.*documentation/i`, `/create.*docs/i`  
**Cost:** $3.00 input / $15.00 output per 1M tokens  

**Example Prompts:**
- "Write API documentation for this function"
- "Create technical documentation for this system"
- "Document this codebase"

---

## Quick Start

### Basic Setup

```javascript
const { 
  createModelRouter, 
  patchGlobalFetch,
  registerApiKeys 
} = require("tokenfirewall");

// Step 1: Register API keys for all providers
registerApiKeys({
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  grok: process.env.GROK_API_KEY,
  kimi: process.env.KIMI_API_KEY
});

// Step 2: Enable smart model selection
createModelRouter({
  strategy: "smart",  // Use task-type based routing
  enableCrossProvider: true  // Enable cross-provider fallback
});

// Step 3: Patch global fetch
patchGlobalFetch();

// Step 4: Use any LLM API - routing is automatic!
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "gpt-4o",  // This will be automatically replaced with optimal model
    messages: [
      { role: "user", content: "Write a Python function to sort an array" }
    ]
  })
});

// Behind the scenes:
// 1. Detects task type: "code_generation"
// 2. Selects optimal model: "claude-3-5-sonnet-20241022"
// 3. Routes to Anthropic API
// 4. Returns response in OpenAI format
// 5. Logs decision for analytics
```

### With Budget Protection

```javascript
const { 
  createBudgetGuard,
  createModelRouter, 
  patchGlobalFetch 
} = require("tokenfirewall");

// Set budget limit
createBudgetGuard({
  monthlyLimit: 100,  // $100 USD
  mode: "block"
});

// Enable smart routing
createModelRouter({
  strategy: "smart"
});

patchGlobalFetch();

// Now you have:
// ✅ Automatic task-based routing
// ✅ Budget protection
// ✅ Cost optimization
// ✅ Quality improvement
```

---

## Configuration

### Full Configuration Options

```javascript
createModelRouter({
  strategy: "smart",
  
  // Optional: Customize task classifications
  taskClassification: {
    "code_generation": {
      model: "claude-3-5-sonnet-20241022",
      reason: "Claude excels at code generation",
      keywords: ["write code", "create function", "implement"],
      patterns: [/write.*code/i, /create.*function/i],
      priority: 10  // Higher priority = checked first
    },
    
    "math_reasoning": {
      model: "o1-mini",
      reason: "o1 designed for reasoning",
      keywords: ["calculate", "solve", "equation"],
      patterns: [/solve.*equation/i, /calculate/i],
      priority: 9
    },
    
    // Add your custom task types
    "legal_analysis": {
      model: "gpt-4o",
      reason: "Complex legal reasoning",
      keywords: ["legal", "contract", "clause"],
      patterns: [/legal.*analysis/i],
      priority: 8
    }
  },
  
  // Optional: Override specific models
  modelOverrides: {
    "code_generation": "gpt-4o",  // Use GPT-4o instead of Claude
    "math_reasoning": "o1"         // Use o1 instead of o1-mini
  },
  
  // Optional: Confidence threshold (0-1)
  confidenceThreshold: 0.7,  // Only route if confidence > 70%
  
  // Optional: Fallback model if no task detected
  defaultModel: "gpt-4o-mini",
  
  // Optional: Enable cross-provider fallback
  enableCrossProvider: true,
  
  // Optional: Max retries
  maxRetries: 2,
  
  // Optional: Enable analytics
  enableAnalytics: true,
  
  // Optional: Custom task detector function
  customDetector: async (prompt, context) => {
    // Your custom logic here
    if (prompt.includes("urgent")) {
      return {
        taskType: "urgent_request",
        model: "gpt-4o",
        confidence: 1.0
      };
    }
    return null;  // Fall back to default detection
  }
});
```

### Environment-Based Configuration

```javascript
const config = {
  strategy: "smart",
  taskClassification: {
    "code_generation": {
      model: process.env.NODE_ENV === "production" 
        ? "claude-3-5-sonnet-20241022"  // Best quality for production
        : "gpt-4o-mini",                 // Cheaper for development
      reason: "Environment-based selection"
    }
  }
};

createModelRouter(config);
```

---

## Task Detection Methods

### 1. Keyword Matching

Simple string matching for common task indicators:

```javascript
// Prompt: "Write a Python function to sort arrays"
// Keywords detected: ["write", "function"]
// Match: code_generation
// Confidence: 85%
```

**Pros:** Fast, simple, reliable  
**Cons:** Can miss context, may have false positives  

---

### 2. Pattern Matching (Regex)

Advanced pattern detection using regular expressions:

```javascript
// Prompt: "Can you help me solve this equation: 2x + 5 = 15"
// Pattern matched: /solve.*equation/i
// Match: math_reasoning
// Confidence: 95%
```

**Pros:** More accurate, handles variations  
**Cons:** Requires careful pattern design  

---

### 3. Semantic Analysis

Analyzes the meaning and intent of the prompt:

```javascript
// Prompt: "I need help fixing this bug in my code"
// Semantic analysis: 
//   - Intent: debugging
//   - Domain: programming
//   - Action: fix/repair
// Match: code_review
// Confidence: 90%
```

**Pros:** Understands context and intent  
**Cons:** More computationally expensive  

---

### 4. Context Analysis

Considers conversation history and context:

```javascript
// Previous messages:
// User: "I'm building a React application"
// Assistant: "Great! What features do you need?"
// Current: "Add a login form"

// Context analysis:
//   - Previous context: React development
//   - Current request: Add feature
//   - Inferred task: code_generation
// Match: code_generation
// Confidence: 92%
```

**Pros:** Highly accurate with context  
**Cons:** Requires conversation history  

---

### 5. Language Detection

Automatically detects non-English languages:

```javascript
// Prompt: "请帮我写一个排序算法"
// Language detected: Chinese (zh-CN)
// Characters: [\u4e00-\u9fa5]
// Match: chinese_language
// Confidence: 99%
```

**Pros:** Perfect for multilingual apps  
**Cons:** Limited to language-specific tasks  

---

### 6. Multi-Method Fusion

Combines multiple detection methods for highest accuracy:

```javascript
// Prompt: "Write a Python function to solve quadratic equations"

// Method 1 - Keywords: ["write", "function"] → code_generation (70%)
// Method 2 - Pattern: /solve.*equation/i → math_reasoning (80%)
// Method 3 - Semantic: Programming + Math → hybrid (85%)

// Fusion Result:
//   Primary: code_generation (60% weight)
//   Secondary: math_reasoning (40% weight)
//   Selected: code_generation (Claude)
//   Fallback: math_reasoning (o1-mini)
// Final Confidence: 88%
```

**Pros:** Highest accuracy, handles edge cases  
**Cons:** Most complex, slightly slower  

---

## Real-World Examples

### Example 1: Code Generation Task

```javascript
// User Request
const prompt = "Write a Python function to validate email addresses using regex";

// Task Detection
// ✓ Keywords: ["write", "function", "python"] → code_generation
// ✓ Pattern: /write.*function/i → code_generation
// ✓ Confidence: 95%

// Model Selection
// Selected: claude-3-5-sonnet-20241022
// Reason: "Claude excels at code generation"
// Cost: $3.00 input / $15.00 output per 1M tokens

// Result
// ✅ High-quality, well-documented code
// ✅ Proper error handling
// ✅ Best practices followed
// ✅ Cost: ~$0.003 for this request

// vs if we used gpt-4o-mini:
// ⚠️ Cost: $0.0002 (cheaper)
// ❌ Lower code quality
// ❌ Less robust error handling
```

---

### Example 2: Math Problem

```javascript
// User Request
const prompt = "Solve this calculus problem: Find the derivative of f(x) = x³ + 2x² - 5x + 7";

// Task Detection
// ✓ Keywords: ["solve", "derivative", "calculus"] → math_reasoning
// ✓ Pattern: /solve.*calculus/i → math_reasoning
// ✓ Confidence: 98%

// Model Selection
// Selected: o1-mini
// Reason: "o1 models designed for mathematical reasoning"
// Cost: $3.00 input / $12.00 output per 1M tokens

// Result
// ✅ Step-by-step solution
// ✅ Chain-of-thought reasoning
// ✅ Correct answer: f'(x) = 3x² + 4x - 5
// ✅ Cost: ~$0.006 for this request

// vs if we used gpt-4o-mini:
// ❌ May make calculation errors
// ❌ No step-by-step reasoning
// ❌ Less reliable for complex math
```

---

### Example 3: Document Summarization

```javascript
// User Request
const prompt = "Summarize this 100-page legal contract: [150,000 tokens of text]";

// Task Detection
// ✓ Keywords: ["summarize", "document", "legal"] → document_analysis
// ✓ Context size: 150,000 tokens
// ✓ Confidence: 92%

// Model Selection
// Selected: gemini-2.5-pro
// Reason: "Gemini has 2M token context window"
// Cost: $1.25 input / $10.00 output per 1M tokens

// Result
// ✅ Processes entire document (no chunking needed)
// ✅ Comprehensive summary
// ✅ Identifies key clauses
// ✅ Cost: ~$0.30 for this request

// vs if we used gpt-4o:
// ❌ Context limit: 128K tokens
// ❌ Would fail or need chunking
// ❌ Incomplete analysis
// ❌ Higher cost per token
```

---

### Example 4: Simple Conversation

```javascript
// User Request
const prompt = "Hi, how are you today?";

// Task Detection
// ✓ Keywords: ["hi", "how are you"] → simple_chat
// ✓ Pattern: /^(hi|hello)/i → simple_chat
// ✓ Confidence: 99%

// Model Selection
// Selected: gpt-4o-mini
// Reason: "Cost-effective for simple conversation"
// Cost: $0.15 input / $0.60 output per 1M tokens

// Result
// ✅ Perfect for simple greeting
// ✅ Fast response
// ✅ Cost: ~$0.00005 for this request

// vs if we used gpt-4o:
// ⚠️ Cost: $0.0008 (16x more expensive!)
// ⚠️ Overkill for simple greeting
// ⚠️ No quality benefit
```

---

### Example 5: Hybrid Task (Code + Math)

```javascript
// User Request
const prompt = "Write a Python function to solve quadratic equations and explain the math";

// Task Detection
// ✓ Keywords: ["write", "function", "solve", "equation"] → hybrid
// ✓ Primary: code_generation (60% confidence)
// ✓ Secondary: math_reasoning (40% confidence)

// Model Selection
// Selected: claude-3-5-sonnet-20241022
// Reason: "Primary task is code generation"
// Fallback: o1-mini (if Claude fails)

// Result
// ✅ Well-structured Python function
// ✅ Mathematical explanation included
// ✅ Best of both worlds
// ✅ Cost: ~$0.004 for this request
```

---

## API Reference

### Core Functions

#### `createModelRouter(options)`

Creates and configures the smart model router.

**Parameters:**

```typescript
interface SmartRouterOptions {
  strategy: "smart";
  taskClassification?: TaskClassificationConfig;
  modelOverrides?: Record<string, string>;
  confidenceThreshold?: number;
  defaultModel?: string;
  enableCrossProvider?: boolean;
  maxRetries?: number;
  enableAnalytics?: boolean;
  customDetector?: (prompt: string, context: any) => Promise<TaskDetection | null>;
}
```

**Example:**

```javascript
createModelRouter({
  strategy: "smart",
  confidenceThreshold: 0.75,
  defaultModel: "gpt-4o-mini",
  enableAnalytics: true
});
```

---

#### `classifyTask(prompt, context?)`

Manually classify a task type.

**Parameters:**
- `prompt` (string): The user's prompt
- `context` (object, optional): Additional context (conversation history, metadata)

**Returns:**

```typescript
interface TaskClassification {
  taskType: string;
  confidence: number;
  selectedModel: string;
  reason: string;
  alternatives: Array<{
    model: string;
    confidence: number;
  }>;
}
```

**Example:**

```javascript
const classification = await classifyTask(
  "Write a Python function to sort arrays",
  { conversationHistory: [...] }
);

console.log(classification);
// {
//   taskType: "code_generation",
//   confidence: 0.95,
//   selectedModel: "claude-3-5-sonnet-20241022",
//   reason: "Claude excels at code generation",
//   alternatives: [
//     { model: "gpt-4o", confidence: 0.75 },
//     { model: "gpt-4o-mini", confidence: 0.50 }
//   ]
// }
```

---

#### `overrideTaskType(taskType)`

Manually override the task type for the next request.

**Parameters:**
- `taskType` (string): The task type to use

**Example:**

```javascript
// Force code generation model
overrideTaskType("code_generation");

// Next request will use Claude regardless of content
const response = await fetch(url, { ... });
```

---

#### `getTaskAnalytics(options)`

Get analytics about task classification and model usage.

**Parameters:**

```typescript
interface AnalyticsOptions {
  startDate?: string;
  endDate?: string;
  groupBy?: "day" | "week" | "month" | "task" | "model";
}
```

**Returns:**

```typescript
interface TaskAnalytics {
  totalRequests: number;
  taskDistribution: Record<string, number>;
  modelUsage: Record<string, number>;
  costSavings: number;
  averageCostPerRequest: number;
  accuracyRate: number;
  topTasks: Array<{ task: string; count: number; percentage: number }>;
}
```

**Example:**

```javascript
const analytics = await getTaskAnalytics({
  startDate: "2026-05-01",
  endDate: "2026-05-27",
  groupBy: "task"
});

console.log(analytics);
// {
//   totalRequests: 100000,
//   taskDistribution: {
//     code_generation: 45000,
//     simple_chat: 30000,
//     math_reasoning: 15000,
//     document_analysis: 10000
//   },
//   modelUsage: {
//     "claude-3-5-sonnet": 45000,
//     "gpt-4o-mini": 30000,
//     "o1-mini": 15000,
//     "gemini-2.5-pro": 10000
//   },
//   costSavings: 1250.00,
//   averageCostPerRequest: 0.00035,
//   accuracyRate: 0.94
// }
```

---

### Request Headers

#### Override Task Type

Force a specific task type for a single request:

```javascript
const response = await fetch(url, {
  headers: {
    "X-TokenFirewall-Task-Type": "code_generation"
  }
});
```

#### Disable Smart Routing

Disable smart routing for a single request:

```javascript
const response = await fetch(url, {
  headers: {
    "X-TokenFirewall-Smart-Routing": "false"
  }
});
```

#### Add Custom Tags

Add custom tags for analytics:

```javascript
const response = await fetch(url, {
  headers: {
    "X-TokenFirewall-Tags": JSON.stringify({
      feature: "chat",
      team: "product",
      priority: "high"
    })
  }
});
```

---

## Analytics & Monitoring

### Real-Time Monitoring

```javascript
// Enable real-time logging
createModelRouter({
  strategy: "smart",
  enableAnalytics: true,
  onTaskDetected: (detection) => {
    console.log(`Task: ${detection.taskType}`);
    console.log(`Model: ${detection.selectedModel}`);
    console.log(`Confidence: ${detection.confidence}`);
  },
  onModelSelected: (selection) => {
    console.log(`Routing to: ${selection.model}`);
    console.log(`Reason: ${selection.reason}`);
  }
});
```

### Dashboard Metrics

Track key metrics for optimization:

```javascript
const metrics = await getSmartRoutingMetrics();

console.log(metrics);
// {
//   last24Hours: {
//     totalRequests: 5000,
//     costSavings: 45.50,
//     averageConfidence: 0.89,
//     taskBreakdown: {
//       code_generation: 2250,
//       simple_chat: 1500,
//       math_reasoning: 750,
//       document_analysis: 500
//     }
//   },
//   last7Days: {
//     totalRequests: 35000,
//     costSavings: 318.50,
//     topModels: [
//       { model: "claude-3-5-sonnet", usage: 15750 },
//       { model: "gpt-4o-mini", usage: 10500 },
//       { model: "o1-mini", usage: 5250 }
//     ]
//   },
//   last30Days: {
//     totalRequests: 150000,
//     costSavings: 1365.00,
//     savingsPercentage: 62.3
//   }
// }
```

### Export Analytics

Export data for external analysis:

```javascript
const data = await exportTaskAnalytics({
  format: "csv",  // or "json", "xlsx"
  startDate: "2026-05-01",
  endDate: "2026-05-27"
});

// Save to file
fs.writeFileSync("task-analytics.csv", data);
```

---

## Cost Savings Analysis

### Scenario 1: AI Development Platform

**Profile:**
- 100,000 requests/month
- Mix of code, chat, and documentation tasks

**Without Smart Selection:**
| Task Type | Requests | Model | Cost per Request | Total Cost |
|-----------|----------|-------|------------------|------------|
| All tasks | 100,000 | GPT-4o | $0.009 | $900.00 |

**With Smart Selection:**
| Task Type | Requests | Model | Cost per Request | Total Cost |
|-----------|----------|-------|------------------|------------|
| Code Generation | 40,000 | Claude | $0.003 | $120.00 |
| Simple Chat | 30,000 | GPT-4o-mini | $0.0003 | $9.00 |
| Math/Reasoning | 15,000 | o1-mini | $0.006 | $90.00 |
| Document Analysis | 10,000 | Gemini | $0.0125 | $125.00 |
| Translation | 5,000 | GPT-4o-mini | $0.0003 | $1.50 |
| **TOTAL** | **100,000** | **Mixed** | **$0.00346** | **$345.50** |

**💰 Monthly Savings: $554.50 (62% reduction)**  
**📈 Quality: Improved (right model for each task)**

---

### Scenario 2: Customer Support Chatbot

**Profile:**
- 50,000 requests/month
- Mostly simple questions, some complex issues

**Without Smart Selection:**
| Task Type | Requests | Model | Cost per Request | Total Cost |
|-----------|----------|-------|------------------|------------|
| All tasks | 50,000 | GPT-4o | $0.003 | $150.00 |

**With Smart Selection:**
| Task Type | Requests | Model | Cost per Request | Total Cost |
|-----------|----------|-------|------------------|------------|
| Simple FAQ | 35,000 | GPT-4o-mini | $0.0002 | $7.00 |
| Medium Complexity | 10,000 | GPT-4o-mini | $0.0005 | $5.00 |
| Complex Issues | 5,000 | GPT-4o | $0.003 | $15.00 |
| **TOTAL** | **50,000** | **Mixed** | **$0.00054** | **$27.00** |

**💰 Monthly Savings: $123.00 (82% reduction)**  
**📈 Response Time: Faster (cheaper models are faster)**

---

### Scenario 3: Content Creation Platform

**Profile:**
- 20,000 requests/month
- Creative writing, code generation, translations

**Without Smart Selection:**
| Task Type | Requests | Model | Cost per Request | Total Cost |
|-----------|----------|-------|------------------|------------|
| All tasks | 20,000 | GPT-4o | $0.015 | $300.00 |

**With Smart Selection:**
| Task Type | Requests | Model | Cost per Request | Total Cost |
|-----------|----------|-------|------------------|------------|
| Creative Writing | 8,000 | GPT-4o | $0.015 | $120.00 |
| Code Generation | 6,000 | Claude | $0.008 | $48.00 |
| Translation | 4,000 | GPT-4o-mini | $0.0005 | $2.00 |
| Simple Edits | 2,000 | GPT-4o-mini | $0.0003 | $0.60 |
| **TOTAL** | **20,000** | **Mixed** | **$0.00853** | **$170.60** |

**💰 Monthly Savings: $129.40 (43% reduction)**  
**📈 Quality: Same or better (specialized models)**

---

## Best Practices

### 1. Start with Default Configuration

Begin with built-in task classifications:

```javascript
createModelRouter({
  strategy: "smart"
  // Use defaults first
});
```

Monitor for 1-2 weeks, then customize based on your specific needs.

---

### 2. Use Confidence Thresholds

Set appropriate confidence levels:

```javascript
createModelRouter({
  strategy: "smart",
  confidenceThreshold: 0.75,  // Only route if 75%+ confident
  defaultModel: "gpt-4o-mini"  // Fallback for low confidence
});
```

**Recommended thresholds:**
- Production: 0.75-0.85 (higher accuracy)
- Development: 0.60-0.70 (more experimentation)

---

### 3. Monitor and Adjust

Regularly review analytics:

```javascript
// Weekly review
const analytics = await getTaskAnalytics({
  startDate: lastWeek,
  endDate: today
});

// Check accuracy
if (analytics.accuracyRate < 0.85) {
  console.warn("Low accuracy - review task classifications");
}

// Check cost savings
console.log(`Saved: $${analytics.costSavings.toFixed(2)}`);
```

---

### 4. Use Custom Tags for Tracking

Tag requests for better analytics:

```javascript
await fetch(url, {
  headers: {
    "X-TokenFirewall-Tags": JSON.stringify({
      feature: "chat",
      team: "product",
      customer: "acme-corp",
      priority: "high"
    })
  }
});

// Later, analyze by tag
const costs = await getCostsByTag("customer", "acme-corp");
```

---

### 5. Combine with Budget Protection

Always use budget guards:

```javascript
createBudgetGuard({
  monthlyLimit: 500,
  mode: "block"
});

createModelRouter({
  strategy: "smart"
});

// Now you have:
// ✅ Cost optimization (smart routing)
// ✅ Cost protection (budget guard)
```

---

### 6. Test in Development First

Use environment-based configuration:

```javascript
const config = {
  strategy: "smart",
  confidenceThreshold: process.env.NODE_ENV === "production" ? 0.80 : 0.60,
  enableAnalytics: true
};

createModelRouter(config);
```

---

### 7. Handle Edge Cases

Provide fallbacks for uncertain tasks:

```javascript
createModelRouter({
  strategy: "smart",
  defaultModel: "gpt-4o-mini",  // Safe, cheap default
  customDetector: async (prompt) => {
    // Handle special cases
    if (prompt.includes("URGENT")) {
      return {
        taskType: "urgent",
        model: "gpt-4o",
        confidence: 1.0
      };
    }
    return null;  // Use default detection
  }
});
```

---

### 8. Document Your Custom Tasks

Keep track of custom task types:

```javascript
// tasks.config.js
module.exports = {
  taskClassification: {
    "legal_analysis": {
      model: "gpt-4o",
      reason: "Complex legal reasoning required",
      keywords: ["legal", "contract", "clause"],
      // Document why this exists
      notes: "Added for legal team - requires high accuracy"
    }
  }
};
```

---

## Advanced Usage

### Multi-Task Detection

Handle prompts with multiple task types:

```javascript
createModelRouter({
  strategy: "smart",
  multiTaskHandling: "primary",  // or "hybrid", "split"
  
  customDetector: async (prompt) => {
    const tasks = await detectMultipleTasks(prompt);
    
    if (tasks.length > 1) {
      // Primary task approach
      return tasks[0];  // Use highest confidence
      
      // Or hybrid approach
      return {
        taskType: "hybrid",
        model: selectBestForHybrid(tasks),
        confidence: averageConfidence(tasks)
      };
    }
    
    return null;
  }
});
```

---

### Context-Aware Routing

Use conversation history for better detection:

```javascript
const conversationHistory = [
  { role: "user", content: "I'm building a React app" },
  { role: "assistant", content: "Great! What features do you need?" }
];

const response = await fetch(url, {
  headers: {
    "X-TokenFirewall-Context": JSON.stringify(conversationHistory)
  },
  body: JSON.stringify({
    messages: [
      ...conversationHistory,
      { role: "user", content: "Add authentication" }
    ]
  })
});

// Detection will use context:
// Previous: React app development
// Current: Add authentication
// Inferred: code_generation → Claude
```

---

### A/B Testing Models

Test different models for the same task:

```javascript
createModelRouter({
  strategy: "smart",
  abTesting: {
    enabled: true,
    tasks: {
      "code_generation": {
        variants: [
          { model: "claude-3-5-sonnet", weight: 0.7 },
          { model: "gpt-4o", weight: 0.3 }
        ]
      }
    }
  }
});

// 70% of code generation → Claude
// 30% of code generation → GPT-4o
// Track which performs better
```

---

### Cost-Based Overrides

Override based on cost thresholds:

```javascript
createModelRouter({
  strategy: "smart",
  costOverrides: {
    maxCostPerRequest: 0.01,  // $0.01 max
    fallbackModel: "gpt-4o-mini"
  },
  
  customDetector: async (prompt) => {
    const detection = await defaultDetection(prompt);
    const estimatedCost = estimateCost(detection.model, prompt);
    
    if (estimatedCost > 0.01) {
      return {
        taskType: detection.taskType,
        model: "gpt-4o-mini",  // Downgrade to cheaper
        confidence: detection.confidence,
        reason: "Cost threshold exceeded"
      };
    }
    
    return detection;
  }
});
```

---

### Quality-Based Selection

Route based on quality requirements:

```javascript
await fetch(url, {
  headers: {
    "X-TokenFirewall-Quality": "high"  // or "medium", "low"
  }
});

// High quality → Use premium models
// Medium quality → Use balanced models
// Low quality → Use cheap models
```

---

## Troubleshooting

### Issue: Low Confidence Scores

**Symptom:** Many requests falling back to default model

**Solutions:**
1. Add more keywords to task definitions
2. Add more regex patterns
3. Lower confidence threshold
4. Add custom detector for your specific use case

```javascript
createModelRouter({
  strategy: "smart",
  confidenceThreshold: 0.65,  // Lower threshold
  taskClassification: {
    "your_task": {
      keywords: ["more", "keywords", "here"],
      patterns: [/more.*patterns/i]
    }
  }
});
```

---

### Issue: Wrong Model Selected

**Symptom:** Task classified incorrectly

**Solutions:**
1. Check keyword conflicts between tasks
2. Add more specific patterns
3. Use manual override for specific requests
4. Review analytics to find patterns

```javascript
// Manual override
await fetch(url, {
  headers: {
    "X-TokenFirewall-Task-Type": "correct_task_type"
  }
});
```

---

### Issue: High Costs Despite Smart Routing

**Symptom:** Costs not decreasing as expected

**Solutions:**
1. Review task distribution in analytics
2. Check if expensive models are being overused
3. Adjust task classifications
4. Add cost-based overrides

```javascript
const analytics = await getTaskAnalytics();
console.log(analytics.modelUsage);
// Check if expensive models dominate
```

---

### Issue: Slow Response Times

**Symptom:** Requests taking longer than expected

**Solutions:**
1. Task detection adds minimal overhead (<10ms)
2. Check if using expensive models unnecessarily
3. Consider caching task classifications
4. Use faster models for time-sensitive tasks

```javascript
createModelRouter({
  strategy: "smart",
  cacheDetections: true,  // Cache for 5 minutes
  taskClassification: {
    "time_sensitive": {
      model: "gpt-4o-mini",  // Fastest model
      keywords: ["urgent", "quick", "fast"]
    }
  }
});
```

---

## Conclusion

Smart Model Selection transforms how you use LLMs by:

✅ **Reducing costs by 50-90%** through intelligent routing  
✅ **Improving quality** by using specialized models  
✅ **Increasing reliability** with appropriate model selection  
✅ **Providing insights** through comprehensive analytics  
✅ **Requiring zero code changes** - drop-in solution  

### Next Steps

1. **Install TokenFirewall**
   ```bash
   npm install tokenfirewall@latest
   ```

2. **Enable Smart Routing**
   ```javascript
   createModelRouter({ strategy: "smart" });
   ```

3. **Monitor Results**
   ```javascript
   const analytics = await getTaskAnalytics();
   ```

4. **Optimize & Iterate**
   - Review analytics weekly
   - Adjust task classifications
   - Add custom tasks as needed

---

## Support & Resources

- **GitHub:** https://github.com/Ruthwik000/tokenfirewall
- **npm:** https://www.npmjs.com/package/tokenfirewall
- **Documentation:** See README.md
- **Issues:** https://github.com/Ruthwik000/tokenfirewall/issues
- **Examples:** See examples/ directory

---

Built with ❤️ for the AI developer community.

**TokenFirewall - Smart Model Selection for Production LLM Applications**
