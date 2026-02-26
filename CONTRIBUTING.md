# Contributing to tokenfirewall

Thank you for your interest in contributing to tokenfirewall! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Adding New Providers](#adding-new-providers)

## Code of Conduct

Be respectful, inclusive, and professional. We're all here to build great software together.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/Ruthwik000/tokenfirewall.git`
3. Create a branch: `git checkout -b feature/your-feature-name`

## Development Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run examples
node examples/basic-usage.js
```

## How to Contribute

### Reporting Bugs

Open an issue with:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, OS)
- Code samples if applicable

### Suggesting Features

Open an issue with:
- Clear use case
- Proposed API design
- Why it's valuable
- Potential implementation approach

### Submitting Code

1. Ensure your code follows our coding standards
2. Add tests if applicable
3. Update documentation
4. Submit a pull request

## Coding Standards

### TypeScript

- Use strict TypeScript
- No implicit `any`
- Explicit return types
- Proper type exports

### Code Style

- Functions under 50 lines where possible
- Clear, descriptive names
- Single responsibility principle
- JSDoc comments for public APIs

### Example

```typescript
/**
 * Calculate cost from normalized usage
 * @param usage - Normalized usage data
 * @returns Cost breakdown
 */
export function calculateCost(usage: NormalizedUsage): CostBreakdown {
  const pricing = pricingRegistry.getPricing(usage.provider, usage.model);
  
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;
  const totalCost = inputCost + outputCost;

  return { inputCost, outputCost, totalCost };
}
```

## Testing

### Manual Testing

```bash
# Test with OpenAI
export OPENAI_API_KEY="your-key"
node examples/basic-usage.js

# Test with Gemini
export GEMINI_API_KEY="your-key"
node examples/gemini-complete-demo.js
```

### Adding Tests

We welcome test contributions! Currently, testing is manual via examples.

## Pull Request Process

1. **Update Documentation**: Update README.md and API.md if needed
2. **Add Examples**: Add example if introducing new features
3. **Update CHANGELOG**: Add entry to CHANGELOG.md
4. **Build Successfully**: Ensure `npm run build` succeeds
5. **Clear Description**: Explain what and why in PR description

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Examples added/updated
- [ ] CHANGELOG updated
- [ ] Build succeeds
```

## Adding New Providers

To add support for a new LLM provider:

### 1. Create Adapter File

Create `src/adapters/yourprovider.ts`:

```typescript
import { ProviderAdapter, NormalizedUsage } from "../core/types";

interface YourProviderResponse {
  // Define response structure
}

export const yourProviderAdapter: ProviderAdapter = {
  name: "yourprovider",

  detect(response: unknown): boolean {
    // Detection logic
    return false;
  },

  normalize(response: unknown): NormalizedUsage {
    const resp = response as YourProviderResponse;
    
    return {
      provider: "yourprovider",
      model: resp.model,
      inputTokens: resp.inputTokens,
      outputTokens: resp.outputTokens,
      totalTokens: resp.totalTokens
    };
  },
};
```

### 2. Register Adapter

Add to `src/adapters/index.ts`:

```typescript
import { yourProviderAdapter } from "./yourprovider";

export const adapters: ProviderAdapter[] = [
  // ... existing adapters
  yourProviderAdapter,
];
```

### 3. Add Pricing

Add to `src/core/pricingRegistry.ts`:

```typescript
// YourProvider pricing (per 1M tokens)
this.register("yourprovider", "model-name", { input: 1.0, output: 2.0 });
```

### 4. Add Context Limits

Add to `src/introspection/contextRegistry.ts`:

```typescript
// YourProvider context limits
this.register("yourprovider", "model-name", { tokens: 128000 });
```

### 5. Add Model Listing (Optional)

Add to `src/introspection/modelLister.ts`:

```typescript
async function listYourProviderModels(apiKey: string, baseURL?: string): Promise<string[]> {
  // Implementation
}
```

### 6. Add Example

Create `examples/yourprovider-demo.js`:

```javascript
const { createBudgetGuard, patchGlobalFetch } = require("tokenfirewall");

createBudgetGuard({ monthlyLimit: 100 });
patchGlobalFetch();

// Example usage
```

### 7. Update Documentation

- Add provider to README.md
- Add to API.md
- Update CHANGELOG.md

## Architecture Guidelines

### Core Principles

1. **Provider-agnostic core**: Core logic must not depend on specific providers
2. **Adapter pattern**: All provider-specific logic in adapters
3. **Separation of concerns**: Each module has single responsibility
4. **Extensibility**: Easy to add new providers without core changes

### File Structure

```
src/
├── core/              # Provider-agnostic logic
│   ├── types.ts
│   ├── costEngine.ts
│   ├── pricingRegistry.ts
│   └── budgetManager.ts
├── adapters/          # Provider-specific normalization
│   ├── openai.ts
│   ├── anthropic.ts
│   └── index.ts
├── interceptors/      # Request/response capture
├── introspection/     # Model discovery
└── index.ts           # Public API
```

### Adding Core Features

Core features must:
- Be provider-agnostic
- Have clear interfaces
- Include TypeScript types
- Be documented in API.md

## Questions?

Open an issue or discussion on GitHub.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to tokenfirewall! 🔥
