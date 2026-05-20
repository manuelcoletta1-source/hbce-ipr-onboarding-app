import Link from "next/link";

import {
  CLASSIC_AI_ACCESS_MODEL,
  CORE_PRODUCT_RULE,
  HBCE_GOVERNED_ACCESS_MODEL,
  LEGAL_BOUNDARY_TEXT,
  PUBLIC_WEBSITE_FORMULA,
  ROUTES
} from "@/lib/constants";

import { BoundaryNotice } from "@/components/BoundaryNotice";
import { OnboardingStepper } from "@/components/OnboardingStepper";

export default function HomePage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">IPR Onboarding Gateway</p>

        <h1 className="hbce-title">
          Operational identity before governed AI access.
        </h1>

        <p className="hbce-lead">
          HBCE IPR Onboarding App verifies the subject before access to
          JOKER-C2. An email is not enough. A subscription is not enough.
          Governed AI access requires verified operational identity.
        </p>

        <div className="hbce-actions">
          <Link className="hbce-btn hbce-btn--primary" href={ROUTES.onboarding}>
            Start IPR Onboarding
          </Link>

          <Link className="hbce-btn" href={ROUTES.legal}>
            View Legal Boundary
          </Link>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card hbce-card--soft">
          <p className="hbce-kicker">Core rule</p>
          <h2>{CORE_PRODUCT_RULE}</h2>
          <p>{PUBLIC_WEBSITE_FORMULA}</p>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <h2>Classic AI access</h2>
            <p>
              Generic AI platforms usually reduce access to account creation,
              authentication and payment.
            </p>

            <ul className="hbce-list">
              {CLASSIC_AI_ACCESS_MODEL.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="hbce-card hbce-card--soft">
            <h2>HBCE governed AI access</h2>
            <p>
              HBCE separates ordinary login from operational authorization.
              Access follows identity verification and internal IPR issuance.
            </p>

            <ul className="hbce-list">
              {HBCE_GOVERNED_ACCESS_MODEL.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <h2>Onboarding sequence</h2>
            <p>
              The user is not simply registered. The subject is onboarded,
              reviewed and connected to an operational identity state before
              JOKER-C2 can open.
            </p>
          </div>

          <div className="hbce-card">
            <h2>Fail-closed access</h2>
            <p>
              If IPR status is incomplete, IPR Card is missing, certificate is
              inactive or revocation state is not clear, access remains denied.
            </p>
          </div>
        </div>

        <div style={{ marginTop: "18px" }}>
          <OnboardingStepper currentStep="start" />
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--3">
          <div className="hbce-card">
            <h3>IPR Verified</h3>
            <p>
              Internal operational identity status assigned after onboarding,
              document metadata, fiscal identifier linkage, photo/video step and
              review.
            </p>
          </div>

          <div className="hbce-card">
            <h3>IPR Card</h3>
            <p>
              Internal HBCE operational identity credential used as the key for
              governed runtime authorization.
            </p>
          </div>

          <div className="hbce-card">
            <h3>JOKER-C2 Access Gate</h3>
            <p>
              Final decision layer that allows or denies governed AI runtime
              access based on verified operational state.
            </p>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <BoundaryNotice title="Legal boundary">
          {LEGAL_BOUNDARY_TEXT}
        </BoundaryNotice>
      </section>
    </div>
  );
}
