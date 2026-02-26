# tokenfirewall API Documentation

Complete API reference for tokenfirewall v1.0.0

## Table of Contents

- [Budget Management](#budget-management)
- [Interception](#interception)
- [Model Discovery](#model-discovery)
- [Extensibility](#extensibility)
- [Types](#types)

---

## Budget Management

### `createBudgetGuard(options)`

Initialize budget protection and enforcement.

**Parameters:**
- `options` (BudgetGuardOptions): Configuration object
  - `monthlyLimit` (number): Monthly budget limit in USD (required)
  - `mode` ("block" | "warn"): Enforcement mode (optional, default: "block")

**Returns:** `BudgetManager` instance

**Example:**
```javascript
const { createBudgetGuard } = require("tokenfirewall");

createBudgetGuard({
  monthlyLimit: 100,
  mode: "block"
});
```

**Behavior:**
- `block` mode: Throws error when budget exceeded
- `warn` mode: Logs warning but continues execution

---

### `getBudgetStatus()`

Get current budget status information.

**Parameters:** None

**Returns:** `BudgetStatus | null`
- `totalSpent` (number): Total amount spent in USD
- `limit` (number): Monthly budget limit in USD
- `remaining` (number): Remaining budget in USD
- `percentageUsed` (number): Percentage of budget used

**Example:**
```javascript
const { getBudgetStatus } = require("tokenfirewall");

const status = getBudgetStatus();
console.log(status);
// {
//   totalSpent: 45.23,
//   limit: 100,
//   remaining: 54.77,
//   percentageUsed: 45.23
// }
```

---

### `resetBudget()`

Reset budget tracking to zero.

**Parameters:** None

**Returns:** `void`

**Example:**
```javascript
const { resetBudget } = require("tokenfirewall");

resetBudget();
```

**Use Case:** Call at the start of each month to reset tracking.

---

## Interception

### `patchGlobalFetch()`

Patch global fetch to intercept all HTTP requests and track LLM API calls.

**Parameters:** None

**Returns:** `void`

**Example:**
```javascript
const { patchGlobalFetch } = require("tokenfirewall");

patchGlobalFetch();

// Now all fetch calls are tracked
await fetch("https://api.openai.com/v1/chat/completions", { ... });
```

**Behavior:**
- Intercepts all `fetch()` calls
- Detects LLM API responses
- Extracts usage data
- Calculates costs
- Tracks against budget
- Logs structured JSON

---

### `patchProvider(providerName)`

Patch a specific provider SDK (most providers use fetch internally).

**Parameters:**
- `providerName` (string): Provider name ("openai", "anthropic", etc.)

**Returns:** `void`

**Example:**
```javascript
const { patchProvider } = require("tokenfirewall");

patchProvider("openai");
```

**Note:** Most providers use fetch internally, so `patchGlobalFetch()` is usually sufficient.

---

## Model Discovery

### `listAvailableModels(options)`

Discover available models from provider APIs with context limits and budget usage.

**Parameters:**
- `options` (ListModelsOptions): Configuration object
  - `provider` (string): Provider name (required)
  - `apiKey` (string): API key for the provider (required)
  - `baseURL` (string): Custom base URL (optional)
  - `includeBudgetUsage` (boolean): Include budget percentage (optional, default: false)

**Returns:** `Promise<ModelInfo[]>`

**ModelInfo:**
- `model` (string): Model identifier
- `contextLimit` (number | undefined): Context window size in tokens
- `budgetUsagePercentage` (number | undefined): Current budget usage percentage

**Example:**
```javascript
const { listAvailableModels } = require("tokenfirewall");

const models = await listAvailableModels({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY,
  includeBudgetUsage: true
});

console.log(models);
// [
//   {
//     model: "gpt-4o",
//     contextLimit: 128000,
//     budgetUsagePercentage: 32.4
//   },
//   ...
// ]
```

**Supported Providers:**
- `openai` - Real API call to `/v1/models`
- `gemini` - Real API call to Google API
- `grok` - Real API call to xAI API
- `kimi` - Real API call to Moonshot API
- `anthropic` - Returns known models (no API available)

---

## Extensibility

### `registerAdapter(adapter)`

Register a custom provider adapter.

**Parameters:**
- `adapter` (ProviderAdapter): Adapter implementation
  - `name` (string): Provider name
  - `detect` (function): Detection function
  - `normalize` (function): Normalization function

**Returns:** `void`

**Example:**
```javascript
const { registerAdapter } = require("tokenfirewall");

registerAdapter({
  name: "ollama",
  detect: (response) => {
    return response?.model && response?.prompt_eval_count !== undefined;
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
```

---

### `registerPricing(provider, model, pricing)`

Register custom pricing for a provider and model.

**Parameters:**
- `provider` (string): Provider name
- `model` (string): Model identifier
- `pricing` (ModelPricing): Pricing configuration
  - `input` (number): Input cost per 1M tokens
  - `output` (number): Output cost per 1M tokens

**Returns:** `void`

**Example:**
```javascript
const { registerPricing } = require("tokenfirewall");

registerPricing("ollama", "llama3.2", {
  input: 0.0,
  output: 0.0
});
```

---

### `registerContextLimit(provider, model, contextLimit)`

Register custom context limit for a provider and model.

**Parameters:**
- `provider` (string): Provider name
- `model` (string): Model identifier
- `contextLimit` (number): Context window size in tokens

**Returns:** `void`

**Example:**
```javascript
const { registerContextLimit } = require("tokenfirewall");

registerContextLimit("ollama", "llama3.2", 131072);
```

---

## Types

### BudgetGuardOptions

```typescript
interface BudgetGuardOptions {
  monthlyLimit: number;
  mode?: "warn" | "block";
}
```

### BudgetStatus

```typescript
interface BudgetStatus {
  totalSpent: number;
  limit: number;
  remaining: number;
  percentageUsed: number;
}
```

### ListModelsOptions

```typescript
interface ListModelsOptions {
  provider: string;
  apiKey: string;
  baseURL?: string;
  includeBudgetUsage?: boolean;
}
```

### ModelInfo

```typescript
interface ModelInfo {
  model: string;
  contextLimit?: number;
  budgetUsagePercentage?: number;
}
```

### ProviderAdapter

```typescript
interface ProviderAdapter {
  name: string;
  detect(response: unknown): boolean;
  normalize(response: unknown, request?: unknown): NormalizedUsage;
}
```

### NormalizedUsage

```typescript
interface NormalizedUsage {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}
```

### ModelPricing

```typescript
interface ModelPricing {
  input: number;   // per 1M tokens
  output: number;  // per 1M tokens
}
```

### CostBreakdown

```typescript
interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}
```

---

## Error Handling

### Budget Exceeded (Block Mode)

```javascript
try {
  // API call that exceeds budget
} catch (error) {
  if (error.message.includes("TokenFirewall: Budget exceeded")) {
    console.log("Budget limit reached!");
  }
}
```

### Invalid Provider

```javascript
const models = await listAvailableModels({
  provider: "unknown",
  apiKey: "key"
});
// Returns: []
```

### Invalid API Key

```javascript
try {
  const models = await listAvailableModels({
    provider: "openai",
    apiKey: "invalid"
  });
} catch (error) {
  console.error("API error:", error.message);
}
```

---

## Logging

tokenfirewall automatically logs structured JSON for each LLM call:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "provider": "openai",
  "model": "gpt-4o",
  "tokens": {
    "input": 150,
    "output": 200,
    "total": 350
  },
  "cost": {
    "input": "0.000375",
    "output": "0.002000",
    "total": "0.002375"
  }
}
```

---

## Version

API Version: 1.0.0

Last Updated: 2026
