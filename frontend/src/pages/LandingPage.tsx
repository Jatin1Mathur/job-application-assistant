import { ArrowRight } from 'lucide-react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { lazy, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import BackpackFallback from '../components/BackpackFallback.tsx'
import ArchitectureDiagram from '../components/home/ArchitectureDiagram.tsx'
import BuiltBy from '../components/home/BuiltBy.tsx'
import CursorLight from '../components/home/CursorLight.tsx'
import LetterCompare from '../components/home/LetterCompare.tsx'
import Magnetic from '../components/home/Magnetic.tsx'
import TryItDemo from '../components/home/TryItDemo.tsx'
import Lazy3D from '../components/Lazy3D.tsx'
import Logo from '../components/Logo.tsx'
import MotionButton from '../components/MotionButton.tsx'
import StoryStepArt from '../components/StoryStepArt.tsx'
import ThemeToggle from '../components/ThemeToggle.tsx'
import { staggerItem, staggerList } from '../lib/motion.ts'
import { webglSupported } from '../three/support.ts'

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
  { title: 'Upload your resume', text: 'A PDF is enough. Its text is read automatically and stays with your account.' },
  { title: 'Analyze the match', text: 'Paste a job posting. Your resume is compared with it: which skills you already show, and which ones the job asks for that are missing.' },
  { title: 'Get your score', text: 'One number from 0 to 100, what to improve, and a first draft of the cover letter.' },
]

const SCENE_LABEL =
  'A leather backpack with skills orbiting around it. While you scroll through the three steps, a resume slides into the backpack, the matching skills light up, and a score ring fills to 82 out of 100.'

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

// The headline, the short pitch and the two ways in
function HeroText() {
  return (
    <motion.div variants={staggerList} initial="hidden" animate="show">
      <motion.h1 variants={staggerItem} className="text-[2.75rem] font-semibold leading-[1.05] sm:text-6xl">
        Know where you stand before you apply.
      </motion.h1>
      <motion.p variants={staggerItem} className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted-foreground">
        Job Assistant compares your resume with a job posting, shows the skills you already have and the ones
        to work on, and drafts the cover letter.
      </motion.p>
      <motion.div variants={staggerItem} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Magnetic>
          <MotionButton asChild className="h-12 px-6 text-base">
            <Link to="/register">
              Create your account <ArrowRight />
            </Link>
          </MotionButton>
        </Magnetic>
        <a href="#try" className="rounded text-base font-medium text-foreground underline decoration-primary/40 decoration-2 underline-offset-4 hover:decoration-primary">
          Try a sample first
        </a>
      </motion.div>
      <motion.p variants={staggerItem} className="mt-6 text-sm text-muted-foreground">
        The analysis runs on a local AI model, not on a cloud AI service.
      </motion.p>
    </motion.div>
  )
}

// What the two kinds of skill dots mean. Shown with the "Analyze" step, where they first differ.
function SkillLegend() {
  return (
    <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-primary" /> Skills you have
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-muted ring-1 ring-foreground/25" /> Skills to learn
      </span>
    </p>
  )
}

