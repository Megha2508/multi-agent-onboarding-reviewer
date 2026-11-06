import { describe, expect, it } from 'vitest'
import { healthResponse } from './health.js'

describe('healthResponse', () => {
  it('reports a healthy API service', () => {
    expect(healthResponse()).toEqual({
      status: 'ok',
      service: 'onboarding-reviewer-api',
    })
  })
})
