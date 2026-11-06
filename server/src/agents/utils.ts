import type {
  AgentExecutionResult,
  AgentFinding,
  Severity,
} from '../types/onboarding.js'

// Fixed assessment date keeps the mocked review logic repeatable in tests and demos.
const REFERENCE_DATE = '2026-01-01'

export const normalizeText = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '')

export const isExpired = (expiryDate: string | undefined): boolean =>
  expiryDate !== undefined && expiryDate < REFERENCE_DATE

export const failureResult = <TOutput>(agentName: string): AgentExecutionResult<TOutput> => ({
  agentName,
  status: 'failed',
  confidence: 0,
  findings: [
    {
      code: 'SIMULATED_AGENT_FAILURE',
      message: `${agentName} was intentionally failed for resilience testing.`,
      severity: 'high',
      confidence: 1,
    },
  ],
  error: {
    code: 'SIMULATED_FAILURE',
    message: 'Failure simulation was requested.',
    retryable: true,
  },
})

export const hasSeverity = (findings: AgentFinding[], severity: Severity): boolean =>
  findings.some((finding) => finding.severity === severity)
