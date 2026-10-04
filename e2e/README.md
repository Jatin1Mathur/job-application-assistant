# Browser tests

These tests drive the running app in a real browser, the way a user would: 24 tests with 158 checks, written with [Playwright](https://playwright.dev).

| File | What it covers |
|---|---|
| `tests/01-public-pages.spec.ts` | Landing page: 3D hero, scroll story, sample demo, letter slider, architecture diagram. Touch devices and reduced motion. |
| `tests/02-user-journey.spec.ts` | One new user from sign-up to delete: resume upload, application, AI analysis, cover letter (tone, regenerate, PDF export), timeline, notes, board with drag and drop, insights, command palette, shortcuts, dark mode, phone width, keyboard focus, and the fallbacks without WebGL. |
| `tests/03-demo-account.spec.ts` | The login page with its compass, and the demo account with its sample data. |
| `tests/04-security.spec.ts` | The login protection: the httpOnly cookie, the CSRF check, the rate limit on login attempts (429), and the way in for API clients. |

Each `check(...)` in the tests is one named check. A failed check is reported and the test continues, so one run shows everything that is wrong.

## Run them

The tests do not start the app. Start it first, then run the tests from this folder.

**With the stand-in for the AI model** (no Ollama needed, about one and a half minutes; this is what CI does):

```
# from the project folder
docker compose -f docker-compose.yml -f e2e/docker-compose.e2e.yml up --build -d

cd e2e
npm install                        # only the first time
npx playwright install chromium    # only the first time
npm test
```

**With the real AI model** (Ollama with `llama3.2` must be running; slower, and the answers differ from run to run):

```
docker compose up --build -d
cd e2e && npm test
```

To go back from the stand-in to the real model, run `docker compose up -d` again in the project folder.

Useful options:

- `npm run test:headed` shows the browser while the tests run.
- `npx playwright test tests/01-public-pages.spec.ts` runs one file.
- `E2E_BASE_URL=http://localhost:5173 npm test` runs against the Vite dev server instead of the Docker frontend.
- After a failure, `npx playwright show-trace test-results/<folder>/trace.zip` replays what happened step by step.

## What is replaced in CI, and what is not

There is no AI model on the CI machine. So in CI, and in the first command above, one thing is replaced: **the language model itself**. `mock-ollama.mjs` is a small server that answers the two requests the backend sends to Ollama with fixed, predictable text.

- The analysis: it looks for well-known skill names in the job description and in the resume, and builds the answer from that.
- The cover letter: a fixed letter, shorter when the "short" tone is asked for.

Everything else is real: the backend builds the prompt, checks and stores the answer and caches it in Redis; PostgreSQL, nginx and the frontend are the same containers as in normal use. What these tests therefore do **not** prove is the quality of the real model's answers. The run with the real model (second command above) covers that.

## Good to know

- Every run creates one user named `e2e-test-<number>@example.com`. To remove them from a local database:
  `docker exec jobassistant-postgres psql -U jobuser -d jobassistant -c "delete from users where email like 'e2e-test-%'"`
- The demo account test expects the sample data as the backend seeds it. If the demo data was changed by hand, restart the backend (`docker compose restart backend`) to put it back.
- The 3D scenes run on software rendering in the test browser, so the tests also work on machines without a graphics card.
- The resume used in the tests is a made-up person. The PDF is built by the test itself (`makePdf` in `helpers.ts`); there is no binary file in the repository.
