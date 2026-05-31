import { request } from './client';

export type GapType = 'HAPPY_PATH_ONLY' | 'BUZZWORD_BLUFF' | 'CHANGING_REQUIREMENTS' | 'DEFENSIVE_RESPONSE' | 'NONE';

export interface Diagnosis {
  gapDetected: GapType;
  evidenceSpan: string;
  note: string;
}

export interface Failure {
  criterion: string;
  description: string;
}

export interface Scorecard {
  scenarioTitle: string;
  finalScore: number;
  failures: Failure[];
}

export interface InterviewResponse {
  interviewId?: string;
  isFinalVerdict: boolean;
  nextInterviewerMessage: string;
  feedback?: string;
  diagnosis: Diagnosis;
  finalScorecard: Scorecard | null;
}

export interface StartInterviewParams {
  scenario: string;
  userId?: string;
}

export interface SendMessageParams {
  interviewId: string | null;
  scenario: string;
  history: Array<{ role: string; content: string; feedback?: string }>;
  candidateMessage: string;
  userId?: string;
}

export const interviewApi = {
  start: (params: StartInterviewParams) =>
    request<InterviewResponse>('/interview/start', {
      method: 'POST',
      body: params,
    }),

  sendMessage: (params: SendMessageParams) =>
    request<InterviewResponse>('/interview/message', {
      method: 'POST',
      body: params,
    }),
};
