import { Router } from 'express'
import { recordDecisionController } from '../controllers/workflows-controller.js'

export const workflowsRouter = Router()

workflowsRouter.post('/:id/decision', recordDecisionController)
