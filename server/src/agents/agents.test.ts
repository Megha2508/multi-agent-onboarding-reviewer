import { describe, expect, it } from 'vitest'
import { AddressAgent } from './address-agent.js'
import { IdentityAgent } from './identity-agent.js'
import { RiskAgent } from './risk-agent.js'
import type { OnboardingCase } from '../types/onboarding.js'

const baseCase: OnboardingCase = {
  caseId: 'case-001',
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

describe('onboarding reviewer agents', () => {
  it('verifies matching identity and address details, then reports low risk', async () => {
    const identityResult = await new IdentityAgent().execute({ case: baseCase })
    const addressResult = await new AddressAgent().execute({ case: baseCase })
    const riskResult = await new RiskAgent().execute({ case: baseCase, identityResult, addressResult })

    expect(identityResult.output?.isIdentityVerified).toBe(true)
    expect(addressResult.output?.isAddressVerified).toBe(true)
    expect(riskResult.output).toEqual({ riskLevel: 'low', riskScore: 5, requiresManualReview: false })
  })

  it('propagates a simulated identity failure to the risk assessment', async () => {
    const identityResult = await new IdentityAgent().execute({ case: baseCase, simulateFailure: true })
    const addressResult = await new AddressAgent().execute({ case: baseCase })
    const riskResult = await new RiskAgent().execute({ case: baseCase, identityResult, addressResult })

    expect(identityResult.status).toBe('failed')
    expect(riskResult.findings).toContainEqual(expect.objectContaining({ code: 'UPSTREAM_REVIEW_UNAVAILABLE' }))
    expect(riskResult.output?.requiresManualReview).toBe(true)
  })
})
