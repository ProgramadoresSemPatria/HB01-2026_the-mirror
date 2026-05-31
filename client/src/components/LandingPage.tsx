import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useInView } from 'framer-motion';
import {
  ArrowLeftIcon,
  ChatCircleDotsIcon,
  WarningCircleIcon,
  ListIcon,
  XIcon,
  ArrowDownIcon
} from '@phosphor-icons/react';
import { cn } from '../lib/utils';

// Helper components mapping globals
function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto max-w-[1440px] px-6 md:px-12 lg:px-20', className)}>
      {children}
    </div>
  );
}

function SectionHeading({ children, className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('mb-4 text-3xl text-balance md:text-4xl lg:text-5xl font-headline', className)}
      {...props}
    >
      {children}
    </h2>
  );
}

function SectionDescription({ children, className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn('mx-auto my-2.5 max-w-prose text-lg text-pretty text-text-secondary lg:text-xl', className)}
      {...props}
    >
      {children}
    </p>
  );
}

function MotionDiv({
  isInView,
  children,
  className,
}: {
  isInView: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className={cn('mb-20 text-center', className)}
    >
      {children}
    </motion.div>
  );
}

// Logo brand
function Logo() {
  return (
    <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      <img
        src="https://i.postimg.cc/sgmLmSb2/logo.png"
        alt="The Mirror logo"
        className="size-8 lg:size-9 rounded-sm object-contain"
      />
      <span className="text-xl font-semibold tracking-tight text-foreground lg:text-2xl font-mono">
        The Mirror
      </span>
    </div>
  );
}

// Types for Mock simulator
type AppState = 'setup' | 'interview' | 'verdict';

interface Challenge {
  id: string;
  title: string;
  difficulty: string;
  difficultyColor: string;
  stack: string;
  description: string;
  tags: string[];
}

interface Message {
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp: Date;
  hasGap?: boolean;
  gapNote?: string;
}

const INTERVIEW_CHALLENGES: Challenge[] = [
  {
    id: 'query-optimization',
    title: 'Otimização de Query',
    difficulty: 'Médio',
    difficultyColor: 'text-warning border-warning/20 bg-warning/5',
    stack: 'SQL · PostgreSQL',
    description:
      'Um endpoint de relatório está demorando 12 segundos. O banco tem 50 milhões de linhas. O entrevistador quer saber exatamente o que você faria, passo a passo, agora.',
    tags: ['N+1 Problem', 'Índices', 'EXPLAIN ANALYZE'],
  },
  {
    id: 'memory-overflow',
    title: 'Estouro de Memória em Filas',
    difficulty: 'Difícil',
    difficultyColor: 'text-error border-error/20 bg-error/5',
    stack: 'Node.js · Redis · Bull',
    description:
      'Seu worker de processamento de e-mails está crashando em produção com OOM Killed. A fila tem 2 milhões de jobs. O sistema precisa voltar em menos de 5 minutos.',
    tags: ['Memory Leak', 'Backpressure', 'Dead Letter Queue'],
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Escolha o cenário',
    description:
      'Selecione um problema técnico real: otimização de query, leak de memória, race condition. Cada desafio é baseado em incidentes reais de produção.',
  },
  {
    step: '02',
    title: 'Entre na entrevista',
    description:
      'O entrevistador de IA conduz uma sessão técnica adversarial. Ele faz perguntas reais, detecta gaps na sua resposta e pressiona em pontos fracos.',
  },
  {
    step: '03',
    title: 'Receba o veredito',
    description:
      'No final, você recebe um scorecard de reprovação detalhado: cada gap identificado, cada resposta vaga, cada oportunidade perdida — grifados.',
  },
];

const MOCK_TRANSCRIPT: Message[] = [
  {
    role: 'interviewer',
    content:
      'Bom, vamos direto ao ponto. Você tem um endpoint de relatório que está demorando 12 segundos. Banco PostgreSQL, 50 milhões de linhas na tabela principal. O que você faz primeiro?',
    timestamp: new Date(),
  },
  {
    role: 'candidate',
    content:
      'Eu adicionaria um índice na tabela para melhorar a performance.',
    timestamp: new Date(),
    hasGap: true,
    gapNote: 'Resposta vaga: não especificou qual coluna, tipo de índice ou como diagnosticaria antes de agir.',
  },
  {
    role: 'interviewer',
    content:
      'Índice em qual coluna? E como você sabe que a ausência de índice é o problema real? Você já rodou o EXPLAIN ANALYZE?',
    timestamp: new Date(),
  },
  {
    role: 'candidate',
    content:
      'Não, não rodei ainda. Eu presumiria que é o índice pelo tempo de resposta.',
    timestamp: new Date(),
    hasGap: true,
    gapNote: 'Gap crítico: presumir diagnóstico sem evidências. Falta metodologia de investigação.',
  },
  {
    role: 'interviewer',
    content:
      'Presumir em produção com 50M de linhas pode causar um ALTER TABLE que trava a tabela por horas. Vamos encerrar aqui. Você será avaliado.',
    timestamp: new Date(),
  },
];

