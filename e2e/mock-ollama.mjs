// A stand-in for Ollama, for automated tests on machines without an AI model (the CI runner).
//
// It answers the two requests the backend sends to Ollama (POST /api/chat) with fixed, predictable text:
//   - the match analysis: skills are found by looking for well-known names in the job description and the resume
//   - the cover letter: a fixed letter, shorter when the "short" tone is asked for
//
// Everything else is the real application: the real backend builds the prompt, checks the answer, stores it and
// caches it. Only the language model itself is replaced. Nothing here is used when the app runs normally.
import { createServer } from 'node:http'

const PORT = Number(process.env.PORT ?? 11434)

const SKILLS = ['C++', 'Python', 'Java', 'Spring Boot', 'PostgreSQL', 'JPA', 'Hibernate', 'Docker', 'Kubernetes', 'Git', 'JUnit', 'Redis', 'Kafka', 'AWS', 'CI/CD', 'CMake', 'Scrum', 'multithreading', 'code reviews', 'unit testing', 'REST APIs']

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// The skill must stand alone: "Java" is not found inside "JavaScript"
const mentions = (text, skill) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(skill)}(?![\\p{L}\\p{N}+#])`, 'iu').test(text)

function analysis(prompt) {
  const [resume, job = ''] = prompt.split('JOB DESCRIPTION:')
  const asked = SKILLS.filter((skill) => mentions(job, skill))
  const matchingSkills = asked.filter((skill) => mentions(resume, skill))
  const missingSkills = asked.filter((skill) => !mentions(resume, skill))
  const matchScore = asked.length === 0 ? 50 : Math.round((matchingSkills.length / asked.length) * 100)
  const first = missingSkills[0] ?? 'the main requirement'
  return JSON.stringify({
    matchScore,
    matchingSkills,
    missingSkills,
    resumeTips: [
      `The posting asks for ${first}: say what you have done that comes closest.`,
      'Put the project that fits this job best at the top of the resume.',
      'Add one result of your last job, in plain words.',
    ],
  })
}

function coverLetter(system, prompt) {
  const company = /COMPANY NAME: (.*)/.exec(prompt)?.[1]?.trim() ?? 'your company'
  const title = /JOB TITLE: (.*)/.exec(prompt)?.[1]?.trim() ?? 'the position'
  const opening = `Dear Hiring Manager,\n\nI am applying for the ${title} position at ${company}.`
  const closing = 'Sincerely,\nSam Sample\n\n(Written by the stand-in for the AI model that is used in automated tests.)'
  if (system.includes('At most 120 words')) {
    return `${opening} My resume shows the experience this role asks for, and I would be glad to tell you more in an interview.\n\n${closing}`
  }
  const friendly = system.includes('friendly') ? " I'm really looking forward to hearing from you." : ''
  return `${opening} As a working student I wrote modular components and covered them with unit tests, and I am used to working in a Scrum team.\n\nIn my second working-student job I built REST APIs for an internal booking tool and wrote the database migrations for it. I packaged the services so that they could be deployed in the same way on every machine, and I reviewed the changes of my colleagues.\n\nYour posting names requirements that my resume does not show yet. I have not used them in a project, and I would like to learn them on the job.${friendly}\n\nI would be glad to tell you more in an interview.\n\n${closing}`
}

createServer((request, response) => {
  const send = (status, body) => {
    response.writeHead(status, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(body))
  }
  if (request.method === 'GET') return send(200, { mock: true, models: [] })
  let raw = ''
  request.on('data', (chunk) => (raw += chunk))
  request.on('end', () => {
    try {
      const body = JSON.parse(raw)
      const system = body.messages?.find((message) => message.role === 'system')?.content ?? ''
      const prompt = body.messages?.find((message) => message.role === 'user')?.content ?? ''
      const content = body.format === 'json' ? analysis(prompt) : coverLetter(system, prompt)
      send(200, { model: body.model, message: { role: 'assistant', content }, done: true })
    } catch (error) {
      send(400, { error: String(error) })
    }
  })
}).listen(PORT, '0.0.0.0', () => console.log(`Mock Ollama (for tests only) listening on port ${PORT}`))
