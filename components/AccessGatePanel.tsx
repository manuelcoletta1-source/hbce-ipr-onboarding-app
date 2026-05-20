import { formatAccessDecision, formatDate } from "@/lib/format";

import type { AccessGateResult } from "@/lib/types";

import { BoundaryNotice } from "@/components/BoundaryNotice";
import { StatusBadge } from "@/components/StatusBadge";

type AccessGatePanelProps = {
  result: AccessGateResult;
};

function getPanelClassName(result: AccessGateResult): string {
  if (result.decision === "allow_governed_access") {
    return "hbce-access-panel hbce-access-panel--allow";
  }

  return "hbce-access-panel hbce-access-panel--deny";
}

export function AccessGatePanel({ result }: AccessGatePanelProps) {
  const isAllowed = result.decision === "allow_governed_access";

  return (
    <section className="hbce-section">
      <div className={getPanelClassName(result)}>
        <div className="hbce-card-preview__top">
          <div>
            <p className="hbce-kicker">JOKER-C2 Access Gate</p>
            <h2 className="hbce-panel-title">
              {formatAccessDecision(result.decision)}
            </h2>
            <p className="hbce-small">{result.decisionReason}</p>
          </div>

          <StatusBadge status={result.decision} />
        </div>

        <div className="hbce-divider" />

        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <h3>Required conditions</h3>
            <ul className="hbce-list">
              {result.requiredConditions.map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ul>
          </div>

          <div className="hbce-card">
            <h3>Current conditions</h3>
            <ul className="hbce-list">
              {result.currentConditions.map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="hbce-divider" />

        <div className="hbce-card-preview__meta">
          <div className="hbce-meta">
            <span className="hbce-meta__label">Subject ID</span>
            <span className="hbce-meta__value hbce-mono">
              {result.subjectId}
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">IPR ID</span>
            <span className="hbce-meta__value hbce-mono">{result.iprId}</span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">IPR status</span>
            <span className="hbce-meta__value">
              <StatusBadge status={result.iprStatus} />
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">IPR Card status</span>
            <span className="hbce-meta__value">
              <StatusBadge status={result.iprCardStatus} />
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">Certificate status</span>
            <span className="hbce-meta__value">
              <StatusBadge status={result.certificateStatus} />
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">Revocation state</span>
            <span className="hbce-meta__value">
              <StatusBadge status={result.revocationState} />
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">JOKER-C2 access</span>
            <span className="hbce-meta__value">
              <StatusBadge status={result.jokerC2AccessStatus} />
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">Decision time</span>
            <span className="hbce-meta__value">
              {formatDate(result.decidedAt)}
            </span>
          </div>
        </div>

        {isAllowed ? (
          <div className="hbce-actions">
            <a
              className="hbce-btn hbce-btn--primary"
              href={result.gatewayReference}
              rel="noreferrer"
              target="_blank"
            >
              Open JOKER-C2 Governed Runtime
            </a>
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: "18px" }}>
        <BoundaryNotice
          title={isAllowed ? "Access enabled" : "Access denied by default"}
          tone={isAllowed ? "info" : "danger"}
        >
          {isAllowed
            ? "Governed access is enabled because all operational identity requirements are valid. In production, this authorization must be enforced server-side."
            : "JOKER-C2 remains blocked until verified IPR, issued IPR Card, active operational certificate and clear revocation state are present. Frontend state must never authorize runtime access."}
        </BoundaryNotice>
      </div>
    </section>
  );
}
