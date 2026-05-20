import { LEGAL_BOUNDARY_TEXT } from "@/lib/constants";
import { formatDate, formatHashReference } from "@/lib/format";

import type { IprCardRecord } from "@/lib/types";

import { BoundaryNotice } from "@/components/BoundaryNotice";
import { StatusBadge } from "@/components/StatusBadge";

type IPRCardPreviewProps = {
  card: IprCardRecord;
};

const CARD_BOUNDARY_ITEMS = [
  "Internal HBCE operational credential",
  "Connected to verified IPR status",
  "Linked to operational certificate reference",
  "Controlled by revocation state",
  "Does not expose raw identity material"
] as const;

export function IPRCardPreview({ card }: IPRCardPreviewProps) {
  return (
    <section className="hbce-section">
      <div className="hbce-card-preview">
        <div className="hbce-card-preview__top">
          <div>
            <p className="hbce-kicker">Internal operational identity</p>
            <h2 className="hbce-card-preview__title">IPR Card</h2>
            <p className="hbce-small">
              Operational identity credential issued inside the HBCE ecosystem.
              It connects verified IPR status to access scope, certificate
              reference, revocation state and governed runtime authorization.
            </p>
          </div>

          <StatusBadge status={card.cardStatus} />
        </div>

        <div className="hbce-card-preview__meta">
          <div className="hbce-meta">
            <span className="hbce-meta__label">IPR Card ID</span>
            <span className="hbce-meta__value hbce-mono">
              {card.iprCardId}
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">IPR ID</span>
            <span className="hbce-meta__value hbce-mono">{card.iprId}</span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">Subject ID</span>
            <span className="hbce-meta__value hbce-mono">
              {card.subjectId}
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">Issuer</span>
            <span className="hbce-meta__value">{card.issuer}</span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">Access scope</span>
            <span className="hbce-meta__value hbce-mono">
              {card.accessScope}
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">Card status</span>
            <span className="hbce-meta__value">
              <StatusBadge status={card.cardStatus} />
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">Issued at</span>
            <span className="hbce-meta__value">
              {formatDate(card.issuedAt)}
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">Expires at</span>
            <span className="hbce-meta__value">
              {formatDate(card.expiresAt)}
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">Certificate reference</span>
            <span className="hbce-meta__value hbce-mono">
              {card.certificateReference}
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">Revocation state</span>
            <span className="hbce-meta__value">
              <StatusBadge status={card.revocationState} />
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">Card hash reference</span>
            <span className="hbce-meta__value hbce-mono">
              {formatHashReference(card.cardHashReference)}
            </span>
          </div>
        </div>

        <div className="hbce-divider" />

        <ul className="hbce-list">
          {CARD_BOUNDARY_ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: "18px" }}>
        <BoundaryNotice title="IPR Card legal boundary">
          {LEGAL_BOUNDARY_TEXT}
        </BoundaryNotice>
      </div>
    </section>
  );
}
