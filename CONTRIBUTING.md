# Contributing to TokenFirewall

Thank you for considering contributing to TokenFirewall. This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful and professional. We welcome contributions from everyone.

## How to Contribute

### Reporting Bugs

Open an issue at https://github.com/Ruthwik000/tokenfirewall/issues with:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, OS)

### Suggesting Features

Open an issue with:
- Clear description of the feature
- Use case and benefits
- Proposed implementation (optional)

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run build: `npm run build`
5. Commit with clear message: `git commit -m "Add feature: description"`
6. Push to your fork: `git push origin feature/your-feature`
7. Open a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/tokenfirewall.git
cd tokenfirewall

# Install dependencies
npm install

# Build TypeScript
npm run build

# Test your changes
node examples/1-basic-usage.js
```

## Project Structure

```
src/
├── core/              # Budget management, cost calculation, pricing
├── adapters/          # Provider-specific adapters (OpenAI, Anthropic, etc.)
├── interceptors/      # Fetch and SDK interception
├── introspection/     # Model discovery and context registry
├── router/            # Intelligent routing and failover
├── index.ts           # Main exports
├── logger.ts          # Structured logging
└── registry.ts        # Adapter registry

examples/              # Working examples
dist/                  # Compiled JavaScript (generated)
```

## Coding Standards

### TypeScript
- Use strict TypeScript with no implicit any
- Include type definitions for all exports
- Keep functions under 60 lines where possible

### Code Style
- Use 2 spaces for indentation
- Use semicolons
- Use double quotes for strings
- Add JSDoc comments for public APIs

### Architecture
- Do NOT modify core/ files unless necessary
- Do NOT introduce circular dependencies
- Keep router optional and opt-in
- Maintain backward compatibility

## Adding a New Provider

1. Create adapter in `src/adapters/your-provider.ts`:

```typescript
import { ProviderAdapter, NormalizedUsage } from "../core/types";

export const yourProviderAdapter: ProviderAdapter = {
  name: "your-provider",
  
  detect(response: Response): boolean {
    return response.url.includes("your-provider.com");
  },
  
  async normalize(response: Response): Promise<NormalizedUsage> {
    const data = await response.json();
    return {
      provider: "your-provider",
      model: data.model,
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens
    };
  }
};
```

2. Register in `src/adapters/index.ts`
3. Add pricing in `src/core/pricingRegistry.ts`
4. Add context limits in `src/introspection/contextRegistry.ts`
5. Create example in `examples/`

## Adding Pricing

Update `src/core/pricingRegistry.ts`:

```typescript
// In constructor
this.register("provider", "model-name", {
  input: 1.0,   // per 1M tokens
  output: 2.0
});
```

## Testing Changes

```bash
# Build
npm run build

# Test basic functionality
node examples/1-basic-usage.js

# Test your specific feature
node examples/your-example.js
```

## Commit Message Format

```
type: brief description

Detailed explanation (optional)

Examples:
- feat: add support for Cohere API
- fix: resolve race condition in budget tracking
- docs: update README with new examples
- refactor: simplify router error detection
- chore: update dependencies
```

## Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Include tests or examples demonstrating the change
- Update documentation (README, CHANGELOG)
- Ensure build passes: `npm run build`
- Reference related issues: "Fixes #123"

## What We're Looking For

### High Priority
- New provider adapters (Cohere, Mistral, etc.)
- Bug fixes and edge cases
- Performance improvements
- Documentation improvements

### Medium Priority
- New routing strategies
- Enhanced error handling
- Additional examples
- TypeScript improvements

### Low Priority
- Code refactoring (must maintain compatibility)
- Style changes
- Minor optimizations

## Questions?

Open an issue or discussion at https://github.com/Ruthwik000/tokenfirewall

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
