import { Prisma } from '@prisma/client'
import type { OnboardingCase } from '../types/onboarding.js'
import { prisma } from './prisma.js'

export class CaseNotFoundError extends Error {}
export class CaseAlreadyExistsError extends Error {}

export const createCase = async (onboardingCase: OnboardingCase) => {
  const existingCase = await prisma.onboardingCaseRecord.findUnique({ where: { id: onboardingCase.caseId } })
  if (existingCase !== null) {
    throw new CaseAlreadyExistsError(`Case ${onboardingCase.caseId} already exists.`)
  }
  return prisma.onboardingCaseRecord.create({
    data: { id: onboardingCase.caseId, payload: onboardingCase as unknown as Prisma.InputJsonValue },
  })
}

export const listCases = async () =>
  prisma.onboardingCaseRecord.findMany({
    orderBy: { createdAt: 'desc' },
    include: { workflowRuns: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })

export const getCase = async (caseId: string) => {
  const onboardingCase = await prisma.onboardingCaseRecord.findUnique({
    where: { id: caseId },
    include: {
      workflowRuns: {
        orderBy: { createdAt: 'desc' },
        include: { agentResults: { orderBy: [{ agentName: 'asc' }, { attempt: 'asc' }] } },
      },
    },
  })
  if (onboardingCase === null) {
    throw new CaseNotFoundError(`Case ${caseId} was not found.`)
  }
  return onboardingCase
}

export const getCasePayload = async (caseId: string): Promise<OnboardingCase> => {
  const record = await prisma.onboardingCaseRecord.findUnique({ where: { id: caseId } })
  if (record === null) {
    throw new CaseNotFoundError(`Case ${caseId} was not found.`)
  }
  return record.payload as unknown as OnboardingCase
}
