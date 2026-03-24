import { adapterRegistry } from "../registry";
import { calculateCost } from "../core/costEngine";
import { logger } from "../logger";
import { BudgetManager } from "../core/budgetManager";
import { ModelRouter } from "../router/modelRouter";
import { detectProvider, buildProviderUrl, isCrossProviderSwitch } from "../router/providerDetector";
import { apiKeyManager } from "../router/apiKeyManager";
import { buildProviderHeaders, appendApiKeyToUrl } from "../router/providerHeaders";
import { transformRequest } from "../router/requestTransformer";
import { transformResponse } from "../router/responseTransformer";

let isPatched = false;
let budgetManager: BudgetManager | null = null;
let modelRouter: ModelRouter | null = null;
const originalFetch = globalThis.fetch;

/**
 * Set the budget manager for fetch interception
 */
export function setBudgetManager(manager: BudgetManager | null): void {
  budgetManager = manager;
}

/**
 * Set the model router for fetch interception
 */
export function setModelRouter(router: ModelRouter | null): void {
  modelRouter = router;
}

/**
 * Patch global fetch to intercept LLM API calls
 */
export function patchGlobalFetch(): void {
  if (isPatched) {
    return;
  }

  const interceptedFetch = async function (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ): Promise<Response> {
    // If router is enabled, wrap request with retry logic
    if (modelRouter) {
      return await fetchWithRetry(input, init);
    }

    // Otherwise, use standard fetch with tracking
    return await standardFetch(input, init);
  };

  globalThis.fetch = interceptedFetch as typeof fetch;
  isPatched = true;
}

/**
 * Standard fetch with cost tracking (no retry)
 */
async function standardFetch(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
): Promise<Response> {
  const response = await originalFetch(input, init);

  // Try to clone response for tracking (may fail for some responses)
  let clonedResponse;
  try {
    clonedResponse = response.clone();
  } catch (error) {
    // If cloning fails, just return original response without tracking
    console.warn('TokenFirewall: Failed to clone response for tracking');
    return response;
  }

  // Process response and track budget BEFORE returning
  try {
    const responseData = await clonedResponse.json();
    
    // Try to process with adapter registry
    const normalizedUsage = adapterRegistry.process(responseData);

    if (normalizedUsage) {
      // Calculate cost
      const cost = calculateCost(normalizedUsage);

      // Track budget if manager exists - MUST await to enforce blocking
      if (budgetManager) {
        await budgetManager.track(cost.totalCost);
      }

      // Log usage
      logger.logUsage(normalizedUsage, cost);
    }
  } catch (error) {
    // If it's a budget error, re-throw it
    if (error instanceof Error && error.message.includes('TokenFirewall: Budget exceeded')) {
      throw error;
    }
    // Otherwise, not JSON or not an LLM response - ignore silently
  }

  return response;
}

/**
 * Fetch with automatic retry and model switching (including cross-provider)
 */
