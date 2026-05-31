import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import ai from '../config/groq.config';
import prisma from '../database/prisma';
import { MAX_INTERVIEW_QUESTIONS, SCENARIO_DEFINITIONS, ScenarioDefinition } from '../config/interview.config';
import { Prisma } from '@prisma/client';
import {
  GapType,
  Failure,
  Scorecard,
  Diagnosis,
  InterviewTurn,
  InterviewResponse,
  interviewResponseSchema
} from '../schemas/interview.schema';

// Normalizes the technical gap key returned by the AI, ensuring compatibility with the database GapType enum
const normalizeGapType = (gap?: string | null): GapType => {
  switch (gap) {
    case 'BUZZWORD_BLUFF':
      return 'BUZZWORD_BLUFF';
    case 'CHANGING_REQUIREMENTS':
      return 'CHANGING_REQUIREMENTS';
    case 'DEFENSIVE_RESPONSE':
      return 'DEFENSIVE_RESPONSE';
    case 'HAPPY_PATH_ONLY':
      return 'HAPPY_PATH_ONLY';
    default:
      return 'NONE';
  }
};

// Type guard to dynamically narrow down unknown values to indexable records
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Sanitizes the raw AI response to avoid type mismatches (e.g. finalScore as string) and missing/invalid keys
const sanitizeRawResponse = (raw: unknown): Record<string, unknown> => {
  if (!isRecord(raw)) {
    return {
      isFinalVerdict: false,
      nextInterviewerMessage: "Desculpe, ocorreu um erro ao processar a resposta.",
      diagnosis: {
        gapDetected: "NONE",
        evidenceSpan: "",
        note: "Falha na estrutura da resposta da IA."
      },
      finalScorecard: null
    };
  }

  const rawDiagnosis = isRecord(raw['diagnosis']) ? raw['diagnosis'] : null;
  const rawScorecard = isRecord(raw['finalScorecard']) ? raw['finalScorecard'] : null;

  const gapStr = rawDiagnosis && typeof rawDiagnosis['gapDetected'] === 'string'
    ? rawDiagnosis['gapDetected']
    : 'NONE';
  const gap = normalizeGapType(gapStr);

  const sanitized: Record<string, unknown> = {
    isFinalVerdict: typeof raw['isFinalVerdict'] === 'boolean' ? raw['isFinalVerdict'] : false,
    nextInterviewerMessage: typeof raw['nextInterviewerMessage'] === 'string'
      ? raw['nextInterviewerMessage'].trim()
      : "",
    feedback: typeof raw['feedback'] === 'string'
      ? raw['feedback'].trim()
      : null,
    diagnosis: {
      gapDetected: gap,
      evidenceSpan: rawDiagnosis && typeof rawDiagnosis['evidenceSpan'] === 'string'
        ? rawDiagnosis['evidenceSpan'].trim()
        : "",
      note: rawDiagnosis && typeof rawDiagnosis['note'] === 'string'
        ? rawDiagnosis['note'].trim()
        : ""
    },
    finalScorecard: null
  };

  if (rawScorecard) {
    const rawFailures = rawScorecard['failures'];
    const failures: Record<string, string>[] = [];
    if (Array.isArray(rawFailures)) {
      for (const f of rawFailures) {
        if (isRecord(f)) {
          failures.push({
            criterion: typeof f['criterion'] === 'string' ? f['criterion'].trim() : "Critério Geral",
            description: typeof f['description'] === 'string' ? f['description'].trim() : "Inconsistência técnica observada."
          });
        }
      }
    }

    let finalScore = 30;
    if (typeof rawScorecard['finalScore'] === 'number') {
      finalScore = rawScorecard['finalScore'];
    } else if (typeof rawScorecard['finalScore'] === 'string') {
      const parsedScore = parseInt(rawScorecard['finalScore'], 10);
      if (!isNaN(parsedScore)) {
        finalScore = parsedScore;
      }
    }

    sanitized['finalScorecard'] = {
      scenarioTitle: typeof rawScorecard['scenarioTitle'] === 'string'
        ? rawScorecard['scenarioTitle'].trim()
        : "",
      finalScore,
      failures
    };
  }

  return sanitized;
};

let systemPromptTemplateCache: string | null = null;

const getSystemPromptTemplate = (): string => {
  if (systemPromptTemplateCache !== null) {
    return systemPromptTemplateCache;
  }
  try {
    const promptTemplatePath = path.join(process.cwd(), 'src/prompts/interview.prompt.md');
    systemPromptTemplateCache = fs.readFileSync(promptTemplatePath, 'utf8');
    return systemPromptTemplateCache;
  } catch (error) {
    console.error('[InterviewService] Error reading prompt template:', error);
    return 'Você é um entrevistador técnico adverso no cenário {{scenarioTitle}}. {{verdictInstruction}} Scope: {{scope}}. Focus: {{focus}}. Avoid: {{avoid}}';
  }
};

