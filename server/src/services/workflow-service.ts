import { Prisma } from '@prisma/client'
import { ReviewSupervisor } from '../orchestrator/review-supervisor.js'
import type {
  AutonomyMode,
  FinalRecommendationDecision,
  WorkflowExecution,
} from '../types/onboarding.js'
import { CaseNotFoundError, getCasePayload } from './case-service.js'
import { prisma } from './prisma.js'

export class WorkflowNotFoundError extends Error {}
export class WorkflowDecisionConflictError extends Error {}

const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue

const persistExecution = async (workflowId: string, execution: WorkflowExecution) => {
  const recommendation = execution.finalRecommendation
  if (recommendation === undefined) {
    throw new Error('A completed workflow must have a recommendation.')
  }
  await prisma.$transaction(async (transaction) => {
    await transaction.agentResult.createMany({
      data: execution.agentExecutions.map(({ agentName, attempt, result }) => ({
        workflowRunId: workflowId,
        agentName,
        attempt,
        status: result.status === 'completed' ? 'COMPLETED' : 'FAILED',
        findings: asJson(result.findings),
        confidence: result.confidence,
        output: result.output === undefined ? Prisma.JsonNull : asJson(result.output),
        error: result.error === undefined ? Prisma.JsonNull : asJson(result.error),
      })),
    })
    await transaction.workflowRun.update({
      where: { id: workflowId },
      data: {
        status: execution.status,
        recommendation: recommendation.decision,
        explanation: recommendation.rationale,
        confidence: recommendation.confidence,
        trace: asJson(execution.executionTrace),
      },
    })
  })
}

export const reviewCase = async (
  caseId: string,
  autonomyMode: AutonomyMode,
  simulateFailures?: { identity?: boolean | undefined; address?: boolean | undefined; risk?: boolean | undefined },
) => {
  const onboardingCase = await getCasePayload(caseId)
  const workflow = await prisma.workflowRun.create({
    data: {
      caseId,
      status: 'PENDING',
      autonomyMode,
      trace: [],
    },
  })
  await prisma.workflowRun.update({ where: { id: workflow.id }, data: { status: 'RUNNING' } })

  try {
    const supervisorInput =
      simulateFailures === undefined
        ? { case: onboardingCase, autonomyMode }
        : { case: onboardingCase, autonomyMode, simulateFailures }
    const execution = await new ReviewSupervisor().execute(supervisorInput)
    await persistExecution(workflow.id, execution)
  } catch (error) {
    await prisma.workflowRun.update({
      where: { id: workflow.id },
      data: {
        status: 'FAILED',
        explanation: 'The workflow could not be completed.',
        trace: asJson([
          {
            step: 'workflow',
            status: 'FAILED',
            message: error instanceof Error ? error.message : 'Unknown workflow error.',
            occurredAt: new Date().toISOString(),
          },
        ]),
      },
    })
  }

  return prisma.workflowRun.findUniqueOrThrow({
    where: { id: workflow.id },
    include: { agentResults: { orderBy: [{ agentName: 'asc' }, { attempt: 'asc' }] } },
  })
}

export const recordHumanDecision = async (workflowId: string, decision: FinalRecommendationDecision) => {
  const workflow = await prisma.workflowRun.findUnique({
    where: { id: workflowId },
    include: { agentResults: true },
  })
  if (workflow === null) {
    throw new WorkflowNotFoundError(`Workflow ${workflowId} was not found.`)
  }
  if (workflow.status !== 'AWAITING_HUMAN_APPROVAL' && workflow.status !== 'MANUAL_REVIEW') {
    throw new WorkflowDecisionConflictError('A decision can only be recorded for a workflow awaiting review.')
  }
  if (decision === 'APPROVE' && workflow.agentResults.some((agentResult) => agentResult.status === 'FAILED')) {
    throw new WorkflowDecisionConflictError('A workflow with failed checks cannot be approved.')
  }

  const existingTrace = workflow.trace as unknown[]
  return prisma.workflowRun.update({
    where: { id: workflowId },
    data: {
      status: 'COMPLETED',
      recommendation: decision,
      explanation: `Human reviewer recorded ${decision}.`,
      trace: asJson([
        ...existingTrace,
        {
          step: 'human-decision',
          status: 'COMPLETED',
          message: `Human reviewer recorded ${decision}.`,
          occurredAt: new Date().toISOString(),
        },
      ]),
    },
    include: { agentResults: { orderBy: [{ agentName: 'asc' }, { attempt: 'asc' }] } },
  })
}

export { CaseNotFoundError }