async function fetchWithRetry(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
): Promise<Response> {
  // Check if streaming is enabled - router doesn't support streaming yet
  if (init?.body) {
    try {
      const body = JSON.parse(init.body as string);
      if (body.stream === true) {
        console.warn(
          'TokenFirewall Router: Streaming requests are not supported by the router. ' +
          'Falling back to standard fetch without retry logic.'
        );
        return await standardFetch(input, init);
      }
    } catch {
      // Body is not JSON, continue normally
    }
  }

  const attemptedModels: string[] = [];
  let retryCount = 0;
  let lastError: unknown;
  let currentInit = init;
  let currentInput = input;

  // Extract original model and provider from request
  const { originalModel, provider: originalProvider } = extractModelInfo(input, init);
  
  if (originalModel) {
    attemptedModels.push(originalModel);
  }

  // Parse the original request body for potential cross-provider transformations
  let originalRequestBody: any = null;
  if (init?.body) {
    try {
      originalRequestBody = JSON.parse(init.body as string);
    } catch {
      // Not JSON
    }
  }

  while (retryCount <= (modelRouter?.getMaxRetries() || 0)) {
    try {
      // Make the request
      const response = await standardFetch(currentInput, currentInit);

      // Check if response indicates an error
      if (!response.ok) {
        // Clone and read error response safely
        let errorData: any = {};
        try {
          const clonedResponse = response.clone();
          errorData = await clonedResponse.json();
        } catch {
          // Response is not JSON or already consumed
        }
        
        // Throw proper Error instance with structured data
        const errorObj = {
          status: response.status,
          response: { data: errorData }
        };
        throw new Error(JSON.stringify(errorObj));
      }

      // If this was a cross-provider retry, transform the response back
      // to the original provider's format for transparency
      if (originalProvider && retryCount > 0) {
        const currentModel = extractCurrentModel(currentInput, currentInit);
        const currentProvider = currentModel ? detectProvider(currentModel) : null;

        if (currentProvider && currentProvider !== originalProvider) {
          try {
            const clonedForTransform = response.clone();
            const responseData = await clonedForTransform.json();
            const transformed = transformResponse(
              responseData,
              currentProvider,      // source: the provider that actually responded
              originalProvider,     // target: what the caller expects
              currentModel || ''
            );
            return new Response(JSON.stringify(transformed), {
              status: response.status,
              statusText: response.statusText,
              headers: { 'Content-Type': 'application/json' },
            });
          } catch {
            // If transformation fails, return original response
            return response;
          }
        }
      }

      return response;
    } catch (error) {
      lastError = error;

      // If no router or no model info, throw immediately
      if (!modelRouter || !originalModel || !originalProvider) {
        throw error;
      }

      // Parse error if it's a JSON string
      let parsedError = error;
      if (error instanceof Error && error.message.startsWith('{')) {
        try {
          parsedError = JSON.parse(error.message);
        } catch {
          // Keep original error
        }
      }

      // Get routing decision
      const decision = modelRouter.handleFailure({
        error: parsedError,
        originalModel,
        requestBody: currentInit?.body ? (() => {
          try {
            return JSON.parse(currentInit.body as string);
          } catch {
            return {};
          }
        })() : {},
        provider: originalProvider,
        retryCount,
        attemptedModels
      });

      // If no retry, throw the error
      if (!decision.retry || !decision.nextModel) {
        throw error;
      }

      // Log the routing event
      logger.logRouterEvent({
        originalModel,
        nextModel: decision.nextModel,
        reason: decision.reason,
        attempt: retryCount + 1,
        maxRetries: modelRouter.getMaxRetries()
      });

      attemptedModels.push(decision.nextModel);

      // Check if this is a cross-provider switch
      const nextProvider = detectProvider(decision.nextModel);
      const isCrossProvider = nextProvider
        && originalProvider
        && isCrossProviderSwitch(originalModel, decision.nextModel)
        && modelRouter.isCrossProviderEnabled();

      if (isCrossProvider && nextProvider && originalRequestBody) {
        // --- Cross-provider fallback ---
        const updated = buildCrossProviderRequest(
          originalRequestBody,
          originalProvider,
          nextProvider,
          decision.nextModel
        );

        if (updated) {
          currentInput = updated.url;
          currentInit = updated.init;
        } else {
          // Could not build cross-provider request, throw
          throw error;
        }
      } else {
        // --- Same-provider fallback (existing behavior) ---
        const updated = updateRequestModel(currentInput, currentInit, decision.nextModel, originalProvider);
        currentInput = updated.input;
        currentInit = updated.init;
      }

      retryCount++;
    }
  }

  // Max retries exceeded
  throw new Error(
    `TokenFirewall: Max routing retries exceeded. Last error: ${lastError}`
  );
}

/**
 * Build a completely new request for a different provider (cross-provider fallback)
 */
function buildCrossProviderRequest(
  originalBody: any,
  sourceProvider: string,
  targetProvider: string,
  targetModel: string
): { url: string; init: RequestInit } | null {
  // Get API key for target provider
  const apiKey = apiKeyManager.getKey(targetProvider);
  if (!apiKey) {
    console.warn(
      `TokenFirewall Router: No API key registered for provider "${targetProvider}". ` +
      `Cross-provider fallback skipped. Register keys with registerApiKeys().`
    );
    return null;
  }

  // Transform request body
  const transformedBody = transformRequest(
    originalBody,
    sourceProvider,
    targetProvider,
    targetModel
  );

  // Build target URL
  let targetUrl = buildProviderUrl(targetProvider, targetModel);
  if (!targetUrl) {
    console.warn(
      `TokenFirewall Router: Unknown endpoint for provider "${targetProvider}".`
    );
    return null;
  }

  // Append API key to URL if needed (Gemini)
  targetUrl = appendApiKeyToUrl(targetUrl, targetProvider, apiKey);

  // Build headers
  const headers = buildProviderHeaders(targetProvider, apiKey);

  return {
    url: targetUrl,
    init: {
      method: 'POST',
      headers,
      body: JSON.stringify(transformedBody),
    },
  };
}

