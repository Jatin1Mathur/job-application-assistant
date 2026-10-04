import { readFileSync } from 'node:fs'
import { test } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'
import { alertText, apiCall, check, is3dRequest, JOB_CPP, JOB_JAVA, makePdf, MODEL_NAME, noSidewaysScroll, RESUME_FILE_NAME, RESUME_LINES } from '../helpers.ts'

// One new user goes through the whole product, in the order a real user would: sign up, upload a resume, add an
// application, analyze it, write a cover letter, track it on the board, read the insights, and so on.
// The tests of this file depend on each other and share one browser page, so they run in order ("serial").
test.describe.configure({ mode: 'serial' })

const email = `e2e-test-${Date.now()}@example.com`
const password = 'E2e-Test-' + Math.random().toString(36).slice(2, 10)

let context: BrowserContext
let page: Page
let app1: number
let app2: number
let app3: number
let score: string
const pageErrors: string[] = []
const threeRequests: string[] = []

test.beforeAll(async ({ browser, baseURL }) => {
  context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'], colorScheme: 'light' })
  page = await context.newPage()
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('request', (request) => is3dRequest(request.url()) && threeRequests.push(request.url().split('/').pop()!.slice(0, 40)))
  page.on('console', (message) => message.type() === 'error' && !message.text().includes('Failed to load resource') && pageErrors.push(message.text().slice(0, 200)))
})

test.afterAll(async () => {
  await context?.close()
})

const inColumn = (id: number, status: string) => page.locator(`[data-testid=board-column-${status}] [data-testid=board-card-${id}]`).count()

