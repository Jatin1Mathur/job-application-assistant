import type { ApplicationStatus } from '../api.ts'

// "INTERVIEW" -> "Interview"
export function statusLabel(status: ApplicationStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase()
}
