import type { AutonomyMode, CaseRecord, Recommendation, WorkflowRun } from './types'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Request failed with status ${response.status}.`
    throw new Error(message)
  }
  return body as T
}

export const api = {
  listCases: () => request<CaseRecord[]>('/api/cases'),
  getCase: (caseId: string) => request<CaseRecord>(`/api/cases/${encodeURIComponent(caseId)}`),
  startReview: (caseId: string, autonomyMode: AutonomyMode) =>
    request<WorkflowRun>(`/api/cases/${encodeURIComponent(caseId)}/review`, {
      method: 'POST',
      body: JSON.stringify({ autonomyMode }),
    }),
  recordDecision: (workflowId: string, decision: Recommendation) =>
    request<WorkflowRun>(`/api/workflows/${encodeURIComponent(workflowId)}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    }),
}
