import type { RiskAgentInput, RiskAgentResult, TypedAgent } from './contracts.js'
import { failureResult, hasSeverity } from './utils.js'
import type { AgentFinding, RiskAssessment, RiskLevel, Severity } from '../types/onboarding.js'

const scoreForSeverity = (severity: Severity): number => {
  if (severity === 'high') return 60
  if (severity === 'medium') return 25
  return 5
}

const riskLevelFor = (score: number): RiskLevel => {
  if (score >= 60) return 'high'
  if (score >= 25) return 'medium'
  return 'low'
}

export class RiskAgent implements TypedAgent<RiskAgentInput, RiskAssessment> {
  readonly name = 'RiskAgent'

  async execute(input: RiskAgentInput): Promise<RiskAgentResult> {
    if (input.simulateFailure) {
      return failureResult(this.name)
    }

    const findings: AgentFinding[] = []
    const { employment, company, riskIndicators } = input.case

    if (input.identityResult.status === 'failed' || input.addressResult.status === 'failed') {
      findings.push({
        code: 'UPSTREAM_REVIEW_UNAVAILABLE',
        message: 'Identity or address verification did not complete and requires manual review.',
        severity: 'high',
        confidence: 1,
      })
    }
    if (hasSeverity(input.identityResult.findings, 'high')) {
      findings.push({
        code: 'IDENTITY_RISK_ESCALATION',
        message: 'High-severity identity findings were included in the risk assessment.',
        severity: 'high',
        confidence: input.identityResult.confidence,
      })
    }
    if (hasSeverity(input.addressResult.findings, 'high')) {
      findings.push({
        code: 'ADDRESS_RISK_ESCALATION',
        message: 'High-severity address findings were included in the risk assessment.',
        severity: 'high',
        confidence: input.addressResult.confidence,
      })
    } else if (hasSeverity(input.addressResult.findings, 'medium')) {
      findings.push({
        code: 'ADDRESS_RISK_REVIEW',
        message: 'Address findings require an additional risk review.',
        severity: 'medium',
        confidence: input.addressResult.confidence,
      })
    }
    if (employment.status === 'unemployed' && (employment.annualIncome === undefined || employment.annualIncome < 15_000)) {
      findings.push({
        code: 'LIMITED_INCOME_SOURCE',
        message: 'The employment profile indicates limited verified income.',
        severity: 'medium',
        confidence: 0.9,
      })
    }
    if (company !== undefined && (!company.isRegistered || company.isSanctioned)) {
      findings.push({
        code: company.isSanctioned ? 'SANCTIONED_COMPANY' : 'UNREGISTERED_COMPANY',
        message: company.isSanctioned
          ? 'The associated company is marked as sanctioned.'
          : 'The associated company is not registered.',
        severity: 'high',
        confidence: 0.99,
      })
    }
    for (const indicator of riskIndicators.filter((indicator) => indicator.isActive)) {
      findings.push({
        code: indicator.code,
        message: indicator.description,
        severity: indicator.severity,
        confidence: 0.95,
      })
    }

    if (findings.length === 0) {
      findings.push({
        code: 'NO_MATERIAL_RISK',
        message: 'No deterministic risk indicators were identified.',
        severity: 'low',
        confidence: 0.9,
      })
    }

    const riskScore = Math.min(100, findings.reduce((total, finding) => total + scoreForSeverity(finding.severity), 0))
    const riskLevel = riskLevelFor(riskScore)

    return {
      agentName: this.name,
      status: 'completed',
      findings,
      confidence: Math.min(...findings.map((finding) => finding.confidence)),
      output: {
        riskLevel,
        riskScore,
        requiresManualReview: riskLevel !== 'low',
      },
    }
  }
}