// Drags a card of the board to another column, the way a mouse would
async function drag(id: number, status: string) {
  await page.locator(`[data-testid=board-column-${status}]`).scrollIntoViewIfNeeded()
  await page.evaluate(() => document.querySelector('[data-testid=board-column-SAVED]')!.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(300)
  const grip = (await page.locator(`[data-testid=board-card-${id}] button`).boundingBox())!
  const target = (await page.locator(`[data-testid=board-column-${status}]`).boundingBox())!
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
  await page.mouse.down()
  await page.mouse.move(grip.x + 30, grip.y + 20, { steps: 5 })
  await page.mouse.move(target.x + target.width / 2, target.y + 120, { steps: 15 })
  await page.waitForTimeout(150)
  await page.mouse.up()
}

test('login and sign-up forms', async () => {
  await page.goto('/dashboard')
  await page.waitForSelector('h1:has-text("Welcome back")')
  check('protected page redirects to /login when logged out', true)

  await page.fill('#email', email)
  await page.fill('#password', 'wrong-password')
  await page.click('button[type=submit]')
  await page.waitForSelector('[data-slot=alert]')
  check('login error from backend', (await alertText(page)).includes('Email or password is incorrect'))
  check('login: the generic error does not say which part was wrong', (await alertText(page)).trim() === 'Email or password is incorrect')
  check('login: autocomplete for password managers', (await page.getAttribute('#email', 'autocomplete')) === 'username' && (await page.getAttribute('#password', 'autocomplete')) === 'current-password')
  await page.click('[aria-label="Show password"]')
  check('show password turns the field into readable text', (await page.getAttribute('#password', 'type')) === 'text' && (await page.getAttribute('[aria-label="Hide password"]', 'aria-pressed')) === 'true')
  await page.click('[aria-label="Hide password"]')
  await page.locator('#password').evaluate((el) => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', modifierCapsLock: true, bubbles: true })))
  check('Caps Lock warning appears', await page.isVisible('[data-testid=caps-lock]'))
  await page.locator('#password').evaluate((el) => el.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', modifierCapsLock: false, bubbles: true })))
  check('Caps Lock warning goes away', !(await page.isVisible('[data-testid=caps-lock]')))
  await page.fill('#email', 'not-an-email')
  await page.locator('#password').focus()
  check('inline validation: a wrong email is named when the field is left', ((await page.textContent('#email-error')) ?? '').includes('does not look like an email') && (await page.getAttribute('#email', 'aria-invalid')) === 'true')
  await page.fill('#email', email)

  await page.click('nav[aria-label="Log in or create an account"] a:has-text("Create account")')
  await page.waitForSelector('h1:has-text("Create your account")')
  check('switching to register keeps what was typed', (await page.inputValue('#email')) === email && (await page.inputValue('#password')) === 'wrong-password' && page.url().endsWith('/register'))
  check('register: autocomplete for password managers', (await page.getAttribute('#email', 'autocomplete')) === 'email' && (await page.getAttribute('#password', 'autocomplete')) === 'new-password')
  await page.waitForSelector('[data-testid=strength]')
  let requests = 0
  const countRegister = (request: { url(): string }) => {
    if (request.url().includes('/api/auth/register')) requests++
  }
  page.on('request', countRegister)
  await page.fill('#password', 'short')
  await page.click('button[type=submit]')
  check(
    'register: a short password is refused in the form, without a request',
    ((await page.textContent('#password-error')) ?? '').includes('at least 8 characters') && requests === 0 && (await page.getAttribute('[data-testid=strength]', 'data-level')) === '0',
  )
  page.off('request', countRegister)
  await page.fill('#password', 'password')
  const weak = await page.getAttribute('[data-testid=strength]', 'data-level')
  await page.fill('#password', password)
  const strong = await page.getAttribute('[data-testid=strength]', 'data-level')
  check('password strength meter reacts', weak === '1' && Number(strong) >= 2 && ((await page.textContent('[data-testid=strength]')) ?? '').includes('Password strength:'), `"password" -> ${weak}, test password -> ${strong}`)

  await page.click('button[type=submit]')
  await page.waitForSelector('[data-testid=auth-success]')
  check('success animation before the dashboard', ((await page.textContent('[data-testid=auth-success]')) ?? '').includes('Your account is ready'))
  await page.waitForSelector('text=Get started in three steps')
  check('register logs in; onboarding checklist on empty dashboard', await page.isVisible('text=0 of 3 done'))
})

test('a new account: empty states, greeting, lazy 3D', async () => {
  await page.waitForTimeout(800)
  check('empty dashboard: paper plane illustration, no stat cards with zeros', (await page.isVisible('[data-art=paper-plane]')) && (await page.locator('[data-testid=stat-applications]').count()) === 0)
  const hello = ((await page.textContent('[data-testid=greeting]')) ?? '').trim()
  check('dashboard greets by time of day, without a name when none was given', /^Good (morning|afternoon|evening)$/.test(hello), hello)
  await page.click('button:has-text("Add your name")')
  await page.fill('#greeting-name', 'Tester')
  await page.click('button:has-text("Save")')
  await page.waitForFunction(() => document.querySelector('[data-testid=greeting]')!.textContent!.includes(', Tester'))
  check('adding a name puts it into the greeting', true)
  await page.goto('/insights')
  await page.waitForSelector('text=No insights yet')
  check('empty insights: telescope illustration', await page.isVisible('[data-art=telescope]'))
  threeRequests.length = 0
  await page.goto('/dashboard')
  await page.waitForSelector('text=Get started in three steps')
  await page.waitForTimeout(800)
  check('lazy loading: the dashboard does not download any 3D code', threeRequests.length === 0, `${threeRequests.length} requests`)
  await page.goto('/')
  await page.waitForURL('**/dashboard')
  check('logged-in user at / goes to the dashboard', true)
})

test('upload a resume', async () => {
  await page.waitForSelector('text=Get started in three steps')
  await page.click('a:has-text("Upload your resume")')
  await page.waitForSelector('text=No resumes yet')
  check('empty resumes: document stack illustration', await page.isVisible('[data-art=document-stack]'))
  await page.setInputFiles('input[type=file]', { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') })
  await page.waitForSelector('[data-slot=alert]')
  check('upload error from backend', (await alertText(page)).includes('Only PDF files are allowed'))
  await page.setInputFiles('input[type=file]', { name: RESUME_FILE_NAME, mimeType: 'application/pdf', buffer: makePdf(RESUME_LINES) })
  await page.waitForSelector(`li >> text=${RESUME_FILE_NAME}`)
  check('resume uploaded and listed', true)
  await page.click('nav >> text=Applications')
  await page.waitForSelector('text=1 of 3 done')
  check('checklist: 1 of 3 after upload', (await page.locator('[data-done=true]').count()) === 1)
})

test('create an application (with the keyboard shortcut N)', async () => {
  await page.keyboard.press('n')
  await page.waitForSelector('h1:has-text("New application")')
  check('shortcut N opens the new application form', true)
  await page.fill('#companyName', 'Siemens Mobility')
  await page.fill('#jobTitle', 'C++ Software Engineer (Simulation)')
  await page.fill('#jobDescription', 'too short')
  check('shortcuts are off while typing (N in a field does nothing)', page.url().endsWith('/applications/new'))
  await page.click('button[type=submit]')
  await page.waitForSelector('[data-slot=alert]')
  check('create validation error from backend', (await alertText(page)).includes('at least 100 characters'))
  await page.fill('#jobDescription', JOB_CPP)
  await page.click('button[type=submit]')
  await page.waitForURL(/applications\/\d+$/)
  await page.waitForSelector('text=Not analyzed yet')
  app1 = Number(page.url().split('/').pop())
  check('application created, detail page opens', true)
})

test('AI match analysis', async () => {
  const started = Date.now()
  await page.click('button:has-text("Analyze match")')
  // With a real model the "working" steps are shown for a while; with the stand-in the answer may arrive first
  await page.waitForSelector('text=Matching skills', { timeout: 200000 })
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  await page.waitForSelector('[data-testid=analysis-meta]')
  await page.waitForTimeout(1600)
  score = ((await page.textContent('section [data-testid=score]')) ?? '').trim()
  await page.waitForSelector('section [data-3d=on] canvas', { timeout: 30000 })
  check('detail: 3D score orb with a readable number', ((await page.textContent('section [data-testid=score]')) ?? '').trim() === score && (await page.getAttribute('section [data-3d]', 'aria-label')) === `Match score ${score} out of 100`)
  const meta = (await page.textContent('[data-testid=analysis-meta]')) ?? ''
  check('analysis shown with model name and date', meta.includes(MODEL_NAME), `score ${score}, ${seconds}s, ${meta}`)
  const kept = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes('analysis')).length)
  check('analysis is not kept in browser storage any more', kept === 0)
  await page.reload()
  await page.waitForSelector('text=Matching skills')
  check('full analysis comes back from the backend after reload', (await page.isVisible('text=Tips to improve your resume')) && (await page.isVisible('[data-testid=analysis-meta]')))
})

test('cover letter: generate, copy, tone, regenerate, export as PDF', async () => {
  let started = Date.now()
  await page.click('button:has-text("Generate cover letter")')
  await page.waitForSelector('[data-testid=cover-letter]', { timeout: 200000 })
  check('cover letter shown', ((await page.textContent('[data-testid=cover-letter]')) ?? '').startsWith('Dear Hiring Manager'), `${((Date.now() - started) / 1000).toFixed(1)}s`)
  await page.click('button:has-text("Copy")')
  await page.waitForSelector('button:has-text("Copied")')
  check('copy to clipboard', (await page.evaluate(() => navigator.clipboard.readText())).startsWith('Dear Hiring Manager'))

  check(
    'cover letter: tone selector starts on Formal and the letter names its tone',
    (await page.isChecked('input[name=cover-letter-tone][value=FORMAL]')) && ((await page.textContent('[data-testid=cover-letter] + p')) ?? '').includes('formal tone'),
  )
  const firstLetter = (await page.textContent('[data-testid=cover-letter]')) ?? ''
  await page.check('input[name=cover-letter-tone][value=SHORT]', { force: true })
  started = Date.now()
  await page.click('[data-testid=generate-letter]:has-text("Regenerate")')
  await page.waitForFunction(() => document.querySelector('[data-testid=cover-letter] + p')?.textContent?.includes('short tone'), null, { timeout: 200000 })
  const shortLetter = (await page.textContent('[data-testid=cover-letter]')) ?? ''
  const words = (text: string) => text.trim().split(/\s+/).length
  check('regenerate with the short tone writes a new, shorter letter', shortLetter !== firstLetter && words(shortLetter) < words(firstLetter), `${words(firstLetter)} -> ${words(shortLetter)} words, ${((Date.now() - started) / 1000).toFixed(1)}s`)

  const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-testid=export-pdf]')])
  const head = readFileSync(await download.path()).subarray(0, 5).toString()
  check('export as PDF downloads a real PDF with a file name', head === '%PDF-' && /^cover-letter-.*\.pdf$/.test(download.suggestedFilename()), download.suggestedFilename())
})

test('status timeline, notes, interview date, and the dashboard overview', async () => {
  const timeline = '[data-testid=status-timeline]'
  check('status timeline starts with "Saved"', (await page.locator(`${timeline} li`).count()) === 1 && ((await page.textContent(timeline)) ?? '').includes('Saved'))
  await page.click('[aria-label="Change status"]')
  await page.click('[role=option]:has-text("Applied")')
  await page.waitForFunction(() => document.querySelectorAll('[data-testid=status-timeline] li').length === 2)
  check('changing the status adds a line to the timeline', ((await page.textContent(timeline)) ?? '').includes('Moved to Applied') && ((await page.textContent(timeline)) ?? '').includes('since today'))

  const tomorrow = new Date(Date.now() + 86400000)
  const local = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}T10:30`
  check('notes: Save is disabled until something changes', await page.isDisabled('[data-testid=notes-form] button[type=submit]'))
  await page.fill('#notes', 'Ask about the team size.')
  await page.fill('#interview-at', local)
  await page.click('[data-testid=notes-form] button[type=submit]')
  await page.waitForSelector('text=Notes and interview date saved')
  await page.reload()
  await page.waitForSelector('#notes')
  check('notes and interview date are stored', (await page.inputValue('#notes')) === 'Ask about the team size.' && (await page.inputValue('#interview-at')) === local)
  await page.click('[aria-label="Change status"]')
  await page.click('[role=option]:has-text("Saved")')
  await page.waitForFunction(() => document.querySelectorAll('[data-testid=status-timeline] li').length === 3)

  await page.goto('/dashboard')
  await page.waitForSelector('[data-testid=next-actions]')
  const firstAction = (await page.textContent('[data-testid=next-actions] li >> nth=0')) ?? ''
  check('dashboard: the interview tomorrow is the first next action', firstAction.includes('Interview tomorrow'), firstAction.slice(0, 80))
  check(
    'dashboard: stat cards with real numbers and a sparkline each',
    ((await page.textContent('[data-testid=stat-applications]')) ?? '').includes('1 added this week') &&
      !((await page.textContent('[data-testid=stat-interview-rate]')) ?? '').includes('2 of') &&
      (await page.locator('[data-sparkline]').count()) === 4,
  )
  check('dashboard: heatmap shows today', (await page.locator('[data-testid=heatmap] [data-count="1"]').count()) === 1 && ((await page.textContent('[data-testid=heatmap]')) ?? '').includes('1 application added on 1 day'))
  check('dashboard has no sideways scrolling', await noSidewaysScroll(page))
  await page.goBack()
  await page.waitForSelector('[data-testid=cover-letter]')
})

test('compare view and status change', async () => {
  await page.click('[role=tab]:has-text("Compare")')
  await page.waitForSelector('[data-testid=compare-resume] p')
  await page.waitForFunction(() => document.querySelectorAll('[data-testid=compare-job] mark').length > 0)
  const marks = await page.evaluate(() => ({
    jobGreen: document.querySelectorAll('[data-testid=compare-job] mark[data-kind=matching]').length,
    jobRed: document.querySelectorAll('[data-testid=compare-job] mark[data-kind=missing]').length,
    resumeGreen: document.querySelectorAll('[data-testid=compare-resume] mark[data-kind=matching]').length,
    resumeLength: document.querySelector('[data-testid=compare-resume] p')!.textContent!.length,
  }))
  check('compare: resume text and job description side by side with highlights', marks.resumeLength > 1000 && marks.jobGreen + marks.jobRed > 0, JSON.stringify(marks))
  await page.click('[role=tab]:has-text("Overview")')

  await page.click('[aria-label="Change status"]')
  await page.click('[role=option]:has-text("Interview")')
  await page.waitForSelector('text=Status changed to Interview')
  check('status changed with the dropdown', true)
})

test('dashboard list: shared element, tilt, filter', async () => {
  // Two more applications through the API, so the board and the insights have something to show
  const resumes = await apiCall(page, 'GET', '/resumes')
  app2 = (await apiCall(page, 'POST', '/applications', { companyName: 'TechNova', jobTitle: 'Java Backend Developer', jobDescription: JOB_JAVA })).id
  await apiCall(page, 'POST', `/applications/${app2}/analyze?resumeId=${resumes[0].id}`)
  app3 = (await apiCall(page, 'POST', '/applications', { companyName: 'Globex', jobTitle: 'Embedded Software Engineer', jobDescription: JOB_CPP.replace('railway control systems', 'industrial robots') })).id

  await page.click('text=Back to applications')
  await page.waitForSelector('[data-testid=application-list] li >> text=Siemens Mobility')
  await page.waitForTimeout(900)
  // Shared element: the card should grow into the detail header (the header starts at the card's size)
  const header = () => page.locator('main h1').locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')
  const cardBox = (await page.locator('[data-testid=application-list] li:has-text("Siemens Mobility") a > div').boundingBox())!
  await page.click('[data-testid=application-list] li >> text=Siemens Mobility')
  const samples: number[] = []
  for (let i = 0; i < 12; i++) {
    const box = await header().boundingBox().catch(() => null)
    if (box) samples.push(Math.round(box.width))
    await page.waitForTimeout(30)
  }
  await page.waitForTimeout(600)
  const finalBox = (await header().boundingBox())!
  // The first samples can still be the old page; what matters is that the header was seen small and then grew
  check(
    'shared element: card grows into the detail header',
    samples.some((width) => width < finalBox.width - 40) && samples[samples.length - 1] >= Math.min(...samples),
    `card ${Math.round(cardBox.width)}px, header during animation ${samples.slice(0, 6).join(',')}…, final ${Math.round(finalBox.width)}px`,
  )
  check('detail header shows at once from the card data', await page.isVisible('h1:has-text("C++ Software Engineer")'))
  await page.waitForSelector('text=Matching skills')
  await page.click('text=Back to applications')
  await page.waitForSelector('[data-testid=application-list] li >> text=Siemens Mobility')
  check('checklist disappears when all three steps are done', !(await page.isVisible('text=Get started in three steps')))

  await page.waitForTimeout(1600)
  const cardLink = page.locator('[data-testid=application-list] li:has-text("Siemens Mobility") a').first()
  await cardLink.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const card = (await cardLink.boundingBox())!
  await page.mouse.move(card.x + card.width * 0.9, card.y + card.height * 0.15)
  await page.waitForTimeout(500)
  const tiltOf = () => cardLink.evaluate((link) => getComputedStyle(link.parentElement!).transform)
  const tilt = await tiltOf()
  // A tilted card has a rotation in its matrix: the first number is no longer exactly 1
  const rotated = tilt.startsWith('matrix3d') && Math.abs(Number(tilt.slice(9).split(',')[0]) - 1) > 0.0005
  await page.mouse.move(5, 5)
  await page.waitForTimeout(600)
  const flatAgain = await tiltOf()
  check('dashboard: card tilts in 3D on hover and goes flat again', rotated && !/^matrix3d\(0\.9/.test(flatAgain), `${tilt.slice(0, 48)}… -> ${flatAgain.slice(0, 40)}`)
  check('dashboard card shows badge and score', await page.isVisible('[data-testid=application-list] li >> text=Interview'))
  await page.click('[role=tab]:has-text("Rejected")')
  await page.waitForSelector('text=No applications with status Rejected')
  check('status filter still works', true)
  await page.click('[role=tab]:has-text("All")')
})

test('kanban board: drag and drop, rollback, animation, confetti', async () => {
  await page.click('[role=tab]:has-text("Board")')
  await page.waitForSelector('[data-testid=board-column-SAVED]')
  check('board: cards sit in the column of their status', (await inColumn(app1, 'INTERVIEW')) === 1 && (await inColumn(app2, 'SAVED')) === 1 && (await inColumn(app3, 'SAVED')) === 1)
  await drag(app2, 'APPLIED')
  await page.waitForSelector('text=TechNova moved to Applied')
  check('board: drag and drop moves the card', (await inColumn(app2, 'APPLIED')) === 1)
  check('board: the backend has the new status', (await apiCall(page, 'GET', `/applications/${app2}`)).status === 'APPLIED')
  await page.waitForTimeout(600)

  // A simulated backend failure: the card must go back
  await page.route(
    '**/api/applications/*/status',
    (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ status: 500, error: 'Internal Server Error', message: 'Simulated failure' }) }),
    { times: 1 },
  )
  await drag(app3, 'OFFER')
  await page.waitForSelector('text=Could not move the application')
  await page.waitForTimeout(300)
  check('board: rollback when the backend fails', (await inColumn(app3, 'SAVED')) === 1 && (await inColumn(app3, 'OFFER')) === 0 && (await page.isVisible('text=Simulated failure')))
  check('board: backend status unchanged after the failed move', (await apiCall(page, 'GET', `/applications/${app3}`)).status === 'SAVED')

  // Layout animation: after a drop the card glides, so shortly after it is not yet at its final place
  await drag(app2, 'INTERVIEW')
  const during = (await page.locator(`[data-testid=board-card-${app2}]`).boundingBox())!
  await page.waitForSelector('text=TechNova moved to Interview')
  await page.waitForTimeout(600)
  const after = (await page.locator(`[data-testid=board-card-${app2}]`).boundingBox())!
  check(
    'board: moved card animates to its new place',
    (await inColumn(app2, 'INTERVIEW')) === 1 && (Math.abs(during.x - after.x) > 2 || Math.abs(during.y - after.y) > 2),
    `x ${Math.round(during.x)} -> ${Math.round(after.x)}, y ${Math.round(during.y)} -> ${Math.round(after.y)}`,
  )
  check('no confetti for an ordinary move', (await page.locator('canvas').count()) === 0)
  await drag(app2, 'OFFER')
  await page.waitForSelector('text=TechNova moved to Offer')
  await page.waitForFunction(() => document.querySelectorAll('canvas').length > 0, null, { timeout: 3000 }).catch(() => {})
  check('confetti when an application is moved to Offer', (await page.locator('canvas').count()) > 0)
  await page.waitForTimeout(250)
  await drag(app2, 'APPLIED')
  await page.waitForSelector('text=TechNova moved to Applied')
  await page.waitForTimeout(500)
  await page.click(`[data-testid=board-card-${app2}] a`)
  await page.waitForURL(`**/applications/${app2}`)
  check('board: clicking a card opens it (not mistaken for a drag)', true)
  await page.goBack()
  await page.waitForSelector('[data-testid=board-column-SAVED]')
  check('board view is remembered', true)
})

test('insights: charts and the 3D skill universe', async () => {
  await page.keyboard.press('g')
  await page.keyboard.press('i')
  // Watch the first chart from now on, frame by frame, for three seconds. Looking at it once "early" and once
  // "late" depended on timing: on a slow machine the first look could come after the animation had finished.
  const watching = page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const seen: string[] = []
        const started = performance.now()
        const look = () => {
          const chart = document.querySelector('[data-testid=status-chart]')
          if (chart) {
            const transform = getComputedStyle(chart).transform
            if (seen[seen.length - 1] !== transform) seen.push(transform)
          }
          if (performance.now() - started < 3000) requestAnimationFrame(look)
          else resolve(seen)
        }
        look()
      }),
  )
  await page.waitForSelector('h1:has-text("Insights")')
  check('shortcut G then I opens insights', true)
  await page.waitForSelector('[data-testid=skills-chart] svg')
  const transforms = await watching
  const finalTransform = transforms[transforms.length - 1]
  check(
    'insights: charts animate in and end at full size',
    transforms.length > 1 && (finalTransform === 'none' || finalTransform === 'matrix(1, 0, 0, 1, 0, 0)'),
    `${transforms.length} different states, from ${transforms[0]} to ${finalTransform}`,
  )

  const insights = await apiCall(page, 'GET', '/insights')
  const hint = (await page.textContent('[data-testid=skill-hint]')) ?? ''
  check(
    'insights: status chart, average and missing-skills chart',
    (await page.isVisible('[data-testid=status-chart] svg')) && ((await page.textContent('[data-testid=average-score]')) ?? '').includes(String(insights.averageMatchScore)),
    `average ${insights.averageMatchScore}, byStatus ${JSON.stringify(insights.applicationsByStatus)}`,
  )
  check('insights: helpful text names the most-missed skill', hint.includes(insights.topMissingSkills[0].skill) && hint.includes(`${insights.topMissingSkills[0].applications} of your 2`), hint.trim())
  const skillBars = await page.locator('[data-testid=skills-chart] .recharts-bar-rectangle path').count()
  const skillLabels = await page.locator('[data-testid=skills-chart] .recharts-label-list text, [data-testid=skills-chart] .recharts-label').count()
  check('insights: one bar and one value label per missing skill', skillBars === insights.topMissingSkills.length && skillLabels === skillBars, `${skillBars} bars, ${skillLabels} labels, ${insights.topMissingSkills.length} skills`)

  await page.locator('[data-testid=skill-hint]').scrollIntoViewIfNeeded()
  await page.waitForSelector('[data-testid=skill-hint] ~ div [data-3d=on] canvas', { timeout: 30000 })
  await page.waitForTimeout(1200)
  check('insights: 3D skill universe with one sphere label per skill', (await page.locator('[data-universe-label]').count()) === insights.topMissingSkills.length)
  let tooltip: string | null = null
  for (const label of await page.locator('[data-universe-label]').all()) {
    const box = await label.boundingBox()
    if (!box) continue
    await page.mouse.move(box.x + box.width / 2, box.y - 14)
    await page.waitForTimeout(350)
    if (await page.locator('[data-testid=universe-tooltip]').count()) {
      tooltip = ((await page.textContent('[data-testid=universe-tooltip]')) ?? '').trim()
      break
    }
  }
  check('insights: hovering a skill shows how many applications need it', tooltip !== null && /Needed by \d+ of your 2 analyzed applications/.test(tooltip), String(tooltip))
  await page.mouse.move(5, 5)
})

test('command palette, shortcuts help, dark mode', async () => {
  await page.keyboard.press('Control+k')
  await page.waitForSelector('[cmdk-input]')
  check('Cmd/Ctrl+K opens the command palette', (await page.isVisible('[cmdk-item]:has-text("New application")')) && (await page.isVisible('[cmdk-item]:has-text("Insights")')))
  await page.keyboard.type('technova')
  await page.waitForTimeout(300)
  const visibleItems = await page.locator('[cmdk-item]').allTextContents()
  check('palette: search applications by company', visibleItems.length === 1 && visibleItems[0].includes('TechNova'), visibleItems.join(' | ').slice(0, 80))
  await page.keyboard.press('Enter')
  await page.waitForURL(`**/applications/${app2}`)
  check('palette: Enter opens the application', true)
  await page.keyboard.press('Control+k')
  await page.waitForSelector('[cmdk-input]')
  await page.keyboard.type('new app')
  await page.waitForTimeout(400)
  await page.keyboard.press('Enter')
  await page.waitForSelector('h1:has-text("New application")')
  check('palette: create a new application', true)
  await page.waitForTimeout(500)
  await page.keyboard.press('g')
  await page.keyboard.press('d')
  await page.waitForSelector('h2:has-text("My applications")')

  await page.keyboard.press('?')
  await page.waitForSelector('[role=dialog] >> text=Keyboard shortcuts')
  check('? opens the shortcuts help dialog', (await page.locator('[role=dialog] li').count()) === 7)
  await page.waitForTimeout(300)
  await page.keyboard.press('Escape')

  await page.waitForTimeout(300)
  await page.keyboard.press('t')
  await page.waitForFunction(() => document.documentElement.classList.contains('dark'))
  check('shortcut T switches to dark mode', true)
})

test('phone width: no sideways scrolling, finger-sized controls', async () => {
  await page.keyboard.press('g')
  await page.keyboard.press('i')
  await page.waitForSelector('[data-testid=skills-chart] svg')
  await page.waitForTimeout(1800)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(1200)
  check('phone: insights without sideways scrolling', await noSidewaysScroll(page))
  const tabBar = await page.evaluate(() => [...document.querySelectorAll('nav.fixed a')].map((a) => ({ text: a.textContent!.trim(), h: Math.round(a.getBoundingClientRect().height) })))
  check('phone: bottom tab bar with labels and finger-sized targets', tabBar.length === 3 && tabBar.every((tab) => tab.text.length > 0 && tab.h >= 44), JSON.stringify(tabBar))
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('button, a[href], [role=tab]')]
      .filter((el) => {
        const box = el.getBoundingClientRect()
        return box.width > 0 && box.height > 0 && box.height < 44 && !el.closest('.sr-only') && getComputedStyle(el).visibility !== 'hidden'
      })
      .map((el) => (el.getAttribute('aria-label') || el.textContent!.trim()).slice(0, 24) + ':' + Math.round(el.getBoundingClientRect().height)),
  )
  check('phone: no control shorter than 44px on the insights page', small.length === 0, small.join(', '))
  check('page title names the page', (await page.title()) === 'Insights · Job Assistant', await page.title())

  await page.click('nav.fixed a:has-text("Applications")')
  await page.waitForSelector('[data-testid=board-column-SAVED]')
  await page.waitForTimeout(600)
  check('phone: board without sideways page scrolling', await noSidewaysScroll(page))
  await page.goto(`/applications/${app1}`)
  await page.waitForSelector('text=Matching skills')
  await page.click('[role=tab]:has-text("Compare")')
  await page.waitForSelector('[data-testid=compare-resume] p')
  await page.waitForTimeout(600)
  check('phone: compare view without sideways scrolling', await noSidewaysScroll(page))
  await page.click('[role=tab]:has-text("Overview")')
  await page.waitForSelector('section [data-3d=on] canvas', { timeout: 30000 })
  await page.waitForTimeout(1800)
  check('phone: detail with the score orb, without sideways scrolling', await noSidewaysScroll(page))

  await page.keyboard.press('t')
  await page.waitForTimeout(300)
  await page.click('[aria-label="Log out"]')
  await page.waitForSelector('h1:has-text("Welcome back")')
  await page.waitForTimeout(500)
  const cookiesAfterLogout = (await context.cookies()).filter((cookie) => cookie.name === 'job_assistant_token')
  check('log out deletes the login cookie', cookiesAfterLogout.length === 0 && (await page.evaluate(() => localStorage.getItem('job-assistant.email'))) === null)
  await page.goto('/')
  await page.waitForSelector('h1:has-text("Know where you stand")')
  await page.waitForTimeout(1200)
  check('phone: landing page without sideways scrolling', await noSidewaysScroll(page))
  await page.setViewportSize({ width: 1280, height: 900 })
})

test('log in again, not found, delete, keyboard focus', async () => {
  await page.click('a:has-text("Log in")')
  await page.waitForSelector('h1:has-text("Welcome back")')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type=submit]')
  await page.waitForSelector('[data-testid=board-column-SAVED]')
  check('log in again shows my data', true)
  await page.goto('/applications/999999')
  await page.waitForSelector('[data-slot=alert]')
  check('404 message from backend', (await alertText(page)).includes('was not found'))
  await page.goto(`/applications/${app3}`)
  await page.waitForSelector('text=Not analyzed yet')
  await page.click('button:has-text("Delete application")')
  await page.waitForSelector('[role=dialog] >> text=Delete this application?')
  await page.click('[role=dialog] button:has-text("Delete")')
  await page.waitForSelector('text=Application deleted')
  check('delete with confirm dialog', (await apiCall(page, 'GET', '/insights')).totalApplications === 2)

  // Keyboard: the first Tab reaches the skip link; focus is visibly outlined
  await page.goto('/dashboard')
  await page.waitForSelector('h2:has-text("My applications")')
  await page.keyboard.press('Tab')
  const focus = await page.evaluate(() => {
    const el = document.activeElement!
    const style = getComputedStyle(el)
    return { text: el.textContent!.trim(), outline: style.outlineStyle + ' ' + style.outlineWidth }
  })
  check('keyboard: Tab reaches "Skip to content" with a visible focus outline', focus.text === 'Skip to content' && focus.outline === 'solid 2px', JSON.stringify(focus))
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  const navFocus = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement!)
    return style.outlineStyle + ' ' + style.outlineWidth
  })
  check('keyboard: links show a focus outline', navFocus === 'solid 2px', navFocus)
})

test('without WebGL: every 3D scene falls back to a flat picture', async ({ browser, baseURL }) => {
  const flat = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 }, storageState: await context.storageState() })
  await flat.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = function () {
      return null
    } as never
  })
  const flatPage = await flat.newPage()
  const flatThree: string[] = []
  const flatErrors: string[] = []
  flatPage.on('request', (request) => is3dRequest(request.url()) && flatThree.push(request.url()))
  flatPage.on('pageerror', (error) => flatErrors.push(String(error)))
  await flatPage.goto(`/applications/${app1}`)
  await flatPage.waitForSelector('text=Matching skills')
  await flatPage.waitForTimeout(1500)
  check(
    'no WebGL: the score falls back to the 2D ring',
    (await flatPage.getAttribute('section [data-3d]', 'data-3d')) === 'fallback' && (await flatPage.locator('section [data-3d] svg circle').count()) === 2 && ((await flatPage.textContent('section [data-testid=score]')) ?? '').trim() === score,
  )
  await flatPage.goto('/insights')
  await flatPage.waitForSelector('[data-testid=universe-fallback]')
  await flatPage.waitForTimeout(800)
  check('no WebGL: the skill universe falls back to static bubbles', (await flatPage.locator('[data-testid=universe-fallback] li').count()) > 0 && (await flatPage.isVisible('[data-testid=skills-chart] svg')))
  check('no WebGL: no 3D code downloaded and no errors', flatThree.length === 0 && flatErrors.length === 0, `${flatThree.length} requests, ${flatErrors.length} errors`)
  await flat.close()
})

test('no JavaScript errors during the whole journey', async () => {
  check('no JavaScript errors in the page', pageErrors.length === 0, pageErrors.join(' | '))
})
