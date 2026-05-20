import Link from "next/link";

import { ROUTES, SECURITY_BOUNDARY_TEXT } from "@/lib/constants";

import { BoundaryNotice } from "@/components/BoundaryNotice";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { StatusBadge } from "@/components/StatusBadge";

export default function OnboardingDocumentsPage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Step 03 · Documents</p>

        <h1 className="hbce-title">Submit official document metadata.</h1>

        <p className="hbce-lead">
          This step records document type, issuing country, expiry date and
          protected hash references. The MVP must not process or expose real
          identity document images, scans or raw document numbers.
        </p>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <h2>Document metadata</h2>
            <p>
              Use synthetic metadata and demonstration hash references only.
              Real documents must remain outside the repository and outside
              public routes.
            </p>

            <form className="hbce-form">
              <div className="hbce-field">
                <label className="hbce-label" htmlFor="document_type">
                  Document type
                </label>
                <select
                  className="hbce-select"
                  id="document_type"
                  name="document_type"
                >
                  <option value="identity_card">Identity card</option>
                  <option value="passport">Passport</option>
                  <option value="driving_license">Driving license</option>
                  <option value="residence_document">Residence document</option>
                  <option value="other_official_document">
                    Other official document
                  </option>
                </select>
              </div>

              <div className="hbce-grid hbce-grid--2">
                <div className="hbce-field">
                  <label className="hbce-label" htmlFor="document_country">
                    Document country
                  </label>
                  <select
                    className="hbce-select"
                    id="document_country"
                    name="document_country"
                  >
                    <option value="IT">Italy</option>
                    <option value="EU">European Union jurisdiction</option>
                    <option value="OTHER">Other jurisdiction</option>
                  </select>
                </div>

                <div className="hbce-field">
                  <label
                    className="hbce-label"
                    htmlFor="document_expiry_date"
                  >
                    Document expiry date
                  </label>
                  <input
                    className="hbce-input"
                    id="document_expiry_date"
                    name="document_expiry_date"
                    type="date"
                  />
                </div>
              </div>

              <div className="hbce-field">
                <label className="hbce-label" htmlFor="document_number_hash">
                  Document number hash
                </label>
                <input
                  className="hbce-input hbce-mono"
                  id="document_number_hash"
                  name="document_number_hash"
                  placeholder="sha256_demo_document_number_hash"
                  type="text"
                />
              </div>

              <div className="hbce-field">
                <label className="hbce-label" htmlFor="document_file_hash">
                  Document file hash
                </label>
                <input
                  className="hbce-input hbce-mono"
                  id="document_file_hash"
                  name="document_file_hash"
                  placeholder="sha256_demo_document_file_hash"
                  type="text"
                />
              </div>

              <div className="hbce-field">
                <label
                  className="hbce-label"
                  htmlFor="document_storage_reference"
                >
                  Protected storage reference
                </label>
                <input
                  className="hbce-input hbce-mono"
                  id="document_storage_reference"
                  name="document_storage_reference"
                  placeholder="protected_storage_reference_demo"
                  type="text"
                />
              </div>

              <div className="hbce-actions">
                <Link className="hbce-btn" href={ROUTES.onboardingIdentity}>
                  Back to Identity
                </Link>

                <Link
                  className="hbce-btn hbce-btn--primary"
                  href={ROUTES.onboardingFiscal}
                >
                  Continue to Fiscal Identifier
                </Link>
              </div>
            </form>
          </div>

          <div className="hbce-card hbce-card--soft">
            <h2>Document state</h2>
            <p>
              Document metadata supports verification, but it does not create
              IPR Verified status by itself.
            </p>

            <div className="hbce-card-preview__meta">
              <div className="hbce-meta">
                <span className="hbce-meta__label">Document status</span>
                <span className="hbce-meta__value">
                  <StatusBadge status="submitted" />
                </span>
              </div>

              <div className="hbce-meta">
                <span className="hbce-meta__label">Fiscal identifier</span>
                <span className="hbce-meta__value">
                  <StatusBadge status="not_started" />
                </span>
              </div>

              <div className="hbce-meta">
                <span className="hbce-meta__label">Review status</span>
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

            <BoundaryNotice title="Document security boundary" tone="danger">
              {SECURITY_BOUNDARY_TEXT} Raw document images, scans, document
              numbers and unprotected storage URLs must never be exposed.
            </BoundaryNotice>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <h2>Current onboarding position</h2>
          <OnboardingStepper currentStep="documents" />
        </div>
      </section>
    </div>
  );
}
