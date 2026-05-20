import { CERTIFICATE_BOUNDARY_TEXT } from "@/lib/constants";
import { formatDate, formatHashReference } from "@/lib/format";

import type { OperationalCertificateRecord } from "@/lib/types";

import { BoundaryNotice } from "@/components/BoundaryNotice";
import { StatusBadge } from "@/components/StatusBadge";

type CertificatePreviewProps = {
  certificate: OperationalCertificateRecord;
};

export function CertificatePreview({ certificate }: CertificatePreviewProps) {
  return (
    <section className="hbce-section">
      <div className="hbce-card">
        <div className="hbce-card-preview__top">
          <div>
            <p className="hbce-kicker">Internal HBCE authorization</p>
            <h2 className="hbce-panel-title">Operational Certificate</h2>
            <p className="hbce-small">
              Internal operational certificate reference linked to verified IPR,
              IPR Card issuance and governed JOKER-C2 access scope.
            </p>
          </div>

          <StatusBadge status={certificate.certificateStatus} />
        </div>

        <div className="hbce-divider" />

        <div className="hbce-card-preview__meta">
          <div className="hbce-meta">
            <span className="hbce-meta__label">Certificate ID</span>
            <span className="hbce-meta__value hbce-mono">
              {certificate.certificateId}
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">IPR ID</span>
            <span className="hbce-meta__value hbce-mono">
              {certificate.iprId}
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">Issuer</span>
            <span className="hbce-meta__value">{certificate.issuer}</span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">Scope</span>
            <span className="hbce-meta__value hbce-mono">
              {certificate.scope}
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">Issued at</span>
            <span className="hbce-meta__value">
              {formatDate(certificate.issuedAt)}
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">Expires at</span>
            <span className="hbce-meta__value">
              {formatDate(certificate.expiresAt)}
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">Hash reference</span>
            <span className="hbce-meta__value hbce-mono">
              {formatHashReference(certificate.hashReference)}
            </span>
          </div>

          <div className="hbce-meta">
            <span className="hbce-meta__label">Revocation state</span>
            <span className="hbce-meta__value">
              <StatusBadge status={certificate.revocationState} />
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "18px" }}>
        <BoundaryNotice title="Certificate boundary">
          {CERTIFICATE_BOUNDARY_TEXT}
        </BoundaryNotice>
      </div>
    </section>
  );
}
