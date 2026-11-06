import { describe, expect, it } from 'vitest'
import { ReviewSupervisor } from './review-supervisor.js'
import type { OnboardingCase } from '../types/onboarding.js'

const validCase: OnboardingCase = {
  caseId: 'workflow-case-001',
  customer: {
    customerId: 'customer-001',
    fullName: 'Ada Lovelace',
    dateOfBirth: '1815-12-10',
    residentialAddress: {
      line1: '12 Analytical Engine Way',
      city: 'London',
      postalCode: 'SW1A 1AA',
      country: 'GB',
    },
  },
  identityDocument: {
    type: 'passport',
    documentNumber: 'P1234567',
    fullName: 'Ada Lovelace',
    dateOfBirth: '1815-12-10',
    issuingCountry: 'GB',
    expiryDate: '2030-01-01',
    isValid: true,
  },
  addressProof: {
    type: 'utility_bill',
    address: {
      line1: '12 Analytical Engine Way',
      city: 'London',
      postalCode: 'SW1A 1AA',
      country: 'GB',
    },
    issueDate: '2025-12-01',
    isValid: true,
  },
  employment: { status: 'employed', annualIncome: 80_000 },
  riskIndicators: [],
  submittedAt: '2025-12-15T10:00:00.000Z',
}

describe('ReviewSupervisor', () => {
  it('auto-completes a passing case in REVIEW_ON_EXCEPTION mode', async () => {
    const result = await new ReviewSupervisor().execute({
      case: validCase,
      autonomyMode: 'REVIEW_ON_EXCEPTION',
    })

    expect(result.status).toBe('COMPLETED')
    expect(result.finalRecommendation).toMatchObject({ decision: 'APPROVE', confidence: 0.9 })
    expect(result.executionTrace.at(-1)).toMatchObject({ step: 'workflow', status: 'COMPLETED' })
  })

  it('retries a failed agent once and refers the case for manual review', async () => {
    const result = await new ReviewSupervisor().execute({
      case: validCase,
      autonomyMode: 'REVIEW_ON_EXCEPTION',
      simulateFailures: { identity: true },
    })

    expect(result.status).toBe('MANUAL_REVIEW')
    expect(result.finalRecommendation?.decision).toBe('REFER')
    expect(result.agentExecutions.filter((attempt) => attempt.agentName === 'IdentityAgent')).toHaveLength(2)
    expect(result.executionTrace.some((trace) => trace.status === 'RETRYING')).toBe(true)
  })

  it('waits for a human decision in HUMAN_APPROVAL_REQUIRED mode', async () => {
    const result = await new ReviewSupervisor().execute({
      case: validCase,
      autonomyMode: 'HUMAN_APPROVAL_REQUIRED',
    })

    expect(result.finalRecommendation?.decision).toBe('APPROVE')
    expect(result.status).toBe('AWAITING_HUMAN_APPROVAL')
  })
})
