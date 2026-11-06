import type { RequestHandler } from 'express'
import { z } from 'zod'
import { createCase, getCase, listCases } from '../services/case-service.js'
import { reviewCase } from '../services/workflow-service.js'
import { parseOnboardingCase, reviewRequestSchema } from '../validation/onboarding.js'

export const listCasesController: RequestHandler = async (_request, response) => {
  response.json(await listCases())
}

export const getCaseController: RequestHandler = async (request, response) => {
  response.json(await getCase(z.string().min(1).parse(request.params.id)))
}

export const createCaseController: RequestHandler = async (request, response) => {
  const onboardingCase = parseOnboardingCase(request.body)
  const createdCase = await createCase(onboardingCase)
  response.status(201).json(createdCase)
}

export const reviewCaseController: RequestHandler = async (request, response) => {
  const reviewRequest = reviewRequestSchema.parse(request.body ?? {})
  const workflow = await reviewCase(
    z.string().min(1).parse(request.params.id),
    reviewRequest.autonomyMode,
    reviewRequest.simulateFailures,
  )
  response.status(201).json(workflow)
}
