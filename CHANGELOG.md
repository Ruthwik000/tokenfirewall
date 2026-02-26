# Changelog

All notable changes to tokenfirewall will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-02-26

### Fixed
- **CRITICAL:** Fixed race condition in fetch interceptor where budget checks happened in background, allowing requests to succeed even when budget was exceeded in block mode
- **CRITICAL:** Fixed circular dependency in model discovery that could cause runtime errors
- **CRITICAL:** Added validation for cost parameter in track() to prevent negative costs, NaN, or Infinity from corrupting budget state
- **HIGH:** Fixed adapter detection collision where Grok/Llama models could be misidentified as OpenAI
- **HIGH:** Added safety for response cloning failures - now gracefully falls back without tracking instead of crashing
- Added validation for budget import state to prevent corrupted data from breaking budget tracking
- Added validation for budget guard options (monthlyLimit must be positive number, mode must be "warn" or "block")
- Added 10-second timeout to all model discovery API calls to prevent application hanging
- Added error handling in adapter registry to catch normalize() failures
- Added validation for registerPricing() and registerContextLimit() to prevent invalid inputs
- Removed unused logger import in modelLister.ts

### Changed
- Fetch interceptor now awaits budget tracking before returning response, ensuring proper blocking behavior
- Model discovery now accepts optional `budgetManager` parameter instead of using circular require()
- Added new `listModels()` wrapper function that automatically passes global budget manager
- Budget import now validates for negative values, NaN, Infinity, and warns on suspicious values
- OpenAI adapter now explicitly excludes Grok, Llama, and Kimi models to prevent detection collisions
- createBudgetGuard() now warns when overwriting an existing budget guard
- importBudgetState() now throws error if no budget guard exists (instead of silently failing)
- Adapter registry now catches and logs normalize() errors instead of crashing

### Added
- `fetchWithTimeout()` helper function for all external API calls with 10s default timeout
- Comprehensive input validation in BudgetManager.track() for cost parameter
- Comprehensive input validation in BudgetManager constructor
- Comprehensive input validation in registerPricing() and registerContextLimit()
- Better error messages for invalid budget state and configuration
- Warning when creating multiple budget guards
- Error handling for response cloning failures

## [1.0.0] - 2026-01-15

### Added
- Initial release of tokenfirewall
- Multi-provider support (OpenAI, Anthropic, Gemini, Grok, Kimi)
- Budget enforcement with warn/block modes
- Automatic cost tracking and calculation
- Model discovery with context limits
- Budget-aware model selection
- Context-aware routing capabilities
- Global fetch interception
- Provider SDK patching
- Custom adapter registration
- Custom pricing registration
- Custom context limit registration
- Structured JSON logging
- TypeScript support with full type definitions
- 8 working examples

### Supported Providers
- OpenAI (gpt-4o, gpt-4o-mini, gpt-3.5-turbo)
- Anthropic (claude-3-5-sonnet, claude-3-5-haiku)
- Gemini (gemini-2.5-pro, gemini-2.5-flash)
- Grok (grok-beta, llama-3.3-70b)
- Kimi (moonshot-v1-8k/32k/128k)

### Features
- Budget management (create, check status, reset)
- Real-time cost calculation
- Token usage tracking
- Context window limits (16K - 2M tokens)
- Extensible adapter architecture
- Zero configuration required
- Production-ready code

### Documentation
- Complete README with API reference
- API.md with detailed documentation
- 8 working examples
- TypeScript type definitions

## [Unreleased]

### Planned Features
- Streaming support
- Persistent storage
- Dashboard UI
- Rate limiting
- Cost forecasting
- Usage analytics
- Webhook notifications
- Multi-user support

---

## Version History

- **1.0.0** - Initial release (2024-01-15)

---

## Migration Guide

### From Development to 1.0.0

No migration needed - this is the first stable release.

---

## Breaking Changes

None - this is the initial release.

---

## Deprecations

None - this is the initial release.

---

## Security

For security issues, please email security@tokenfirewall.com (or open a private security advisory on GitHub).

---

## Support

- Documentation: See README.md and API.md
- Examples: See examples/ directory
