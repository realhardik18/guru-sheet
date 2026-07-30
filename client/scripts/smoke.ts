/**
 * Step 1 gate. Run:  npm run smoke
 *
 * Proves two things, in order:
 *   (a) the provider answers at all
 *   (b) Output.object returns a SCHEMA-VALID worksheet
 *
 * (b) is the one that matters. It is the capability the model choice was made
 * for, and the one most likely to fail. Do not start UI work until it passes.
 */
import { generateText, Output } from 'ai';
import { worksheetModel } from '../lib/ai/model.ts';
import { WorksheetSchema } from '../lib/ai/schema.ts';

const ok = (s: string) => console.log(`\x1b[32m✓\x1b[0m ${s}`);
const bad = (s: string) => console.log(`\x1b[31m✗\x1b[0m ${s}`);

if (!process.env.OPENROUTER_API_KEY) {
  bad('OPENROUTER_API_KEY is not set. Add it to client/.env.local');
  process.exit(1);
}

console.log('\n(a) plain text generation…');
try {
  const { text } = await generateText({
    model: worksheetModel,
    prompt: 'Reply with exactly: READY',
  });
  ok(`model responded: ${JSON.stringify(text.trim().slice(0, 60))}`);
} catch (e) {
  bad(`plain generation failed: ${(e as Error).message}`);
  console.error(e);
  process.exit(1);
}

console.log('\n(b) structured output against WorksheetSchema…');
try {
  const { output } = await generateText({
    model: worksheetModel,
    output: Output.object({ schema: WorksheetSchema }),
    system:
      'You write printable worksheets for Indian school teachers. Be concise.',
    prompt:
      'Create a 3-question worksheet on friction for Class 8. One question per tier (below, at, stretch).',
  });

  const parsed = WorksheetSchema.safeParse(output);
  if (!parsed.success) {
    bad('returned an object but it FAILED schema validation');
    console.error(parsed.error.issues);
    process.exit(1);
  }

  ok(`schema-valid worksheet: "${parsed.data.topic}" (${parsed.data.classLevel})`);
  ok(`${parsed.data.questions.length} questions, ${parsed.data.totalMarks} marks`);
  console.log(
    parsed.data.questions
      .map((q, i) => `   ${i + 1}. [${q.tier}/${q.marks}m] ${q.q.slice(0, 70)}`)
      .join('\n'),
  );
  console.log('\n\x1b[32mGATE PASSED\x1b[0m — safe to build UI.\n');
} catch (e) {
  bad(`structured output failed: ${(e as Error).message}`);
  console.error(e);
  console.log(
    '\nIf this is a schema/tool-support error, fall back in lib/ai/model.ts to:\n' +
      "  openrouter.chat('google/gemma-4-31b-it')   // paid, ~cents/day, has structured_outputs\n",
  );
  process.exit(1);
}
