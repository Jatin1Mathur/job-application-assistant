import { test } from '@playwright/test'
import { check, JOB_JAVA } from '../helpers.ts'

// How the login is protected: the token in an httpOnly cookie, the CSRF check, the rate limit on login attempts,
// and the separate way in for API clients.

const COOKIE = 'job_assistant_token'

test('the login token is in an httpOnly cookie that the page cannot read', async ({ page, context }) => {
  await page.goto('/login')
  await page.waitForSelector('h1:has-text("Welcome back")')
  const [response] = await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/auth/demo')), page.click('[data-testid=demo-login]')])
  const body = await response.text()
  await page.waitForSelector('[data-testid=demo-banner]')

  const cookie = (await context.cookies()).find((item) => item.name === COOKIE)
  check('login sets an httpOnly, SameSite=Strict cookie for /api', cookie !== undefined && cookie.httpOnly && cookie.sameSite === 'Strict' && cookie.path === '/api', JSON.stringify(cookie && { httpOnly: cookie.httpOnly, sameSite: cookie.sameSite, path: cookie.path }))
  check('the login answer does not contain the token', !body.includes('token') && cookie !== undefined && !body.includes(cookie.value))
  const visible = await page.evaluate((name) => ({ inCookie: document.cookie.includes(name), stored: Object.entries(localStorage).map(([key, value]) => key + '=' + value).join(' | ') }), COOKIE)
  check('JavaScript in the page cannot see the token: not in document.cookie, not in localStorage', !visible.inCookie && cookie !== undefined && !visible.stored.includes(cookie.value) && !visible.stored.includes('token'), visible.stored)

  // CSRF: a request that changes something needs the token from the XSRF-TOKEN cookie in a header
  const withoutHeader = await page.evaluate(async () => {
    const response = await fetch('/api/account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Someone' }) })
    return { status: response.status, message: (await response.json()).message as string }
  })
  check('a changing request without the CSRF header is refused with 403', withoutHeader.status === 403 && withoutHeader.message.includes('CSRF token'), JSON.stringify(withoutHeader))
  const wrongHeader = await page.evaluate(async () => (await fetch('/api/account', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': 'made-up' }, body: '{"name":"Someone"}' })).status)
  check('a made-up CSRF token is refused too', wrongHeader === 403)
  const reading = await page.evaluate(async () => (await fetch('/api/account')).status)
  check('reading needs no CSRF header', reading === 200)

  // Log out: only the backend can delete the cookie
  await page.click('[aria-label="Log out"]')
  await page.waitForSelector('h1:has-text("Welcome back")')
  await page.waitForTimeout(500)
  const afterLogout = await page.evaluate(async () => (await fetch('/api/account')).status)
  check('after logging out the cookie is gone and the API answers 401', (await context.cookies()).every((item) => item.name !== COOKIE) && afterLogout === 401)
})

test('too many login attempts for one email are answered with 429', async ({ request }) => {
  const email = `e2e-test-limit-${Date.now()}@example.com`
  const statuses: number[] = []
  let last = { retryAfter: '', message: '' }
  // The limit is 10 attempts in 5 minutes per email. The 11th must be refused, whatever the password.
  for (let attempt = 1; attempt <= 11; attempt++) {
    const response = await request.post('/api/auth/login', { data: { email, password: 'wrong-password' } })
    statuses.push(response.status())
    if (response.status() === 429) last = { retryAfter: response.headers()['retry-after'] ?? '', message: (await response.json()).message }
  }
  check('the first ten attempts get the normal answer (401)', statuses.slice(0, 10).every((status) => status === 401), statuses.join(','))
  check('the eleventh attempt gets 429 with Retry-After and a clear message', statuses[10] === 429 && Number(last.retryAfter) > 0 && last.message.startsWith('Too many login attempts for this email. Please wait'), JSON.stringify(last))
  const other = await request.post('/api/auth/login', { data: { email: `other-${email}`, password: 'wrong-password' } })
  check('another email is not affected', other.status() === 401)
})

test('API clients log in at /api/auth/token and send the token in a header, without cookie or CSRF token', async ({ playwright, baseURL }) => {
  // A client with no cookie jar shared with the browser, like Postman or a script
  const client = await playwright.request.newContext({ baseURL })
  const email = `e2e-test-api-${Date.now()}@example.com`
  const password = 'E2e-Test-' + Math.random().toString(36).slice(2, 10)
  const registered = await client.post('/api/auth/register', { data: { email, password } })
  const login = await client.post('/api/auth/token', { data: { email, password } })
  const { token } = await login.json()
  check('the token endpoint returns the token in the body and sets no login cookie', registered.status() === 201 && login.status() === 200 && typeof token === 'string' && !(login.headers()['set-cookie'] ?? '').includes(COOKIE))

  const bearer = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Authorization: `Bearer ${token}` } })
  const account = await bearer.get('/api/account')
  const created = await bearer.post('/api/applications', { data: { companyName: 'TechNova', jobTitle: 'Java Backend Developer', jobDescription: JOB_JAVA } })
  check('with the Authorization header, reading and changing both work', account.status() === 200 && (await account.json()).email === email && created.status() === 201)
  const anonymous = await client.get('/api/account')
  check('without a token the API answers 401', anonymous.status() === 401)
  await client.dispose()
  await bearer.dispose()
})
