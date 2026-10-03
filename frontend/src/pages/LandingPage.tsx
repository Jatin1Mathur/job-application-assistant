import { ArrowRight, BarChart3, Check, FileUp, PenLine, Sparkles, Target } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo.tsx'
import MotionButton from '../components/MotionButton.tsx'
import ScoreRing from '../components/ScoreRing.tsx'
import ThemeToggle from '../components/ThemeToggle.tsx'
import { Button } from '../components/ui/button.tsx'
import { popItem, staggerItem, staggerList } from '../lib/motion.ts'

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

// A small, made-up example of the analysis result, so visitors see what they will get
function PreviewCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
      className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl shadow-primary/10"
      aria-label="Example of a match analysis"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Example analysis</p>
      <p className="mt-1 text-base font-semibold">Backend Developer · Acme GmbH</p>
      <div className="mt-5 flex items-center gap-5">
        <ScoreRing score={82} />
        <div>
          <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">Strong match</p>
          <p className="mt-1 text-sm text-muted-foreground">Your resume covers most of what this job asks for.</p>
        </div>
      </div>
      <motion.ul variants={staggerList} initial="hidden" animate="show" className="mt-5 flex flex-wrap gap-2">
        {['Java', 'Spring Boot', 'PostgreSQL', 'Docker'].map((skill) => (
          <motion.li
            key={skill}
            variants={popItem}
            className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-500/25 dark:text-emerald-300"
          >
            {skill}
          </motion.li>
        ))}
        {['Kubernetes'].map((skill) => (
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
  )
}

// The public page at "/": what the product does and how to start. No login needed to see it.
export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
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

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="absolute inset-x-0 -top-40 -z-10 h-[32rem] bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-2xl" />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-24">
            <motion.div variants={staggerList} initial="hidden" animate="show">
              <motion.p variants={staggerItem} className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" /> Powered by a local AI model, not a cloud AI service.
              </motion.p>
              <motion.h1 variants={staggerItem} className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
                Apply smarter, <span className="text-primary">not harder.</span>
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
            <div className="flex justify-center lg:justify-end">
              <PreviewCard />
            </div>
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
              <motion.li key={title} variants={staggerItem} whileHover={{ y: -4 }} className="rounded-2xl border bg-card p-6 shadow-xs">
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
                  <span className="relative flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
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
