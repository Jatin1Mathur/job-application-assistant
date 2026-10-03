import { ArrowRight, BarChart3, Check, FileUp, PenLine, Sparkles, Target } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { lazy, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GalaxyFallback from '../components/GalaxyFallback.tsx'
import Lazy3D from '../components/Lazy3D.tsx'
import Logo from '../components/Logo.tsx'
import MotionButton from '../components/MotionButton.tsx'
import ScoreRing from '../components/ScoreRing.tsx'
import ThemeToggle from '../components/ThemeToggle.tsx'
import { Button } from '../components/ui/button.tsx'
import { popItem, staggerItem, staggerList } from '../lib/motion.ts'

// The 3D code is a separate download that starts only when the galaxy is about to be shown
const SkillGalaxy = lazy(() => import('../three/SkillGalaxy.tsx'))

const FEATURES = [
  {
    icon: Target,
    title: 'Know your match before you apply',
    text: 'The AI compares your resume with the job posting and gives a score from 0 to 100, with the skills you have and the ones you are missing.',
  },
  {
    icon: PenLine,
    title: 'Cover letters from your real resume',
    text: 'One click writes a cover letter for the job. It only uses facts from your resume and never invents experience.',
  },
  {
    icon: BarChart3,
    title: 'Track everything in one place',
    text: 'Move applications from saved to offer on a board, and see which skills keep coming up as missing.',
  },
]

const STEPS = [
  { icon: FileUp, title: 'Upload your resume', text: 'Add your resume as a PDF. Its text is extracted automatically.' },
  { icon: Sparkles, title: 'Paste a job posting', text: 'Create an application with the company, the job title and the description.' },
  { icon: Target, title: 'Get your score and letter', text: 'See how well you fit, what to improve, and generate a cover letter.' },
]

const EXAMPLES = [
  { job: 'Backend Developer · Acme GmbH', score: 82, label: 'Strong match', tone: 'text-emerald-700 dark:text-emerald-400', matching: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker'], missing: ['Kubernetes'] },
  { job: 'Data Engineer · Northwind', score: 61, label: 'Partial match', tone: 'text-amber-700 dark:text-amber-400', matching: ['Python', 'SQL', 'Git'], missing: ['Spark', 'Airflow'] },
  { job: 'iOS Developer · Lumen Labs', score: 34, label: 'Weak match', tone: 'text-rose-700 dark:text-rose-400', matching: ['Git', 'REST APIs'], missing: ['Swift', 'SwiftUI', 'Xcode'] },
]

// Made-up examples of the analysis result, so visitors see what they will get.
// It moves on to the next example every few seconds; with "reduce motion" it stays on the first.
function PreviewCard() {
  const reducedMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const example = EXAMPLES[index]

  useEffect(() => {
    if (reducedMotion) return
    const timer = setInterval(() => setIndex((current) => (current + 1) % EXAMPLES.length), 4500)
    return () => clearInterval(timer)
  }, [reducedMotion])

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotate: 0 }}
      animate={{ opacity: 1, y: 0, rotate: 1.5 }}
      transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
      className="relative w-full max-w-md rounded-3xl border bg-card p-6 shadow-pop"
      aria-label="Example of a match analysis"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Example analysis</p>
      {/* The key changes with the example, so the old content fades out and the new one animates in */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={example.job}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          <p className="mt-1 text-base font-semibold">{example.job}</p>
          <div className="mt-5 flex items-center gap-5">
            <ScoreRing score={example.score} />
            <div>
              <p className={`font-display text-xl font-semibold ${example.tone}`}>{example.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {example.matching.length} matching and {example.missing.length} missing skills found.
              </p>
            </div>
          </div>
          <motion.ul variants={staggerList} initial="hidden" animate="show" className="mt-5 flex min-h-16 flex-wrap content-start gap-2">
            {example.matching.map((skill) => (
              <motion.li
                key={skill}
                variants={popItem}
                className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-500/25 dark:text-emerald-300"
              >
                {skill}
              </motion.li>
            ))}
            {example.missing.map((skill) => (
              <motion.li
                key={skill}
                variants={popItem}
                className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-500/25 dark:text-rose-300"
              >
                {skill}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

// The hero background: three soft color blobs that drift slowly (a "gradient mesh").
// Decorative only, so it is hidden from screen readers.
function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -left-24 -top-32 size-[28rem] rounded-full bg-brand/35 blur-3xl dark:bg-brand/15"
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[-8rem] top-10 size-[26rem] rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-400/10"
        animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-10rem] left-1/3 size-[24rem] rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-300/10"
        animate={{ x: [0, 40, 0], y: [0, -40, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

// The public page at "/": what the product does and how to start. No login needed to see it.
export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button asChild variant="ghost" size="lg">
            <Link to="/login">Log in</Link>
          </Button>
          <MotionButton asChild size="lg" className="hidden sm:inline-flex">
            <Link to="/register">Get started</Link>
          </MotionButton>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          <HeroBackground />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-24">
            <motion.div variants={staggerList} initial="hidden" animate="show">
              <motion.p variants={staggerItem} className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5" /> Powered by a local AI model, not a cloud AI service.
              </motion.p>
              <motion.h1 variants={staggerItem} className="mt-5 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
                Apply smarter,{' '}
                {/* The accent color as a marker stroke behind the words; the text itself stays dark for contrast */}
                <span className="relative whitespace-nowrap text-brand-foreground">
                  <motion.span
                    aria-hidden
                    className="absolute inset-x-[-0.15em] bottom-[0.08em] top-[0.18em] -z-10 -rotate-1 rounded-md bg-brand"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.35, delay: 0.3, ease: 'easeOut' }}
                    style={{ transformOrigin: 'left' }}
                  />
                  not harder.
                </span>
              </motion.h1>
              <motion.p variants={staggerItem} className="mt-5 max-w-lg text-lg text-muted-foreground">
                Job Assistant checks how well your resume fits a job, tells you which skills are missing, and writes
                the cover letter for you.
              </motion.p>
              <motion.div variants={staggerItem} className="mt-8 flex flex-wrap gap-3">
                <MotionButton asChild className="h-11 px-5 text-base">
                  <Link to="/register">
                    Get started <ArrowRight />
                  </Link>
                </MotionButton>
                <Button asChild variant="outline" className="h-11 px-5 text-base">
                  <Link to="/login">Log in</Link>
                </Button>
              </motion.div>
              <motion.ul variants={staggerItem} className="mt-6 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                {['Local AI model', 'No invented experience', 'Light and dark mode'].map((point) => (
                  <li key={point} className="flex items-center gap-1.5">
                    <Check className="size-4 text-emerald-500" /> {point}
                  </li>
                ))}
              </motion.ul>
            </motion.div>
            {/* The 3D skill galaxy. Until its code has loaded (and without WebGL or with "reduce motion")
                the static drawing of the same galaxy is shown, so this column is never empty. */}
            <div>
              <Lazy3D
                label="A galaxy of skills connected by lines. Skills you have glow; skills you are missing are dimmer."
                className="relative mx-auto h-72 w-full max-w-lg sm:h-[26rem]"
                fallback={<GalaxyFallback />}
                scene={(props) => <SkillGalaxy {...props} />}
              />
              <p className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-brand ring-1 ring-foreground/25" /> Skills you have
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-muted ring-1 ring-foreground/25" /> Skills to learn
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* What an analysis looks like */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-4 sm:px-6 lg:grid-cols-2" aria-labelledby="preview-heading">
          <div className="flex justify-center lg:order-2 lg:justify-end">
            <PreviewCard />
          </div>
          <div>
            <h2 id="preview-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              One number, and the reasons behind it
            </h2>
            <p className="mt-3 max-w-md text-muted-foreground">
              Every analysis gives a score from 0 to 100, the skills that match, the skills that are missing, and
              three tips for your resume. You can check each skill against the job posting yourself.
            </p>
          </div>
        </section>

        {/* Three feature highlights */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything you need for the job hunt
          </h2>
          <motion.ul
            variants={staggerList}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="mt-10 grid gap-5 md:grid-cols-3"
          >
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <motion.li key={title} variants={staggerItem} whileHover={{ y: -4 }} className="rounded-2xl border bg-card p-6 shadow-card">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </motion.li>
            ))}
          </motion.ul>
        </section>

        {/* How it works */}
        <section className="border-y bg-muted/40" aria-labelledby="how-heading">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 id="how-heading" className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              How it works
            </h2>
            <motion.ol
              variants={staggerList}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              className="mt-10 grid gap-8 md:grid-cols-3"
            >
              {STEPS.map(({ icon: Icon, title, text }, index) => (
                <motion.li key={title} variants={staggerItem} className="flex flex-col items-center text-center">
                  <span className="relative flex size-14 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-raised">
                    <Icon className="size-6" />
                    <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border bg-card text-xs font-semibold text-foreground">
                      {index + 1}
                    </span>
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{title}</h3>
                  <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{text}</p>
                </motion.li>
              ))}
            </motion.ol>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ready for your next application?</h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">Create an account and analyze your first job in a few minutes.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <MotionButton asChild className="h-11 px-5 text-base">
              <Link to="/register">
                Get started <ArrowRight />
              </Link>
            </MotionButton>
            <Button asChild variant="outline" className="h-11 px-5 text-base">
              <Link to="/login">Log in</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Job Assistant · Spring Boot · React · Ollama
      </footer>
    </div>
  )
}
