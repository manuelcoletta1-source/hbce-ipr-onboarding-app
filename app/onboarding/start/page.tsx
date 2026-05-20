import Link from "next/link";

import { PRIVACY_BOUNDARY_TEXT, ROUTES } from "@/lib/constants";

import { BoundaryNotice } from "@/components/BoundaryNotice";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { StatusBadge } from "@/components/StatusBadge";

export default function OnboardingStartPage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Step 01 · Start</p>

        <h1 className="hbce-title">Create the onboarding session.</h1>

        <p className="hbce-lead">
          This step opens the IPR onboarding path. It does not grant JOKER-C2
          access. The subject must still complete operational identity
          verification, document metadata, fiscal identifier linkage,
          photo/video verification and review.
        </p>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <h2>Initial registration</h2>
            <p>
              The MVP form below represents the first onboarding state. It is a
              static interface for the first implementation phase and must not
              be used for real identity data in production mode.
            </p>

            <form className="hbce-form">
              <div className="hbce-field">
                <label className="hbce-label" htmlFor="email">
                  Email
                </label>
                <input
                  className="hbce-input"
                  id="email"
                  name="email"
                  placeholder="demo@example.com"
                  type="email"
                />
              </div>

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
                <label className="hbce-label">
                  <input name="accept_terms" type="checkbox" /> I accept the
                  operational onboarding terms.
                </label>
              </div>

              <div className="hbce-field">
                <label className="hbce-label">
                  <input name="accept_privacy" type="checkbox" /> I accept the
                  privacy boundary for the MVP onboarding flow.
                </label>
              </div>

              <div className="hbce-actions">
                <Link
                  className="hbce-btn hbce-btn--primary"
                  href={ROUTES.onboardingIdentity}
                >
                  Continue to Identity
                </Link>
              </div>
            </form>
          </div>

          <div className="hbce-card hbce-card--soft">
            <h2>Generated initial state</h2>
            <p>
              In the MVP, this page represents the first operational state of
              the onboarding record.
            </p>

            <div className="hbce-card-preview__meta">
              <div className="hbce-meta">
                <span className="hbce-meta__label">Onboarding status</span>
                <span className="hbce-meta__value">
                  <StatusBadge status="started" />
                </span>
              </div>

              <div className="hbce-meta">
                <span className="hbce-meta__label">Email status</span>
                <span className="hbce-meta__value">
                  <StatusBadge status="pending" />
                </span>
              </div>

              <div className="hbce-meta">
                <span className="hbce-meta__label">IPR status</span>
                <span className="hbce-meta__value">
                  <StatusBadge status="not_created" />
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

            <BoundaryNotice title="Registration does not equal access">
              Email registration only opens the onboarding flow. JOKER-C2 access
              remains denied until verified IPR, issued IPR Card, active
              certificate and clear revocation state are present.
            </BoundaryNotice>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <h2>Current onboarding position</h2>
          <OnboardingStepper currentStep="start" />
        </div>
      </section>

      <section className="hbce-section">
        <BoundaryNotice title="Privacy boundary">
          {PRIVACY_BOUNDARY_TEXT}
        </BoundaryNotice>
      </section>
    </div>
  );
}
