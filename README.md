# TokenFirewall

> Enterprise-grade LLM cost enforcement middleware for Node.js with automatic budget protection, multi-provider support, and intelligent cost tracking.

[![npm version](https://img.shields.io/npm/v/tokenfirewall.svg)](https://www.npmjs.com/package/tokenfirewall)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## Overview

TokenFirewall is a production-ready middleware that automatically tracks and enforces budget limits for Large Language Model (LLM) API calls. It provides transparent cost monitoring, prevents budget overruns, and supports multiple providers through a unified interface.

### Key Features

-  **Automatic Budget Enforcement** - Block or warn when spending limits are exceeded
-  **Real-time Cost Tracking** - Automatic calculation based on actual token usage
-  **Multi-Provider Support** - Works with OpenAI, Anthropic, Gemini, Grok, Kimi, and custom providers
-  **Model Discovery** - List available models with context limits and pricing
-  **Budget Persistence** - Save and restore budget state across restarts
-  **Zero Configuration** - Works out-of-the-box with sensible defaults
- **Production Ready** - Comprehensive error handling and validation
-  **TypeScript Native** - Full type definitions included

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
  - [Budget Management](#budget-management)
  - [Interception](#interception)
  - [Model Discovery](#model-discovery)
  - [Custom Providers](#custom-providers)
  - [Budget Persistence](#budget-persistence)
- [Supported Providers](#supported-providers)
- [Use Cases](#use-cases)
- [Examples](#examples)
- [TypeScript Support](#typescript-support)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Contributing](#contributing)
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

// Step 3: Use any LLM API normally - tokenfirewall handles the rest
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

The Budget Guard is the core component that tracks spending and enforces limits. It operates in two modes:

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

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options` | `BudgetGuardOptions` | Yes | Budget configuration object |
| `options.monthlyLimit` | `number` | Yes | Maximum spending limit in USD |
| `options.mode` | `"block" \| "warn"` | No | Enforcement mode (default: `"block"`) |

**Returns:** `BudgetManager` - The budget manager instance

**Throws:**
- `Error` if `monthlyLimit` is not a positive number
- `Error` if `mode` is not "block" or "warn"

**Example:**

```javascript
const { createBudgetGuard } = require("tokenfirewall");

// Block mode - strict enforcement
const guard = createBudgetGuard({
  monthlyLimit: 100,
  mode: "block"
});

// Warn mode - soft limits
const guard = createBudgetGuard({
  monthlyLimit: 500,
  mode: "warn"
});
```

**Notes:**
- Calling `createBudgetGuard()` multiple times will replace the existing guard
- A warning is logged when overwriting an existing guard
- The guard is global and applies to all subsequent API calls

---

#### `getBudgetStatus()`

Retrieves the current budget status and usage statistics.

**Parameters:** None

**Returns:** `BudgetStatus | null`

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
  
  // Alert if over 80%
  if (status.percentageUsed > 80) {
    console.warn("⚠️ Budget usage is high!");
  }
}
```

**Returns `null` if:**
- No budget guard has been created
- Budget guard was not initialized

---

#### `resetBudget()`

Resets the budget tracking to zero, clearing all accumulated costs.

**Parameters:** None

**Returns:** `void`

**Example:**

```javascript
const { resetBudget, getBudgetStatus } = require("tokenfirewall");

// Reset at the start of each month
function monthlyReset() {
  resetBudget();
  console.log("Budget reset for new month");
  
  const status = getBudgetStatus();
  console.log(`New budget: $${status.limit}`);
}

// Schedule monthly reset
const cron = require("node-cron");
cron.schedule("0 0 1 * *", monthlyReset); // First day of month
```

**Use Cases:**
- Monthly budget resets
- Testing and development
- Per-session budgets
- Tenant-specific resets

---

### Interception

#### `patchGlobalFetch()`

Patches the global `fetch` function to intercept and track LLM API calls.

**Parameters:** None

**Returns:** `void`

**Example:**

```javascript
const { patchGlobalFetch } = require("tokenfirewall");

// Patch once at application startup
patchGlobalFetch();

// All subsequent fetch calls are intercepted
await fetch("https://api.openai.com/v1/chat/completions", { /* ... */ });
await fetch("https://api.anthropic.com/v1/messages", { /* ... */ });
```

**Behavior:**
- Intercepts all `fetch` calls globally
- Only processes LLM API responses (non-LLM calls are ignored)
- Automatically detects provider from response format
- Calculates costs and tracks against budget
- Logs usage information to console
- Can be called multiple times safely (idempotent)

**Important Notes:**
- Must be called AFTER `createBudgetGuard()`
- Works with official SDKs that use `fetch` internally
- Does not affect non-LLM HTTP requests
- Minimal performance overhead

---

#### `unpatchGlobalFetch()`

Restores the original `fetch` function, disabling interception.

**Parameters:** None

**Returns:** `void`

**Example:**

```javascript
const { patchGlobalFetch, unpatchGlobalFetch } = require("tokenfirewall");

// Enable tracking
patchGlobalFetch();

// ... make some API calls ...

// Disable tracking
unpatchGlobalFetch();

// Subsequent calls are not tracked
```

**Use Cases:**
- Temporarily disable tracking
- Testing specific scenarios
- Cleanup in test suites

---

#### `patchProvider(providerName)`

Patches a specific provider SDK (currently placeholder - most providers work via fetch interception).

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `providerName` | `string` | Yes | Provider name ("openai", "anthropic", etc.) |

**Returns:** `void`

**Example:**

```javascript
const { patchProvider } = require("tokenfirewall");

patchProvider("openai");
```

**Note:** Most providers work automatically with `patchGlobalFetch()`. This function is reserved for future provider-specific integrations.

---

### Model Discovery

#### `listModels(options)`

Lists available models from a provider with context limits and budget information.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options` | `ListModelsOptions` | Yes | Discovery options |
| `options.provider` | `string` | Yes | Provider name ("openai", "gemini", "grok", "kimi") |
| `options.apiKey` | `string` | Yes | Provider API key |
| `options.baseURL` | `string` | No | Custom API endpoint URL |
| `options.includeBudgetUsage` | `boolean` | No | Include current budget usage % (default: false) |

**Returns:** `Promise<ModelInfo[]>`

```typescript
interface ModelInfo {
  model: string;                    // Model identifier
  contextLimit?: number;            // Context window size in tokens
  budgetUsagePercentage?: number;   // Current budget usage (if requested)
}
```

**Example:**

```javascript
const { listModels } = require("tokenfirewall");

// Discover OpenAI models
const models = await listModels({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY,
  includeBudgetUsage: true
});

models.forEach(model => {
  console.log(`Model: ${model.model}`);
  if (model.contextLimit) {
    console.log(`  Context: ${model.contextLimit.toLocaleString()} tokens`);
  }
  if (model.budgetUsagePercentage !== undefined) {
    console.log(`  Budget Used: ${model.budgetUsagePercentage.toFixed(2)}%`);
  }
});

// Find models with large context windows
const largeContext = models.filter(m => m.contextLimit && m.contextLimit > 100000);
```

**Supported Providers:**
- `"openai"` - Fetches from OpenAI API
- `"gemini"` - Fetches from Google Gemini API
- `"grok"` - Fetches from X.AI API
- `"kimi"` - Fetches from Moonshot AI API
- `"anthropic"` - Returns static list (no API endpoint available)

**Error Handling:**
- Returns empty array if API call fails
- Logs warning on errors
- Has 10-second timeout to prevent hanging

---

#### `listAvailableModels(options)`

Lower-level model discovery function with manual budget manager injection.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options` | `ListModelsOptions` | Yes | Discovery options (same as `listModels`) |
| `options.budgetManager` | `BudgetManager` | No | Manual budget manager instance |

**Returns:** `Promise<ModelInfo[]>`

**Example:**

```javascript
const { listAvailableModels, createBudgetGuard } = require("tokenfirewall");

const manager = createBudgetGuard({ monthlyLimit: 100, mode: "warn" });

const models = await listAvailableModels({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY,
  budgetManager: manager,
  includeBudgetUsage: true
});
```

**Note:** Use `listModels()` instead - it automatically passes the global budget manager.

---

### Custom Providers

#### `registerAdapter(adapter)`

Registers a custom provider adapter for tracking non-standard LLM APIs.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `adapter` | `ProviderAdapter` | Yes | Custom adapter implementation |

```typescript
interface ProviderAdapter {
  name: string;                                    // Unique provider name
  detect: (response: unknown) => boolean;          // Detect if response is from this provider
  normalize: (response: unknown, request?: unknown) => NormalizedUsage;  // Extract token usage
}

interface NormalizedUsage {
  provider: string;      // Provider name
  model: string;         // Model identifier
  inputTokens: number;   // Input/prompt tokens
  outputTokens: number;  // Output/completion tokens
  totalTokens: number;   // Total tokens
}
```

**Example:**

```javascript
const { registerAdapter } = require("tokenfirewall");

// Register Ollama (self-hosted) adapter
registerAdapter({
  name: "ollama",
  
  detect: (response) => {
    return response && 
           typeof response === "object" && 
           response.model && 
           response.prompt_eval_count !== undefined;
  },
  
  normalize: (response) => {
    return {
      provider: "ollama",
      model: response.model,
      inputTokens: response.prompt_eval_count || 0,
      outputTokens: response.eval_count || 0,
      totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
    };
  }
});

// Now Ollama calls are tracked
const response = await fetch("http://localhost:11434/api/generate", {
  method: "POST",
  body: JSON.stringify({ model: "llama3.2", prompt: "Hello" })
});
```

**Validation:**
- Adapter name must be a non-empty string
- `detect()` must return boolean
- `normalize()` must return valid `NormalizedUsage` object
- Adapters are checked in registration order (first match wins)

---

#### `registerPricing(provider, model, pricing)`

Registers custom pricing for a provider and model.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | `string` | Yes | Provider name |
| `model` | `string` | Yes | Model identifier |
| `pricing` | `ModelPricing` | Yes | Pricing configuration |

```typescript
interface ModelPricing {
  input: number;   // Cost per 1M input tokens (USD)
  output: number;  // Cost per 1M output tokens (USD)
}
```

**Example:**

```javascript
const { registerPricing } = require("tokenfirewall");

// Register pricing for custom model
registerPricing("ollama", "llama3.2", {
  input: 0.0,   // Free (self-hosted)
  output: 0.0
});

// Register pricing for new OpenAI model
registerPricing("openai", "gpt-5", {
  input: 5.0,   // $5 per 1M input tokens
  output: 15.0  // $15 per 1M output tokens
});

// Override existing pricing
registerPricing("openai", "gpt-4o", {
  input: 2.0,   // Custom pricing
  output: 8.0
});
```

**Validation:**
- Provider and model must be non-empty strings
- Input and output prices must be non-negative numbers
- Prices cannot be NaN or Infinity

**Default Pricing:**
TokenFirewall includes default pricing for:
- OpenAI (GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo)
- Anthropic (Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus)
- Gemini (Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash)
- Grok (Grok-beta, Grok-2, Llama models)
- Kimi (Moonshot v1 models)

---

#### `registerContextLimit(provider, model, contextLimit)`

Registers custom context window limit for a model.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | `string` | Yes | Provider name |
| `model` | `string` | Yes | Model identifier |
| `contextLimit` | `number` | Yes | Context window size in tokens |

**Example:**

```javascript
const { registerContextLimit } = require("tokenfirewall");

// Register context limit for custom model
registerContextLimit("ollama", "llama3.2", 8192);

// Register for new model
registerContextLimit("openai", "gpt-5", 256000);
```

**Validation:**
- Provider and model must be non-empty strings
- Context limit must be a positive number
- Cannot be NaN or Infinity

---

### Budget Persistence

#### `exportBudgetState()`

Exports the current budget state for persistence.

**Parameters:** None

**Returns:** `{ totalSpent: number; limit: number; mode: string } | null`

**Example:**

```javascript
const { exportBudgetState } = require("tokenfirewall");
const fs = require("fs");

// Export state
const state = exportBudgetState();

if (state) {
  // Save to file
  fs.writeFileSync("budget-state.json", JSON.stringify(state, null, 2));
  
  // Or save to database
  await db.budgets.update({ id: "main" }, state);
  
  // Or save to Redis
  await redis.set("budget:state", JSON.stringify(state));
}
```

**Returns `null` if:**
- No budget guard has been created

---

#### `importBudgetState(state)`

Imports and restores a previously saved budget state.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `state` | `{ totalSpent: number }` | Yes | Saved budget state |

**Returns:** `void`

**Throws:**
- `Error` if no budget guard exists
- `Error` if `totalSpent` is not a valid number
- `Error` if `totalSpent` is negative

**Example:**

```javascript
const { importBudgetState, createBudgetGuard } = require("tokenfirewall");
const fs = require("fs");

// Create budget guard first
createBudgetGuard({ monthlyLimit: 100, mode: "block" });

// Load from file
if (fs.existsSync("budget-state.json")) {
  const state = JSON.parse(fs.readFileSync("budget-state.json", "utf8"));
  importBudgetState(state);
  console.log("Budget state restored");
}

// Or load from database
const state = await db.budgets.findOne({ id: "main" });
if (state) {
  importBudgetState(state);
}
```

**Validation:**
- Validates `totalSpent` is a valid number
- Rejects negative values
- Warns if imported value is suspiciously large (>10x limit)

---

## Supported Providers

TokenFirewall includes built-in support for:

| Provider | Models | Pricing | Discovery |
|----------|--------|---------|-----------|
| **OpenAI** | GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo | ✅ Included | ✅ API |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus | ✅ Included | ✅ Static |
| **Google Gemini** | Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash | ✅ Included | ✅ API |
| **Grok (X.AI)** | Grok-beta, Grok-2, Llama 3.x models | ✅ Included | ✅ API |
| **Kimi (Moonshot)** | Moonshot v1 (8k, 32k, 128k) | ✅ Included | ✅ API |
| **Custom** | Any LLM API | ⚙️ Register | ⚙️ Custom |

---

## Use Cases

### 1. Production Applications
- Prevent unexpected cost spikes
- Enforce spending limits per tenant/user
- Track costs across multiple providers

### 2. Development & Testing
- Limit test suite costs
- Prevent accidental expensive calls
- Safe experimentation with new models

### 3. Multi-Tenant SaaS
- Per-customer budget limits
- Tiered pricing enforcement
- Usage-based billing

### 4. AI Agent Systems
- Prevent runaway agent loops
- Budget-aware task planning
- Cost-optimized model selection

### 5. Internal Tools
- Department-level budgets
- Employee usage tracking
- Cost allocation and reporting

---

## Examples

See the [`examples/`](./examples) directory for complete, runnable examples:

1. **[Basic Usage](./examples/1-basic-usage.js)** - Core functionality and budget protection
2. **[Multiple Providers](./examples/2-multiple-providers.js)** - Unified tracking across providers
3. **[Budget Persistence](./examples/3-budget-persistence.js)** - Save and restore state
4. **[Custom Provider](./examples/4-custom-provider.js)** - Add your own LLM provider
5. **[Model Discovery](./examples/5-model-discovery.js)** - Find and compare models

---

## TypeScript Support

TokenFirewall is written in TypeScript and includes full type definitions.

```typescript
import {
  createBudgetGuard,
  patchGlobalFetch,
  getBudgetStatus,
  BudgetGuardOptions,
  BudgetStatus,
  ModelInfo,
  ProviderAdapter,
  ModelPricing
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
    // Budget limit reached
    console.error("Monthly budget exhausted");
    // Notify user, upgrade prompt, etc.
  } else if (error.message.includes("TokenFirewall: Cost must be")) {
    // Invalid cost calculation (should not happen in normal use)
    console.error("Internal error:", error.message);
  } else {
    // Other errors (network, API, etc.)
    console.error("API error:", error.message);
  }
}
```

**Common Errors:**

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Budget exceeded! Would spend $X of $Y limit` | Budget limit reached | Increase limit or wait for reset |
| `monthlyLimit must be a valid number` | Invalid budget configuration | Provide positive number |
| `Cost must be a valid number` | Internal error | Report as bug |
| `No pricing found for model "X"` | Unknown model | Register custom pricing |
| `Cannot import budget state - no budget guard exists` | Import before create | Call `createBudgetGuard()` first |

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
  await sendAlert("Budget usage high!");
}
```

### 5. Reset Monthly
```javascript
// Automated monthly reset
const cron = require("node-cron");
cron.schedule("0 0 1 * *", () => {
  resetBudget();
  console.log("Budget reset for new month");
});
```

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

MIT © [Ruthwik](https://github.com/Ruthwik000)

---

## Links

- **GitHub:** https://github.com/Ruthwik000/tokenfirewall
- **npm:** https://www.npmjs.com/package/tokenfirewall
- **Issues:** https://github.com/Ruthwik000/tokenfirewall/issues
- **Documentation:** [API.md](./API.md)
- **Changelog:** [CHANGELOG.md](./CHANGELOG.md)

---

## Support

If you find TokenFirewall useful, please:
- ⭐ Star the repository
- 🐛 Report bugs and issues
- 💡 Suggest new features
- 📖 Improve documentation
- 🔀 Submit pull requests

---

**Built with ❤️ for the AI developer community**
