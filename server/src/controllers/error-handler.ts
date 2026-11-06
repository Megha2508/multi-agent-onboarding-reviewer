import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { CaseAlreadyExistsError, CaseNotFoundError } from '../services/case-service.js'
import { WorkflowDecisionConflictError, WorkflowNotFoundError } from '../services/workflow-service.js'

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: 'Invalid request', details: error.issues })
    return
  }
  if (error instanceof CaseNotFoundError || error instanceof WorkflowNotFoundError) {
    response.status(404).json({ error: error.message })
    return
  }
  if (error instanceof CaseAlreadyExistsError || error instanceof WorkflowDecisionConflictError) {
    response.status(409).json({ error: error.message })
    return
  }
  console.error(error)
  response.status(500).json({ error: 'Internal server error' })
}
