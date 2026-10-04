import { test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { check, noSidewaysScroll } from '../helpers.ts'

// The pages a visitor sees without an account: the landing page with its 3D hero, scroll story, sample demo,
// letter slider and architecture diagram, and how they behave on a touch device and with reduced motion.

// Scrolls so that step number `index` of "How it works" is in the middle of the screen
async function toStep(page: Page, index: number) {
  const y = await page.evaluate((index) => {
    const li = document.querySelectorAll('section[aria-labelledby=how-heading] li')[index].getBoundingClientRect()
    const y = Math.round(window.scrollY + li.top + li.height / 2 - window.innerHeight * 0.5)
    window.scrollTo(0, y)
    return y
  }, index)
  await page.waitForTimeout(1500)
  return y
}

const storyScore = async (page: Page) => ({
  text: ((await page.textContent('[data-story-score] span')) ?? '').trim(),
  opacity: Number(await page.locator('[data-story-score]').evaluate((el: HTMLElement) => el.style.opacity || 0)),
})

test('landing page: 3D hero and scroll story', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('h1:has-text("Know where you stand")')
  check('public landing page at /', (await page.isVisible('text=What it does for your job search')) && (await page.isVisible('text=Three steps to your first result')))
  await page.waitForSelector('[data-3d=on] canvas', { timeout: 30000 })
  check('landing: 3D backpack hero with six orbiting skill labels', (await page.locator('[data-galaxy-label]').count()) === 6)

  // The skills travel along their orbits, so a label moves over time
  await page.waitForTimeout(600)
  const labelBefore = (await page.locator('[data-galaxy-label]').nth(1).boundingBox())!
  await page.waitForTimeout(1500)
  const labelAfter = (await page.locator('[data-galaxy-label]').nth(1).boundingBox())!
  check('landing: the skills orbit the backpack', Math.abs(labelBefore.x - labelAfter.x) > 1, `label x ${labelBefore.x.toFixed(1)} -> ${labelAfter.x.toFixed(1)}`)

  // When the scene is off-screen, rendering stops: the label stays where it is
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(700)
  const pausedBefore = await page.locator('[data-galaxy-label]').nth(1).evaluate((el: HTMLElement) => el.style.transform)
  await page.waitForTimeout(1200)
  const pausedAfter = await page.locator('[data-galaxy-label]').nth(1).evaluate((el: HTMLElement) => el.style.transform)
  check('landing: rendering pauses while the hero is off-screen', pausedBefore === pausedAfter, pausedBefore)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(500)

  check(
    'landing: 3 features and 3 steps',
    (await page.locator('section[aria-labelledby=features-heading] li').count()) === 3 && (await page.locator('section[aria-labelledby=how-heading] li').count()) === 3,
  )
  check('landing: Log in and Get started buttons', (await page.locator('a:has-text("Create your account")').count()) >= 1 && (await page.locator('a:has-text("Log in")').count()) >= 1)

  // Scroll story: scrolling to a step plays the scene; scrolling is native (the page ends up exactly where it was sent)
  await page.waitForTimeout(1500)
  const y1 = await toStep(page, 0)
  const atStep1 = await storyScore(page)
  const stuck = (await page.locator('[data-3d]').boundingBox())!
  check(
    'story step 1: the scene stays on screen next to the text, score still hidden',
    stuck.y >= 0 && stuck.y + stuck.height <= 900 && atStep1.opacity < 0.05 && Math.abs((await page.evaluate(() => window.scrollY)) - y1) <= 1,
    JSON.stringify(atStep1),
  )
  await toStep(page, 1)
  const dockerLabel = Number(await page.locator('[data-galaxy-label]:has-text("Docker")').evaluate((el: HTMLElement) => el.style.opacity))
  check('story step 2: the names of missing skills fade', dockerLabel < 0.5, 'Docker label opacity ' + dockerLabel)
  await toStep(page, 2)
  const atStep3 = await storyScore(page)
  check('story step 3: the score ring is shown and counts to 82', atStep3.text === '82' && atStep3.opacity > 0.95, JSON.stringify(atStep3))
  const textBox = (await page.locator('section[aria-labelledby=how-heading] li').nth(2).locator('h3').boundingBox())!
  const sceneBox = (await page.locator('[data-3d]').boundingBox())!
  check('story: step text and scene do not overlap', textBox.x + textBox.width <= sceneBox.x, `${Math.round(textBox.x + textBox.width)} <= ${Math.round(sceneBox.x)}`)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(1500)
  check('story: scrolling back to the top plays it backwards', (await storyScore(page)).text === '0')
})

