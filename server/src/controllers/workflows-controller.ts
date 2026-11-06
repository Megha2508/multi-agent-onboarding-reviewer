import type { RequestHandler } from 'express'
import { z } from 'zod'
import { recordHumanDecision } from '../services/workflow-service.js'
import { workflowDecisionSchema } from '../validation/onboarding.js'

export const recordDecisionController: RequestHandler = async (request, response) => {
  const { decision } = workflowDecisionSchema.parse(request.body)
  response.json(await recordHumanDecision(z.string().min(1).parse(request.params.id), decision))
}
