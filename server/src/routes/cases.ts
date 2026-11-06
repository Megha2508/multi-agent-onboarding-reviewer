import { Router } from 'express'
import {
  createCaseController,
  getCaseController,
  listCasesController,
  reviewCaseController,
} from '../controllers/cases-controller.js'

export const casesRouter = Router()

casesRouter.get('/', listCasesController)
casesRouter.get('/:id', getCaseController)
casesRouter.post('/', createCaseController)
casesRouter.post('/:id/review', reviewCaseController)
