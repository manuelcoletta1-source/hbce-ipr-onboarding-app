import { LEGAL_BOUNDARY_TEXT } from "@/lib/constants";
import { formatDate, formatHashReference } from "@/lib/format";

import type { IprCardRecord } from "@/lib/types";

import { BoundaryNotice } from "@/components/BoundaryNotice";
import { StatusBadge } from "@/components/StatusBadge";

type IPRCardPreviewProps = {
  card: IprCardRecord;
};

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
      </div>

      <div style={{ marginTop: "18px" }}>
        <BoundaryNotice title="Legal boundary">
          {LEGAL_BOUNDARY_TEXT}
        </BoundaryNotice>
      </div>
    </section>
  );
}
