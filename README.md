# Multi-Agent Onboarding Case Reviewer

A local technical-assessment project for reviewing onboarding evidence with deterministic TypeScript agents. It is not a banking system and does not call third-party AI services or perform financial actions.

## Architecture

- `client/` — React, Vite, and TypeScript dashboard. It reads cases and workflow records from the Express API.
- `server/` — Express and TypeScript API, Zod request validation, custom orchestration, Prisma, and MySQL persistence.
- `server/src/agents/` — independent, side-effect-free identity, address, and risk agents.
- `server/src/orchestrator/` — the review supervisor, retry policy, consolidation, recommendation, and execution trace.
- `server/src/services/` — case/workflow persistence. Controllers handle HTTP only; services own business operations.
- `server/prisma/` — MySQL schema, migration, and idempotent synthetic seed data.

## Agent roles and workflow

1. `IdentityAgent` compares the customer profile to the identity document.
2. `AddressAgent` compares the stated residence to address proof.
3. `RiskAgent` consumes both upstream agent results, plus employment, company, and risk-indicator details.
4. `ReviewSupervisor` retries any failed agent once, records each attempt, consolidates findings, and creates a recommendation plus execution trace.

Recommendations are `APPROVE`, `REJECT`, or `REFER`. Automatic rejection only occurs for explicit hard-fail rules: identity name/date-of-birth mismatch, an unusable identity document, unusable address proof, or a sanctioned company. Other exceptions are referred for review.

Workflow statuses are `PENDING`, `RUNNING`, `AWAITING_HUMAN_APPROVAL`, `MANUAL_REVIEW`, `COMPLETED`, and `FAILED`.

## Autonomy modes

- `HUMAN_APPROVAL_REQUIRED` — every recommendation pauses in `AWAITING_HUMAN_APPROVAL` for a human decision.
- `REVIEW_ON_EXCEPTION` — only a fully successful, low-risk review with confidence of at least `0.85` completes automatically. Missing/invalid evidence, mismatches, high-risk findings, or agent failures enter `MANUAL_REVIEW`.

An agent failure is retried once. A repeated failure is never automatically approved. The decision endpoint also refuses an `APPROVE` decision when a persisted agent check failed.

## Setup

Prerequisites: Node.js 22.12+ and a reachable MySQL 8+ database.

Create local environment files from their examples and replace only the placeholders:

```sh
cd server
cp .env.example .env
cd ../client
cp .env.example .env
```

`server/.env` variables:

```dotenv
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/onboarding_reviewer"
```

`client/.env` variables:

```dotenv
VITE_API_URL=http://localhost:3000
```

Install packages and initialize the database:

```sh
cd server
npm install
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed

cd ../client
npm install
```

Start the API and dashboard in separate terminals:

```sh
cd server && npm run dev
```

```sh
cd client && npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

## Migrations and seed data

The committed initial migration creates tables for cases, workflow runs, and every agent attempt. Apply it with:

```sh
cd server
npm run prisma:deploy
```

Run this idempotent seed command to create four fictional synthetic cases:

```sh
npm run prisma:seed
```

The seed set includes a clean case, an address mismatch, missing identity evidence, and an active high-risk indicator. It updates those fixed synthetic IDs without deleting workflow history.

## API

- `GET /api/health`
- `GET /api/cases`
- `GET /api/cases/:id`
- `POST /api/cases`
- `POST /api/cases/:id/review`
- `POST /api/workflows/:id/decision`

Start a review with:

```json
{ "autonomyMode": "REVIEW_ON_EXCEPTION" }
```

Record a pending human decision with:

```json
{ "decision": "APPROVE" }
```

## Tests and checks

```sh
cd server
npm run prisma:generate
npx prisma validate
npm run build
npm test

cd ../client
npm run build
npm run lint
```

The server test suite covers clean workflow completion, agent failure and retry behavior, and both autonomy modes.

## Assumptions and limitations

- Agent logic is deterministic mocked business logic, not KYC/AML verification. It must not be used to make real customer, regulatory, or financial decisions.
- The agents use a fixed assessment date for repeatable test/demo expiry behavior.
- Case payloads, agent findings, output, errors, and trace are stored as MySQL JSON to keep the small assessment domain flexible.
- No authentication, authorization, audit-user identity, rate limiting, file upload, encryption-at-rest configuration, or production observability has been added. These are required before any real-world use.
- Synthetic seed data is fictional and uses `.test` email addresses.

## Security

Never commit a real `.env` file or database credentials. Keep MySQL access scoped to a least-privilege application account, use TLS for production database connections, and restrict the API with authentication and role-based authorization before exposing it outside a development environment.
