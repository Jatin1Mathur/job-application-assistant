import { ArrowRight } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { lazy, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BackpackFallback from '../components/BackpackFallback.tsx'
import Lazy3D from '../components/Lazy3D.tsx'
import Logo from '../components/Logo.tsx'
import MotionButton from '../components/MotionButton.tsx'
import ScoreRing from '../components/ScoreRing.tsx'
import ThemeToggle from '../components/ThemeToggle.tsx'
import { popItem, staggerItem, staggerList } from '../lib/motion.ts'

// The 3D code is a separate download that starts only when the hero scene is about to be shown
const BackpackHero = lazy(() => import('../three/BackpackHero.tsx'))

const FEATURES = [
  {
    title: 'See where you stand before you apply',
    text: 'Your resume is compared with the job posting. You get a score from 0 to 100, the skills you already show, and the skills the job asks for that your resume does not.',
  },
  {
    title: 'A cover letter drafted from your real resume',
    text: 'One click drafts a letter for the job. It uses only what is in your resume and does not invent experience. You edit it until it sounds like you.',
  },
  {
    title: 'Every application in one place',
    text: 'Move applications from saved to offer on a board. After a few applications, the insights page shows which skills keep coming up as missing.',
  },
]

const STEPS = [
  { title: 'Upload your resume', text: 'A PDF is enough. Its text is read automatically.' },
  { title: 'Paste a job posting', text: 'Add the company, the job title and the description.' },
  { title: 'See your match', text: 'Get your score, what to improve, and a first draft of the cover letter.' },
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
      className="relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-pop"
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
              <p className={`text-lg font-semibold ${example.tone}`}>{example.label}</p>
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
        className="absolute -left-24 -top-32 size-[28rem] rounded-full bg-primary/15 blur-3xl dark:bg-primary/10"
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[-8rem] top-10 size-[26rem] rounded-full bg-encourage blur-3xl dark:bg-encourage/60"
        animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-10rem] left-1/3 size-[24rem] rounded-full bg-primary/10 blur-3xl dark:bg-primary/5"
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
          <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
            Log in
          </Link>
          <MotionButton asChild size="lg" variant="outline" className="hidden sm:inline-flex">
            <Link to="/register">Create account</Link>
          </MotionButton>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          <HeroBackground />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-24">
            <motion.div variants={staggerList} initial="hidden" animate="show">
              <motion.h1 variants={staggerItem} className="text-[2.75rem] font-semibold leading-[1.05] sm:text-6xl">
                Know where you stand before you apply.
              </motion.h1>
              <motion.p variants={staggerItem} className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted-foreground">
                Job Assistant compares your resume with a job posting, shows the skills you already have and the ones
                to work on, and drafts the cover letter.
              </motion.p>
              <motion.div variants={staggerItem} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <MotionButton asChild className="h-12 px-6 text-base">
                  <Link to="/register">
                    Create your account <ArrowRight />
                  </Link>
                </MotionButton>
                <Link to="/login" className="rounded text-base font-medium text-foreground underline decoration-primary/40 decoration-2 underline-offset-4 hover:decoration-primary">
                  I already have an account
                </Link>
              </motion.div>
              <motion.p variants={staggerItem} className="mt-6 text-sm text-muted-foreground">
                The analysis runs on a local AI model, not on a cloud AI service.
              </motion.p>
            </motion.div>
            {/* The 3D hero: a backpack (the career you carry with you) with skills orbiting it. Until its code has loaded (and without WebGL or with "reduce motion")
                the static drawing of the same scene is shown, so this column is never empty. */}
            <div>
              <Lazy3D
                label="A leather backpack with skills orbiting around it. Skills you have glow; skills you are missing are dimmer."
                className="relative mx-auto h-72 w-full max-w-lg sm:h-[26rem]"
                fallback={<BackpackFallback />}
                scene={(props) => <BackpackHero {...props} />}
              />
              <p className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-primary" /> Skills you have
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
            <h2 id="preview-heading" className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
              One number, and the reasons behind it
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
              Every analysis gives a score from 0 to 100, the skills that match, the skills that are missing, and
              three tips for your resume. You can check each skill against the job posting yourself.
            </p>
          </div>
        </section>

        {/* What it does: a heading on the left, three plain entries on the right, divided by hairlines */}
        <section className="mx-auto grid max-w-6xl gap-x-16 gap-y-8 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.6fr]" aria-labelledby="features-heading">
          <h2 id="features-heading" className="font-display text-3xl font-semibold leading-tight sm:text-4xl lg:sticky lg:top-24 lg:self-start">
            What it does for your job search
          </h2>
          <motion.ul
            variants={staggerList}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="divide-y border-y"
          >
            {FEATURES.map(({ title, text }) => (
              <motion.li key={title} variants={staggerItem} className="py-7">
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-2 max-w-[60ch] leading-relaxed text-muted-foreground">{text}</p>
              </motion.li>
            ))}
          </motion.ul>
        </section>

        {/* How it works: the order matters here, so the steps are numbered */}
        <section className="border-y bg-muted/50" aria-labelledby="how-heading">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 id="how-heading" className="font-display text-3xl font-semibold sm:text-4xl">
              Three steps to your first result
            </h2>
            <motion.ol
              variants={staggerList}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              className="mt-10 grid gap-10 md:grid-cols-3"
            >
              {STEPS.map(({ title, text }, index) => (
                <motion.li key={title} variants={staggerItem} className="border-t-2 border-primary pt-5">
                  <span className="font-display text-4xl font-semibold text-primary" aria-hidden>
                    {index + 1}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                  <p className="mt-1.5 max-w-xs text-muted-foreground">{text}</p>
                </motion.li>
              ))}
            </motion.ol>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <h2 className="max-w-2xl font-display text-3xl font-semibold leading-tight sm:text-4xl">
            Your next application can start with a clear picture.
          </h2>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <MotionButton asChild className="h-12 px-6 text-base">
              <Link to="/register">
                Create your account <ArrowRight />
              </Link>
            </MotionButton>
            <Link to="/login" className="rounded text-base font-medium text-foreground underline decoration-primary/40 decoration-2 underline-offset-4 hover:decoration-primary">
              Log in
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Job Assistant, a master's project built with Spring Boot, React and Ollama
      </footer>
    </div>
  )
}