const SCORECARD_ITEMS = [
  { label: 'Diagnóstico antes de agir', passed: false, note: 'Propôs solução sem rodar EXPLAIN ANALYZE' },
  { label: 'Conhecimento de índices', passed: false, note: 'Não soube especificar tipo nem coluna do índice' },
  { label: 'Consciência de impacto em produção', passed: false, note: 'Não mencionou ALTER TABLE concorrente nem lock' },
  { label: 'Metodologia de investigação', passed: false, note: 'Ausência total de processo estruturado' },
  { label: 'Comunicação técnica', passed: true, note: 'Linguagem clara, mas sem profundidade' },
];

function ChallengeCard({
  challenge,
  onSelect,
}: {
  challenge: Challenge;
  onSelect: (c: Challenge) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -4 }}
      className="group relative cursor-pointer rounded-3xl border border-border bg-background/2 p-8 backdrop-blur-xs transition-[background-color,box-shadow,border-color] duration-300 hover:border-primary/40 hover:bg-primary/5 hover:shadow-[0_0_40px_rgba(56,189,248,0.08)]"
      onClick={() => onSelect(challenge)}
      role="button"
      tabIndex={0}
      id={`challenge-card-${challenge.id}`}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(challenge)}
    >
      {/* Header — Icons removed per user request */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{challenge.title}</h3>
          <p className="text-xs text-text-muted">{challenge.stack}</p>
        </div>
        <span className={`rounded-full border border-border px-3 py-1 text-xs font-medium ${challenge.difficultyColor}`}>
          {challenge.difficulty}
        </span>
      </div>

      {/* Description */}
      <p className="mb-6 leading-relaxed text-text-secondary">{challenge.description}</p>

      {/* Tags */}
      <div className="mb-6 flex flex-wrap gap-2">
        {challenge.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text-muted"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* CTA */}
      <div className="flex items-center gap-2 text-sm font-medium text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <ChatCircleDotsIcon size={16} weight="fill" />
        <span>Entrar na entrevista →</span>
      </div>
    </motion.div>
  );
}

function ChatBubble({ message, index }: { message: Message; index: number }) {
  return <div />;
}

