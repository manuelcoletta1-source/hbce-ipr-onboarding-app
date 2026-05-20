import Link from "next/link";

import { PRIVACY_BOUNDARY_TEXT, ROUTES } from "@/lib/constants";

import { BoundaryNotice } from "@/components/BoundaryNotice";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { StatusBadge } from "@/components/StatusBadge";

const INITIAL_STATE_ITEMS = [
  {
    label: "Onboarding status",
    status: "started"
  },
  {
    label: "Email status",
    status: "pending"
  },
  {
    label: "IPR status",
    status: "not_created"
  },
  {
    label: "JOKER-C2 access",
    status: "denied"
  }
] as const;

const START_BOUNDARIES = [
  "This step opens the onboarding session only.",
  "No IPR is created at this stage.",
  "No IPR Card is issued at this stage.",
  "No operational certificate is active at this stage.",
  "JOKER-C2 access remains denied by default."
] as const;

export default function OnboardingStartPage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Step 01 · Start</p>

        <h1 className="hbce-title">Create the onboarding session.</h1>

        <p className="hbce-lead">
          This step opens the IPR onboarding path. It does not grant JOKER-C2
          access. The subject must still complete operational identity
          verification, official document metadata, fiscal identifier linkage,
          photo/video verification and review.
        </p>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <p className="hbce-kicker">Initial registration</p>
            <h2>Create the first onboarding state</h2>

            <p>
              The MVP form below represents the first onboarding state. It is a
              static interface for the first implementation phase and must not
              be used for real identity data, real documents, real fiscal
              identifiers or production onboarding material.
            </p>

            <form className="hbce-form">
              <div className="hbce-field">
                <label className="hbce-label" htmlFor="email">
                  Email
                </label>
                <input
                  autoComplete="email"
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
                    autoComplete="given-name"
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
                    autoComplete="family-name"
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
                  Country or jurisdiction
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
            <p className="hbce-kicker">Generated initial state</p>
            <h2>Registration is not authorization</h2>

            <p>
              In the MVP, this page represents the first operational state of
              the onboarding record. The subject exists as a registration case,
              not as a verified IPR identity.
            </p>

            <div className="hbce-card-preview__meta">
              {INITIAL_STATE_ITEMS.map((item) => (
                <div className="hbce-meta" key={item.label}>
                  <span className="hbce-meta__label">{item.label}</span>
                  <span className="hbce-meta__value">
                    <StatusBadge status={item.status} />
                  </span>
                </div>
              ))}
            </div>

            <div className="hbce-divider" />

            <ul className="hbce-list">
              {START_BOUNDARIES.map((boundary) => (
                <li key={boundary}>{boundary}</li>
              ))}
            </ul>

            <div className="hbce-divider" />

            <BoundaryNotice title="Registration does not equal access">
              Email registration only opens the onboarding flow. JOKER-C2 access
              remains denied until verified IPR, issued IPR Card, active
              operational certificate and clear revocation state are present.
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
