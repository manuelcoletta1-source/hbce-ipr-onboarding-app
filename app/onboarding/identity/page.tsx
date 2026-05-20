import Link from "next/link";

import { LEGAL_BOUNDARY_TEXT, ROUTES } from "@/lib/constants";

import { BoundaryNotice } from "@/components/BoundaryNotice";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { StatusBadge } from "@/components/StatusBadge";

export default function OnboardingIdentityPage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Step 02 · Identity</p>

        <h1 className="hbce-title">Submit operational identity data.</h1>

        <p className="hbce-lead">
          This step collects the minimum identity information required to build
          the internal operational identity record. It does not issue public
          identity, state identity, CIE, SPID, EUDI Wallet or qualified eIDAS
          credentials.
        </p>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <h2>Identity data</h2>
            <p>
              Use synthetic or demonstration data in the MVP. Real identity data
              must not be committed to the repository or exposed in public
              routes.
            </p>

            <form className="hbce-form">
              <div className="hbce-grid hbce-grid--2">
                <div className="hbce-field">
                  <label className="hbce-label" htmlFor="first_name">
                    First name
                  </label>
                  <input
                    className="hbce-input"
                    id="first_name"
                    name="first_name"
                    placeholder="Demo"
                    type="text"
                  />
                </div>

                <div className="hbce-field">
                  <label className="hbce-label" htmlFor="last_name">
                    Last name
                  </label>
                  <input
                    className="hbce-input"
                    id="last_name"
                    name="last_name"
                    placeholder="Subject"
                    type="text"
                  />
                </div>
              </div>

              <div className="hbce-grid hbce-grid--2">
                <div className="hbce-field">
                  <label className="hbce-label" htmlFor="date_of_birth">
                    Date of birth
                  </label>
                  <input
                    className="hbce-input"
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                  />
                </div>

                <div className="hbce-field">
                  <label className="hbce-label" htmlFor="place_of_birth">
                    Place of birth
                  </label>
                  <input
                    className="hbce-input"
                    id="place_of_birth"
                    name="place_of_birth"
                    placeholder="Bologna"
                    type="text"
                  />
                </div>
              </div>

              <div className="hbce-grid hbce-grid--2">
                <div className="hbce-field">
                  <label className="hbce-label" htmlFor="country">
                    Country
                  </label>
                  <select className="hbce-select" id="country" name="country">
                    <option value="IT">Italy</option>
                    <option value="EU">European Union jurisdiction</option>
                    <option value="OTHER">Other jurisdiction</option>
                  </select>
                </div>

                <div className="hbce-field">
                  <label className="hbce-label" htmlFor="nationality">
                    Nationality
                  </label>
                  <select
                    className="hbce-select"
                    id="nationality"
                    name="nationality"
                  >
                    <option value="IT">Italian</option>
                    <option value="EU">European Union</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="hbce-field">
                <label className="hbce-label" htmlFor="residential_country">
                  Residential country
                </label>
                <select
                  className="hbce-select"
                  id="residential_country"
                  name="residential_country"
                >
                  <option value="IT">Italy</option>
                  <option value="EU">European Union jurisdiction</option>
                  <option value="OTHER">Other jurisdiction</option>
                </select>
              </div>

              <div className="hbce-actions">
                <Link className="hbce-btn" href={ROUTES.onboardingStart}>
                  Back to Start
                </Link>

                <Link
                  className="hbce-btn hbce-btn--primary"
                  href={ROUTES.onboardingDocuments}
                >
                  Continue to Documents
                </Link>
              </div>
            </form>
          </div>

          <div className="hbce-card hbce-card--soft">
            <h2>Identity state</h2>
            <p>
              The identity form prepares the operational identity profile. It is
              not enough to activate IPR Verified or JOKER-C2 access.
            </p>

            <div className="hbce-card-preview__meta">
              <div className="hbce-meta">
                <span className="hbce-meta__label">Identity data</span>
                <span className="hbce-meta__value">
                  <StatusBadge status="submitted" />
                </span>
              </div>

              <div className="hbce-meta">
                <span className="hbce-meta__label">Document status</span>
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

            <BoundaryNotice title="Identity boundary">
              {LEGAL_BOUNDARY_TEXT}
            </BoundaryNotice>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <h2>Current onboarding position</h2>
          <OnboardingStepper currentStep="identity" />
        </div>
      </section>
    </div>
  );
}
