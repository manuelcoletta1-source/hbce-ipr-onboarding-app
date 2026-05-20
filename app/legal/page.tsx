import Link from "next/link";

import {
  CERTIFICATE_BOUNDARY_TEXT,
  LEGAL_BOUNDARY_TEXT,
  NON_REPLACEMENT_BOUNDARY,
  PRODUCT_FORMULA,
  ROUTES
} from "@/lib/constants";

import { BoundaryNotice } from "@/components/BoundaryNotice";

export default function LegalPage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Legal Boundary</p>

        <h1 className="hbce-title">Operational identity, not public identity.</h1>

        <p className="hbce-lead">
          HBCE IPR Onboarding App creates an internal verifiable operational
          identity record for governed access inside the HBCE ecosystem. It does
          not issue official public identity credentials.
        </p>
      </section>

      <section className="hbce-section">
        <BoundaryNotice title="Primary legal boundary">
          {LEGAL_BOUNDARY_TEXT}
        </BoundaryNotice>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <h2>Correct claim</h2>
            <p>
              HBCE issues an internal verifiable operational identity record
              that connects subject, verification state, IPR Card, operational
              certificate, access scope and audit continuity.
            </p>
          </div>

          <div className="hbce-card">
            <h2>Incorrect claim</h2>
            <p>
              HBCE does not issue official European identity, does not replace
              national identity systems and does not replace regulated digital
              identity providers.
            </p>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <h2>Non-replacement boundary</h2>
          <p>
            HBCE IPR Onboarding App does not replace the following official or
            regulated systems.
          </p>

          <ul className="hbce-list">
            {NON_REPLACEMENT_BOUNDARY.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--3">
          <div className="hbce-card">
            <h3>IPR</h3>
            <p>
              IPR means Identity Primary Record. It is an internal operational
              identity record, not a state identity document.
            </p>
          </div>

          <div className="hbce-card">
            <h3>IPR Card</h3>
            <p>
              IPR Card is the internal operational key for HBCE access. It does
              not replace public identity documents.
            </p>
          </div>

          <div className="hbce-card">
            <h3>Operational Certificate</h3>
            <p>{CERTIFICATE_BOUNDARY_TEXT}</p>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card hbce-card--soft">
          <h2>Product formula</h2>

          <ul className="hbce-list">
            {PRODUCT_FORMULA.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <h2>Bank-grade does not mean banking service</h2>
          <p>
            The application may use a bank-grade onboarding posture because it
            requires structured identity verification before access. This does
            not mean that HBCE provides bank accounts, deposits, payment
            services, financial products, lending, custody or regulated
            financial services.
          </p>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-actions">
          <Link className="hbce-btn" href={ROUTES.privacy}>
            View Privacy Boundary
          </Link>

          <Link className="hbce-btn" href={ROUTES.security}>
            View Security Boundary
          </Link>

          <Link className="hbce-btn hbce-btn--primary" href={ROUTES.onboarding}>
            Return to Onboarding
          </Link>
        </div>
      </section>
    </div>
  );
}
