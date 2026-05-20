import Link from "next/link";

import { ROUTES, SECURITY_BOUNDARY_TEXT } from "@/lib/constants";
import {
  approvedOnboardingRecord,
  deniedOnboardingRecord,
  pendingOnboardingRecord,
  revokedOnboardingRecord
} from "@/lib/mock-onboarding";

import { BoundaryNotice } from "@/components/BoundaryNotice";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { StatusBadge } from "@/components/StatusBadge";

const reviewCases = [
  {
    title: "Approved case",
    description:
      "All required onboarding states are valid. The subject may proceed to IPR Card issuance.",
    record: approvedOnboardingRecord
  },
  {
    title: "Pending case",
    description:
      "The onboarding case is still under review. JOKER-C2 access remains denied.",
    record: pendingOnboardingRecord
  },
  {
    title: "Denied case",
    description:
      "The onboarding case failed verification. IPR Verified cannot be issued.",
    record: deniedOnboardingRecord
  },
  {
    title: "Revoked case",
    description:
      "The operational identity state has been revoked. Revocation overrides previous approval.",
    record: revokedOnboardingRecord
  }
];

export default function OnboardingReviewPage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Step 06 · Review</p>

        <h1 className="hbce-title">Review the onboarding case.</h1>

        <p className="hbce-lead">
          Review is the decision layer between submitted onboarding data and IPR
          Verified status. Only an approved review can create verified IPR,
          enable IPR Card issuance and prepare the operational certificate path.
        </p>
      </section>

      <section className="hbce-section">
        <div className="hbce-card hbce-card--soft">
          <p className="hbce-kicker">Fail-closed review rule</p>
          <h2>Only approved review state may create IPR Verified.</h2>
          <p>
            Pending, rejected, expired, suspended or revoked states keep
            JOKER-C2 access denied. Review cannot be bypassed by frontend state,
            button clicks, query parameters or local storage.
          </p>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          {reviewCases.map((item) => (
            <div className="hbce-card" key={item.title}>
              <div className="hbce-card-preview__top">
                <div>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                </div>

                <StatusBadge status={item.record.reviewStatus} />
              </div>

              <div className="hbce-divider" />

              <div className="hbce-card-preview__meta">
                <div className="hbce-meta">
                  <span className="hbce-meta__label">Onboarding</span>
                  <span className="hbce-meta__value">
                    <StatusBadge status={item.record.onboardingStatus} />
                  </span>
                </div>

                <div className="hbce-meta">
                  <span className="hbce-meta__label">Identity data</span>
                  <span className="hbce-meta__value">
                    <StatusBadge status={item.record.identityDataStatus} />
                  </span>
                </div>

                <div className="hbce-meta">
                  <span className="hbce-meta__label">Document</span>
                  <span className="hbce-meta__value">
                    <StatusBadge status={item.record.documentStatus} />
                  </span>
                </div>

                <div className="hbce-meta">
                  <span className="hbce-meta__label">Fiscal identifier</span>
                  <span className="hbce-meta__value">
                    <StatusBadge status={item.record.fiscalIdentifierStatus} />
                  </span>
                </div>

                <div className="hbce-meta">
                  <span className="hbce-meta__label">Photo</span>
                  <span className="hbce-meta__value">
                    <StatusBadge status={item.record.photoVerificationStatus} />
                  </span>
                </div>

                <div className="hbce-meta">
                  <span className="hbce-meta__label">Video</span>
                  <span className="hbce-meta__value">
                    <StatusBadge status={item.record.videoVerificationStatus} />
                  </span>
                </div>

                <div className="hbce-meta">
                  <span className="hbce-meta__label">IPR status</span>
                  <span className="hbce-meta__value">
                    <StatusBadge status={item.record.iprStatus} />
                  </span>
                </div>

                <div className="hbce-meta">
                  <span className="hbce-meta__label">JOKER-C2 access</span>
                  <span className="hbce-meta__value">
                    <StatusBadge status={item.record.jokerC2AccessStatus} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <h2>Approved path</h2>
            <p>
              If review is approved, the subject can proceed to IPR Card
              issuance and operational certificate activation.
            </p>

            <div className="hbce-actions">
              <Link className="hbce-btn hbce-btn--primary" href={ROUTES.iprCard}>
                Continue to IPR Card
              </Link>
            </div>
          </div>

          <div className="hbce-card">
            <h2>Denied path</h2>
            <p>
              If review is pending, rejected, expired or revoked, access remains
              blocked and the subject cannot reach governed JOKER-C2 runtime.
            </p>

            <div className="hbce-actions">
              <Link className="hbce-btn hbce-btn--danger" href={ROUTES.jokerC2Access}>
                View denied access gate
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <h2>Current onboarding position</h2>
          <OnboardingStepper currentStep="review" />
        </div>
      </section>

      <section className="hbce-section">
        <BoundaryNotice title="Review security boundary" tone="danger">
          {SECURITY_BOUNDARY_TEXT} The review decision must be enforced by
          server-side logic in future production implementation. Client-side
          approval is never a valid source of trust.
        </BoundaryNotice>
      </section>
    </div>
  );
}
