export type Severity = 'low' | 'medium' | 'high'
export type AutonomyMode = 'HUMAN_APPROVAL_REQUIRED' | 'REVIEW_ON_EXCEPTION'
export type WorkflowStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'AWAITING_HUMAN_APPROVAL'
  | 'MANUAL_REVIEW'
  | 'COMPLETED'
  | 'FAILED'
export type Recommendation = 'APPROVE' | 'REJECT' | 'REFER'

export interface PostalAddress {
  line1: string
  line2?: string
  city: string
  state?: string
  postalCode: string
  country: string
}

export interface OnboardingCase {
  caseId: string
  customer: {
    customerId: string
    fullName: string
    dateOfBirth: string
    email?: string
    phoneNumber?: string
    residentialAddress: PostalAddress
  }
  identityDocument: {
    type: string
    documentNumber: string
    fullName: string
    dateOfBirth?: string
    issuingCountry: string
    expiryDate?: string
    isValid: boolean
  }
  addressProof: {
    type: string
    address: PostalAddress
    issueDate: string
    expiryDate?: string
    isValid: boolean
  }
  employment: {
    status: string
    employerName?: string
    jobTitle?: string
    annualIncome?: number
  }
  company?: {
    legalName: string
    registrationNumber?: string
    country: string
    isRegistered: boolean
    isSanctioned: boolean
  }
  riskIndicators: Array<{
    code: string
    description: string
    severity: Severity
    isActive: boolean
  }>
  submittedAt: string
}

export interface Finding {
  code: string
  message: string
  severity: Severity
  confidence: number
}

export interface AgentResult {
  id: string
  agentName: string
  attempt: number
  status: 'COMPLETED' | 'FAILED'
  findings: Finding[]
  confidence: number
  output: unknown | null
  error: { code: string; message: string; retryable: boolean } | null
  createdAt: string
}

export interface TraceEvent {
  step: string
  status: 'STARTED' | 'COMPLETED' | 'FAILED' | 'RETRYING'
  message: string
  occurredAt: string
}

export interface WorkflowRun {
  id: string
  status: WorkflowStatus
  autonomyMode: AutonomyMode
  recommendation: Recommendation | null
  explanation: string | null
  confidence: number | null
  trace: TraceEvent[]
  createdAt: string
  updatedAt: string
  agentResults: AgentResult[]
}

export interface CaseRecord {
  id: string
  payload: OnboardingCase
  createdAt: string
  updatedAt: string
  workflowRuns: WorkflowRun[]
}
