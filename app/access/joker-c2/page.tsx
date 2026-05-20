import Link from "next/link";

import { evaluateJokerC2Access } from "@/lib/access-decision";
import { ROUTES, SECURITY_BOUNDARY_TEXT } from "@/lib/constants";
import {
  approvedOnboardingRecord,
  deniedOnboardingRecord,
  pendingOnboardingRecord,
  revokedOnboardingRecord
} from "@/lib/mock-onboarding";

import { AccessGatePanel } from "@/components/AccessGatePanel";
import { BoundaryNotice } from "@/components/BoundaryNotice";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { StatusBadge } from "@/components/StatusBadge";

const demoCases = [
  {
    title: "Approved operational identity",
    description:
      "Verified IPR, issued IPR Card, active certificate and clear revocation state are present.",
    record: approvedOnboardingRecord
  },
  {
    title: "Pending onboarding",
    description:
      "The onboarding case is still pending. The access gate must deny JOKER-C2 access.",
    record: pendingOnboardingRecord
  },
  {
    title: "Denied onboarding",
    description:
      "The onboarding case failed verification. IPR Verified cannot be used for access.",
    record: deniedOnboardingRecord
  },
  {
    title: "Revoked operational identity",
    description:
      "The identity state is revoked. Revocation overrides every previous approval.",
    record: revokedOnboardingRecord
  }
];

export default function JokerC2AccessPage() {
  const primaryAccessResult = evaluateJokerC2Access(approvedOnboardingRecord);

  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Step 09 · JOKER-C2 Access Gate</p>

        <h1 className="hbce-title">Evaluate governed AI access.</h1>

        <p className="hbce-lead">
          JOKER-C2 access is not granted through a simple email account,
          password or subscription. The access gate evaluates verified IPR,
          issued IPR Card, active operational certificate and clear revocation
          state.
        </p>
      </section>

      <section className="hbce-section">
        <div className="hbce-card hbce-card--soft">
          <p className="hbce-kicker">Final access rule</p>
          <h2>No verified IPR, no governed JOKER-C2 access.</h2>
          <p>
            The default decision is denial. The access gate becomes permissive
            only when all required operational identity conditions are valid.
          </p>

          <div className="hbce-actions">
            <Link className="hbce-btn" href={ROUTES.certificate}>
              Back to Certificate
            </Link>

            <Link className="hbce-btn" href={ROUTES.onboarding}>
              View Onboarding Flow
            </Link>
          </div>
        </div>
      </section>

      <AccessGatePanel result={primaryAccessResult} />

      <section className="hbce-section">
        <div className="hbce-card">
          <h2>Demo access decisions</h2>
          <p>
            These mock states prove that the access gate is not decorative. Only
            the approved operational identity produces allow_governed_access.
          </p>

          <div className="hbce-grid hbce-grid--2" style={{ marginTop: "18px" }}>
            {demoCases.map((item) => {
              const result = evaluateJokerC2Access(item.record);

              return (
                <div className="hbce-card" key={item.title}>
                  <div className="hbce-card-preview__top">
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>

                    <StatusBadge status={result.decision} />
                  </div>

                  <div className="hbce-divider" />

                  <div className="hbce-card-preview__meta">
                    <div className="hbce-meta">
                      <span className="hbce-meta__label">IPR status</span>
                      <span className="hbce-meta__value">
                        <StatusBadge status={item.record.iprStatus} />
                      </span>
                    </div>

                    <div className="hbce-meta">
                      <span className="hbce-meta__label">IPR Card</span>
                      <span className="hbce-meta__value">
                        <StatusBadge status={item.record.iprCardStatus} />
                      </span>
                    </div>

                    <div className="hbce-meta">
                      <span className="hbce-meta__label">Certificate</span>
                      <span className="hbce-meta__value">
                        <StatusBadge status={item.record.certificateStatus} />
                      </span>
                    </div>

                    <div className="hbce-meta">
                      <span className="hbce-meta__label">Revocation</span>
                      <span className="hbce-meta__value">
                        <StatusBadge status={item.record.revocationState} />
                      </span>
                    </div>
                  </div>

                  <div className="hbce-divider" />

                  <p className="hbce-small">{result.decisionReason}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <h2>Current onboarding position</h2>
          <OnboardingStepper currentStep="joker_c2_access" />
        </div>
      </section>

      <section className="hbce-section">
        <BoundaryNotice title="Access gate security boundary" tone="danger">
          {SECURITY_BOUNDARY_TEXT} The future production access gate must be
          enforced server-side. Browser state, local storage, query parameters
          and frontend-only approval must never authorize JOKER-C2.
        </BoundaryNotice>
      </section>
    </div>
  );
}