// The scroll story: the 3D scene stays in view while the hero text and the three steps scroll past it, and the
// scroll position plays the scene. The page scrolls in the normal way; nothing takes over the scroll wheel.
function ScrollStory() {
  const steps = useRef<HTMLOListElement>(null)
  // The line on the screen a step has to reach to be "the current one": the middle on wide screens,
  // lower on narrow ones, where the scene is pinned to the top and the text passes below it
  const [focus] = useState(() => (window.matchMedia('(min-width: 1024px)').matches ? 0.5 : 0.7))
  const { scrollYProgress } = useScroll({ target: steps, offset: [`start ${focus}`, `end ${focus}`] })
  // From scroll position to story position: 0 is the hero, 1 to 3 are the steps. The flat parts
  // (1 to 1, 2 to 2) hold the picture still while a step is being read.
  const stage = useTransform(scrollYProgress, [0, 0.13, 0.21, 0.46, 0.54, 0.8, 1], [0, 1, 1, 2, 2, 3, 3])

  return (
    <div className="relative isolate">
      <HeroBackground />
      <CursorLight />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:grid lg:grid-cols-2 lg:gap-x-12">
        <div className="py-14 lg:flex lg:min-h-[calc(100svh-4rem)] lg:items-center lg:py-0">
          <HeroText />
        </div>

        {/* The scene. Wide screens: it fills the right column and stays there. Narrow screens: it is pinned to the
            top with a solid background, so the text that scrolls below it is never drawn over. */}
        <div className="sticky top-0 z-10 -mx-4 border-b bg-background px-4 sm:-mx-6 sm:px-6 lg:top-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mx-0 lg:flex lg:h-[calc(100svh-4rem)] lg:items-center lg:self-start lg:border-0 lg:bg-transparent lg:px-0">
          <Lazy3D
            label={SCENE_LABEL}
            className="relative mx-auto h-[34svh] min-h-60 w-full max-w-lg lg:h-[26rem]"
            fallback={<BackpackFallback />}
            scene={(props) => <BackpackHero {...props} stage={stage} />}
          />
        </div>

        <section aria-labelledby="how-heading" className="pb-16 pt-12 lg:col-start-1 lg:pb-[14svh] lg:pt-0">
          <h2 id="how-heading" className="font-display text-3xl font-semibold sm:text-4xl">
            Three steps to your first result
          </h2>
          <ol ref={steps} className="mt-6 lg:mt-0">
            {STEPS.map(({ title, text }, index) => (
              <li key={title} className="flex min-h-[52svh] flex-col justify-center lg:min-h-[78svh]">
                <div className="border-t-2 border-primary pt-5">
                  <span className="font-display text-4xl font-semibold text-primary" aria-hidden>
                    {index + 1}
                  </span>
                  <h3 className="mt-3 text-2xl font-semibold">{title}</h3>
                  <p className="mt-2 max-w-md text-lg leading-relaxed text-muted-foreground">{text}</p>
                  {index === 1 && <SkillLegend />}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}

// The same story without motion: one still picture per step. Shown with "reduce motion" and without WebGL.
function StaticStory() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <HeroBackground />
        <CursorLight />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-24">
          <HeroText />
          <Lazy3D
            label="A leather backpack with skills orbiting around it."
            className="relative mx-auto h-72 w-full max-w-lg sm:h-[26rem]"
            fallback={<BackpackFallback />}
            scene={() => null}
          />
        </div>
      </section>
      <section className="border-y bg-muted/50" aria-labelledby="how-heading">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 id="how-heading" className="font-display text-3xl font-semibold sm:text-4xl">
            Three steps to your first result
          </h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3">
            {STEPS.map(({ title, text }, index) => (
              <li key={title} className="border-t-2 border-primary pt-5">
                <StoryStepArt step={index + 1} />
                <span className="mt-4 block font-display text-4xl font-semibold text-primary" aria-hidden>
                  {index + 1}
                </span>
                <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 max-w-xs text-muted-foreground">{text}</p>
                {index === 1 && <SkillLegend />}
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  )
}

// The top of the page: the hero and "How it works" as one story
function Story() {
  const reducedMotion = useReducedMotion()
  return !reducedMotion && webglSupported() ? <ScrollStory /> : <StaticStory />
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
        <Story />

        <TryItDemo />

        <LetterCompare />

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

        <div className="border-t">
          <ArchitectureDiagram />
        </div>

        {/* Closing: the call to action, and who built this */}
        <section className="border-t bg-muted/50">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <h2 className="max-w-2xl font-display text-3xl font-semibold leading-tight sm:text-4xl">
                Your next application can start with a clear picture.
              </h2>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Magnetic>
                  <MotionButton asChild className="h-12 px-6 text-base">
                    <Link to="/register">
                      Create your account <ArrowRight />
                    </Link>
                  </MotionButton>
                </Magnetic>
                <Link to="/login" className="rounded text-base font-medium text-foreground underline decoration-primary/40 decoration-2 underline-offset-4 hover:decoration-primary">
                  Log in
                </Link>
              </div>
            </div>
            <BuiltBy />
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Job Assistant, a master's project built with Spring Boot, React and Ollama
      </footer>
    </div>
  )
}
