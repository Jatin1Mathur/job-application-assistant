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
}

export interface MatchAnalysis {
  matchScore: number
  matchingSkills: string[]
  missingSkills: string[]
  resumeTips: string[]
}

export interface LoginResult {
  token: string
  tokenType: string
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

const TOKEN_KEY = 'job-assistant.token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

// Called when the backend says the token is no longer valid, so the app can log the user out
let onSessionExpired: () => void = () => {}

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler
}

async function send(path: string, init: RequestInit = {}): Promise<{ data: unknown; response: Response }> {
  const headers = new Headers(init.headers)
  const token = tokenStore.get()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  // For file uploads (FormData) the browser sets the Content-Type itself
  if (typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(`/api${path}`, { ...init, headers })
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
    if (response.status === 401 && token && !path.startsWith('/auth/')) {
      onSessionExpired()
    }
    throw new ApiError(
      response.status,
      backendMessage ?? 'The server did not answer properly. Check that the backend is running on port 8080.',
    )
  }
  return { data, response }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return (await send(path, init)).data as T
}

export const api = {
  register: (email: string, password: string) =>
    request<{ id: number; email: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<LoginResult>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  listResumes: () => request<ResumeSummary[]>('/resumes'),

  getResume: (id: number) => request<Resume>(`/resumes/${id}`),

  getInsights: () => request<Insights>('/insights'),

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

  generateCoverLetter: (id: number, resumeId: number) =>
    request<{ applicationId: number; coverLetter: string }>(`/applications/${id}/cover-letter?resumeId=${resumeId}`, {
      method: 'POST',
    }),
}

// Turns anything that was thrown into a message for the user
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
