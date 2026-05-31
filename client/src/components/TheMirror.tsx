import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Database, Zap, Lock, Rocket, HardDrive, LineChart, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react'
import {
  interviewApi,
  GapType,
  Failure,
  Scorecard,
  Diagnosis,
  InterviewResponse
} from '../api/interview'

interface Turn {
  role: 'interviewer' | 'candidate'
  content: string
  diagnosis?: Diagnosis
  feedback?: string
}

type AppState = 'SETUP' | 'INTERVIEW' | 'VERDICT'

const SCENARIOS = [
  { id: 'auth', slug: 'authentication', label: 'Autenticação', icon: <ShieldCheck size={24} />, description: 'sabe como blindar o acesso do usuário sem criar brechas de segurança na sua arquitetura?', locked: false },
  { id: 'n1', slug: 'n-plus-one', label: 'Problema N+1', icon: <LineChart size={24} />, description: 'sabe como impedir que o seu ORM destrua a performance com milhares de consultas ocultas?', locked: false },
  { id: 'deploy', slug: 'zero-downtime-deploy', label: 'Deploy sem Downtime', icon: <Rocket size={24} />, description: 'sabe como enviar código para produção numa sexta-feira à tarde sem tirar o sistema do ar?', locked: false },
  { id: 'query', slug: 'query-optimization', label: 'Otimização de Query', icon: <Database size={24} />, description: 'sabe como eliminar gargalos em produção antes que derrubem o seu banco de dados?', locked: true },
  { id: 'race', slug: 'race-condition', label: 'Race Condition', icon: <Zap size={24} />, description: 'sabe como lidar com concorrência e evitar que múltiplos acessos simultâneos corrompam seus dados?', locked: true },
  { id: 'cache', slug: 'cache-strategy', label: 'Estratégia de Cache', icon: <HardDrive size={24} />, description: 'sabe como entregar alta velocidade de resposta sem servir dados defasados para o cliente?', locked: true },
]

const SCENARIO_BY_SLUG = Object.fromEntries(SCENARIOS.map((scenario) => [scenario.slug, scenario]))

const GAP_LABELS: Record<GapType, string> = {
  HAPPY_PATH_ONLY: 'Pensamento de Caminho Feliz',
  BUZZWORD_BLUFF: 'Blefe com Buzzwords',
  CHANGING_REQUIREMENTS: 'Colapso ao Mudar Requisito',
  DEFENSIVE_RESPONSE: 'Resposta Defensiva',
  NONE: 'Sem gap detectado',
}

const GAP_COLORS: Record<GapType, string> = {
  HAPPY_PATH_ONLY: '#f59e0b',
  BUZZWORD_BLUFF: '#8b5cf6',
  CHANGING_REQUIREMENTS: '#ef4444',
  DEFENSIVE_RESPONSE: '#f97316',
  NONE: '#6b7280',
}