// Rebuilds the system prompt template by replacing markdown placeholders using global regular expressions
const buildSystemPrompt = (scenario: string, forceVerdict: boolean = false): string => {
  const definition = getScenarioDefinition(scenario);
  
  const scopeStr = definition.rules.scope;
  const focusStr = definition.rules.focus 
    ? `Foque estritamente em avaliar: ${definition.rules.focus.join(', ')}.` 
    : '';
  const avoidStr = definition.rules.avoid 
    ? `Evite abordar ou aceitar desvios para: ${definition.rules.avoid.join(', ')} (a menos que o candidato os traga ativamente).` 
    : '';

  const verdictInstruction = forceVerdict 
    ? `ATENÇÃO CRÍTICA: O limite máximo de ${MAX_INTERVIEW_QUESTIONS} perguntas foi atingido!
Você DEVE obrigatoriamente encerrar a entrevista e gerar o veredito final (isFinalVerdict = true).
Não faça novas perguntas. Forneça o scorecard completo (finalScorecard) e o veredito agora.`
    : `Se este limite for atingido, gere o veredito final em vez de fazer nova pergunta.`;

  return getSystemPromptTemplate()
    .replace(/\{\{scenarioTitle\}\}/g, definition.title)
    .replace(/\{\{scenarioDescription\}\}/g, definition.description)
    .replace(/\{\{maxQuestions\}\}/g, String(MAX_INTERVIEW_QUESTIONS))
    .replace(/\{\{verdictInstruction\}\}/g, verdictInstruction)
    .replace(/\{\{scope\}\}/g, scopeStr)
    .replace(/\{\{focus\}\}/g, focusStr)
    .replace(/\{\{avoid\}\}/g, avoidStr);
};

