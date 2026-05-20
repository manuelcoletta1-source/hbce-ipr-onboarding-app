import Link from "next/link";

import {
  CERTIFICATE_BOUNDARY_TEXT,
  CORRECT_LEGAL_CLAIM,
  INCORRECT_LEGAL_CLAIM,
  LEGAL_BOUNDARY_TEXT,
  NON_REPLACEMENT_BOUNDARY,
  PRODUCT_FORMULA,
  ROUTES
} from "@/lib/constants";

import { BoundaryNotice } from "@/components/BoundaryNotice";

const LEGAL_SCOPE_ITEMS = [
  "Internal operational identity record",
  "IPR Verified status inside the HBCE framework",
  "IPR Card as internal operational credential",
  "Operational certificate reference",
  "Governed JOKER-C2 access evaluation",
  "Audit-oriented continuity references"
] as const;

const NOT_A_SERVICE_ITEMS = [
  "No banking account issuance",
  "No payment account issuance",
  "No deposits",
  "No lending",
  "No custody of financial assets",
  "No regulated financial product",
  "No qualified trust service claim"
] as const;

export default function LegalPage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Legal Boundary</p>

        <h1 className="hbce-title">
          Operational identity, not public identity.
        </h1>

        <p className="hbce-lead">
          HBCE IPR Onboarding App creates an internal verifiable operational
          identity record for governed access inside the HBCE ecosystem. It does
          not issue official public identity credentials, state identity
          documents, regulated financial services or qualified trust services.
        </p>
      </section>

      <section className="hbce-section">
        <BoundaryNotice title="Primary legal boundary">
          {LEGAL_BOUNDARY_TEXT}
        </BoundaryNotice>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">Correct claim</p>
            <h2>Verifiable operational identity</h2>
            <p>{CORRECT_LEGAL_CLAIM}</p>

            <div className="hbce-divider" />

            <ul className="hbce-list">
              {LEGAL_SCOPE_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="hbce-card">
            <p className="hbce-kicker">Incorrect claim</p>
            <h2>No official public identity issuance</h2>
            <p>{INCORRECT_LEGAL_CLAIM}</p>

            <div className="hbce-divider" />

            <p>
              HBCE does not replace national identity systems, public identity
              authorities, regulated digital identity providers, recognized
              trust service providers or public-sector identity issuance.
            </p>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <p className="hbce-kicker">Non-replacement boundary</p>
          <h2>Systems and services not replaced by HBCE IPR Card</h2>

          <p>
            HBCE IPR Onboarding App does not replace the following official,
            public or regulated systems.
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
              identity record that links subject, verification state, access
              scope and audit continuity. It is not a state identity document.
            </p>
          </div>

          <div className="hbce-card">
            <h3>IPR Card</h3>
            <p>
              IPR Card is the internal operational key for HBCE access. It can
              represent verified operational status inside the HBCE framework,
              but it does not replace public identity documents.
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
          <p className="hbce-kicker">Product formula</p>
          <h2>HBCE access sequence</h2>

          <ul className="hbce-list">
            {PRODUCT_FORMULA.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <p className="hbce-kicker">Bank-grade boundary</p>
          <h2>Bank-grade onboarding does not mean banking service.</h2>

          <p>
            The application may use a bank-grade onboarding posture because it
            requires structured identity verification before governed AI access.
            This does not mean that HBCE provides bank accounts, deposits,
            payment services, financial products, lending, custody or regulated
            financial services.
          </p>

          <div className="hbce-divider" />

          <ul className="hbce-list">
            {NOT_A_SERVICE_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
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
