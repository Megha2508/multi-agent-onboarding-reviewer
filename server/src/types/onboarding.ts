export type Severity = 'low' | 'medium' | 'high'

export type AutonomyMode = 'HUMAN_APPROVAL_REQUIRED' | 'REVIEW_ON_EXCEPTION'

export type WorkflowStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'AWAITING_HUMAN_APPROVAL'
  | 'MANUAL_REVIEW'
  | 'COMPLETED'
  | 'FAILED'

export interface PostalAddress {
  line1: string
  line2?: string
  city: string
  state?: string
  postalCode: string
  country: string
}

export interface CustomerProfile {
  customerId: string
  fullName: string
  dateOfBirth: string
  residentialAddress: PostalAddress
  email?: string
  phoneNumber?: string
}

export interface IdentityDocumentDetails {
  type: 'passport' | 'national_id' | 'drivers_license'
  documentNumber: string
  fullName: string
  dateOfBirth?: string
  issuingCountry: string
  expiryDate?: string
  isValid: boolean
}

export interface AddressProofDetails {
  type: 'utility_bill' | 'bank_statement' | 'government_letter' | 'lease_agreement'
  address: PostalAddress
  issueDate: string
  expiryDate?: string
  isValid: boolean
}

export interface EmploymentDetails {
  status: 'employed' | 'self_employed' | 'unemployed' | 'retired' | 'student'
  employerName?: string
  jobTitle?: string
  annualIncome?: number
}

export interface CompanyDetails {
  legalName: string
  registrationNumber?: string
  country: string
  isRegistered: boolean
  isSanctioned: boolean
}

export interface RiskIndicator {
  code: string
  description: string
  severity: Severity
  isActive: boolean
}

export interface OnboardingCase {
  caseId: string
  customer: CustomerProfile
  identityDocument: IdentityDocumentDetails
  addressProof: AddressProofDetails
  employment: EmploymentDetails
  company?: CompanyDetails
  riskIndicators: RiskIndicator[]
  submittedAt: string
}

export interface AgentFinding {
  code: string
  message: string
  severity: Severity
  confidence: number
}

export type AgentExecutionStatus = 'completed' | 'failed'

export interface AgentExecutionError {
  code: string
  message: string
  retryable: boolean
}

export interface AgentExecutionResult<TOutput> {
  agentName: string
  status: AgentExecutionStatus
  findings: AgentFinding[]
  confidence: number
  output?: TOutput
  error?: AgentExecutionError
}

export type FinalRecommendationDecision = 'APPROVE' | 'REJECT' | 'REFER'

export interface FinalRecommendation {
  decision: FinalRecommendationDecision
  rationale: string
  confidence: number
  requiredActions: string[]
}

export interface WorkflowState {
  case: OnboardingCase
  autonomyMode: AutonomyMode
  status: WorkflowStatus
  identityResult?: AgentExecutionResult<IdentityAssessment>
  addressResult?: AgentExecutionResult<AddressAssessment>
  riskResult?: AgentExecutionResult<RiskAssessment>
  finalRecommendation?: FinalRecommendation
}

export interface ExecutionTraceEvent {
  step: string
  status: 'STARTED' | 'COMPLETED' | 'FAILED' | 'RETRYING'
  message: string
  occurredAt: string
}

export interface AgentExecutionAttempt {
  agentName: string
  attempt: number
  result: AgentExecutionResult<unknown>
}

export interface WorkflowExecution extends WorkflowState {
  consolidatedFindings: AgentFinding[]
  executionTrace: ExecutionTraceEvent[]
  agentExecutions: AgentExecutionAttempt[]
}

export interface IdentityAssessment {
  isIdentityVerified: boolean
  nameMatches: boolean
  dateOfBirthMatches: boolean
  documentIsUsable: boolean
}

export interface AddressAssessment {
  isAddressVerified: boolean
  addressMatches: boolean
  proofIsUsable: boolean
}

export type RiskLevel = 'low' | 'medium' | 'high'

export interface RiskAssessment {
  riskLevel: RiskLevel
  riskScore: number
  requiresManualReview: boolean
}
