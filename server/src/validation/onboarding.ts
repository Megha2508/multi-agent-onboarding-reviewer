import { z } from 'zod'
import type { OnboardingCase } from '../types/onboarding.js'

const postalAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().min(1).optional(),
  city: z.string().min(1),
  state: z.string().min(1).optional(),
  postalCode: z.string().min(1),
  country: z.string().length(2),
})

export const onboardingCaseSchema = z.object({
  caseId: z.string().min(1),
  customer: z.object({
    customerId: z.string().min(1),
    fullName: z.string().min(1),
    dateOfBirth: z.string().date(),
    residentialAddress: postalAddressSchema,
    email: z.email().optional(),
    phoneNumber: z.string().min(1).optional(),
  }),
  identityDocument: z.object({
    type: z.enum(['passport', 'national_id', 'drivers_license']),
    documentNumber: z.string().min(1),
    fullName: z.string().min(1),
    dateOfBirth: z.string().date().optional(),
    issuingCountry: z.string().length(2),
    expiryDate: z.string().date().optional(),
    isValid: z.boolean(),
  }),
  addressProof: z.object({
    type: z.enum(['utility_bill', 'bank_statement', 'government_letter', 'lease_agreement']),
    address: postalAddressSchema,
    issueDate: z.string().date(),
    expiryDate: z.string().date().optional(),
    isValid: z.boolean(),
  }),
  employment: z.object({
    status: z.enum(['employed', 'self_employed', 'unemployed', 'retired', 'student']),
    employerName: z.string().min(1).optional(),
    jobTitle: z.string().min(1).optional(),
    annualIncome: z.number().nonnegative().optional(),
  }),
  company: z
    .object({
      legalName: z.string().min(1),
      registrationNumber: z.string().min(1).optional(),
      country: z.string().length(2),
      isRegistered: z.boolean(),
      isSanctioned: z.boolean(),
    })
    .optional(),
  riskIndicators: z.array(
    z.object({
      code: z.string().min(1),
      description: z.string().min(1),
      severity: z.enum(['low', 'medium', 'high']),
      isActive: z.boolean(),
    }),
  ),
  submittedAt: z.string().datetime(),
})

export const parseOnboardingCase = (value: unknown): OnboardingCase =>
  onboardingCaseSchema.parse(value) as unknown as OnboardingCase

export const reviewRequestSchema = z.object({
  autonomyMode: z.enum(['HUMAN_APPROVAL_REQUIRED', 'REVIEW_ON_EXCEPTION']).default('REVIEW_ON_EXCEPTION'),
  simulateFailures: z
    .object({
      identity: z.boolean().optional(),
      address: z.boolean().optional(),
      risk: z.boolean().optional(),
    })
    .optional(),
})

export const workflowDecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'REFER']),
})
