import type {
  AddressAssessment,
  AgentExecutionResult,
  IdentityAssessment,
  OnboardingCase,
  RiskAssessment,
} from '../types/onboarding.js'

export interface AgentExecutionOptions {
  /** Deterministically returns a failed execution result for test and resilience flows. */
  simulateFailure?: boolean
}

export interface TypedAgent<TInput, TOutput> {
  readonly name: string
  execute(input: TInput): Promise<AgentExecutionResult<TOutput>>
}

export interface IdentityAgentInput extends AgentExecutionOptions {
  case: OnboardingCase
}

export interface AddressAgentInput extends AgentExecutionOptions {
  case: OnboardingCase
}

export interface RiskAgentInput extends AgentExecutionOptions {
  case: OnboardingCase
  identityResult: AgentExecutionResult<IdentityAssessment>
  addressResult: AgentExecutionResult<AddressAssessment>
}

export type IdentityAgentResult = AgentExecutionResult<IdentityAssessment>
export type AddressAgentResult = AgentExecutionResult<AddressAssessment>
export type RiskAgentResult = AgentExecutionResult<RiskAssessment>
