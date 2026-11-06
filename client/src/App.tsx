import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, BriefcaseBusiness, CheckCircle2, CircleUserRound, FileText, LoaderCircle, MapPin, Play, RefreshCw, ShieldCheck, UserRoundCheck } from 'lucide-react'
import { api } from './api'
import { AgentResultCard } from './components/AgentResultCard'
import { CaseList } from './components/CaseList'
import { DetailSection } from './components/DetailSection'
import type { AutonomyMode, CaseRecord, Recommendation, WorkflowRun } from './types'
import './App.css'

const agentNames = ['IdentityAgent', 'AddressAgent', 'RiskAgent']
const humanDecisionStates = new Set(['AWAITING_HUMAN_APPROVAL', 'MANUAL_REVIEW'])
const formatLabel = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase())
const formatAddress = (address: { line1: string; line2?: string; city: string; state?: string; postalCode: string; country: string }) =>
  [address.line1, address.line2, address.city, address.state, address.postalCode, address.country].filter(Boolean).join(', ')
const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : 'Not provided')

function App() {
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null)
  const [autonomyMode, setAutonomyMode] = useState<AutonomyMode>('REVIEW_ON_EXCEPTION')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCase, setIsLoadingCase] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshCases = useCallback(async () => {
    const records = await api.listCases()
    setCases(records)
    return records
  }, [])

  const loadCase = useCallback(async (caseId: string) => {
    setIsLoadingCase(true)
    setError(null)
    try {
      setSelectedCase(await api.getCase(caseId))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the selected case.')
    } finally {
      setIsLoadingCase(false)
    }
  }, [])

  const initialize = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const records = await refreshCases()
      if (records[0] !== undefined) await loadCase(records[0].id)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load onboarding cases.')
    } finally {
      setIsLoading(false)
    }
  }, [loadCase, refreshCases])

  useEffect(() => {
    let isCurrent = true
    const loadInitialCases = async () => {
      try {
        const records = await api.listCases()
        if (!isCurrent) return
        setCases(records)
        if (records[0] !== undefined) {
          const record = await api.getCase(records[0].id)
          if (isCurrent) setSelectedCase(record)
        }
      } catch (loadError) {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : 'Unable to load onboarding cases.')
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }
    void loadInitialCases()
    return () => { isCurrent = false }
  }, [])

  const workflow = useMemo<WorkflowRun | undefined>(() => selectedCase?.workflowRuns[0], [selectedCase])

  const runReview = async () => {
    if (selectedCase === null) return
    setIsWorking(true)
    setError(null)
    try {
      await api.startReview(selectedCase.id, autonomyMode)
      await refreshCases()
      await loadCase(selectedCase.id)
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Unable to start review.')
    } finally {
      setIsWorking(false)
    }
  }

  const recordDecision = async (decision: Recommendation) => {
    if (workflow === undefined || selectedCase === null) return
    setIsWorking(true)
    setError(null)
    try {
      await api.recordDecision(workflow.id, decision)
      await refreshCases()
      await loadCase(selectedCase.id)
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Unable to record the decision.')
    } finally {
      setIsWorking(false)
    }
  }

  if (isLoading) return <main className="page-state" aria-live="polite"><LoaderCircle className="spin" size={28} /><p>Loading onboarding cases…</p></main>

  return (
    <main className="dashboard">
      <header className="app-header">
        <div><p className="eyebrow">Operations workspace</p><h1>Onboarding case reviewer</h1><p className="subtitle">Evidence-led review with deterministic specialist agents.</p></div>
        <button className="secondary-button" onClick={() => void initialize()} type="button" disabled={isLoadingCase || isWorking}><RefreshCw size={16} /> Refresh</button>
      </header>
      {error && <div className="error-banner" role="alert"><AlertCircle size={18} /><span>{error}</span><button onClick={() => setError(null)} type="button" aria-label="Dismiss error">×</button></div>}
      <div className="dashboard-grid">
        <aside><CaseList cases={cases} selectedId={selectedCase?.id} onSelect={(caseId) => void loadCase(caseId)} /></aside>
        <section className="assessment-area" aria-live="polite">
          {isLoadingCase ? <div className="panel-state"><LoaderCircle className="spin" size={24} /> Loading case…</div> : selectedCase === null ? <div className="panel-state"><FileText size={28} /> Select a case to begin its review.</div> : (
            <CaseDashboard caseRecord={selectedCase} workflow={workflow} autonomyMode={autonomyMode} isWorking={isWorking} onAutonomyModeChange={setAutonomyMode} onRunReview={() => void runReview()} onDecision={(decision) => void recordDecision(decision)} />
          )}
        </section>
      </div>
    </main>
  )
}

