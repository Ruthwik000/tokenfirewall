# Final QA Checklist

Use this checklist before release candidates and before marking final testing complete.

## Automated Smoke Suite

1. Install dependencies with `npm install` if the local `node_modules` directory is missing.
2. Run the TypeScript build and deterministic QA suite:

   ```sh
   npm test
   ```

3. Confirm the output reports both suites passing:
   - `tests/final-qa.test.js`
   - `tests/cross-provider.test.js`

The final QA smoke suite covers:

- Budget guard tracking, export, reset, and import state.
- Router config validation for invalid fallback maps.
- Rate-limit fallback decisions across OpenAI, Anthropic, and Gemini models.
- Provider detection, provider URL generation, request headers, and Gemini API key placement.
- Request transformations for OpenAI to Anthropic and OpenAI to Gemini.
- Response transformations preserving text and token usage metadata.

## Manual Real-API Checks

Only run these checks with test keys in a non-production environment.

1. Set provider keys for the providers being checked.
2. Enable model routing with cross-provider fallback.
3. Send a short factual prompt through the default model and confirm a normal response.
4. Force or simulate a 429/rate-limit response from the default provider and confirm the fallback model is selected.
5. Repeat with at least three prompt types:
   - Short Q&A prompt.
   - Multi-turn chat prompt with a system instruction.
   - Longer summarization or code-review prompt.
6. Confirm analytics/budget state changes after each request:
   - Total spend increases only for tracked requests.
   - Remaining budget decreases by the tracked amount.
   - Exported state can be re-imported without losing totals.
7. Confirm error handling:
   - Missing API key fails clearly.
   - Unsupported model fails clearly.
   - Invalid fallback configuration fails before routing.
   - Exhausted retries return a non-retry decision.

## Release Sign-Off

- `npm test` passes locally.
- Real-API manual checks were run with test credentials or explicitly deferred by a maintainer.
- Any failed provider, prompt type, or analytics check is documented before release.
