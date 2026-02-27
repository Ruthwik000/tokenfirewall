# Changelog

All notable changes to tokenfirewall will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-02-27

### Major Release - Production Ready

This is a major release with significant new features, comprehensive pricing updates, and production-grade reliability improvements.

### Added

#### Intelligent Model Router
- **Automatic Retry System** - Seamless model switching on failures
- `createModelRouter()` - Configure routing with three strategies
- `disableModelRouter()` - Disable automatic routing
- Three routing strategies:
  - **Fallback Strategy** - Predefined fallback chains
  - **Context Strategy** - Automatic upgrade to larger context windows
  - **Cost Strategy** - Intelligent cost optimization
- Automatic error detection and classification
- Configurable retry limits with safety guards
- Prevention of infinite loops and circular retries
- Comprehensive router event logging

#### Dynamic Model Registration
- `registerModels()` - Bulk register models at runtime
- Dynamic model discovery integration
- Runtime pricing and context limit registration
- Support for custom providers
- Automatic integration with router strategies

#### Comprehensive Model Support
- **OpenAI Models:**
  - GPT-5 series (gpt-5, gpt-5-mini)
  - GPT-4.1 series (gpt-4.1, gpt-4.1-mini)
  - GPT-4o series (gpt-4o, gpt-4o-mini)
  - Reasoning models (o1, o1-mini)
  - Image generation (gpt-image-1)

- **Anthropic Models:**
  - Claude 4.5 series (opus, sonnet, haiku)
  - Claude 4 series (opus, sonnet, haiku)
  - Claude 3.5 latest (sonnet, haiku)

- **Google Gemini Models:**
  - Gemini 3 series (pro, flash, flash-lite)
  - Gemini 3.1 series (pro, flash-image)
  - Gemini 2.5 series (pro, flash, flash-lite, flash-image)
  - Nano Banana (ultra-light multimodal)
  - Image models (3-pro-image, 3.1-flash-image)

#### Production Features
- Case-insensitive provider lookups
- Comprehensive input validation (NaN, Infinity, negative values)
- Request object handling with header preservation
- Streaming request detection and fallback
- Non-JSON body handling with warnings
- Edge case handling for concurrent operations

### Updated

#### Accurate Pricing (Per 1M Tokens)
All pricing updated to reflect current market rates (verified February 27, 2026):

**OpenAI:**
- GPT-5: $1.25/$10.00
- GPT-5-mini: $0.25/$2.00
- GPT-4.1: $2.00/$8.00
- GPT-4o: $2.50/$10.00
- o1: $15.00/$60.00

**Anthropic:**
- Claude Opus 4.5: $5.00/$25.00
- Claude Sonnet 4.5: $3.00/$15.00
- Claude Haiku 4.5: $1.00/$5.00

**Gemini:**
- Gemini 3 Pro: $2.00/$12.00
- Gemini 3 Flash: $0.50/$3.00
- Gemini 2.5 Pro: $1.25/$10.00
- Gemini 2.5 Flash: $0.30/$2.50
- Gemini 2.5 Flash Lite: $0.10/$0.40

#### Context Limits
- GPT-5: 256K tokens
- Claude 4.5: 200K tokens
- Gemini 3 Pro: 2M tokens

### Fixed

#### Critical Fixes
- Provider case sensitivity - all lookups now case-insensitive
- NaN and Infinity validation in all numeric inputs
- Gemini model extraction from URL paths
- URL reconstruction for model switching
- Request object handling with proper header preservation
- Whitespace validation in provider/model names

#### High Priority Fixes
- Response cloning race conditions
- Error object format standardization
- Streaming request detection
- Unknown provider hostname extraction
- Request body ReadableStream handling

#### Medium Priority Fixes
- Circular retry prevention
- Fallback map validation
- Model validation in routing strategies
- Non-JSON body handling
- Empty string and whitespace rejection in fallback maps

### Changed
- Removed test folder for cleaner package
- Updated README to professional format without emojis
- Improved documentation structure
- Enhanced error messages for better debugging

### Breaking Changes
None - Fully backward compatible with v1.x

---

## [1.1.0] - 2026-02-27

### Added
- Intelligent Model Router with three strategies
- Dynamic model registration
- Router event logging
- Example 6: Intelligent routing
- Example 7: Dynamic model registration

### Fixed
- 18 bug fixes across critical, high, and medium priority
- Gemini model extraction and URL reconstruction
- Provider case sensitivity
- Request object handling
  - Meta: Llama 3.3 and 3.1 families
  - Mistral: Latest Mistral and Mixtral models
  - Cohere: Command family models
  - Kimi: Moonshot models

### Changed
- Fetch interceptor now supports optional router integration
- Added `setModelRouter()` function to enable/disable routing
- Router is opt-in and does not affect existing functionality
- All router logic is isolated in `src/router/` directory
- Error handling improved with proper Error instances and JSON serialization
- Request body parsing now has proper error handling for non-JSON bodies
- **Model discovery is now dynamic** - `getProviderModels()` uses context registry first, falls back to static list
- Router automatically uses models registered via `registerModels()` or `registerContextLimit()`

### Technical Details
- New `src/router/` module with 4 files:
  - `types.ts` - Type definitions for router
  - `errorDetector.ts` - Error classification logic
  - `routingStrategies.ts` - Three routing strategies
  - `modelRouter.ts` - Main router implementation
- Router integrates with fetch interceptor for automatic retries
- Context registry extended with `getModelsForProvider()` method
- Logger extended with `logRouterEvent()` method
- No modifications to core/ files (maintains architectural integrity)
- No breaking changes to existing APIs

## [1.0.2] - 2026-02-27

### Changed
- Comprehensive professional README with detailed API documentation
- Added complete function reference with parameters, returns, and examples
- Added TypeScript support examples
- Added error handling guide
- Added best practices section
- Added use cases and real-world scenarios

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

- **1.0.0** - Initial release (2026-02-26)

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