interface CaseDashboardProps {
  caseRecord: CaseRecord
  workflow?: WorkflowRun
  autonomyMode: AutonomyMode
  isWorking: boolean
  onAutonomyModeChange: (mode: AutonomyMode) => void
  onRunReview: () => void
  onDecision: (decision: Recommendation) => void
}

function CaseDashboard({ caseRecord, workflow, autonomyMode, isWorking, onAutonomyModeChange, onRunReview, onDecision }: CaseDashboardProps) {
  const onboardingCase = caseRecord.payload
  const isAwaitingDecision = workflow !== undefined && humanDecisionStates.has(workflow.status)
  const approveDisabled = workflow?.agentResults.some((result) => result.status === 'FAILED') ?? false
  const income = onboardingCase.employment.annualIncome

  return <>
    <section className="case-header panel"><div><p className="eyebrow">Case {caseRecord.id}</p><h2>{onboardingCase.customer.fullName}</h2><p className="muted">Submitted {formatDate(onboardingCase.submittedAt)}</p></div>{workflow && <span className={`status-pill prominent ${workflow.status.toLowerCase()}`}>{formatLabel(workflow.status)}</span>}</section>
    <section className="review-controls panel">
      <div><p className="eyebrow">Review configuration</p><h3>Autonomy mode</h3></div>
      <div className="mode-options">
        <label className={autonomyMode === 'REVIEW_ON_EXCEPTION' ? 'mode-option is-selected' : 'mode-option'}><input checked={autonomyMode === 'REVIEW_ON_EXCEPTION'} name="autonomy-mode" onChange={() => onAutonomyModeChange('REVIEW_ON_EXCEPTION')} type="radio" /><span><strong>Review on exception</strong><small>Completes only a clean, high-confidence case.</small></span></label>
        <label className={autonomyMode === 'HUMAN_APPROVAL_REQUIRED' ? 'mode-option is-selected' : 'mode-option'}><input checked={autonomyMode === 'HUMAN_APPROVAL_REQUIRED'} name="autonomy-mode" onChange={() => onAutonomyModeChange('HUMAN_APPROVAL_REQUIRED')} type="radio" /><span><strong>Human approval required</strong><small>Always pauses for a human decision.</small></span></label>
      </div>
      <button className="primary-button" disabled={isWorking} onClick={onRunReview} type="button">{isWorking ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />} Start review</button>
    </section>
    <section className="details-grid" aria-label="Customer evidence">
      <DetailSection title="Customer profile"><Info icon={<CircleUserRound size={18} />} label="Customer ID" value={onboardingCase.customer.customerId} /><Info icon={<UserRoundCheck size={18} />} label="Date of birth" value={formatDate(onboardingCase.customer.dateOfBirth)} /><Info icon={<FileText size={18} />} label="Email" value={onboardingCase.customer.email ?? 'Not provided'} /></DetailSection>
      <DetailSection title="Identity document"><Info icon={<ShieldCheck size={18} />} label="Type" value={formatLabel(onboardingCase.identityDocument.type)} /><Info icon={<FileText size={18} />} label="Document number" value={onboardingCase.identityDocument.documentNumber} /><Info icon={<CheckCircle2 size={18} />} label="Valid / expiry" value={`${onboardingCase.identityDocument.isValid ? 'Valid' : 'Invalid'} · ${formatDate(onboardingCase.identityDocument.expiryDate)}`} /></DetailSection>
      <DetailSection title="Residential address"><Info icon={<MapPin size={18} />} label="Customer" value={formatAddress(onboardingCase.customer.residentialAddress)} /><Info icon={<FileText size={18} />} label="Proof" value={`${formatLabel(onboardingCase.addressProof.type)} · ${formatAddress(onboardingCase.addressProof.address)}`} /><Info icon={<CheckCircle2 size={18} />} label="Proof status" value={onboardingCase.addressProof.isValid ? 'Valid' : 'Invalid'} /></DetailSection>
      <DetailSection title="Employment & company"><Info icon={<BriefcaseBusiness size={18} />} label="Employment" value={formatLabel(onboardingCase.employment.status)} /><Info icon={<BriefcaseBusiness size={18} />} label="Employer" value={onboardingCase.employment.employerName ?? 'Not provided'} /><Info icon={<FileText size={18} />} label="Annual income" value={income === undefined ? 'Not provided' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(income)} />{onboardingCase.company && <Info icon={<BriefcaseBusiness size={18} />} label="Company" value={`${onboardingCase.company.legalName} · ${onboardingCase.company.isRegistered ? 'Registered' : 'Unregistered'}`} />}</DetailSection>
    </section>
    <DetailSection title="Risk indicators">{onboardingCase.riskIndicators.length === 0 ? <p className="muted">No risk indicators were supplied with this case.</p> : <ul className="risk-list">{onboardingCase.riskIndicators.map((indicator) => <li key={indicator.code}><span className={`severity-pill ${indicator.severity}`}>{indicator.severity}</span><div><strong>{indicator.code}</strong><p>{indicator.description}</p></div><span className="muted">{indicator.isActive ? 'Active' : 'Inactive'}</span></li>)}</ul>}</DetailSection>
    <section className="results-section"><div className="section-heading"><p className="eyebrow">Assessment output</p><h2>Agent results</h2></div><div className="agent-grid">{agentNames.map((agentName) => <AgentResultCard agentName={agentName} key={agentName} results={workflow?.agentResults ?? []} />)}</div></section>
    <section className="workflow-grid">
      <article className="recommendation-card panel"><p className="eyebrow">Final recommendation</p>{workflow ? <><div className="recommendation-card__headline"><h2>{workflow.recommendation ?? 'PENDING'}</h2><span className={`status-pill prominent ${workflow.status.toLowerCase()}`}>{formatLabel(workflow.status)}</span></div><p>{workflow.explanation ?? 'The workflow has not produced an explanation yet.'}</p>{workflow.confidence !== null && <p className="confidence-line">Workflow confidence <strong>{Math.round(workflow.confidence * 100)}%</strong></p>}{isAwaitingDecision && <div className="decision-controls"><p>Human decision required</p><button className="approve-button" disabled={isWorking || approveDisabled} onClick={() => onDecision('APPROVE')} type="button">Approve</button><button className="reject-button" disabled={isWorking} onClick={() => onDecision('REJECT')} type="button">Reject</button>{approveDisabled && <small>A failed agent check cannot be approved.</small>}</div>}</> : <p className="muted">Start a review to receive a recommendation and workflow state.</p>}</article>
      <article className="trace-card panel"><p className="eyebrow">Audit trail</p><h2>Execution trace</h2>{workflow?.trace.length ? <ol className="trace-list">{workflow.trace.map((trace, index) => <li key={`${trace.step}-${trace.occurredAt}-${index}`}><span className={`trace-marker ${trace.status.toLowerCase()}`} /><div><strong>{trace.step}</strong><p>{trace.message}</p><time>{new Date(trace.occurredAt).toLocaleTimeString()}</time></div></li>)}</ol> : <p className="muted">No execution trace has been recorded.</p>}</article>
    </section>
  </>
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="info-row"><span className="info-row__icon">{icon}</span><span className="info-row__label">{label}</span><span className="info-row__value">{value}</span></div>
}

export default App
