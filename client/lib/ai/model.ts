import { createOpenAI } from '@ai-sdk/openai';

type AiProvider = 'openrouter' | 'gemini' | 'ollama';

function configuredProvider(): AiProvider {
  const value = (process.env.AI_PROVIDER ?? 'openrouter').toLowerCase();
  if (value === 'openrouter' || value === 'gemini' || value === 'ollama') return value;
  throw new Error('AI_PROVIDER must be one of: openrouter, gemini, ollama.');
}

export const aiProvider = configuredProvider();

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Google's OpenAI-compatible endpoint is backed by the Gemini Generative
// Language API (`models/{model}:generateContent`), so it keeps the app's
// existing AI SDK streaming and structured-output workflow intact.
const gemini = createOpenAI({
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
  apiKey: process.env.GEMINI_API_KEY,
});

const ollama = createOpenAI({
  baseURL: `${(process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '')}/v1`,
  apiKey: process.env.OLLAMA_API_KEY ?? 'ollama',
});

export const worksheetModel =
  aiProvider === 'gemini'
    ? gemini.chat(process.env.GEMINI_MODEL ?? 'gemma-4-26b-a4b-it')
    : aiProvider === 'ollama'
      ? ollama.chat(process.env.OLLAMA_MODEL ?? 'gemma3:4b')
      : openrouter.chat(process.env.OPENROUTER_MODEL ?? 'google/gemma-4-26b-a4b-it:free');

export const hasApiKey = () =>
  aiProvider === 'ollama' || Boolean(aiProvider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.OPENROUTER_API_KEY);
