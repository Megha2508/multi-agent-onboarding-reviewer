import type { CaseRecord } from '../types'

interface CaseListProps {
  cases: CaseRecord[]
  selectedId?: string
  onSelect: (caseId: string) => void
}

export function CaseList({ cases, selectedId, onSelect }: CaseListProps) {
  return (
    <nav className="case-list" aria-label="Onboarding cases">
      <div className="case-list__heading">
        <div>
          <p className="eyebrow">Queue</p>
          <h2>Onboarding cases</h2>
        </div>
        <span className="count-badge">{cases.length}</span>
      </div>
      {cases.length === 0 ? (
        <p className="muted empty-copy">No cases yet. Run the seed command to add synthetic assessment cases.</p>
      ) : (
        <div className="case-list__items">
          {cases.map((caseRecord) => {
            const latestWorkflow = caseRecord.workflowRuns[0]
            return (
              <button
                className={`case-list__item ${caseRecord.id === selectedId ? 'is-selected' : ''}`}
                key={caseRecord.id}
                onClick={() => onSelect(caseRecord.id)}
                type="button"
              >
                <span className="case-list__name">{caseRecord.payload.customer.fullName}</span>
                <span className="case-list__meta">{caseRecord.id}</span>
                <span className={`status-pill ${latestWorkflow ? latestWorkflow.status.toLowerCase() : 'pending'}`}>
                  {latestWorkflow?.status ?? 'PENDING'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </nav>
  )
}
