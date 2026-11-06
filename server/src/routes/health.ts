import { Router } from 'express'
import type { HealthResponse } from '../types/health.js'

export const healthResponse = (): HealthResponse => ({
  status: 'ok',
  service: 'onboarding-reviewer-api',
})

export const healthRouter = Router()

healthRouter.get('/', (_request, response) => {
  response.status(200).json(healthResponse())
})
