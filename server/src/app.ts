import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler } from './controllers/error-handler.js'
import { casesRouter } from './routes/cases.js'
import { healthRouter } from './routes/health.js'
import { workflowsRouter } from './routes/workflows.js'

export const app = express()

app.use(cors({ origin: env.CLIENT_ORIGIN }))
app.use(express.json())
app.use('/api/health', healthRouter)
app.use('/api/cases', casesRouter)
app.use('/api/workflows', workflowsRouter)
app.use(errorHandler)
