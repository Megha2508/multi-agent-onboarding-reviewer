import type { AgentResult } from '../types'

interface AgentResultCardProps {
  agentName: string
  results: AgentResult[]
}

const displayName = (agentName: string) => agentName.replace('Agent', ' agent')

export function AgentResultCard({ agentName, results }: AgentResultCardProps) {
  const agentResults = results.filter((result) => result.agentName === agentName)
  const result = agentResults.at(-1)

  return (
    <article className="agent-card">
      <div className="agent-card__header">
        <div>
          <p className="eyebrow">Specialist agent</p>
          <h3>{displayName(agentName)}</h3>
        </div>
        {result && <span className={`status-pill ${result.status.toLowerCase()}`}>{result.status}</span>}
      </div>
      {!result ? (
        <p className="muted">No result has been recorded for this agent.</p>
      ) : (
        <>
          <div className="agent-card__metrics">
            <span>Confidence <strong>{Math.round(result.confidence * 100)}%</strong></span>
            <span>Attempt <strong>{result.attempt}</strong></span>
          </div>
          {result.error && <p className="error-copy">{result.error.message}</p>}
          <ul className="finding-list">
            {result.findings.map((finding) => (
              <li key={`${finding.code}-${finding.message}`}>
                <span className={`severity-dot ${finding.severity}`} aria-hidden="true" />
                <div>
                  <strong>{finding.code}</strong>
                  <p>{finding.message}</p>
                </div>
                <span className={`severity-pill ${finding.severity}`}>{finding.severity}</span>
              </li>
            ))}
          </ul>
          {agentResults.length > 1 && <p className="muted retry-note">Includes {agentResults.length} recorded attempts.</p>}
        </>
      )}
    </article>
  )
}
