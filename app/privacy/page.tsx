import Link from "next/link";

import {
  FORBIDDEN_REPOSITORY_DATA,
  PRIVACY_BOUNDARY_TEXT,
  PUBLIC_SAFE_FIELDS,
  ROUTES
} from "@/lib/constants";

import { BoundaryNotice } from "@/components/BoundaryNotice";

const protectedDataCategories = [
  "Identity data",
  "Official document metadata",
  "Fiscal or national identifier metadata",
  "Photo verification state",
  "Video verification state",
  "Review state",
  "IPR status",
  "IPR Card status",
  "Operational certificate status",
  "JOKER-C2 access state"
];

const privacyPrinciples = [
  "Collect only what is necessary for operational identity onboarding.",
  "Expose only minimized metadata, masked values, operational states and hash references.",
  "Keep raw identity material outside public views and outside the repository.",
  "Use protected storage references instead of public document URLs.",
  "Deny JOKER-C2 access when operational identity state is incomplete or revoked."
];

export default function PrivacyPage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Privacy Boundary</p>

        <h1 className="hbce-title">Minimized data for operational identity.</h1>

        <p className="hbce-lead">
          HBCE IPR Onboarding App follows data minimization. The MVP must use
          synthetic data only and must not expose real identity documents,
          fiscal identifiers, photos, videos, biometric material or private
          review notes.
        </p>
      </section>

      <section className="hbce-section">
        <BoundaryNotice title="Core privacy rule">
          {PRIVACY_BOUNDARY_TEXT}
        </BoundaryNotice>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <h2>Protected data categories</h2>
            <p>
              These categories may exist in a future real implementation, but
              the MVP must treat them as protected and must not expose raw
              sensitive material.
            </p>

            <ul className="hbce-list">
              {protectedDataCategories.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="hbce-card hbce-card--soft">
            <h2>Privacy principles</h2>
            <p>
              The app should preserve operational usefulness while reducing
              unnecessary exposure.
            </p>

            <ul className="hbce-list">
              {privacyPrinciples.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <h2>Public-safe fields</h2>
            <p>
              Public or semi-public UI areas may display minimized operational
              fields only.
            </p>

            <ul className="hbce-list">
              {PUBLIC_SAFE_FIELDS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="hbce-card">
            <h2>Forbidden repository data</h2>
            <p>
              These materials must not be committed to the repository or used in
              public screenshots, examples or demo records.
            </p>

            <ul className="hbce-list">
              {FORBIDDEN_REPOSITORY_DATA.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card hbce-card--soft">
          <p className="hbce-kicker">Hash and masking model</p>
          <h2>Verification without unnecessary exposure.</h2>
          <p>
            The app should prefer hash references, masked values and protected
            storage references. Hashes do not remove all privacy obligations, but
            they reduce direct exposure of raw identity material.
          </p>

          <div className="hbce-card-preview__meta">
            <div className="hbce-meta">
              <span className="hbce-meta__label">Document number</span>
              <span className="hbce-meta__value hbce-mono">
                sha256_demo_document_number_hash
              </span>
            </div>

            <div className="hbce-meta">
              <span className="hbce-meta__label">Fiscal identifier</span>
              <span className="hbce-meta__value hbce-mono">
                DEM*********VED
              </span>
            </div>

            <div className="hbce-meta">
              <span className="hbce-meta__label">Document file</span>
              <span className="hbce-meta__value hbce-mono">
                protected_storage_reference_demo
              </span>
            </div>

            <div className="hbce-meta">
              <span className="hbce-meta__label">Access state</span>
              <span className="hbce-meta__value hbce-mono">
                denied_by_default
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <h2>JOKER-C2 privacy boundary</h2>
          <p>
            The access gate should pass only minimized authorization state to
            JOKER-C2: IPR ID, IPR status, IPR Card status, certificate status,
            revocation state, access scope and decision. JOKER-C2 does not need
            raw identity documents, raw fiscal identifiers, photos, videos or
            biometric material to evaluate governed access.
          </p>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-actions">
          <Link className="hbce-btn" href={ROUTES.legal}>
            View Legal Boundary
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
