import 'dotenv/config'
import { Prisma, PrismaClient } from '@prisma/client'
import type { OnboardingCase } from '../src/types/onboarding.js'

const prisma = new PrismaClient()

const address = (line1: string, city: string, postalCode: string, country = 'US') => ({
  line1,
  city,
  postalCode,
  country,
})

const seedCases: OnboardingCase[] = [
  {
    caseId: 'case-clean-priya',
    customer: {
      customerId: 'customer-priya',
      fullName: 'Priya Shah',
      dateOfBirth: '1990-04-18',
      email: 'priya.shah@example.test',
      residentialAddress: address('42 Cedar Avenue', 'Seattle', '98101'),
    },
    identityDocument: {
      type: 'passport',
      documentNumber: 'US-P-902104',
      fullName: 'Priya Shah',
      dateOfBirth: '1990-04-18',
      issuingCountry: 'US',
      expiryDate: '2031-05-01',
      isValid: true,
    },
    addressProof: {
      type: 'utility_bill',
      address: address('42 Cedar Avenue', 'Seattle', '98101'),
      issueDate: '2025-12-01',
      isValid: true,
    },
    employment: { status: 'employed', employerName: 'Northstar Labs', jobTitle: 'Engineer', annualIncome: 125_000 },
    riskIndicators: [],
    submittedAt: '2025-12-15T09:00:00.000Z',
  },
  {
    caseId: 'case-address-mismatch-miguel',
    customer: {
      customerId: 'customer-miguel',
      fullName: 'Miguel Santos',
      dateOfBirth: '1987-09-22',
      email: 'miguel.santos@example.test',
      residentialAddress: address('18 Harbour Street', 'Boston', '02110'),
    },
    identityDocument: {
      type: 'drivers_license',
      documentNumber: 'MA-DL-842010',
      fullName: 'Miguel Santos',
      dateOfBirth: '1987-09-22',
      issuingCountry: 'US',
      expiryDate: '2029-09-22',
      isValid: true,
    },
    addressProof: {
      type: 'bank_statement',
      address: address('77 Beacon Road', 'Boston', '02110'),
      issueDate: '2025-11-20',
      isValid: true,
    },
    employment: { status: 'self_employed', employerName: 'Santos Design', jobTitle: 'Owner', annualIncome: 92_000 },
    company: {
      legalName: 'Santos Design LLC',
      registrationNumber: 'MA-441002',
      country: 'US',
      isRegistered: true,
      isSanctioned: false,
    },
    riskIndicators: [],
    submittedAt: '2025-12-16T10:30:00.000Z',
  },
  {
    caseId: 'case-missing-identity-noor',
    customer: {
      customerId: 'customer-noor',
      fullName: 'Noor Rahman',
      dateOfBirth: '1995-02-11',
      email: 'noor.rahman@example.test',
      residentialAddress: address('9 Willow Close', 'Austin', '78701'),
    },
    identityDocument: {
      type: 'national_id',
      documentNumber: 'NOT_PROVIDED',
      fullName: 'Noor Rahman',
      issuingCountry: 'US',
      isValid: false,
    },
    addressProof: {
      type: 'government_letter',
      address: address('9 Willow Close', 'Austin', '78701'),
      issueDate: '2025-11-15',
      isValid: true,
    },
    employment: { status: 'student', annualIncome: 12_000 },
    riskIndicators: [],
    submittedAt: '2025-12-17T14:15:00.000Z',
  },
  {
    caseId: 'case-high-risk-elena',
    customer: {
      customerId: 'customer-elena',
      fullName: 'Elena Markovic',
      dateOfBirth: '1982-07-30',
      email: 'elena.markovic@example.test',
      residentialAddress: address('250 Market Street', 'New York', '10001'),
    },
    identityDocument: {
      type: 'passport',
      documentNumber: 'US-P-771920',
      fullName: 'Elena Markovic',
      dateOfBirth: '1982-07-30',
      issuingCountry: 'US',
      expiryDate: '2032-01-15',
      isValid: true,
    },
    addressProof: {
      type: 'lease_agreement',
      address: address('250 Market Street', 'New York', '10001'),
      issueDate: '2025-10-01',
      isValid: true,
    },
    employment: { status: 'employed', employerName: 'Crescent Holdings', jobTitle: 'Director', annualIncome: 180_000 },
    company: {
      legalName: 'Crescent Holdings Inc.',
      registrationNumber: 'NY-903118',
      country: 'US',
      isRegistered: true,
      isSanctioned: false,
    },
    riskIndicators: [
      {
        code: 'HIGH_RISK_JURISDICTION_EXPOSURE',
        description: 'Declared exposure to a high-risk jurisdiction requires enhanced due diligence.',
        severity: 'high',
        isActive: true,
      },
    ],
    submittedAt: '2025-12-18T08:45:00.000Z',
  },
]

async function main() {
  for (const onboardingCase of seedCases) {
    await prisma.onboardingCaseRecord.upsert({
      where: { id: onboardingCase.caseId },
      create: {
        id: onboardingCase.caseId,
        payload: onboardingCase as unknown as Prisma.InputJsonValue,
      },
      update: { payload: onboardingCase as unknown as Prisma.InputJsonValue },
    })
  }
  console.log(`Seeded ${seedCases.length} synthetic onboarding cases.`)
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
