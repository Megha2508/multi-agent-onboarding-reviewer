import { AddressAgent } from '../agents/address-agent.js'
import type {
  AddressAgentInput,
  IdentityAgentInput,
  RiskAgentInput,
  TypedAgent,
} from '../agents/contracts.js'
import { IdentityAgent } from '../agents/identity-agent.js'
import { RiskAgent } from '../agents/risk-agent.js'
import type {
  AddressAssessment,
  AgentExecutionResult,
  AgentExecutionAttempt,
  AgentFinding,
  AutonomyMode,
  ExecutionTraceEvent,
  FinalRecommendation,
  IdentityAssessment,
  OnboardingCase,
  RiskAssessment,
  WorkflowExecution,
  WorkflowStatus,
} from '../types/onboarding.js'

export interface FailureSimulation {
  identity?: boolean | undefined
  address?: boolean | undefined
  risk?: boolean | undefined
}

export interface ReviewSupervisorInput {
  case: OnboardingCase
  autonomyMode: AutonomyMode
  simulateFailures?: FailureSimulation
}

export interface ReviewerAgents {
  identity: TypedAgent<IdentityAgentInput, IdentityAssessment>
  address: TypedAgent<AddressAgentInput, AddressAssessment>
  risk: TypedAgent<RiskAgentInput, RiskAssessment>
}

const hardFailCodes = new Set([
  'IDENTITY_NAME_MISMATCH',
  'IDENTITY_DOB_MISMATCH',
  'IDENTITY_DOCUMENT_UNUSABLE',
  'ADDRESS_PROOF_UNUSABLE',
  'SANCTIONED_COMPANY',
])

const event = (
  trace: ExecutionTraceEvent[],
  step: string,
  status: ExecutionTraceEvent['status'],
  message: string,
): void => {
  trace.push({ step, status, message, occurredAt: new Date().toISOString() })
}

const executeWithRetry = async <TInput, TOutput>(
  agent: TypedAgent<TInput, TOutput>,
  input: TInput,
  trace: ExecutionTraceEvent[],
): Promise<{ result: AgentExecutionResult<TOutput>; attempts: AgentExecutionResult<TOutput>[] }> => {
  event(trace, agent.name, 'STARTED', 'Executing agent.')
  const invoke = async (): Promise<AgentExecutionResult<TOutput>> => {
    try {
      return await agent.execute(input)
    } catch (error) {
      return {
        agentName: agent.name,
        status: 'failed',
        confidence: 0,
        findings: [
          {
            code: 'AGENT_EXECUTION_ERROR',
            message: `${agent.name} raised an unexpected error.`,
            severity: 'high',
            confidence: 1,
          },
        ],
        error: {
          code: 'UNEXPECTED_AGENT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown agent error.',
          retryable: true,
        },
      }
    }
  }
  const firstAttempt = await invoke()
  if (firstAttempt.status === 'completed') {
    event(trace, agent.name, 'COMPLETED', 'Agent completed on attempt 1.')
    return { result: firstAttempt, attempts: [firstAttempt] }
  }

  event(trace, agent.name, 'RETRYING', 'Agent failed on attempt 1; retrying once.')
  const secondAttempt = await invoke()
  event(
    trace,
    agent.name,
    secondAttempt.status === 'completed' ? 'COMPLETED' : 'FAILED',
    `Agent ${secondAttempt.status === 'completed' ? 'completed' : 'failed'} on attempt 2.`,
  )
  return { result: secondAttempt, attempts: [firstAttempt, secondAttempt] }
}

