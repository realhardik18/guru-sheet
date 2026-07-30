import type { Worksheet } from './schema';

/**
 * Stage insurance. If the free tier rate-limits or times out mid-demo, render
 * this instead of an error and keep talking. It is schema-valid by construction.
 */
export const FALLBACK_WORKSHEET: Worksheet = {
  topic: 'Force and Pressure',
  classLevel: 'Class 8',
  totalMarks: 20,
  questions: [
    {
      q: 'Which of the following is the correct SI unit of force?',
      type: 'mcq',
      options: ['Newton (N)', 'Pascal (Pa)', 'Joule (J)', 'Kilogram (kg)'],
      answer: 'Newton (N)',
      tier: 'below',
      marks: 1,
      commonWrongAnswer:
        'Pascal — learners confuse the unit of pressure with the unit of force.',
    },
    {
      q: 'A force can change the ______ of an object, the ______ of an object, or both.',
      type: 'short',
      answer: 'State of motion; shape',
      tier: 'below',
      marks: 2,
      commonWrongAnswer: 'Weight; size — describing effects rather than the two categories.',
    },
    {
      q: 'Name two forces that act on a book resting on a table.',
      type: 'short',
      answer:
        'The weight of the book acting downwards, and the normal reaction of the table acting upwards.',
      tier: 'below',
      marks: 2,
    },
    {
      q: 'Why does a sharp knife cut better than a blunt one? Answer in terms of pressure.',
      type: 'short',
      answer:
        'A sharp knife has a much smaller area of contact. Since pressure = force / area, the same force produces far greater pressure, so it cuts more easily.',
      tier: 'at',
      marks: 3,
      commonWrongAnswer:
        '"Because it is sharper" — restates the question without using the pressure relationship.',
    },
    {
      q: 'A force of 60 N acts on an area of 0.5 m². Calculate the pressure exerted. Show your working.',
      type: 'short',
      answer: 'Pressure = Force / Area = 60 / 0.5 = 120 Pa (or 120 N/m²).',
      tier: 'at',
      marks: 3,
      commonWrongAnswer: '30 Pa — multiplying by 0.5 instead of dividing.',
    },
    {
      q: 'Explain why the walls of a dam are built thicker at the bottom than at the top.',
      type: 'long',
      answer:
        'The pressure exerted by a liquid increases with depth, because a greater height of water column presses down. The bottom of the dam therefore experiences much greater pressure than the top, so the wall must be thicker there to withstand it without breaking.',
      tier: 'at',
      marks: 4,
    },
    {
      q: 'A camel walks easily on soft sand while a person in narrow heels sinks in. Using the relationship between force, area and pressure, explain this difference. Refer to both the camel and the person in your answer.',
      type: 'long',
      answer:
        'Pressure = force / area. A camel has broad, flat feet, so its weight is spread over a large area of contact, producing low pressure on the sand and little sinking. Narrow heels have a very small area of contact, so even a much smaller weight produces very high pressure, and the heel sinks into the sand. The deciding factor is the area over which the force acts, not the weight alone.',
      tier: 'stretch',
      marks: 5,
      commonWrongAnswer:
        'Answering only that the camel is heavier — this reverses the expected result and ignores area entirely.',
    },
  ],
};
