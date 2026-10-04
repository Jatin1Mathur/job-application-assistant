import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// One check of the suite. A failed check is reported with its name, and the test goes on to the next check,
// so one run shows everything that is wrong instead of only the first problem.
export function check(name: string, ok: boolean, detail = '') {
  expect.soft(ok, detail ? `${name} (${detail})` : name).toBe(true)
}

export const alertText = async (page: Page) => (await page.textContent('[data-slot=alert]')) ?? ''

export const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

// The name of the AI model the backend is set to (OLLAMA_MODEL). Shown next to every analysis.
export const MODEL_NAME = process.env.E2E_MODEL ?? 'llama3.2'

// Requests for the 3D code: three.js itself, the React binding, or one of the lazy scenes.
// Works for the built app (hashed file names) and for the Vite dev server.
export const is3dRequest = (url: string) => /react-three|deps\/three|BackpackHero|CompassScene|ScoreOrb|SkillUniverse/i.test(url)

// Calls the backend as the logged-in user of this page
export const apiCall = (page: Page, method: string, path: string, body?: unknown) =>
  page.evaluate(
    async ([method, path, body]) => {
      const response = await fetch('/api' + path, {
        method: method as string,
        headers: { Authorization: 'Bearer ' + localStorage.getItem('job-assistant.token'), ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      })
      return response.status === 204 ? null : response.json()
    },
    [method, path, body] as const,
  )

export const JOB_CPP =
  'We are looking for a C++ Software Engineer to develop simulation and test frameworks for railway control systems. You will design modular C++ components, write unit tests using a test-driven approach, build with CMake, and work in an Agile Scrum team.\n\nRequired: strong C++ (C++17), object-oriented design, multithreading, Git, and code reviews.\nNice to have: Python scripting, Docker and finite-state machines.'

export const JOB_JAVA =
  'We are looking for a Java Backend Developer to build and maintain REST APIs with Spring Boot. Required: Java 17 or newer, Spring Boot, PostgreSQL, JPA/Hibernate, Docker, Kubernetes, Git and unit testing with JUnit. Nice to have: Redis, Kafka, AWS and CI/CD pipelines.'

// A made-up resume. Nothing here describes a real person.
export const RESUME_LINES = [
  'Sam Sample',
  'M.Sc. student, Software Engineering (made-up resume for automated tests)',
  'sam.sample@example.com',
  '',
  'Summary',
  'Software engineering student with two years of part-time experience in backend and simulation',
  'software. Comfortable in C++ and Java, used to working in a Scrum team and to writing tests first.',
  '',
  'Experience',
  'Working student, simulation software (14 months)',
  '- Wrote modular C++ components for a train simulation and covered them with unit tests',
  '- Used Git every day and worked in two-week Scrum sprints',
  '- Automated test runs with Python scripts and packaged the tools with Docker',
  '',
  'Working student, backend development (10 months)',
  '- Built REST APIs with Java and Spring Boot for an internal booking tool',
  '- Wrote SQL queries and migrations for PostgreSQL',
  '- Wrote unit testing suites with JUnit and reviewed the changes of two colleagues',
  '',
  'Projects',
  '- Course planner: a Spring Boot backend with a PostgreSQL database and a small web frontend',
  '- Thesis prototype: a C++ library for discrete event simulation, measured and tuned for speed',
  '',
  'Skills',
  'C++, Java, Python, Spring Boot, PostgreSQL, Docker, Git, JUnit, unit testing, Scrum, REST APIs',
  '',
  'Education',
  'B.Sc. Computer Science',
  'M.Sc. Software Engineering (ongoing)',
]

export const RESUME_FILE_NAME = 'sample-resume.pdf'

// Builds a small, valid one-page PDF with the given lines of text, so the suite needs no binary file in the
// repository. The backend reads it like any uploaded resume.
export function makePdf(lines: string[]): Buffer {
  const escape = (text: string) => text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  const content = ['BT', '/F1 11 Tf', '15 TL', '56 790 Td', ...lines.map((line) => `(${escape(line)}) Tj T*`), 'ET'].join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'))
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}
