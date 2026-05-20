import Link from "next/link";

import {
  CORE_PRODUCT_RULE,
  PRIVACY_BOUNDARY_TEXT,
  ROUTES,
  SECURITY_BOUNDARY_TEXT
} from "@/lib/constants";

import { BoundaryNotice } from "@/components/BoundaryNotice";
import { OnboardingStepper } from "@/components/OnboardingStepper";

export default function OnboardingPage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Onboarding sequence</p>

        <h1 className="hbce-title">Start the IPR verification path.</h1>

        <p className="hbce-lead">
          The onboarding flow prepares the subject for IPR Verified status, IPR
          Card issuance, operational certificate activation and governed
          JOKER-C2 access. The default access state remains denied until all
          required operational conditions are valid.
        </p>

        <div className="hbce-actions">
          <Link
            className="hbce-btn hbce-btn--primary"
            href={ROUTES.onboardingStart}
          >
            Start Onboarding
          </Link>

          <Link className="hbce-btn" href={ROUTES.jokerC2Access}>
            View Access Gate
          </Link>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card hbce-card--soft">
          <p className="hbce-kicker">Access rule</p>
          <h2>{CORE_PRODUCT_RULE}</h2>
          <p>
            This app does not grant JOKER-C2 access after a simple account
            registration. The subject must complete operational identity
            verification and pass the access gate.
          </p>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--3">
          <div className="hbce-card">
            <h2>1. Collect</h2>
            <p>
              The app collects registration data, identity data, official
              document metadata, fiscal identifier metadata and photo/video
              verification status.
            </p>
          </div>

          <div className="hbce-card">
            <h2>2. Review</h2>
            <p>
              The onboarding case enters review. Only approved review state can
              create IPR Verified status inside the HBCE operational framework.
            </p>
          </div>

          <div className="hbce-card">
            <h2>3. Authorize</h2>
            <p>
              IPR Card and operational certificate prepare the subject for
              JOKER-C2 access, but the access gate still denies by default.
            </p>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <h2>Canonical onboarding path</h2>
          <p>
            Every step has an operational purpose. In the MVP, the flow uses
            mock states only; in future implementation, the same structure can
            connect to secure storage, verification providers, EVT, OPC and the
            JOKER-C2 runtime bridge.
          </p>

          <div style={{ marginTop: "18px" }}>
            <OnboardingStepper currentStep="start" />
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <BoundaryNotice title="Privacy boundary">
            {PRIVACY_BOUNDARY_TEXT}
          </BoundaryNotice>

          <BoundaryNotice title="Security boundary">
            {SECURITY_BOUNDARY_TEXT}
          </BoundaryNotice>
        </div>
      </section>
    </div>
  );
}
