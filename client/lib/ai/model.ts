import { createOpenAI } from '@ai-sdk/openai';

/**
 * The ONLY place in this codebase that names an inference provider.
 *
 * Everything else imports `worksheetModel` from here. Moving inference on-device
 * is a one-line change to this file — nothing downstream knows or cares where
 * the tokens come from.
 */
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

// `.chat()` on purpose: a bare openrouter(id) call resolves to OpenAI's
// Responses API, which OpenRouter does not implement.
export const worksheetModel = openrouter.chat('google/gemma-4-26b-a4b-it:free');

// LATER (local):
// import { createOllama } from 'ollama-ai-provider';
// export const worksheetModel = createOllama()('gemma3:4b');

export const hasApiKey = () => Boolean(process.env.OPENROUTER_API_KEY);
