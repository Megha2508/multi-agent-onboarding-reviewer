import type { AddressAgentInput, AddressAgentResult, TypedAgent } from './contracts.js'
import { failureResult, isExpired, normalizeText } from './utils.js'
import type { AddressAssessment, AgentFinding, PostalAddress } from '../types/onboarding.js'

const normalizedAddress = (address: PostalAddress): string =>
  [address.line1, address.line2, address.city, address.state, address.postalCode, address.country]
    .filter((value): value is string => value !== undefined)
    .map(normalizeText)
    .join('|')

export class AddressAgent implements TypedAgent<AddressAgentInput, AddressAssessment> {
  readonly name = 'AddressAgent'

  async execute(input: AddressAgentInput): Promise<AddressAgentResult> {
    if (input.simulateFailure) {
      return failureResult(this.name)
    }

    const { customer, addressProof } = input.case
    const addressMatches = normalizedAddress(customer.residentialAddress) === normalizedAddress(addressProof.address)
    const proofIsUsable = addressProof.isValid && !isExpired(addressProof.expiryDate)
    const findings: AgentFinding[] = []

    if (!addressMatches) {
      findings.push({
        code: 'ADDRESS_MISMATCH',
        message: 'The residential address does not match the address proof.',
        severity: 'medium',
        confidence: 0.97,
      })
    }
    if (!proofIsUsable) {
      findings.push({
        code: 'ADDRESS_PROOF_UNUSABLE',
        message: 'The address proof is invalid or expired.',
        severity: 'high',
        confidence: 0.98,
      })
    }
    if (findings.length === 0) {
      findings.push({
        code: 'ADDRESS_VERIFIED',
        message: 'The residential address matches valid address proof.',
        severity: 'low',
        confidence: 0.97,
      })
    }

    return {
      agentName: this.name,
      status: 'completed',
      findings,
      confidence: findings.length === 1 && findings[0]?.code === 'ADDRESS_VERIFIED' ? 0.97 : 0.98,
      output: {
        isAddressVerified: addressMatches && proofIsUsable,
        addressMatches,
        proofIsUsable,
      },
    }
  }
}