test('landing page: sample demo, letter slider, architecture, built by', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('h1:has-text("Know where you stand")')
  await page.locator('#try').scrollIntoViewIfNeeded()
  const result = '[data-testid=demo-result]'
  check('demo: labelled as a sample and empty before Analyze', ((await page.textContent(result)) ?? '').includes('Sample result, not a live analysis') && (await page.getAttribute(result, 'data-phase')) === 'idle')
  await page.click('[data-testid=demo-analyze]')
  await page.waitForSelector(`${result}[data-phase=done]`)
  await page.waitForTimeout(1600)
  check('demo: Analyze shows the score ring at 82 and five skill tags', ((await page.textContent(`${result} [data-testid=score]`)) ?? '').trim() === '82' && (await page.locator(`${result} ul li`).count()) === 5)
  await page.check('input[name=sample-job][value=ios]')
  check('demo: picking another job clears the result', (await page.getAttribute(result, 'data-phase')) === 'idle')
  await page.click('[data-testid=demo-analyze]')
  await page.waitForSelector(`${result}[data-phase=done]`)
  await page.waitForTimeout(1600)
  check('demo: the iOS sample scores 34 (weak match)', ((await page.textContent(result)) ?? '').includes('Weak match') && ((await page.textContent(`${result} [data-testid=score]`)) ?? '').trim() === '34')

  const range = page.locator('[data-testid=letter-compare] input[type=range]')
  await range.scrollIntoViewIfNeeded()
  await range.focus()
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft')
  check(
    'letter slider: arrow keys move the divider, skills are highlighted',
    (await page.locator('[data-testid=letter-compare]').evaluate((el: HTMLElement) => el.style.getPropertyValue('--split'))) === '40%' && (await page.locator('[data-testid=letter-compare] mark').count()) >= 5,
  )

  await page.locator('svg:visible [data-part=redis]').focus()
  check('architecture: focusing a part explains it in one sentence', ((await page.textContent('[data-testid=part-text]')) ?? '').includes('The cache remembers finished analyses'))
  await page.locator('svg:visible [data-part=ollama]').hover()
  check('architecture: hovering a part explains it; dots travel along the lines', ((await page.textContent('[data-testid=part-text]')) ?? '').includes('llama3.2') && (await page.locator('svg:visible animateMotion').count()) === 8)

  check(
    'built by: name, degree and GitHub link',
    (await page.isVisible('text=Jatin Mathur')) && (await page.isVisible('text=M.Sc. Software Engineering student')) && (await page.getAttribute('a:has-text("GitHub")', 'href')) === 'https://github.com/Jatin1Mathur',
  )
  check('magnetic buttons and cursor light are active with a mouse', (await page.locator('[data-magnetic]').count()) >= 2 && (await page.locator('[data-cursor-light]').count()) === 1)
})

test('touch device: no pointer effects, no sideways scrolling, no 3D code on the login page', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await context.newPage()
  await page.goto('/')
  await page.waitForSelector('h1:has-text("Know where you stand")')
  check('touch device: no magnetic buttons and no cursor light', (await page.locator('[data-magnetic]').count()) === 0 && (await page.locator('[data-cursor-light]').count()) === 0)
  check('touch device: home page without sideways scrolling', await noSidewaysScroll(page))
  await page.goto('/login')
  await page.waitForSelector('h1:has-text("Welcome back")')
  await page.waitForTimeout(1200)
  check('phone login: no side panel and no 3D code', (await page.locator('canvas').count()) === 0 && (await noSidewaysScroll(page)))
  await context.close()
})

test('reduced motion: still pictures instead of animations', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/')
  await page.waitForSelector('h1:has-text("Know where you stand")')
  check(
    'reduced motion: no magnetic buttons, no cursor light, no travelling dots',
    (await page.locator('[data-magnetic]').count()) === 0 && (await page.locator('[data-cursor-light]').count()) === 0 && (await page.locator('animateMotion').count()) === 0,
  )
  await page.click('[data-testid=demo-analyze]')
  await page.waitForSelector('[data-testid=demo-result][data-phase=done]')
  await page.waitForTimeout(300)
  check('reduced motion: the demo shows its score at once', ((await page.textContent('[data-testid=demo-result] [data-testid=score]')) ?? '').trim() === '82')

  await page.goto('/login')
  await page.waitForSelector('h1:has-text("Welcome back")')
  const tip = await page.textContent('[data-testid=tip]')
  await page.waitForTimeout(7600)
  check('reduced motion: login tips do not rotate by themselves, and the compass is a still picture', (await page.textContent('[data-testid=tip]')) === tip && (await page.locator('canvas').count()) === 0)
  await page.click('[aria-label="Next tip"]')
  await page.waitForTimeout(400)
  check('reduced motion: the next tip can be asked for', (await page.textContent('[data-testid=tip]')) !== tip)

  await page.goto('/')
  await page.waitForSelector('[data-story-art]')
  check(
    'reduced motion: a still picture for each of the three steps, and no 3D',
    (await page.locator('[data-story-art]').count()) === 3 && (await page.locator('canvas').count()) === 0 && (await page.locator('section[aria-labelledby=how-heading] li').count()) === 3,
  )
  await context.close()
})
