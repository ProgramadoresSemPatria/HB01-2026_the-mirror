import { z } from 'zod';

export const gapTypeSchema = z.enum([
  'HAPPY_PATH_ONLY',
  'BUZZWORD_BLUFF',
  'CHANGING_REQUIREMENTS',
  'DEFENSIVE_RESPONSE',
  'NONE'
]);

export type GapType = z.infer<typeof gapTypeSchema>;

export const interviewTurnSchema = z.object({
  role: z.enum(['interviewer', 'candidate']),
  content: z.string().trim(),
  feedback: z.string().trim().nullable().optional(),
});

export type InterviewTurn = z.infer<typeof interviewTurnSchema>;

export const failureSchema = z.object({
  criterion: z.string().trim(),
  description: z.string().trim(),
});

export type Failure = z.infer<typeof failureSchema>;

export const scorecardSchema = z.object({
  scenarioTitle: z.string().trim(),
  finalScore: z.number(),
  failures: z.array(failureSchema),
});

export type Scorecard = z.infer<typeof scorecardSchema>;

export const diagnosisSchema = z.object({
  gapDetected: gapTypeSchema,
  evidenceSpan: z.string().trim(),
  note: z.string().trim(),
});

export type Diagnosis = z.infer<typeof diagnosisSchema>;

export const interviewResponseSchema = z.object({
  interviewId: z.string().trim().optional(),
  isFinalVerdict: z.boolean(),
  nextInterviewerMessage: z.string().trim(),
  feedback: z.string().trim().nullable().optional(),
  diagnosis: diagnosisSchema,
  finalScorecard: scorecardSchema.nullable(),
});

export type InterviewResponse = z.infer<typeof interviewResponseSchema>;

// Request Schemas for Controllers
export const startInterviewSchema = z.object({
  scenario: z.string().trim().min(1, 'Cenário é obrigatório.'),
  userId: z.string().trim().optional(),
});

export type StartInterviewInput = z.infer<typeof startInterviewSchema>;

export const sendInterviewMessageSchema = z.object({
  interviewId: z.string().trim().optional(),
  scenario: z.string().trim().min(1, 'Cenário é obrigatório.'),
  history: z.array(interviewTurnSchema),
  candidateMessage: z.string().trim().min(1, 'Mensagem do candidato é obrigatória.'),
  userId: z.string().trim().optional(),
});

export type SendInterviewMessageInput = z.infer<typeof sendInterviewMessageSchema>;
