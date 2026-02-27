# TokenFirewall

Enterprise-grade LLM cost enforcement middleware for Node.js with automatic budget protection, intelligent model routing, and comprehensive multi-provider support.

[![npm version](https://img.shields.io/npm/v/tokenfirewall.svg?style=flat-square)](https://www.npmjs.com/package/tokenfirewall)
[![npm downloads](https://img.shields.io/npm/dm/tokenfirewall.svg?style=flat-square)](https://www.npmjs.com/package/tokenfirewall)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg?style=flat-square)](https://www.typescriptlang.org/)

## Overview

TokenFirewall is a production-ready middleware that automatically tracks and enforces budget limits for Large Language Model (LLM) API calls. It provides transparent cost monitoring, prevents budget overruns, intelligent model routing with automatic failover, and supports multiple providers through a unified interface.

### Key Features

- **Never Exceed Your Budget** - Automatically blocks API calls when spending limits are reached, preventing surprise bills
- **Zero Code Changes Required** - Drop-in middleware that works with any LLM API without modifying your existing code
- **Automatic Failover** - Intelligent router switches to backup models when primary fails, keeping your app running
- **Real-time Cost Tracking** - See exactly how much each API call costs based on actual token usage
- **Multi-Provider Support** - Works with OpenAI, Anthropic, Gemini, Grok, Kimi, and any custom LLM provider
- **Custom Model Support** - Register your own models with custom pricing and context limits at runtime
- **Production Ready** - Battle-tested with comprehensive error handling and edge case coverage
- **TypeScript Native** - Full type safety with included definitions

### What's New in v2.0.0

- **Intelligent Router** - Automatic failover to backup models when API calls fail
- **40+ Latest Models** - GPT-5, Claude 4.5, Gemini 3, with accurate 2026 pricing
- **Dynamic Registration** - Add custom models and pricing at runtime
- **Production Hardened** - Comprehensive validation, error handling, and edge case coverage

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Intelligent Model Router](#intelligent-model-router)
- [Dynamic Model Registration](#dynamic-model-registration)
- [Supported Providers](#supported-providers)
- [Examples](#examples)
- [TypeScript Support](#typescript-support)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [License](#license)

---

## Installation

```bash
npm install tokenfirewall
```

**Requirements:**
- Node.js >= 16.0.0
- TypeScript >= 5.0.0 (for TypeScript projects)

---

## Quick Start

```javascript
const { createBudgetGuard, patchGlobalFetch } = require("tokenfirewall");

// Step 1: Set up budget protection
createBudgetGuard({
  monthlyLimit: 100,  // $100 USD
  mode: "block"       // Throw error when exceeded
});

// Step 2: Patch global fetch
patchGlobalFetch();

// Step 3: Use any LLM API normally
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Hello!" }]
  })
});

// Costs are automatically tracked and logged
```

---

## Core Concepts

### Budget Guard

The Budget Guard tracks spending and enforces limits in two modes:

- **Block Mode** (`mode: "block"`): Throws an error when budget is exceeded, preventing the API call
- **Warn Mode** (`mode: "warn"`): Logs a warning but allows the API call to proceed

### Automatic Interception

TokenFirewall intercepts HTTP requests at the `fetch` level, automatically:
1. Detecting LLM API responses
2. Extracting token usage information
3. Calculating costs based on provider pricing
4. Tracking against your budget
5. Logging usage details

### Provider Adapters

Each LLM provider has a dedicated adapter that:
- Detects provider-specific response formats
- Normalizes token usage data
- Applies correct pricing models

---

## API Reference

### Budget Management

#### `createBudgetGuard(options)`

Creates and configures a budget guard instance.

**Parameters:**

```typescript
interface BudgetGuardOptions {
  monthlyLimit: number;           // Maximum spending limit in USD
  mode?: "block" | "warn";        // Enforcement mode (default: "block")
}
```

**Example:**

```javascript
const { createBudgetGuard } = require("tokenfirewall");

// Block mode - strict enforcement
createBudgetGuard({
  monthlyLimit: 100,
  mode: "block"
});

// Warn mode - soft limits
createBudgetGuard({
  monthlyLimit: 500,
  mode: "warn"
});
```

---

#### `getBudgetStatus()`

Retrieves the current budget status and usage statistics.

**Returns:**

```typescript
interface BudgetStatus {
  totalSpent: number;      // Total amount spent in USD
  limit: number;           // Monthly limit in USD
  remaining: number;       // Remaining budget in USD
  percentageUsed: number;  // Percentage of budget used (0-100)
}
```

**Example:**

```javascript
const { getBudgetStatus } = require("tokenfirewall");

const status = getBudgetStatus();
if (status) {
  console.log(`Spent: $${status.totalSpent.toFixed(2)}`);
  console.log(`Remaining: $${status.remaining.toFixed(2)}`);
  console.log(`Usage: ${status.percentageUsed.toFixed(1)}%`);
}
```

---

#### `resetBudget()`

Resets the budget tracking to zero.

```javascript
const { resetBudget } = require("tokenfirewall");

// Reset at the start of each month
resetBudget();
```

---

#### `exportBudgetState()` / `importBudgetState(state)`

Save and restore budget state for persistence.

```javascript
const { exportBudgetState, importBudgetState } = require("tokenfirewall");
const fs = require("fs");

// Export state
const state = exportBudgetState();
fs.writeFileSync("budget.json", JSON.stringify(state));

// Import state
const savedState = JSON.parse(fs.readFileSync("budget.json"));
importBudgetState(savedState);
```

---

### Interception

#### `patchGlobalFetch()`

Patches the global `fetch` function to intercept and track LLM API calls.

```javascript
const { patchGlobalFetch } = require("tokenfirewall");

patchGlobalFetch();

// All subsequent fetch calls are intercepted
```

---

### Model Discovery

#### `listModels(options)`

Lists available models from a provider with context limits and budget information.

**Parameters:**

```typescript
interface ListModelsOptions {
  provider: string;                  // Provider name
  apiKey: string;                    // Provider API key
  baseURL?: string;                  // Custom API endpoint
  includeBudgetUsage?: boolean;      // Include budget usage %
}
```

**Example:**

```javascript
const { listModels } = require("tokenfirewall");

const models = await listModels({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY,
  includeBudgetUsage: true
});

models.forEach(model => {
  console.log(`${model.model}: ${model.contextLimit} tokens`);
});
```

---

## Intelligent Model Router

The Model Router provides automatic retry and model switching on failures.

### `createModelRouter(options)`

Creates and configures an intelligent model router.

**Parameters:**

```typescript
interface ModelRouterOptions {
  strategy: "fallback" | "context" | "cost";  // Routing strategy
  fallbackMap?: Record<string, string[]>;     // Fallback model map
  maxRetries?: number;                        // Max retry attempts (default: 1)
}
```

**Example:**

```javascript
const { createModelRouter, patchGlobalFetch } = require("tokenfirewall");

// Fallback strategy - use predefined fallback models
createModelRouter({
  strategy: "fallback",
  fallbackMap: {
    "gpt-4o": ["gpt-4o-mini", "gpt-3.5-turbo"],
    "claude-3-5-sonnet-20241022": ["claude-3-5-haiku-20241022"]
  },
  maxRetries: 2
});

patchGlobalFetch();

// API calls will automatically retry with fallback models on failure
```

### Routing Strategies

**1. Fallback Strategy** - Uses predefined fallback map
- Tries models in order from fallbackMap
- Best for: Known model preferences, production resilience

**2. Context Strategy** - Upgrades to larger context window
- Only triggers on context overflow errors
- Selects model with larger context from same provider
- Best for: Handling variable input sizes

**3. Cost Strategy** - Switches to cheaper model
- Selects cheaper model from same provider
- Best for: Cost optimization, rate limit handling

### Error Detection

The router automatically detects and classifies failures:
- `rate_limit` - HTTP 429 or rate limit errors
- `context_overflow` - Context length exceeded errors
- `model_unavailable` - HTTP 404 or model not found
- `access_denied` - HTTP 403 or unauthorized
- `unknown` - Other errors

### `disableModelRouter()`

Disables the model router.

```javascript
const { disableModelRouter } = require("tokenfirewall");

disableModelRouter();
```

---

## Dynamic Model Registration

Register models with pricing and context limits at runtime.

### `registerModels(provider, models)`

Bulk register models for a provider.

**Parameters:**

```typescript
interface ModelConfig {
  name: string;                    // Model identifier
  contextLimit?: number;           // Context window size in tokens
  pricing?: {                      // Pricing per 1M tokens (USD)
    input: number;
    output: number;
  };
}
```

**Example:**

```javascript
const { registerModels, createModelRouter } = require("tokenfirewall");

// Register custom models
registerModels("my-provider", [
  {
    name: "my-large-model",
    contextLimit: 200000,
    pricing: { input: 5.0, output: 15.0 }
  },
  {
    name: "my-small-model",
    contextLimit: 50000,
    pricing: { input: 1.0, output: 3.0 }
  }
]);

// Router will use dynamically registered models
createModelRouter({
  strategy: "cost",
  maxRetries: 2
});
```

### `registerPricing(provider, model, pricing)`

Register custom pricing for a specific model.

```javascript
const { registerPricing } = require("tokenfirewall");

registerPricing("openai", "gpt-5", {
  input: 5.0,   // $5 per 1M input tokens
  output: 15.0  // $15 per 1M output tokens
});
```

### `registerContextLimit(provider, model, contextLimit)`

Register custom context window limit.

```javascript
const { registerContextLimit } = require("tokenfirewall");

registerContextLimit("openai", "gpt-5", 256000);
```

---

## Supported Providers

TokenFirewall includes built-in support for:

| Provider | Models | Pricing | Discovery |
|----------|--------|---------|-----------|
| **OpenAI** | GPT-5, GPT-5-mini, GPT-4.1, GPT-4o, o1, gpt-image-1 | Included | API |
| **Anthropic** | Claude 4.5 (Opus, Sonnet, Haiku), Claude 4, Claude 3.5 | Included | Static |
| **Google Gemini** | Gemini 3, Gemini 3.1, Gemini 2.5, Nano Banana | Included | API |
| **Grok (X.AI)** | Grok 3, Grok 2, Grok Vision | Included | API |
| **Kimi (Moonshot)** | Moonshot v1 (8k, 32k, 128k) | Included | API |
| **Meta** | Llama 3.3, Llama 3.1 | Included | Static |
| **Mistral** | Mistral Large, Mixtral | Included | Static |
| **Cohere** | Command R+, Command R | Included | Static |
| **Custom** | Any LLM API | Register | Custom |

### Pricing (Per 1M Tokens)

**OpenAI:**
- GPT-5: $1.25 / $10.00
- GPT-5-mini: $0.25 / $2.00
- GPT-4.1: $2.00 / $8.00
- GPT-4o: $2.50 / $10.00
- o1: $15.00 / $60.00

**Anthropic:**
- Claude Opus 4.5: $5.00 / $25.00
- Claude Sonnet 4.5: $3.00 / $15.00
- Claude Haiku 4.5: $1.00 / $5.00

**Gemini:**
- Gemini 3 Pro: $2.00 / $12.00
- Gemini 3 Flash: $0.50 / $3.00
- Gemini 2.5 Pro: $1.25 / $10.00
- Gemini 2.5 Flash: $0.30 / $2.50
- Gemini 2.5 Flash Lite: $0.10 / $0.40

*Pricing verified as of February 27, 2026. Standard tier, ≤200K input tokens.*

### Context Limits

- GPT-5: 256K tokens
- GPT-4.1: 200K tokens
- Claude 4.5: 200K tokens
- Gemini 3 Pro: 2M tokens
- o1: 200K tokens

---

## Examples

See the [`examples/`](./examples) directory for complete, runnable examples:

1. **[Basic Usage](./examples/1-basic-usage.js)** - Core functionality and budget protection
2. **[Multiple Providers](./examples/2-multiple-providers.js)** - Unified tracking across providers
3. **[Budget Persistence](./examples/3-budget-persistence.js)** - Save and restore state
4. **[Custom Provider](./examples/4-custom-provider.js)** - Add your own LLM provider
5. **[Model Discovery](./examples/5-model-discovery.js)** - Find and compare models
6. **[Intelligent Routing](./examples/6-intelligent-routing.js)** - Automatic retry and fallback
7. **[Dynamic Models](./examples/7-dynamic-models.js)** - Register models at runtime

---

## TypeScript Support

TokenFirewall is written in TypeScript and includes full type definitions.

```typescript
import {
  createBudgetGuard,
  patchGlobalFetch,
  getBudgetStatus,
  createModelRouter,
  registerModels,
  BudgetGuardOptions,
  BudgetStatus,
  ModelInfo,
  ModelRouterOptions,
  ModelConfig
} from "tokenfirewall";

// Full type safety
const options: BudgetGuardOptions = {
  monthlyLimit: 100,
  mode: "block"
};

createBudgetGuard(options);
patchGlobalFetch();

const status: BudgetStatus | null = getBudgetStatus();
```

---

## Error Handling

TokenFirewall provides clear, actionable error messages:

```javascript
try {
  const response = await fetch(/* ... */);
} catch (error) {
  if (error.message.includes("TokenFirewall: Budget exceeded")) {
    console.error("Monthly budget exhausted");
    // Handle budget limit
  } else if (error.message.includes("TokenFirewall Router: Max routing retries exceeded")) {
    console.error("All fallback models failed");
    // Handle routing failure
  } else {
    console.error("API error:", error.message);
  }
}
```

**Common Errors:**

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Budget exceeded! Would spend $X of $Y limit` | Budget limit reached | Increase limit or wait for reset |
| `monthlyLimit must be a valid number` | Invalid budget configuration | Provide positive number |
| `Max routing retries exceeded` | All fallback models failed | Check API status or fallback map |
| `No pricing found for model "X"` | Unknown model | Register custom pricing |

---

## Best Practices

### 1. Initialize Early

```javascript
// At application startup
createBudgetGuard({ monthlyLimit: 100, mode: "block" });
patchGlobalFetch();
```

### 2. Use Warn Mode in Development

```javascript
const mode = process.env.NODE_ENV === "production" ? "block" : "warn";
createBudgetGuard({ monthlyLimit: 100, mode });
```

### 3. Persist Budget State

```javascript
// Save on exit
process.on("beforeExit", () => {
  const state = exportBudgetState();
  if (state) saveToDatabase(state);
});
```

### 4. Monitor Usage

```javascript
// Alert at 80% usage
const status = getBudgetStatus();
if (status && status.percentageUsed > 80) {
  await sendAlert("Budget usage high");
}
```

### 5. Use Router for Resilience

```javascript
// Automatic fallback on failures
createModelRouter({
  strategy: "fallback",
  fallbackMap: {
    "gpt-4o": ["gpt-4o-mini", "gpt-3.5-turbo"]
  },
  maxRetries: 2
});
```

### 6. Register Models Dynamically

```javascript
// Discover and register models from API
const models = await discoverModels(apiKey);
registerModels("provider", models.map(m => ({
  name: m.id,
  contextLimit: m.context_window,
  pricing: { input: m.input_price, output: m.output_price }
})));
```

---

## License

MIT © [Ruthwik](https://github.com/Ruthwik000)

---

## Links

- **GitHub:** https://github.com/Ruthwik000/tokenfirewall
- **npm:** https://www.npmjs.com/package/tokenfirewall
- **Issues:** https://github.com/Ruthwik000/tokenfirewall/issues
- **Changelog:** [CHANGELOG.md](./CHANGELOG.md)

---

Built with ❤️ for the AI developer community.
