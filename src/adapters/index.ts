import { ProviderAdapter } from "../core/types";
import { openaiAdapter } from "./openai";
import { anthropicAdapter } from "./anthropic";
import { geminiAdapter } from "./gemini";
import { grokAdapter } from "./grok";
import { kimiAdapter } from "./kimi";

/**
 * Registry of all provider adapters
 */
export const adapters: ProviderAdapter[] = [
  openaiAdapter,
  anthropicAdapter,
  geminiAdapter,
  grokAdapter,
  kimiAdapter,
];
