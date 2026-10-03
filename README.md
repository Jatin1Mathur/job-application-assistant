# Job Application Assistant

A Spring Boot API to track job applications, upload a resume, and let a local AI model (Ollama) score how well the resume fits a job and write a cover letter.

## Running the app

1. Copy `.env.example` to `.env` and set your own values.
2. Start PostgreSQL and Redis: `docker compose up -d`
3. Start Ollama with the `llama3.2` model (only needed for the AI requests).
4. Start the app: `./mvnw spring-boot:run`

The backend runs on http://localhost:8080.

## Running the frontend

The frontend is a React + Vite + TypeScript app with Tailwind CSS in the `frontend` folder. It uses shadcn/ui components, Motion for animations, lucide icons and sonner toasts, and has a light and a dark mode. It needs Node.js 20.19 or newer.

1. Start the backend first (see above).
2. In a second terminal:
   ```
   cd frontend
   npm install   # only the first time
   npm run dev
   ```
3. Open http://localhost:5173 in your browser.

What you can do in the app:

- **Landing page** at `/` for visitors, with a sample analysis you can try without an account; logged-in users go straight to the dashboard.
- **Demo account**: "Try with demo account" on the login page opens a shared account with sample data (see below).
- **Dashboard** as a card list or a **Kanban board** with drag and drop between status columns.
- **Insights** with charts: applications by status, average match score, and the skills missing most often.
- **Application page**: AI match analysis, cover letter, and a **Compare** tab that shows the resume and the job description side by side with matching and missing skills marked.
- **3D scenes** (three.js, loaded only where they are shown): a leather backpack with orbiting skills on the landing page, a score orb on the application page and a skill universe on the insights page. Each has a static fallback for browsers without WebGL and for reduced motion.
- **Command palette** with `Cmd+K` / `Ctrl+K`, and keyboard shortcuts (press `?` to see them).

The dev server passes every `/api` call on to the backend on port 8080 (see `frontend/vite.config.ts`), so the backend needs no CORS settings.

## The demo account

When the backend starts, it creates one shared demo user (`demo@jobassistant.example`) with two sample resumes, six sample applications and five sample analyses. The sample analyses were written by hand and are labelled "sample data (not an AI result)".

- Visitors enter it with the "Try with demo account" button, which calls `POST /api/auth/demo`. No email or password is sent.
- The account has no password that anyone knows, and a normal login with its email is always refused.
- The sample data is put back when the backend starts and every night at 03:00 (`demo.reset-cron` in `application.yml`).
- The database refuses to delete the demo user or to change its email or password (trigger in migration `V5`).
- Set `demo.enabled: false` in `application.yml` to switch the demo account off.

## Design

- [DESIGN.md](DESIGN.md) is the design system: colors, typography, spacing, components, and do's and don'ts.
- [docs/design-decisions.md](docs/design-decisions.md) explains the audit, what was changed and why, and the trade-offs.
- [docs/screenshots](docs/screenshots) has every page before and after the redesign, in desktop and phone size, light and dark mode.

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