const recommendationFor = (
  findings: AgentFinding[],
  results: Array<AgentExecutionResult<unknown>>,
): FinalRecommendation => {
  const hasFailure = results.some((result) => result.status === 'failed')
  const hasHardFail = findings.some((finding) => hardFailCodes.has(finding.code))
  const hasException = findings.some((finding) => finding.severity !== 'low')
  const checksComplete = results.every((result) => result.status === 'completed')
  const confidence = Math.min(...results.map((result) => result.confidence))

  if (hasHardFail) {
    return {
      decision: 'REJECT',
      rationale: 'An explicit hard-fail rule was triggered.',
      confidence,
      requiredActions: ['Reject the case or have a human reviewer override this result.'],
    }
  }
  if (hasFailure || !checksComplete || hasException || confidence < 0.85) {
    return {
      decision: 'REFER',
      rationale: 'The case has incomplete checks, an agent failure, insufficient confidence, or review findings.',
      confidence,
      requiredActions: ['Complete a human review before making a final decision.'],
    }
  }
  return {
    decision: 'APPROVE',
    rationale: 'All checks completed successfully with no exceptions.',
    confidence,
    requiredActions: [],
  }
}

export class ReviewSupervisor {
  constructor(
    private readonly agents: ReviewerAgents = {
      identity: new IdentityAgent(),
      address: new AddressAgent(),
      risk: new RiskAgent(),
    },
  ) {}

  async execute(input: ReviewSupervisorInput): Promise<WorkflowExecution> {
    const executionTrace: ExecutionTraceEvent[] = []
    event(executionTrace, 'workflow', 'STARTED', 'Starting onboarding review workflow.')

    const identityInput: IdentityAgentInput =
      input.simulateFailures?.identity === undefined
        ? { case: input.case }
        : { case: input.case, simulateFailure: input.simulateFailures.identity }
    const addressInput: AddressAgentInput =
      input.simulateFailures?.address === undefined
        ? { case: input.case }
        : { case: input.case, simulateFailure: input.simulateFailures.address }
    const identity = await executeWithRetry(this.agents.identity, identityInput, executionTrace)
    const address = await executeWithRetry(this.agents.address, addressInput, executionTrace)
    const riskInput: RiskAgentInput =
      input.simulateFailures?.risk === undefined
        ? { case: input.case, identityResult: identity.result, addressResult: address.result }
        : {
            case: input.case,
            identityResult: identity.result,
            addressResult: address.result,
            simulateFailure: input.simulateFailures.risk,
          }
    const risk = await executeWithRetry(this.agents.risk, riskInput, executionTrace)

    const results: Array<AgentExecutionResult<unknown>> = [identity.result, address.result, risk.result]
    const agentExecutions: AgentExecutionAttempt[] = [
      ...identity.attempts.map((result, index) => ({ agentName: result.agentName, attempt: index + 1, result })),
      ...address.attempts.map((result, index) => ({ agentName: result.agentName, attempt: index + 1, result })),
      ...risk.attempts.map((result, index) => ({ agentName: result.agentName, attempt: index + 1, result })),
    ]
    const consolidatedFindings = results.flatMap((result) => result.findings)
    const finalRecommendation = recommendationFor(consolidatedFindings, results)
    const allChecksPass =
      finalRecommendation.decision === 'APPROVE' &&
      identity.result.output?.isIdentityVerified === true &&
      address.result.output?.isAddressVerified === true &&
      risk.result.output?.riskLevel === 'low'
    let status: WorkflowStatus

    if (input.autonomyMode === 'HUMAN_APPROVAL_REQUIRED') {
      status = 'AWAITING_HUMAN_APPROVAL'
    } else if (allChecksPass && finalRecommendation.confidence >= 0.85) {
      status = 'COMPLETED'
    } else {
      status = 'MANUAL_REVIEW'
    }

    event(executionTrace, 'workflow', 'COMPLETED', `Workflow finished with ${status}.`)
    return {
      case: input.case,
      autonomyMode: input.autonomyMode,
      status,
      identityResult: identity.result,
      addressResult: address.result,
      riskResult: risk.result,
      finalRecommendation,
      consolidatedFindings,
      executionTrace,
      agentExecutions,
    }
  }
}
