// Made-up sample data for the landing page. Nothing here comes from the AI model or from a real person:
// the results were written by hand, so the page can show what an analysis looks like without a login.

export interface SampleJob {
  id: string
  title: string
  company: string
  // The part of the posting that names the skills
  posting: string
  score: number
  matching: string[]
  missing: string[]
  tip: string
}

export const SAMPLE_RESUME_LINE = 'Sample resume: a working student with Java, Spring Boot, PostgreSQL, Docker, Python, SQL and Git.'

export const SAMPLE_JOBS: SampleJob[] = [
  {
    id: 'backend',
    title: 'Backend Developer',
    company: 'Nordlicht Software',
    posting: 'REST APIs with Java and Spring Boot, PostgreSQL, Docker, deployments on Kubernetes.',
    score: 82,
    matching: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker'],
    missing: ['Kubernetes'],
    tip: 'Kubernetes is asked for: mention any course or tutorial you did, or plan to do.',
  },
  {
    id: 'data',
    title: 'Data Engineer',
    company: 'Kornfeld Analytics',
    posting: 'Data pipelines with Python and SQL, scheduled with Airflow, large data sets with Spark.',
    score: 61,
    matching: ['Python', 'SQL', 'Git'],
    missing: ['Spark', 'Airflow'],
    tip: 'Your Python work is listed last: move it up for a data role.',
  },
  {
    id: 'ios',
    title: 'iOS Developer',
    company: 'Lumen Labs',
    posting: 'An iOS app with Swift and SwiftUI in Xcode, talking to REST APIs.',
    score: 34,
    matching: ['Git', 'REST APIs'],
    missing: ['Swift', 'SwiftUI', 'Xcode'],
    tip: 'The resume shows no mobile work: this role needs a different profile.',
  },
]

// Two example letters for the same job (the Backend Developer sample), written for this page
export const GENERIC_LETTER = `Dear Sir or Madam,

I am writing to apply for the open position at your company. I am a motivated and hard-working team player with strong communication skills, and I am always eager to learn new things.

I have experience with many technologies and I am confident that I can be a valuable addition to your team. I work well alone and in groups, and I always give my best.

I look forward to hearing from you.

Kind regards,
Alex Example`

export const TAILORED_LETTER = `Dear hiring team at Nordlicht Software,

I am applying for the Backend Developer position. In my working-student job I built REST APIs with Java and Spring Boot for an internal booking tool, and wrote the PostgreSQL migrations for it.

I packaged these services with Docker. Your posting also asks for Kubernetes: I have not used it in a project yet, and I would like to learn it on the job.

I would be glad to tell you more in an interview.

Kind regards,
Alex Example`

export const LETTER_SKILLS = ['Java', 'Spring Boot', 'PostgreSQL', 'Docker', 'REST APIs']