function InterviewSimulator({ isInView }: { isInView: boolean }) {
  const [appState, setAppState] = useState<AppState>('setup');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (appState !== 'interview') return;
    if (visibleCount >= MOCK_TRANSCRIPT.length) return;

    const delay = visibleCount === 0 ? 800 : 1200;
    const timer = setTimeout(() => {
      setMessages((prev) => [...prev, MOCK_TRANSCRIPT[visibleCount]]);
      setVisibleCount((c) => c + 1);

      if (visibleCount < MOCK_TRANSCRIPT.length - 1) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 900);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [appState, visibleCount]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSelectChallenge = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setAppState('interview');
    setMessages([]);
    setVisibleCount(0);
    setIsTyping(false);
  };

  const handleReset = () => {
    setAppState('setup');
    setSelectedChallenge(null);
    setMessages([]);
    setVisibleCount(0);
  };

  const handleSkipToVerdict = () => {
    setAppState('verdict');
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {/* State: Setup */}
        {appState === 'setup' && (
          <motion.div
            key="setup"
            id="desafios"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {/* Section Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="mb-12 text-center"
            >
              <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
                Escolha seu Desafio
              </span>
              <SectionHeading>
                Problemas reais de produção.
                <span className="text-primary"> Sem filtro.</span>
              </SectionHeading>
              <SectionDescription>
                Cada cenário foi extraído de incidentes reais. Não existem perguntas fáceis. Escolha um desafio e prove que você sabe o que está fazendo.
              </SectionDescription>
            </motion.div>

            {/* Challenge Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {INTERVIEW_CHALLENGES.map((challenge, i) => (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.1 + i * 0.15 }}
                >
                  <ChallengeCard challenge={challenge} onSelect={handleSelectChallenge} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {appState !== 'setup' && (
          <div className="text-center py-12 text-text-muted">
            Sessão: {appState}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { ref: revealRef, isInView: revealInView } = (() => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });
    return { ref, isInView };
  })();

  const { ref: simulatorRef, isInView: simulatorInView } = (() => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });
    return { ref, isInView };
  })();

  const handleStartSimulation = () => {
    navigate('/interviews');
  };

  return (
    <div className="landing-page relative min-h-screen selection:bg-primary/20 selection:text-foreground overflow-x-hidden">
      {/* Scroll indicator bar */}
      <motion.div
        style={{ scaleX: scrollYProgress }}
        className="fixed top-0 right-0 left-0 z-50 h-1 origin-left bg-primary"
      />

      {/* Header Navbar */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 1 }}
        className="fixed top-0 left-0 z-50 w-full bg-linear-to-b from-black via-black/60 to-transparent md:py-2"
      >
        <Container>
          <div className="relative flex items-center justify-between py-4">
            <Logo />

            <nav className="hidden md:absolute md:left-1/2 md:flex md:-translate-x-1/2 md:items-center md:gap-6">
              <a href="#como-funciona" className="text-sm text-text-secondary transition-colors hover:text-foreground">
                Como funciona
              </a>
              <a href="#desafios" className="text-sm text-text-secondary transition-colors hover:text-foreground">
                Desafios
              </a>
            </nav>

            <div className="hidden md:flex md:items-center md:gap-4">
              <button
                onClick={handleStartSimulation}
                id="header-cta-start"
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover cursor-pointer"
              >
                Começar Simulação
              </button>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="-mr-2 flex size-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface md:hidden cursor-pointer"
              aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {isMobileMenuOpen ? <XIcon size={24} weight="bold" /> : <ListIcon size={24} weight="bold" />}
            </button>
          </div>
        </Container>
      </motion.header>

      {/* Mobile nav menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-background/95 backdrop-blur-lg md:hidden"
          >
            <motion.nav
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex h-full flex-col items-center justify-center gap-8"
            >
              <a
                href="#como-funciona"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-2xl font-medium text-foreground transition-colors hover:text-primary"
              >
                Como funciona
              </a>
              <a
                href="#desafios"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-2xl font-medium text-foreground transition-colors hover:text-primary"
              >
                Desafios
              </a>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleStartSimulation();
                }}
                className="mt-4 rounded-lg bg-primary px-8 py-3 text-lg font-medium text-primary-foreground transition-colors hover:bg-primary-hover cursor-pointer"
              >
                Começar Simulação
              </button>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="flex justify-center pt-28 sm:pt-36 lg:pt-40">
        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
          {/* Hero Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-3 text-4xl leading-tight font-medium text-foreground sm:text-5xl md:text-6xl lg:text-7xl font-headline"
          >
            Todo simulador de entrevista te elogia.{' '}
            <span className="text-primary">O nosso te reprova.</span>
          </motion.h1>

          {/* Hero Subtitle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mb-8"
          >
            <SectionDescription>
              Um simulador de entrevista técnica que não te poupa.
              A IA detecta seus gaps em tempo real e entrega um scorecard de reprovação
              detalhado ao final.
            </SectionDescription>
          </motion.div>

          {/* Hero CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-col items-center gap-4 sm:flex-row"
          >
            <a
              href="#desafios"
              id="cta-start-simulation"
              className="group inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary-hover hover:shadow-[0_0_30px_rgba(56,189,248,0.3)]"
            >
              Escolher um Desafio
              <ArrowDownIcon
                size={16}
                weight="bold"
                className="transition-transform group-hover:translate-y-1"
              />
            </a>
            <a
              href="#como-funciona"
              id="cta-how-it-works"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-8 py-3 text-base font-medium text-text-secondary transition-colors hover:border-border-hover hover:text-foreground"
            >
              Como funciona?
            </a>
          </motion.div>
        </div>
      </section>

      {/* How it Works Section */}
      <section
        id="como-funciona"
        ref={revealRef}
        className="relative bg-background pt-12 pb-24"
      >
        <Container className="relative">
          {/* Header */}
          <MotionDiv isInView={revealInView} className="pb-16 text-center">
            <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
              Como Funciona
            </span>
            <SectionHeading>
              Três etapas. Sem elogios.
            </SectionHeading>
            <SectionDescription>
              O Mirror te coloca em uma sessão adversarial real. O entrevistador não para de pressionar até encontrar seus gaps.
            </SectionDescription>
          </MotionDiv>

          {/* Steps */}
          <div className="grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 40 }}
                animate={revealInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="rounded-3xl border bg-background/2 p-8 backdrop-blur-xs transition-[background-color,box-shadow] duration-200 hover:bg-primary/7 hover:shadow-[0_0_30px_rgba(56,189,248,0.07)]"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-4xl font-bold text-primary/20 font-headline">
                    {step.step}
                  </span>
                </div>
                <h3 className="mb-3 text-xl font-semibold text-foreground">{step.title}</h3>
                <p className="leading-relaxed text-text-secondary">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* Simulator / Challenges Section */}
      <section ref={simulatorRef} className="relative bg-background pb-24 pt-12">
        <Container className="relative">
          <InterviewSimulator isInView={simulatorInView} />
        </Container>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 relative bg-background">
        <Container>
          <div className="relative flex flex-col items-center justify-between gap-4 md:flex-row">
            <Logo />

            <nav className="flex items-center gap-6 text-sm text-text-secondary md:absolute md:left-1/2 md:-translate-x-1/2">
              <a href="#como-funciona" className="transition-colors hover:text-foreground">
                Como funciona
              </a>
              <a href="#desafios" className="transition-colors hover:text-foreground">
                Desafios
              </a>
            </nav>

            <div className="text-sm text-text-muted font-mono">
              Simulações baseadas em produção real
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-text-muted font-mono">
            © 2026 The Mirror · Simulador de Entrevistas Técnicas
          </div>
        </Container>
      </footer>
    </div>
  );
}
