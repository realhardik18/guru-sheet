import { z } from 'zod';

export const QuestionSchema = z.object({
  q: z.string().describe('The question text, as it appears on the page.'),
  type: z.enum(['mcq', 'short', 'long']),
  options: z
    .array(z.string())
    .optional()
    .describe('Four options. Required for mcq, omitted otherwise.'),
  answer: z.string(),
  tier: z
    .enum(['below', 'at', 'stretch'])
    .describe('below = working below grade level, at = at level, stretch = above.'),
  marks: z.number(),
  commonWrongAnswer: z
    .string()
    .optional()
    .describe('The mistake a teacher should expect to see, for marking.'),
  sourcePage: z
    .number()
    .optional()
    .describe(
      'The book page number (from the [[page N]] markers in the chapter text) that this question was drawn from.',
    ),
});

export const WorksheetSchema = z.object({
  topic: z.string(),
  classLevel: z.string(),
  totalMarks: z.number(),
  questions: z.array(QuestionSchema),
});

export type Question = z.infer<typeof QuestionSchema>;
export type Worksheet = z.infer<typeof WorksheetSchema>;

export const TIERS = ['below', 'at', 'stretch'] as const;

export const TIER_LABELS: Record<Question['tier'], string> = {
  below: 'Section A — Building up',
  at: 'Section B — On level',
  stretch: 'Section C — Stretch',
};
