import Link from "next/link";

import { LEGAL_BOUNDARY_TEXT, ROUTES } from "@/lib/constants";
import {
  approvedIprCardRecord,
  approvedOnboardingRecord
} from "@/lib/mock-onboarding";

import { BoundaryNotice } from "@/components/BoundaryNotice";
import { IPRCardPreview } from "@/components/IPRCardPreview";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { StatusBadge } from "@/components/StatusBadge";

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
            <h2>Issuance conditions</h2>
            <p>
              IPR Card issuance requires verified IPR status and clear
              revocation state. The card does not expose raw identity data,
              document numbers, fiscal identifiers, photos, videos or biometric
              material.
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
                  <StatusBadge status={approvedOnboardingRecord.revocationState} />
                </span>
              </div>
            </div>
          </div>

          <div className="hbce-card">
            <h2>Operational meaning</h2>
            <p>
              The IPR Card is the operational key inside the HBCE ecosystem. It
              does not replace official identity documents and does not grant
              public legal identity status by itself.
            </p>

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
