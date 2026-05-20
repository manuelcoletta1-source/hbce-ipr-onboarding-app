import Link from "next/link";

import { CERTIFICATE_BOUNDARY_TEXT, ROUTES } from "@/lib/constants";
import {
  approvedCertificateRecord,
  approvedOnboardingRecord
} from "@/lib/mock-onboarding";

import { BoundaryNotice } from "@/components/BoundaryNotice";
import { CertificatePreview } from "@/components/CertificatePreview";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { StatusBadge } from "@/components/StatusBadge";

export default function CertificatePage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Step 08 · Operational Certificate</p>

        <h1 className="hbce-title">Activate the operational certificate.</h1>

        <p className="hbce-lead">
          The operational certificate is the internal HBCE authorization
          reference that links verified IPR, issued IPR Card, access scope and
          governed JOKER-C2 access evaluation.
        </p>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card hbce-card--soft">
            <h2>Activation conditions</h2>
            <p>
              Certificate activation requires verified IPR, issued IPR Card and
              clear revocation state. Without an active certificate, JOKER-C2
              access remains denied.
            </p>

            <div className="hbce-card-preview__meta">
              <div className="hbce-meta">
                <span className="hbce-meta__label">IPR status</span>
                <span className="hbce-meta__value">
                  <StatusBadge status={approvedOnboardingRecord.iprStatus} />
                </span>
              </div>

              <div className="hbce-meta">
                <span className="hbce-meta__label">IPR Card status</span>
                <span className="hbce-meta__value">
                  <StatusBadge status={approvedOnboardingRecord.iprCardStatus} />
                </span>
              </div>

              <div className="hbce-meta">
                <span className="hbce-meta__label">Certificate status</span>
                <span className="hbce-meta__value">
                  <StatusBadge
                    status={approvedOnboardingRecord.certificateStatus}
                  />
                </span>
              </div>

              <div className="hbce-meta">
                <span className="hbce-meta__label">Revocation state</span>
                <span className="hbce-meta__value">
                  <StatusBadge status={approvedOnboardingRecord.revocationState} />
                </span>
              </div>
            </div>
          </div>

          <div className="hbce-card">
            <h2>Operational meaning</h2>
            <p>
              The certificate defines the operational authorization scope. It is
              the internal bridge between IPR Card issuance and the JOKER-C2
              access gate.
            </p>

            <div className="hbce-actions">
              <Link className="hbce-btn" href={ROUTES.iprCard}>
                Back to IPR Card
              </Link>

              <Link
                className="hbce-btn hbce-btn--primary"
                href={ROUTES.jokerC2Access}
              >
                Evaluate JOKER-C2 Access
              </Link>
            </div>
          </div>
        </div>
      </section>

      <CertificatePreview certificate={approvedCertificateRecord} />

      <section className="hbce-section">
        <div className="hbce-card">
          <h2>Current onboarding position</h2>
          <OnboardingStepper currentStep="certificate" />
        </div>
      </section>

      <section className="hbce-section">
        <BoundaryNotice title="Certificate legal boundary">
          {CERTIFICATE_BOUNDARY_TEXT}
        </BoundaryNotice>
      </section>
    </div>
  );
}
