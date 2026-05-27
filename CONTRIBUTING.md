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
│   ├── detectors/     # Task detection methods (keyword, pattern, language, context)
│   ├── taskTypes.ts   # Task type definitions
│   ├── taskRegistry.ts # Task configuration registry
│   └── taskClassifier.ts # Main classification engine
├── analytics/         # Task analytics and monitoring
├── index.ts           # Main exports
├── logger.ts          # Structured logging
└── registry.ts        # Adapter registry

examples/              # Working examples
dist/                  # Compiled JavaScript (generated)
```

## Smart Model Selection Feature

We're currently implementing a **Smart Model Selection** feature that automatically routes requests to the optimal LLM model based on task type. This is a major feature being developed for v2.2.0.

### 📚 Feature Documentation

**Complete documentation:** [SMART-MODEL-SELECTION.md](./SMART-MODEL-SELECTION.md)

This document contains:
- Feature overview and architecture
- 12 built-in task types (code generation, math reasoning, document analysis, etc.)
- Task detection methods (keyword, pattern, language, context)
- API reference and usage examples
- Cost savings analysis
- Implementation guidelines

### 🎯 Contributing to Smart Model Selection

There are **29 GitHub issues** for this feature, labeled with `gssoc'26` and `feature: smart-routing`. Issues are categorized by difficulty:

- **Level 1 (Easy)**: Good for beginners - 11 issues
- **Level 2 (Medium)**: Intermediate - 13 issues  
- **Level 3 (Hard)**: Advanced - 5 issues

**Good First Issues:** Look for issues labeled `good first issue` - these are perfect for new contributors!

### 📋 Implementation Phases

1. **Phase 1: Foundation** - Type definitions and registries
2. **Phase 2: Detection** - Keyword, pattern, language, and context detectors
3. **Phase 3: Routing** - Smart routing strategy integration
4. **Phase 4: Analytics** - Task analytics and monitoring
5. **Phase 5: API** - Public APIs for manual classification
6. **Phase 6: Testing** - Comprehensive test coverage
7. **Phase 7: Documentation** - README and examples
8. **Phase 8: Release** - Performance optimization and release

### 🔗 Related Issues

View all Smart Model Selection issues: https://github.com/Ruthwik000/tokenfirewall/issues?q=is%3Aissue+label%3A%22feature%3A+smart-routing%22

### 💡 Before Starting

1. Read [SMART-MODEL-SELECTION.md](./SMART-MODEL-SELECTION.md) to understand the feature
2. Pick an issue that matches your skill level
3. Check issue dependencies (some issues depend on others)
4. Comment on the issue to let others know you're working on it
5. Follow the deliverables and acceptance criteria in the issue

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
