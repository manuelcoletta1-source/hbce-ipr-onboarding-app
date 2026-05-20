import Link from "next/link";

import {
  LEGAL_BOUNDARY_TEXT,
  NON_REPLACEMENT_BOUNDARY,
  ROUTES
} from "@/lib/constants";
import {
  approvedIprCardRecord,
  approvedOnboardingRecord
} from "@/lib/mock-data";

import { BoundaryNotice } from "@/components/BoundaryNotice";
import { IPRCardPreview } from "@/components/IPRCardPreview";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { StatusBadge } from "@/components/StatusBadge";

const ISSUANCE_CONDITIONS = [
  "Review status must be approved",
  "IPR status must be verified",
  "IPR Card status must be issued",
  "Revocation state must be clear",
  "Raw identity material must not be exposed"
] as const;

export default function IPRCardPage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Step 07 · IPR Card</p>

        <h1 className="hbce-title">Issue the operational identity card.</h1>

        <p className="hbce-lead">
          The IPR Card is the internal HBCE operational identity credential
          issued after verified IPR status. It connects the subject to access
          scope, certificate reference, revocation state and governed JOKER-C2
          authorization.
        </p>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">Issuance conditions</p>
            <h2>IPR Card issuance requires verified IPR.</h2>

            <p>
              IPR Card issuance requires approved review, verified IPR status
              and clear revocation state. The card does not expose raw identity
              data, document numbers, fiscal identifiers, photos, videos or
              biometric material.
            </p>

            <div className="hbce-card-preview__meta">
              <div className="hbce-meta">
                <span className="hbce-meta__label">Review status</span>
                <span className="hbce-meta__value">
                  <StatusBadge status={approvedOnboardingRecord.reviewStatus} />
                </span>
              </div>

              <div className="hbce-meta">
                <span className="hbce-meta__label">IPR status</span>
                <span className="hbce-meta__value">
                  <StatusBadge status={approvedOnboardingRecord.iprStatus} />
                </span>
              </div>

              <div className="hbce-meta">
                <span className="hbce-meta__label">Card status</span>
                <span className="hbce-meta__value">
                  <StatusBadge status={approvedOnboardingRecord.iprCardStatus} />
                </span>
              </div>

              <div className="hbce-meta">
                <span className="hbce-meta__label">Revocation state</span>
                <span className="hbce-meta__value">
                  <StatusBadge
                    status={approvedOnboardingRecord.revocationState}
                  />
                </span>
              </div>
            </div>

            <div className="hbce-divider" />

            <ul className="hbce-list">
              {ISSUANCE_CONDITIONS.map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ul>
          </div>

          <div className="hbce-card">
            <p className="hbce-kicker">Operational meaning</p>
            <h2>IPR Card is the operational key.</h2>

            <p>
              The IPR Card is the operational key inside the HBCE ecosystem. It
              links the verified subject to an internal access scope and prepares
              the certificate step, but it does not replace official public
              identity systems.
            </p>

            <div className="hbce-divider" />

            <h3>It does not replace</h3>
            <ul className="hbce-list">
              {NON_REPLACEMENT_BOUNDARY.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <div className="hbce-actions">
              <Link className="hbce-btn" href={ROUTES.onboardingReview}>
                Back to Review
              </Link>

              <Link
                className="hbce-btn hbce-btn--primary"
                href={ROUTES.certificate}
              >
                Continue to Certificate
              </Link>
            </div>
          </div>
        </div>
      </section>

      <IPRCardPreview card={approvedIprCardRecord} />

      <section className="hbce-section">
        <div className="hbce-card">
          <h2>Current onboarding position</h2>
          <OnboardingStepper currentStep="ipr_card" />
        </div>
      </section>

      <section className="hbce-section">
        <BoundaryNotice title="IPR Card legal boundary">
          {LEGAL_BOUNDARY_TEXT}
        </BoundaryNotice>
      </section>
    </div>
  );
}
