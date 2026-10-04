import { test } from '@playwright/test'
import { check } from '../helpers.ts'

// The shared demo account: entered with one click, filled with sample data for every feature.
// These checks expect the sample data as the backend seeds it (at start-up and every night). If someone has
// changed the demo data since, restart the backend to put it back.

test('login page: 3D compass, rotating tips, and the demo account with its sample data', async ({ page }) => {
  await page.goto('/login')
  await page.waitForSelector('[data-3d=on] canvas', { timeout: 30000 })
  const firstTip = await page.textContent('[data-testid=tip]')
  await page.waitForTimeout(7800)
  check(
    'login: 3D compass in the side panel (still searching), tips rotate',
    (await page.textContent('[data-testid=tip]')) !== firstTip && ((await page.getAttribute('[data-3d]', 'aria-label')) ?? '').includes('still searching'),
  )

  await page.click('[data-testid=demo-login]')
  await page.waitForSelector('[data-testid=auth-success]')
  check('demo login: success message without email or password', ((await page.textContent('[data-testid=auth-success]')) ?? '').includes('Welcome to the demo account'))
  check('successful login: the compass needle turns to north', ((await page.getAttribute('[data-3d]', 'aria-label')) ?? '').includes('points north'))
  await page.waitForSelector('[data-testid=demo-banner]')
  await page.waitForSelector('text=Nordlicht Software')
  await page.waitForTimeout(1200)
  check(
    'demo account: banner and sample applications',
    ((await page.textContent('[data-testid=demo-banner]')) ?? '').includes('put back every night') && (await page.isVisible('text=Tintenfass Verlag')) && (await page.isVisible('text=Bergwind Cloud')),
  )

  // Every feature has sample data in the demo account
  const text = async (selector: string) => (await page.textContent(selector)) ?? ''
  check('demo dashboard: greeting with the name', /^Good (morning|afternoon|evening), Alex$/.test((await text('[data-testid=greeting]')).trim()))
  check(
    'demo dashboard: four stat cards',
    (await text('[data-testid=stat-applications]')).includes('8') &&
      (await text('[data-testid=stat-sent]')).includes('6') &&
      (await text('[data-testid=stat-interview-rate]')).includes('2 of 6 sent led to an interview') &&
      (await text('[data-testid=stat-average-score]')).includes('from 7 analyses'),
  )
  const actionTypes = await page.locator('[data-testid=next-actions] a').evaluateAll((links) => links.map((link) => (link as HTMLElement).dataset.action))
  check('demo dashboard: next actions in order of urgency', JSON.stringify(actionTypes) === JSON.stringify(['INTERVIEW_SOON', 'FOLLOW_UP', 'FOLLOW_UP', 'ANALYZE']), actionTypes.join(', '))
  check(
    'demo dashboard: heatmap with 8 active days over 12 weeks',
    (await page.locator('[data-testid=heatmap] [data-count]:not([data-count="0"])').count()) === 8 && (await page.locator('[data-testid=heatmap] [data-count]').count()) >= 78,
  )

  await page.click('[role=tab]:has-text("Board")')
  await page.waitForSelector('[data-testid=board-column-APPLIED]')
  await page.waitForTimeout(600)
  const ages = await page.locator('[data-testid=board-column-APPLIED] [data-testid=stage-age]').allTextContents()
  check(
    'board: count per column and days in the stage on every card',
    (await page.getAttribute('[data-testid=board-column-APPLIED]', 'aria-label')) === 'Applied, 2 applications' && ages.length === 2 && ages.every((age) => /\d+ days/.test(age)),
    ages.join(' | '),
  )
  await page.click('[role=tab]:has-text("List")')
  await page.waitForSelector('text=Nordlicht Software')
  await page.click('[data-testid=application-list] >> text=Nordlicht Software')
  await page.waitForSelector('text=sample data (not an AI result)')
  check('demo account: analyses are labelled as sample data, not as AI results', true)
  check(
    'demo detail: timeline with three steps, notes and an interview date',
    (await page.locator('[data-testid=status-timeline] li').count()) === 3 && (await page.inputValue('#notes')).includes('Second round') && (await page.inputValue('#interview-at')) !== '',
  )

  await page.goto('/insights')
  await page.waitForSelector('[data-testid=funnel]')
  await page.waitForTimeout(900)
  const funnel = await page.locator('[data-testid=funnel] li').allTextContents()
  check(
    'insights: funnel with counts and conversion rates',
    funnel.length === 4 && funnel[0].includes('8') && funnel[1].includes('75% of saved were sent') && funnel[2].includes('33% of sent led to an interview') && funnel[3].includes('50% of interviews led to an offer'),
  )
  await page.locator('[data-testid=trend-chart]').scrollIntoViewIfNeeded()
  await page.waitForTimeout(900)
  check('insights: score over time, one point per week with analyses', (await page.locator('[data-testid=trend-chart] .recharts-line-dot').count()) >= 4)
  check(
    'insights: radar chart by category, with the same numbers as text',
    (await page.locator('[data-testid=radar-chart] .recharts-polar-angle-axis-tick').count()) >= 5 && (await text('[data-testid=category-list]')).includes('Cloud and DevOps'),
  )
  const best = await text('[data-testid=best-resume]')
  check('insights: best resume card', best.includes('sample-resume-alex-example.pdf') && best.includes('from 5 analyses') && best.includes('sample-resume-short-version.pdf'))
  check('insights: charts are fully shown after they appeared', await page.locator('[data-testid=trend-chart]').evaluate((el) => getComputedStyle(el).opacity === '1'))

  await page.goto('/resumes')
  await page.waitForSelector('text=sample-resume-alex-example.pdf')
  check('demo account: sample resumes', await page.isVisible('text=sample-resume-short-version.pdf'))
  await page.waitForFunction(() => document.querySelectorAll('[data-testid=resume-thumbnail][data-state=ready]').length === 2, null, { timeout: 30000 })
  const inked = await page.locator('[data-testid=resume-thumbnail] canvas').first().evaluate((canvas: HTMLCanvasElement) => {
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
    let count = 0
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] < 235) count++
    return count
  })
  check('resumes: PDF preview thumbnails are drawn by pdf.js', inked > 50, `${inked} non-white pixels on the first page`)
  check('resumes: detected skills as tags', (await page.locator('ul[aria-label="Skills found in sample-resume-alex-example.pdf"] li').allTextContents()).includes('Spring Boot'))
  check('resumes: compare view is closed until two are ticked', (await page.locator('[data-testid=resume-compare]').count()) === 0)
  for (const box of await page.locator('input[type=checkbox]').all()) await box.check()
  await page.waitForSelector('[data-testid=resume-compare]')
  await page.waitForTimeout(800)
  const compare = await text('[data-testid=resume-compare]')
  check('resumes: compare shows both scores and which skills only one has', compare.includes('76.8') && compare.includes('46') && compare.includes('Only in A') && compare.includes('PostgreSQL') && compare.includes('In both'))

  const lockedName = await page.evaluate(() =>
    fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('job-assistant.token') },
      body: JSON.stringify({ name: 'Someone' }),
    }).then((response) => response.status),
  )
  check('demo account keeps its name', lockedName === 403)
  const passwordLogin = await page.evaluate(() =>
    fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@jobassistant.example', password: 'demo' }) }).then((response) => response.status),
  )
  check('demo account cannot be entered with a password', passwordLogin === 401)
})
