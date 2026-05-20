import Link from "next/link";

import { PRIVACY_BOUNDARY_TEXT, ROUTES } from "@/lib/constants";

import { BoundaryNotice } from "@/components/BoundaryNotice";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { StatusBadge } from "@/components/StatusBadge";

export default function OnboardingFiscalPage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Step 04 · Fiscal Identifier</p>

        <h1 className="hbce-title">Link fiscal or national identifier metadata.</h1>

        <p className="hbce-lead">
          This step connects the subject to a fiscal code, tax identifier or
          national identification number through minimized metadata, masked
          values and hash references. The raw identifier must not be exposed in
          public views or committed to the repository.
        </p>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <h2>Fiscal identifier metadata</h2>
            <p>
              Use synthetic values in the MVP. The interface demonstrates how
              fiscal linkage works without storing or displaying a real raw
              identifier.
            </p>

            <form className="hbce-form">
              <div className="hbce-field">
                <label className="hbce-label" htmlFor="fiscal_identifier_type">
                  Identifier type
                </label>
                <select
                  className="hbce-select"
                  id="fiscal_identifier_type"
                  name="fiscal_identifier_type"
                >
                  <option value="fiscal_code">Fiscal code</option>
                  <option value="tax_identifier">Tax identifier</option>
                  <option value="national_identification_number">
                    National identification number
                  </option>
                  <option value="social_security_style_number">
                    Social security style number
                  </option>
                  <option value="other_public_identifier">
                    Other public identifier
                  </option>
                </select>
              </div>

              <div className="hbce-field">
                <label
                  className="hbce-label"
                  htmlFor="fiscal_identifier_country"
                >
                  Identifier country
                </label>
                <select
                  className="hbce-select"
                  id="fiscal_identifier_country"
                  name="fiscal_identifier_country"
                >
                  <option value="IT">Italy</option>
                  <option value="EU">European Union jurisdiction</option>
                  <option value="OTHER">Other jurisdiction</option>
                </select>
              </div>

              <div className="hbce-field">
                <label className="hbce-label" htmlFor="fiscal_identifier_hash">
                  Identifier hash
                </label>
                <input
                  className="hbce-input hbce-mono"
                  id="fiscal_identifier_hash"
                  name="fiscal_identifier_hash"
                  placeholder="sha256_demo_fiscal_identifier_hash"
                  type="text"
                />
              </div>

              <div className="hbce-field">
                <label
                  className="hbce-label"
                  htmlFor="fiscal_identifier_masked"
                >
                  Masked display value
                </label>
                <input
                  className="hbce-input hbce-mono"
                  id="fiscal_identifier_masked"
                  name="fiscal_identifier_masked"
                  placeholder="DEM*********VED"
                  type="text"
                />
              </div>

              <div className="hbce-actions">
                <Link className="hbce-btn" href={ROUTES.onboardingDocuments}>
                  Back to Documents
                </Link>

                <Link
                  className="hbce-btn hbce-btn--primary"
                  href={ROUTES.onboardingPhotoVideo}
                >
                  Continue to Photo / Video
                </Link>
              </div>
            </form>
          </div>

          <div className="hbce-card hbce-card--soft">
            <h2>Fiscal linkage state</h2>
            <p>
              Fiscal identifier linkage strengthens the operational identity
              record, but it does not by itself issue IPR Verified status or
              unlock JOKER-C2.
            </p>

            <div className="hbce-card-preview__meta">
              <div className="hbce-meta">
                <span className="hbce-meta__label">Fiscal identifier</span>
                <span className="hbce-meta__value">
                  <StatusBadge status="submitted" />
                </span>
              </div>

              <div className="hbce-meta">
                <span className="hbce-meta__label">Photo verification</span>
                <span className="hbce-meta__value">
                  <StatusBadge status="not_started" />
                </span>
              </div>

              <div className="hbce-meta">
                <span className="hbce-meta__label">Video verification</span>
                <span className="hbce-meta__value">
                  <StatusBadge status="not_started" />
                </span>
              </div>

              <div className="hbce-meta">
                <span className="hbce-meta__label">JOKER-C2 access</span>
                <span className="hbce-meta__value">
                  <StatusBadge status="denied" />
                </span>
              </div>
            </div>

            <div className="hbce-divider" />

            <BoundaryNotice title="Fiscal identifier privacy boundary">
              {PRIVACY_BOUNDARY_TEXT} Raw fiscal codes, tax identifiers and
              national identification numbers must remain protected, minimized,
              masked or hash-referenced.
            </BoundaryNotice>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <h2>Current onboarding position</h2>
          <OnboardingStepper currentStep="fiscal" />
        </div>
      </section>
    </div>
  );
}
