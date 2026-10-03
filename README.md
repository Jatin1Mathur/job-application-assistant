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

The dev server passes every `/api` call on to the backend on port 8080 (see `frontend/vite.config.ts`), so the backend needs no CORS settings.

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
