# TokenFirewall Examples

This directory contains practical examples showing how to use tokenfirewall in real-world scenarios.

## Quick Start

```bash
# Install dependencies
npm install

# Set your API keys
export OPENAI_API_KEY="your-key-here"
export ANTHROPIC_API_KEY="your-key-here"
export GEMINI_API_KEY="your-key-here"
export XAI_API_KEY="your-key-here"

# Run any example
node examples/1-basic-usage.js
```

## Examples Overview

### 1. Basic Usage (`1-basic-usage.js`)
**What it shows:**
- Setting up a monthly budget
- Automatic cost tracking
- Budget enforcement (block mode)
- Checking budget status

**Best for:** Getting started, understanding core functionality

**Run:**
```bash
node examples/1-basic-usage.js
```

---

### 2. Multiple Providers (`2-multiple-providers.js`)
**What it shows:**
- Tracking costs across OpenAI, Anthropic, Gemini, and Grok
- Unified budget for all providers
- Comparing costs between providers

**Best for:** Applications using multiple LLM providers

**Run:**
```bash
node examples/2-multiple-providers.js
```

---

### 3. Budget Persistence (`3-budget-persistence.js`)
**What it shows:**
- Saving budget state to disk
- Restoring budget state on restart
- Maintaining tracking across application restarts

**Best for:** Long-running applications, serverless functions

**Run:**
```bash
node examples/3-budget-persistence.js
```

---

### 4. Custom Provider (`4-custom-provider.js`)
**What it shows:**
- Registering a custom LLM provider (Ollama example)
- Setting custom pricing
- Tracking self-hosted or new providers

**Best for:** Self-hosted models, new LLM providers, custom APIs

**Run:**
```bash
# Make sure Ollama is running first
ollama serve

# Then run the example
node examples/4-custom-provider.js
```

---

### 5. Model Discovery (`5-model-discovery.js`)
**What it shows:**
- Listing available models from providers
- Viewing context window limits
- Checking budget usage percentage
- Comparing models across providers

**Best for:** Choosing the right model, understanding capabilities

**Run:**
```bash
node examples/5-model-discovery.js
```

---

### 6. Intelligent Routing (`6-intelligent-routing.js`)
**What it shows:**
- Automatic retry on API failures
- Model switching with fallback strategy
- Context-based routing (upgrade on overflow)
- Cost-based routing (switch to cheaper model)

**Best for:** Production resilience, cost optimization, handling rate limits

**Run:**
```bash
node examples/6-intelligent-routing.js
```

---

### 7. Dynamic Model Registration (`7-dynamic-models.js`)
**What it shows:**
- Dynamically registering models from API discovery
- Bulk model registration with pricing and context limits
- Using router with dynamically registered models
- Recommended patterns for model discovery

**Best for:** Custom providers, API-specific models, dynamic model lists

**Run:**
```bash
node examples/7-dynamic-models.js
```

---

## Common Patterns

### Pattern 1: Block Mode (Strict Budget)
```javascript
createBudgetGuard({
  monthlyLimit: 100,
  mode: "block"  // Throw error when exceeded
});
```

### Pattern 2: Warn Mode (Soft Budget)
```javascript
createBudgetGuard({
  monthlyLimit: 100,
  mode: "warn"  // Log warning but allow requests
});
```

### Pattern 3: Budget Persistence
```javascript
// On startup
const savedState = loadBudgetState();
if (savedState) {
  importBudgetState(savedState);
}

// On exit
process.on('beforeExit', () => {
  saveBudgetState();
});
```

### Pattern 4: Custom Provider
```javascript
registerAdapter({
  name: "my-provider",
  detect: (response) => /* check if response is from your provider */,
  normalize: (response) => ({
    provider: "my-provider",
    model: response.model,
    inputTokens: response.input_tokens,
    outputTokens: response.output_tokens,
    totalTokens: response.total_tokens
  })
});

registerPricing("my-provider", "my-model", {
  input: 0.5,   // per 1M tokens
  output: 1.0
});
```

## Environment Variables

Set these environment variables to run the examples:

```bash
# OpenAI
export OPENAI_API_KEY="sk-..."

# Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."

# Google Gemini
export GEMINI_API_KEY="..."

# Grok (X.AI)
export XAI_API_KEY="xai-..."

# Kimi (Moonshot AI)
export KIMI_API_KEY="..."
```

## Troubleshooting

### "Budget exceeded" error
- Check your budget limit with `getBudgetStatus()`
- Increase `monthlyLimit` or switch to `mode: "warn"`
- Reset budget with `resetBudget()` for testing

### Models not discovered
- Verify API key is correct
- Check network connectivity
- Some providers (Anthropic) return static lists

### Custom provider not tracked
- Ensure `detect()` returns true for your responses
- Verify `normalize()` returns correct format
- Check console for tokenfirewall warnings

## Need Help?

- See main README.md for full documentation
- Check API.md for complete API reference
- Review CONTRIBUTING.md for development guidelines
