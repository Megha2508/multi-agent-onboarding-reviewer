import type { TypedAgent, IdentityAgentInput, IdentityAgentResult } from './contracts.js'
import { failureResult, isExpired, normalizeText } from './utils.js'
import type { AgentFinding, IdentityAssessment } from '../types/onboarding.js'

export class IdentityAgent implements TypedAgent<IdentityAgentInput, IdentityAssessment> {
  readonly name = 'IdentityAgent'

  async execute(input: IdentityAgentInput): Promise<IdentityAgentResult> {
    if (input.simulateFailure) {
      return failureResult(this.name)
    }

    const { customer, identityDocument } = input.case
    const nameMatches = normalizeText(customer.fullName) === normalizeText(identityDocument.fullName)
    const dateOfBirthMatches =
      identityDocument.dateOfBirth !== undefined && customer.dateOfBirth === identityDocument.dateOfBirth
    const documentIsUsable = identityDocument.isValid && !isExpired(identityDocument.expiryDate)
    const findings: AgentFinding[] = []

    if (!nameMatches) {
      findings.push({
        code: 'IDENTITY_NAME_MISMATCH',
        message: 'The customer name does not match the identity document.',
        severity: 'high',
        confidence: 0.99,
      })
    }
    if (!dateOfBirthMatches) {
      findings.push({
        code: 'IDENTITY_DOB_MISMATCH',
        message: 'The customer date of birth is missing from or differs on the identity document.',
        severity: 'high',
        confidence: 0.99,
      })
    }
    if (!documentIsUsable) {
      findings.push({
        code: 'IDENTITY_DOCUMENT_UNUSABLE',
        message: 'The identity document is invalid or expired.',
        severity: 'high',
        confidence: 0.98,
      })
    }
    if (findings.length === 0) {
      findings.push({
        code: 'IDENTITY_VERIFIED',
        message: 'Identity details match a valid, unexpired document.',
        severity: 'low',
        confidence: 0.98,
      })
    }

    return {
      agentName: this.name,
      status: 'completed',
      findings,
      confidence: findings.length === 1 && findings[0]?.code === 'IDENTITY_VERIFIED' ? 0.98 : 0.99,
      output: {
        isIdentityVerified: nameMatches && dateOfBirthMatches && documentIsUsable,
        nameMatches,
        dateOfBirthMatches,
        documentIsUsable,
      },
    }
  }
}