// Score Ring
function ScoreRing({ score }: { score: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score < 40 ? '#ef4444' : score < 70 ? '#f59e0b' : '#22c55e'

  return (
    <div className="mirror-score-ring">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={radius} fill="none" stroke="#1f2937" strokeWidth="10" />
        <circle
          cx="65" cy="65" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div className="mirror-score-center">
        <span className="mirror-score-number" style={{ color }}>{score}</span>
        <span className="mirror-score-label">/ 100</span>
      </div>
    </div>
  )
}

// Setup Screen
function SetupScreen() {
  const navigate = useNavigate()

  return (
    <div className="mirror-setup">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mirror-setup-header"
      >
        <div className="mirror-logo-wrap">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
          <h1 className="mirror-title">The Mirror</h1>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="mirror-scenario-label"
        style={{ fontSize: '2rem', fontWeight: 600, color: 'white', marginBottom: '1.5rem', textAlign: 'center', textTransform: 'none' }}
      >
        Você realmente...
      </motion.div>

      <div className="mirror-scenarios-grid">
        {SCENARIOS.map((s, i) => (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i + 0.4, duration: 0.4 }}
            className={`mirror-scenario-card flex items-start gap-4 p-4 rounded-xl text-left border ${
              s.locked ? 'opacity-40 cursor-not-allowed border-zinc-800 grayscale' : 'border-zinc-800 hover:border-zinc-600'
            }`}
            onClick={() => !s.locked && navigate(`/interviews/${s.slug}`)}
            disabled={s.locked}
          >
            <span className="mirror-scenario-icon text-zinc-400 mt-1">{s.locked ? <Lock size={24} /> : s.icon}</span>
            <div>
              <div className="mirror-scenario-name text-white font-semibold flex items-center gap-2">
                {s.label}
              </div>
              <div className="mirror-scenario-desc text-zinc-400 text-sm mt-1">{s.description}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// Interview Screen
function InterviewScreen({
  scenario,
  turns,
  isLoading,
  onSend,
}: {
  scenario: string
  turns: Turn[]
  isLoading: boolean
  onSend: (msg: string) => void
}) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, isLoading])

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [input])

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <div className="mirror-interview">
      {/* Header */}
      <div className="mirror-interview-header">
        <div className="mirror-logo-sm">
          <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
          <span className="mirror-title-sm">Simulador</span>
        </div>
        <div className="mirror-interview-scenario">
          <span className="mirror-scenario-pill">{scenario}</span>
        </div>
        <div className="mirror-interviewer-badge">
          <div className="mirror-avatar-dot" />
          <span>Entrevistador</span>
        </div>
      </div>

      {/* Chat area */}
      <div className="mirror-chat">
        <AnimatePresence initial={false}>
          {turns.map((turn, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className={`mirror-bubble-wrap ${turn.role === 'candidate' ? 'mirror-bubble-wrap--candidate' : ''}`}
            >
              {turn.role === 'interviewer' && (
                <div className="mirror-avatar !bg-transparent border-none">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
              )}
              <div className={`flex flex-col gap-2 max-w-full ${turn.role === 'candidate' ? 'items-end' : 'items-start'}`}>
                <div className={`mirror-bubble ${
                  turn.role === 'interviewer' 
                    ? 'mirror-bubble--interviewer' 
                    : turn.feedback 
                      ? 'mirror-bubble--candidate mirror-bubble--candidate-feedback' 
                      : 'mirror-bubble--candidate'
                }`}>
                  <p>{turn.content}</p>
                  {turn.diagnosis && turn.diagnosis.gapDetected !== 'NONE' && (
                    <div className="mirror-gap-tag" style={{ borderColor: GAP_COLORS[turn.diagnosis.gapDetected] }}>
                      <span style={{ color: GAP_COLORS[turn.diagnosis.gapDetected] }}>
                        ⚑ {GAP_LABELS[turn.diagnosis.gapDetected]}
                      </span>
                    </div>
                  )}
                </div>

                {turn.role === 'candidate' && turn.feedback && (
                  <div className="mirror-feedback-box">
                    <AlertCircle className="mirror-feedback-icon" size={16} />
                    <span>{turn.feedback}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mirror-bubble-wrap"
            >
              <div className="mirror-avatar !bg-transparent border-none">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="mirror-bubble mirror-bubble--interviewer mirror-typing">
                <span /><span /><span />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mirror-input-wrap">
        <textarea
          ref={textareaRef}
          className="mirror-input"
          placeholder="Sua resposta..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          rows={1}
          disabled={isLoading}
        />
        <button
          className="mirror-send-btn"
          disabled={!input.trim() || isLoading}
          onClick={handleSend}
          aria-label="Enviar"
        >
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  )
}

// Verdict Screen
function VerdictScreen({
  scorecard,
  diagnosis,
  onRestart,
}: {
  scorecard: Scorecard
  diagnosis: Diagnosis
  onRestart: () => void
}) {
  const finalScore = scorecard?.finalScore ?? 0
  const scenarioTitle = scorecard?.scenarioTitle ?? 'Simulação Concluída'
  const failuresList = scorecard?.failures ?? []

  return (
    <div className="mirror-verdict">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mirror-verdict-card"
      >
        {/* Header */}
        <div className="mirror-verdict-header" style={{
          background: finalScore >= 70 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(220, 38, 38, 0.15)'
        }}>
          <div className="mirror-verdict-stamp" style={{
            color: finalScore >= 70 ? '#22c55e' : 'var(--mirror-accent)',
            borderColor: finalScore >= 70 ? '#22c55e' : 'var(--mirror-accent)'
          }}>
            {finalScore >= 70 ? 'APROVADO' : 'REPROVADO'}
          </div>
          <h2 className="mirror-verdict-title">{scenarioTitle}</h2>
          <p className="mirror-verdict-subtitle">Relatório de Performance Técnica</p>
        </div>

        {/* Score */}
        <div className="mirror-verdict-score-section">
          <ScoreRing score={finalScore} />
          <div className="mirror-verdict-gap">
            <div
              className="mirror-gap-badge"
              style={{ background: `${GAP_COLORS[diagnosis.gapDetected]}22`, borderColor: GAP_COLORS[diagnosis.gapDetected] }}
            >
              <span style={{ color: GAP_COLORS[diagnosis.gapDetected] }}>
                ⚑ {GAP_LABELS[diagnosis.gapDetected]}
              </span>
            </div>
            {diagnosis.note && (
              <p className="mirror-verdict-note">{diagnosis.note}</p>
            )}
            {diagnosis.evidenceSpan && (
              <blockquote className="mirror-evidence">"{diagnosis.evidenceSpan}"</blockquote>
            )}
          </div>
        </div>

        {/* Failures checklist */}
        <div className="mirror-failures">
          <h3 className="mirror-failures-title">Falhas Identificadas</h3>
          <div className="mirror-failures-list">
            {failuresList.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 * i + 0.3, duration: 0.4 }}
                className="mirror-failure-item"
              >
                <div className="mirror-failure-dot" />
                <div>
                  <div className="mirror-failure-criterion">{f.criterion}</div>
                  <div className="mirror-failure-desc">{f.description}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Restart */}
        <button className="mirror-restart-btn" onClick={onRestart}>
          ↺ Nova Simulação
        </button>
      </motion.div>
    </div>
  )
}

// Main Interview Page (SPA state machine)
export default function TheMirrorPage({ userId }: { userId?: string }) {
  const [appState, setAppState] = useState<AppState>('SETUP')
  const [scenario, setScenario] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [verdict, setVerdict] = useState<{ scorecard: Scorecard; diagnosis: Diagnosis } | null>(null)
  const [interviewId, setInterviewId] = useState<string | null>(null)
  const { scenarioSlug } = useParams()
  const navigate = useNavigate()
  const startedSlugRef = useRef<string | null>(null)

  const handleStart = async (selectedScenario: string) => {
    setScenario(selectedScenario)
    setIsLoading(true)
    setAppState('INTERVIEW')

    try {
      const data = await interviewApi.start({
        scenario: selectedScenario,
        userId,
      })

      if (data.interviewId) {
        setInterviewId(data.interviewId)
      }

      setTurns([{
        role: 'interviewer',
        content: data.nextInterviewerMessage,
        diagnosis: data.diagnosis,
      }])

      if (data.isFinalVerdict && data.finalScorecard) {
        setVerdict({ scorecard: data.finalScorecard, diagnosis: data.diagnosis })
        setAppState('VERDICT')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar simulação')
      setAppState('SETUP')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async (msg: string) => {
    const newTurns: Turn[] = [...turns, { role: 'candidate', content: msg }]
    setTurns(newTurns)
    setIsLoading(true)

    try {
      const historyPayload = turns.map(t => ({ role: t.role, content: t.content, feedback: t.feedback }))

      const data = await interviewApi.sendMessage({
        interviewId,
        scenario,
        history: historyPayload,
        candidateMessage: msg,
        userId,
      })

      const updatedTurns: Turn[] = [
        ...turns,
        {
          role: 'candidate',
          content: msg,
          feedback: data.feedback,
        },
        {
          role: 'interviewer',
          content: data.nextInterviewerMessage,
          diagnosis: data.diagnosis,
        },
      ]
      setTurns(updatedTurns)

      if (data.isFinalVerdict && data.finalScorecard) {
        setVerdict({ scorecard: data.finalScorecard, diagnosis: data.diagnosis })
        setTimeout(() => setAppState('VERDICT'), 1800)
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar mensagem')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestart = () => {
    startedSlugRef.current = null
    setAppState('SETUP')
    setScenario('')
    setTurns([])
    setVerdict(null)
    setInterviewId(null)
    navigate('/interviews')
  }

  useEffect(() => {
    if (!scenarioSlug) {
      startedSlugRef.current = null
      setAppState('SETUP')
      return
    }

    if (startedSlugRef.current === scenarioSlug) return

    const selectedScenario = SCENARIO_BY_SLUG[scenarioSlug]

    if (!selectedScenario || selectedScenario.locked) {
      toast.error('Cenário indisponível')
      setAppState('SETUP')
      return
    }

    startedSlugRef.current = scenarioSlug
    setTurns([])
    setVerdict(null)
    setInterviewId(null)
    handleStart(selectedScenario.label)
  }, [scenarioSlug])

  return (
    <div className="mirror-root">
      <AnimatePresence mode="wait">
        {appState === 'SETUP' && (
          <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mirror-page">
            <SetupScreen />
          </motion.div>
        )}
        {appState === 'INTERVIEW' && (
          <motion.div key="interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mirror-page">
            <InterviewScreen scenario={scenario} turns={turns} isLoading={isLoading} onSend={handleSend} />
          </motion.div>
        )}
        {appState === 'VERDICT' && verdict && (
          <motion.div key="verdict" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mirror-page">
            <VerdictScreen scorecard={verdict.scorecard} diagnosis={verdict.diagnosis} onRestart={handleRestart} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
