# Job Application Assistant

[![CI](https://github.com/Jatin1Mathur/job-application-assistant/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Jatin1Mathur/job-application-assistant/actions/workflows/ci.yml)

A Spring Boot API to track job applications, upload a resume, and let a local AI model (Ollama) score how well the resume fits a job and write a cover letter.

## Running the app

You need Docker (Docker Desktop on a Mac) and Ollama with the `llama3.2` model. Ollama runs on your own machine, not in Docker; it is only needed for the AI requests.

1. Copy `.env.example` to `.env` and set your own values (only the first time).
2. Start everything with one command, from the project folder:
   ```
   docker compose up --build
   ```
3. Open http://localhost:3000 in your browser.

Stop it with `Ctrl+C`, or with `docker compose down` from a second terminal. Your data stays in a Docker volume and is there again at the next start. Add `-d` (`docker compose up --build -d`) to run it in the background.

What the command starts:

| Container | Address | What it is |
|---|---|---|
| frontend | http://localhost:3000 | nginx with the built React app; passes every `/api` call on to the backend |
| backend | http://localhost:8080 | Spring Boot (for Postman) |
| postgres | localhost:5432 | Database |
| redis | localhost:6380 | Cache |

The backend starts only after the database and the cache answer their health checks, and the frontend starts only after the backend is healthy. The backend reaches Ollama on your machine through `host.docker.internal`.

### Working on the code

For development it is quicker to run the backend and the frontend directly, so changes show up at once. Docker then only runs the database and the cache:

```
docker compose up -d postgres redis
./mvnw spring-boot:run          # backend on http://localhost:8080
cd frontend && npm install && npm run dev   # frontend on http://localhost:5173
```

The frontend is a React + Vite + TypeScript app with Tailwind CSS in the `frontend` folder. It uses shadcn/ui components, Motion for animations, lucide icons and sonner toasts, and has a light and a dark mode. It needs Node.js 20.19 or newer. The dev server passes every `/api` call on to the backend on port 8080 (see `frontend/vite.config.ts`), so the backend needs no CORS settings.

### How the images are built (multi-stage build)

Both `Dockerfile`s have two stages. The first stage has all the tools needed to build: the JDK and Maven for the backend, Node.js for the frontend. The second stage starts from a small image and copies in only the finished result: the jar file, or the built HTML, CSS and JavaScript files. The tools and the source code stay behind in the first stage and are not part of the image that runs. That makes the final images small (backend: 448 MB instead of the 1.09 GB of its build stage; frontend: 87 MB instead of 1.34 GB) and leaves less inside them that could be attacked. Both run as a normal user, not as root.

### Continuous integration (CI)

On every push and every pull request, GitHub Actions runs `.github/workflows/ci.yml` on a fresh machine:

- **Backend tests**: `./mvnw test`, with a real PostgreSQL and Redis started next to the job
- **Frontend build and lint**: `npm ci`, `npm run lint`, `npm run build`
- **Docker images**: builds both images, to prove the Dockerfiles work

The badge at the top of this file shows the result for `main`.

## What you can do in the app

- **Landing page** at `/` for visitors, with a sample analysis you can try without an account; logged-in users go straight to the dashboard.
- **Demo account**: "Try with demo account" on the login page opens a shared account with sample data (see below).
- **Dashboard** with a greeting, four numbers with their trend, a list of next actions and an activity calendar; below it the applications as a card list or a **Kanban board** with drag and drop, a count per column and "days in this stage" on each card.
- **Insights** with charts: applications by status, the funnel from saved to offer, match score over time, skills by category, the best resume, and the skills missing most often.
- **Resumes** with a preview picture of the first page, the skills found in the text, and a side-by-side comparison of two resumes.
- **Application page**: AI match analysis, cover letter in three tones (formal, friendly, short) with regenerate and PDF export, a status timeline, notes and an interview date, and a **Compare** tab that shows the resume and the job description side by side with matching and missing skills marked.
- **3D scenes** (three.js, loaded only where they are shown): a leather backpack with orbiting skills on the landing page, a compass on the login page, a score orb on the application page and a skill universe on the insights page. Each has a static fallback for browsers without WebGL and for reduced motion.
- **Command palette** with `Cmd+K` / `Ctrl+K`, and keyboard shortcuts (press `?` to see them).

## API added in step 17

| Request | What it does |
|---|---|
| `GET /api/dashboard?zone=Europe/Berlin` | Counts, interview rate, average score, applications per day and per week for the last 12 weeks, and next actions |
| `GET /api/insights?zone=...` | Now also: funnel, score per week, skills by category, score per resume |
| `PATCH /api/applications/{id}/details` | Notes and interview date (`{"notes": "...", "interviewAt": "2026-10-06T09:00:00Z"}`) |
| `POST /api/applications/{id}/cover-letter?resumeId=1&tone=friendly` | Tone is `formal` (default), `friendly` or `short` |
| `GET /api/applications/{id}/cover-letter.pdf` | The stored cover letter as a PDF |
| `GET /api/resumes/{id}/file` | The uploaded PDF |
| `GET /api/account`, `PATCH /api/account` | Email and the optional name (`{"name": "Jatin"}`) |

`GET /api/applications/{id}` now includes `statusHistory`, `notes`, `interviewAt`, `statusChangedAt` and `coverLetterTone`. Registration accepts an optional `name`.

## The demo account

When the backend starts, it creates one shared demo user (`demo@jobassistant.example`) with two sample resumes, eight sample applications with a status history, notes and an interview date, and seven sample analyses. The sample analyses were written by hand and are labelled "sample data (not an AI result)".

- Visitors enter it with the "Try with demo account" button, which calls `POST /api/auth/demo`. No email or password is sent.
- The account has no password that anyone knows, and a normal login with its email is always refused.
- The sample data is put back when the backend starts and every night at 03:00 (`demo.reset-cron` in `application.yml`).
- The database refuses to delete the demo user or to change its email or password (trigger in migration `V5`).
- Set `demo.enabled: false` in `application.yml` to switch the demo account off.

## Design

- [DESIGN.md](DESIGN.md) is the design system: colors, typography, spacing, components, and do's and don'ts.
- [docs/design-decisions.md](docs/design-decisions.md) explains the audit, what was changed and why, and the trade-offs.
- [docs/screenshots](docs/screenshots) has every page before and after the redesign, in desktop and phone size, light and dark mode. The pictures are WebP files, which keeps the repository small.

## Testing with Postman

A ready-made collection is in [`postman/Job-Application-Assistant.postman_collection.json`](postman/Job-Application-Assistant.postman_collection.json).

1. In Postman choose **Import** and select that file.
2. Run the requests in this order the first time:
   1. **Auth → Register** (change the email and password in the body first)
   2. **Auth → Login** (same email and password)
   3. **Resumes → Upload resume** (pick your PDF in the Body tab)
   4. **Applications → Create application**
3. After that, every other request works in any order.

You do not need to copy anything by hand. Login saves the `token`, Upload resume saves `resumeId`, and Create application saves `applicationId` as collection variables, and the other requests use them. The token is sent automatically as a Bearer token on every request except Health, Register and Login.

The token is valid for 24 hours. If you get a 401, run **Login** again. If the app runs somewhere else, change the `baseUrl` collection variable.