/**
 * Extract current model from the (possibly updated) request
 */
function extractCurrentModel(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
): string | null {
  // Check URL for Gemini-style model
  const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
  const geminiMatch = url.match(/\/models\/([^:?]+)/);
  if (geminiMatch) {
    return geminiMatch[1];
  }

  // Check body for model field
  if (init?.body) {
    try {
      const body = JSON.parse(init.body as string);
      return body.model || null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Extract model and provider information from request
 */
function extractModelInfo(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
): { originalModel: string | null; provider: string | null } {
  try {
    // Parse URL to detect provider
    const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
    let provider: string | null = null;
    let model: string | null = null;

    if (url.includes('api.openai.com')) {
      provider = 'openai';
    } else if (url.includes('api.anthropic.com')) {
      provider = 'anthropic';
    } else if (url.includes('generativelanguage.googleapis.com')) {
      provider = 'gemini';
      // Gemini model is in URL: /models/{model}:generateContent
      const match = url.match(/\/models\/([^:]+):/);
      if (match) {
        model = match[1];
      }
    } else if (url.includes('api.x.ai')) {
      provider = 'grok';
    } else if (url.includes('api.moonshot.cn')) {
      provider = 'kimi';
    } else {
      // Unknown provider - try to extract from URL hostname
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        // Use first part of hostname as provider (e.g., api.example.com -> example)
        const parts = hostname.split('.');
        if (parts.length >= 2) {
          provider = parts[parts.length - 2]; // Get domain name
        }
      } catch {
        provider = 'unknown';
      }
    }

    // Extract model from request body (for non-Gemini providers)
    if (!model) {
      let body: string | null = null;
      
      // Get body from init or Request object
      if (init?.body) {
        body = typeof init.body === 'string' ? init.body : null;
      } else if (input instanceof Request && input.body) {
        // Note: Request.body is a ReadableStream, we can't read it here without consuming it
        // So we skip body parsing for Request objects without explicit init.body
        body = null;
      }
      
      if (body) {
        try {
          const bodyObj = JSON.parse(body);
          model = bodyObj.model || null;
        } catch {
          // Body is not JSON or doesn't have model field
        }
      }
    }

    return { originalModel: model, provider };
  } catch {
    return { originalModel: null, provider: null };
  }
}

/**
 * Update request with new model (handles both URL and body)
 */
function updateRequestModel(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1],
  newModel: string,
  provider: string | null
): { input: Parameters<typeof fetch>[0]; init: Parameters<typeof fetch>[1] } {
  let newInput = input;
  let newInit = init;

  // Get the URL string
  const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));

  // Update URL for Gemini (model is in URL path)
  if (provider === 'gemini') {
    const newUrl = url.replace(/\/models\/[^:]+:/, `/models/${newModel}:`);
    
    // If input was a Request object, we need to create a new Request with updated URL
    if (input instanceof Request) {
      // Clone the request with new URL
      newInput = new Request(newUrl, {
        method: input.method,
        headers: input.headers,
        body: init?.body || null,
        mode: input.mode,
        credentials: input.credentials,
        redirect: input.redirect,
        referrer: input.referrer,
        integrity: input.integrity
      });
    } else {
      newInput = newUrl;
    }
  }

  // Update body for other providers (model is in request body)
  if (init?.body) {
    try {
      const body = JSON.parse(init.body as string);
      body.model = newModel;

      newInit = {
        ...init,
        body: JSON.stringify(body)
      };
    } catch {
      // Body is not JSON, log warning
      console.warn(
        `TokenFirewall Router: Cannot update model in non-JSON request body. ` +
        `Model switching may not work correctly.`
      );
    }
  } else if (input instanceof Request && provider !== 'gemini') {
    // Request object without explicit init.body - we can't modify it
    console.warn(
      `TokenFirewall Router: Cannot update model in Request object without explicit body. ` +
      `Model switching may not work correctly.`
    );
  }

  return { input: newInput, init: newInit };
}

/**
 * Restore original fetch
 */
export function unpatchGlobalFetch(): void {
  if (isPatched) {
    globalThis.fetch = originalFetch;
    isPatched = false;
  }
}
