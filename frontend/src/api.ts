// All calls to the backend go through this file.

export type ApplicationStatus = 'SAVED' | 'APPLIED' | 'INTERVIEW' | 'OFFER' | 'REJECTED'

export const STATUSES: ApplicationStatus[] = ['SAVED', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED']

// The full AI analysis the backend stores for an application
export interface SavedAnalysis extends MatchAnalysis {
  modelName: string
  analyzedAt: string
  resumeId: number | null
}

export interface Insights {
  totalApplications: number
  applicationsByStatus: Record<ApplicationStatus, number>
  analyzedApplications: number
  averageMatchScore: number | null
  topMissingSkills: { skill: string; applications: number }[]
  // How many applications ever reached each stage. rateFromPrevious: percent of the stage before, or null
  funnel: { stage: ApplicationStatus; applications: number; rateFromPrevious: number | null }[]
  // Only weeks in which something was analyzed
  scoreByWeek: { weekStart: string; averageScore: number; analyses: number }[]
  skillCategories: { category: string; matching: number; missing: number; matchRate: number }[]
  // Best first
  scoreByResume: { resumeId: number; fileName: string; analyses: number; averageScore: number }[]
}

export type CoverLetterTone = 'FORMAL' | 'FRIENDLY' | 'SHORT'

export const TONES: { value: CoverLetterTone; label: string; hint: string }[] = [
  { value: 'FORMAL', label: 'Formal', hint: 'Full sentences, no contractions' },
  { value: 'FRIENDLY', label: 'Friendly', hint: 'Warm and personal' },
  { value: 'SHORT', label: 'Short', hint: 'About 120 words' },
]

export interface StatusChange {
  // null for the first entry: the application was created
  fromStatus: ApplicationStatus | null
  toStatus: ApplicationStatus
  changedAt: string
}

export type NextActionType = 'INTERVIEW_SOON' | 'FOLLOW_UP' | 'ANALYZE'

export interface NextAction {
  type: NextActionType
  applicationId: number
  companyName: string
  jobTitle: string
  date: string
  days: number
}

export interface WeekSummary {
  weekStart: string
  created: number
  applied: number
  interviews: number
  averageScore: number | null
}

// Everything above the list of applications on the dashboard. Rates and averages are null when there is
// nothing to calculate them from.
export interface Dashboard {
  name: string | null
  totalApplications: number
  applicationsByStatus: Record<ApplicationStatus, number>
  appliedApplications: number
  interviewApplications: number
  interviewRate: number | null
  analyzedApplications: number
  averageScore: number | null
  days: { date: string; applications: number }[]
  weeks: WeekSummary[]
  nextActions: NextAction[]
}

export interface Resume {
  id: number
  fileName: string
  createdAt: string
  extractedText: string
}

export interface Application {
  id: number
  companyName: string
  jobTitle: string
  jobDescription: string
  status: ApplicationStatus
  matchScore: number | null
  coverLetter: string | null
  createdAt: string
  updatedAt: string
  analysis: SavedAnalysis | null
  notes: string | null
  interviewAt: string | null
  // When the application got its current status
  statusChangedAt: string
  coverLetterTone: CoverLetterTone | null
  // Filled when one application is loaded; empty in lists
  statusHistory: StatusChange[]
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface ResumeSummary {
  id: number
  fileName: string
  createdAt: string
  textPreview: string
  // Skills of the built-in skill list that appear in the text of the resume
  detectedSkills: string[]
  // False for resumes uploaded before the PDF itself was stored: they have no preview picture
  hasFile: boolean
}

export interface MatchAnalysis {
  matchScore: number
  matchingSkills: string[]
  missingSkills: string[]
  resumeTips: string[]
}

// Who is logged in after a login. The token is not part of the answer: it is set as an httpOnly cookie.
export interface Session {
  email: string
  name: string | null
  demo: boolean
  expiresInSeconds: number
}

// An error answer from the backend. `message` is the backend's own text, ready to show to the user
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// The login token itself is in an httpOnly cookie that this code cannot read (and neither can a script that
// someone manages to inject into the page). The browser attaches the cookie to every /api request by itself.
//
// What is kept here is only a note for the page: "this browser is probably logged in, as this email". It is not a
// secret and proves nothing; the backend decides on every request whether the cookie is valid.
const EMAIL_KEY = 'job-assistant.email'

export const sessionHint = {
  get: () => localStorage.getItem(EMAIL_KEY),
  set: (email: string) => localStorage.setItem(EMAIL_KEY, email),
  clear: () => localStorage.removeItem(EMAIL_KEY),
}

// The backend hands out a CSRF token in a cookie the page may read (XSRF-TOKEN). Every request that changes
// something sends it back in a header. Another website cannot read the cookie, so it cannot send the header,
// and so it cannot make this browser change anything in the user's name.
function csrfToken(): string | null {
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function withCsrf(headers: Headers, method: string | undefined): Headers {
  const token = csrfToken()
  if (token && method && method.toUpperCase() !== 'GET') {
    headers.set('X-XSRF-TOKEN', token)
  }
  return headers
}

// Called when the backend says the login is no longer valid, so the app can log the user out
let onSessionExpired: () => void = () => {}

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler
}

async function send(path: string, init: RequestInit = {}): Promise<{ data: unknown; response: Response }> {
  const headers = withCsrf(new Headers(init.headers), init.method)
  // For file uploads (FormData) the browser sets the Content-Type itself
  if (typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    // same-origin: the browser sends the login cookie along, but only to this site
    response = await fetch(`/api${path}`, { ...init, headers, credentials: 'same-origin' })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check that the backend is running.')
  }

  const text = await response.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    // Not JSON (for example an error page from the dev server); handled below
  }

  if (!response.ok) {
    const backendMessage = (data as { message?: string } | null)?.message
    if (response.status === 401 && sessionHint.get() && !path.startsWith('/auth/')) {
      onSessionExpired()
    }
    throw new ApiError(
      response.status,
      backendMessage ?? 'The server did not answer properly. Check that the backend is running on port 8080.',
    )
  }
  return { data, response }
}

// A file from the backend (a PDF). Errors come back as JSON, like everywhere else.
async function download(path: string): Promise<Blob> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, { credentials: 'same-origin' })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check that the backend is running.')
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null
    if (response.status === 401 && sessionHint.get()) onSessionExpired()
    throw new ApiError(response.status, data?.message ?? 'The file could not be loaded.')
  }
  return response.blob()
}

function timeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return (await send(path, init)).data as T
}

export const api = {
  register: (email: string, password: string, name?: string) =>
    request<{ id: number; email: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name: name?.trim() || null }),
    }),

  // The name shown in the greeting. An empty name removes it.
  updateName: (name: string) =>
    request<{ email: string; name: string | null; demo: boolean }>('/account', { method: 'PATCH', body: JSON.stringify({ name }) }),

  // The browser's time zone is sent along, so "today" and the weeks are the user's, not the server's
  getDashboard: () => request<Dashboard>(`/dashboard?zone=${encodeURIComponent(timeZone())}`),

  login: (email: string, password: string) =>
    request<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // "Try with demo account": no email and no password, the backend logs this browser in as the shared demo user
  demoLogin: () => request<Session>('/auth/demo', { method: 'POST' }),

  // Only the backend can delete the httpOnly cookie
  logout: () => request<void>('/auth/logout', { method: 'POST' }),

  // Who the login cookie belongs to. 401 if there is none or it has expired.
  getAccount: () => request<{ email: string; name: string | null; demo: boolean }>('/account'),

  listResumes: () => request<ResumeSummary[]>('/resumes'),

  getResume: (id: number) => request<Resume>(`/resumes/${id}`),

  getInsights: () => request<Insights>(`/insights?zone=${encodeURIComponent(timeZone())}`),

  // The uploaded PDF itself, for the preview picture
  getResumeFile: (id: number) => download(`/resumes/${id}/file`),

  uploadResume: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<ResumeSummary>('/resumes', { method: 'POST', body: form })
  },

  listApplications: (status: ApplicationStatus | null, page: number, size: number) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (status) {
      params.set('status', status)
    }
    return request<Page<Application>>(`/applications?${params}`)
  },

  getApplication: (id: number) => request<Application>(`/applications/${id}`),

  createApplication: (body: { companyName: string; jobTitle: string; jobDescription: string }) =>
    request<Application>('/applications', { method: 'POST', body: JSON.stringify(body) }),

  updateStatus: (id: number, status: ApplicationStatus) =>
    request<Application>(`/applications/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // `cached` is true when the backend answered from its Redis cache (X-Cache: HIT) instead of asking the AI
  analyze: async (id: number, resumeId: number) => {
    const { data, response } = await send(`/applications/${id}/analyze?resumeId=${resumeId}`, { method: 'POST' })
    return { analysis: data as MatchAnalysis, cached: response.headers.get('X-Cache') === 'HIT' }
  },

  deleteApplication: (id: number) => request<void>(`/applications/${id}`, { method: 'DELETE' }),

  // Calling it again writes a new letter ("regenerate")
  generateCoverLetter: (id: number, resumeId: number, tone: CoverLetterTone = 'FORMAL') =>
    request<{ applicationId: number; coverLetter: string; tone: CoverLetterTone }>(
      `/applications/${id}/cover-letter?resumeId=${resumeId}&tone=${tone}`,
      { method: 'POST' },
    ),

  // The stored cover letter as a PDF file
  getCoverLetterPdf: (id: number) => download(`/applications/${id}/cover-letter.pdf`),

  // Notes and interview date. null removes the value.
  updateDetails: (id: number, body: { notes: string | null; interviewAt: string | null }) =>
    request<Application>(`/applications/${id}/details`, { method: 'PATCH', body: JSON.stringify(body) }),
}

// Turns anything that was thrown into a message for the user
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
