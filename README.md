# tokenfirewall

Production-grade LLM cost enforcement middleware for Node.js with automatic tracking, budget management, and model discovery.

## Features

- **Multi-provider support**: OpenAI, Anthropic, Gemini, Grok, Kimi
- **Budget enforcement**: Warn or block when limits exceeded
- **Automatic cost tracking**: Real-time usage monitoring
- **Model discovery**: List available models with context limits
- **Context intelligence**: Budget-aware model selection
- **Extensible**: Add custom providers easily
- **Type-safe**: Full TypeScript support

## Installation

```bash
npm install tokenfirewall
```

## Quick Start

```javascript
const { createBudgetGuard, patchGlobalFetch } = require("tokenfirewall");

// Set budget limit
createBudgetGuard({
  monthlyLimit: 100,  // $100 USD
  mode: "block"       // or "warn"
});

// Enable tracking
patchGlobalFetch();

// Use any LLM API - tokenfirewall tracks everything
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "gpt-4o",
    messages: [{ role: "user", content: "Hello!" }]
  })
});
```

## API Reference

### Budget Management

#### `createBudgetGuard(options)`

Initialize budget protection.

```javascript
createBudgetGuard({
  monthlyLimit: 100,  // Required: monthly budget in USD
  mode: "block"       // Optional: "block" (default) or "warn"
});
```

#### `getBudgetStatus()`

Get current budget information.

```javascript
const status = getBudgetStatus();
// {
//   totalSpent: 45.23,
//   limit: 100,
//   remaining: 54.77,
//   percentageUsed: 45.23
// }
```

#### `resetBudget()`

Reset budget tracking (useful for monthly resets).

```javascript
resetBudget();
```

### Interception

#### `patchGlobalFetch()`

Intercept all fetch calls to track LLM usage.

```javascript
patchGlobalFetch();
```

#### `patchProvider(providerName)`

Patch specific provider SDK (most use fetch internally).

```javascript
patchProvider("openai");
```

### Model Discovery

#### `listAvailableModels(options)`

Discover available models with context limits and budget usage.

```javascript
const models = await listAvailableModels({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY,
  includeBudgetUsage: true  // Optional
});

// Returns:
// [
//   {
//     model: "gpt-4o",
//     contextLimit: 128000,
//     budgetUsagePercentage: 32.4
//   }
// ]
```

### Extensibility

#### `registerAdapter(adapter)`

Add custom LLM provider.

```javascript
registerAdapter({
  name: "custom",
  detect: (response) => /* detection logic */,
  normalize: (response) => /* normalization logic */
});
```

#### `registerPricing(provider, model, pricing)`

Add custom pricing (per 1M tokens).

```javascript
registerPricing("custom", "model-name", {
  input: 0.001,
  output: 0.002
});
```

#### `registerContextLimit(provider, model, contextLimit)`

Add custom context limit.

```javascript
registerContextLimit("custom", "model-name", 131072);
```

## Supported Providers

| Provider | Models | Context Limits |
|----------|--------|----------------|
| OpenAI | gpt-4o, gpt-4o-mini, gpt-3.5-turbo | 16K - 128K |
| Anthropic | claude-3-5-sonnet, claude-3-5-haiku | 200K |
| Gemini | gemini-2.5-pro, gemini-2.5-flash | 1M - 2M |
| Grok | grok-beta, llama-3.3-70b | 131K |
| Kimi | moonshot-v1-8k/32k/128k | 8K - 128K |

## Usage Examples

### Basic Usage

```javascript
const { createBudgetGuard, patchGlobalFetch } = require("tokenfirewall");

createBudgetGuard({ monthlyLimit: 100, mode: "block" });
patchGlobalFetch();

// Make LLM calls as usual - automatically tracked
```

### Budget-Aware Model Selection

```javascript
const { listAvailableModels, getBudgetStatus } = require("tokenfirewall");

const models = await listAvailableModels({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY,
  includeBudgetUsage: true
});

const status = getBudgetStatus();
if (status.remaining < 10) {
  console.log("Low budget - use cheaper models");
  const cheapModels = models.filter(m => m.model.includes("mini"));
}
```

### Context-Aware Routing

```javascript
const { listAvailableModels } = require("tokenfirewall");

const models = await listAvailableModels({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY
});

// Find model with sufficient context
const suitable = models.find(m => 
  m.contextLimit && m.contextLimit >= promptTokens * 1.5
);
```

### Custom Provider

```javascript
const { registerAdapter, registerPricing } = require("tokenfirewall");

// Add Ollama support
registerAdapter({
  name: "ollama",
  detect: (response) => response?.model && response?.prompt_eval_count !== undefined,
  normalize: (response) => ({
    provider: "ollama",
    model: response.model,
    inputTokens: response.prompt_eval_count || 0,
    outputTokens: response.eval_count || 0,
    totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
  })
});

registerPricing("ollama", "llama3.2", { input: 0, output: 0 });
```

## TypeScript Support

Full type definitions included:

```typescript
import { 
  createBudgetGuard,
  listAvailableModels,
  BudgetGuardOptions,
  ModelInfo,
  ListModelsOptions
} from "tokenfirewall";

const options: BudgetGuardOptions = {
  monthlyLimit: 100,
  mode: "block"
};

const models: ModelInfo[] = await listAvailableModels({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY!
});
```

## Architecture

```
tokenfirewall/
├── core/           # Provider-agnostic logic
├── adapters/       # Provider-specific normalization
├── interceptors/   # Request/response capture
├── introspection/  # Model discovery
└── registry/       # Adapter management
```

Adding a new provider requires only creating an adapter file - no core changes needed.

## Examples

See the `examples/` directory for complete working examples:

- `basic-usage.js` - Simple OpenAI example
- `multiple-providers.js` - Track multiple providers
- `with-sdk.js` - Use with official SDKs
- `model-discovery.js` - Model discovery
- `context-aware-routing.js` - Intelligent routing
- `custom-provider.js` - Add custom provider
- `gemini-complete-demo.js` - Complete Gemini demo

## Best Practices

1. **Set realistic budgets**: Start with a conservative limit
2. **Use warn mode in development**: Switch to block in production
3. **Reset monthly**: Automate budget resets with cron
4. **Cache model lists**: Model availability doesn't change often
5. **Monitor logs**: Review structured JSON output regularly

## Limitations

- In-memory tracking only (no persistence in V1)
- No streaming support yet
- Context limits are static (not from provider APIs)
- Budget tracking is local only (not provider-side billing)

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Support

For issues and questions, please open a GitHub issue.