// Extracts the JSON payload from the AI response, sanitizes its fields, and validates it against the Zod schema
const extractAndParseJson = (rawText: string): InterviewResponse => {
  let cleanedText = rawText.trim();
  
  // Remove markdown code fences if present
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '');
    cleanedText = cleanedText.replace(/\s*```$/, '');
    cleanedText = cleanedText.trim();
  }

  const start = cleanedText.indexOf('{');
  const end = cleanedText.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    throw new Error('Could not locate JSON object in AI response.');
  }

  const jsonContent = cleanedText.substring(start, end + 1);
  
  const parsed = JSON.parse(jsonContent);
  const sanitized = sanitizeRawResponse(parsed);

  const validation = interviewResponseSchema.safeParse(sanitized);
  if (!validation.success) {
    console.error('[AI Response Error] Schema validation failed:', validation.error.format());
    throw new Error(`AI response structure is invalid: ${validation.error.message}`);
  }

  return validation.data;
};

const getScenarioDefinition = (title: string): ScenarioDefinition => {
  return SCENARIO_DEFINITIONS.find((scenario) => scenario.title === title) ?? {
    title,
    description: title,
    rules: { scope: title },
    isLocked: false,
  };
};

const ensureScenario = async (title: string) => {
  const definition = getScenarioDefinition(title);
  const rulesJson: Prisma.InputJsonValue = JSON.parse(JSON.stringify(definition.rules));

  return prisma.scenario.upsert({
    where: { title: definition.title },
    update: {},
    create: {
      title: definition.title,
      description: definition.description,
      enunciation: "",
      rules: rulesJson,
      isLocked: definition.isLocked,
    },
  });
};

const ensureUserId = async (userId?: string) => {
  if (userId) {
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (existingUser) return existingUser.id;
  }

  const fallbackEmail = 'hackathon@local.dev';
  const hashedPassword = await bcrypt.hash('not-used', 10);
  const fallbackUser = await prisma.user.upsert({
    where: { email: fallbackEmail },
    update: {},
    create: {
      name: 'Hackathon User',
      email: fallbackEmail,
      password: hashedPassword,
    },
  });

  return fallbackUser.id;
};

class InterviewService {
  async startInterview(scenario: string, userId?: string): Promise<InterviewResponse> {
    const contents = [
      {
        role: 'user',
        parts: [{ text: `Inicie a entrevista sobre o cenário: ${scenario}` }],
      },
    ];

    const rawText = await ai.sendPrompt(contents, buildSystemPrompt(scenario, false));
    const result = extractAndParseJson(rawText);

    const scenarioRecord = await ensureScenario(scenario);
    const verifiedUserId = await ensureUserId(userId);

    const historyJson: Prisma.InputJsonValue = JSON.parse(
      JSON.stringify([{ role: 'interviewer', content: result.nextInterviewerMessage }])
    );

    const interview = await prisma.interview.create({
      data: {
        userId: verifiedUserId,
        scenarioId: scenarioRecord.id,
        history: historyJson,
        turnCount: 1,
        currentStep: 'PRESENTATION',
      }
    });

    result.interviewId = interview.id;
    return result;
  }

  async sendInterviewMessage(
    interviewId: string | undefined,
    scenario: string,
    history: InterviewTurn[],
    candidateMessage: string,
    userId?: string
  ): Promise<InterviewResponse> {
    let currentInterviewId = interviewId;

    if (currentInterviewId) {
      const existing = await prisma.interview.findUnique({
        where: { id: currentInterviewId },
        select: { currentStep: true }
      });
      if (!existing) {
        throw new Error('Interview not found.');
      }
      if (existing.currentStep === 'VERDICT') {
        throw new Error('This interview is already finalized and cannot receive new messages.');
      }
    } else {
      const scenarioRecord = await ensureScenario(scenario);
      const verifiedUserId = await ensureUserId(userId);
      const historyJson: Prisma.InputJsonValue = JSON.parse(JSON.stringify(history));

      const interview = await prisma.interview.create({
        data: {
          userId: verifiedUserId,
          scenarioId: scenarioRecord.id,
          history: historyJson,
        }
      });
      currentInterviewId = interview.id;
    }

    const contents = [
      ...history.map((turn) => ({
        role: turn.role === 'interviewer' ? 'model' : 'user',
        parts: [{ text: turn.content }],
      })),
      {
        role: 'user',
        parts: [{ text: candidateMessage }],
      },
    ];

    const interviewerQuestionsCount = history.filter((turn) => turn.role === 'interviewer').length;
    const forceVerdict = interviewerQuestionsCount >= MAX_INTERVIEW_QUESTIONS;

    const rawText = await ai.sendPrompt(contents, buildSystemPrompt(scenario, forceVerdict));
    const result = extractAndParseJson(rawText);

    // Safeguard: programmatically force a verdict if the AI missed the instruction
    if (forceVerdict && !result.isFinalVerdict) {
      console.warn('[AI] Model did not return isFinalVerdict = true on forced verdict. Overriding.');
      result.isFinalVerdict = true;
      result.finalScorecard = {
        scenarioTitle: scenario,
        finalScore: result.finalScorecard?.finalScore ?? 30,
        failures: result.finalScorecard?.failures ?? [
          {
            criterion: "Avaliação Geral",
            description: "O candidato atingiu o limite de perguntas do cenário sem responder de forma completa a todos os critérios."
          }
        ],
      };
      result.nextInterviewerMessage = result.nextInterviewerMessage || "Entrevista encerrada. O limite de perguntas foi atingido.";
      result.diagnosis = {
        gapDetected: result.diagnosis?.gapDetected || 'HAPPY_PATH_ONLY',
        evidenceSpan: candidateMessage,
        note: result.diagnosis?.note || 'O limite máximo de perguntas foi atingido.',
      };
    }

    const updatedHistory = [
      ...history,
      { role: 'candidate', content: candidateMessage, feedback: result.feedback },
      { role: 'interviewer', content: result.nextInterviewerMessage }
    ];

    if (currentInterviewId) {
      const updatedInterviewerQuestionsCount = updatedHistory.filter(turn => turn.role === 'interviewer').length;
      const currentStep = result.isFinalVerdict 
        ? 'VERDICT' 
        : (updatedInterviewerQuestionsCount > 1 ? 'PROBING' : 'PRESENTATION');

      const updatedHistoryJson: Prisma.InputJsonValue = JSON.parse(JSON.stringify(updatedHistory));
      const failuresJson: Prisma.InputJsonValue = result.finalScorecard?.failures
        ? JSON.parse(JSON.stringify(result.finalScorecard.failures))
        : null;

      await prisma.interview.update({
        where: { id: currentInterviewId },
        data: {
          history: updatedHistoryJson,
          score: result.finalScorecard?.finalScore ?? null,
          verdict: result.isFinalVerdict
            ? (result.finalScorecard && result.finalScorecard.finalScore >= 70 ? 'APROVADO' : 'REPROVADO')
            : null,
          gapDetected: result.diagnosis?.gapDetected ?? null,
          evidence: result.diagnosis?.evidenceSpan ?? null,
          note: result.diagnosis?.note ?? null,
          failures: failuresJson,
          turnCount: updatedInterviewerQuestionsCount,
          currentStep: currentStep,
        }
      });
    }

    result.interviewId = currentInterviewId;
    return result;
  }
}

export default new InterviewService();
