import Link from "next/link";

import {
  ACCESS_REQUIRED_CONDITIONS,
  FORBIDDEN_REPOSITORY_DATA,
  ROUTES,
  SECURITY_BOUNDARY_TEXT
} from "@/lib/constants";
import {
  approvedOnboardingRecord,
  deniedOnboardingRecord,
  pendingOnboardingRecord,
  revokedOnboardingRecord
} from "@/lib/mock-onboarding";
import { evaluateJokerC2Access } from "@/lib/access-decision";

import { BoundaryNotice } from "@/components/BoundaryNotice";
import { StatusBadge } from "@/components/StatusBadge";

const securityPrinciples = [
  "Deny access by default.",
  "Never trust frontend-only state.",
  "Do not expose raw identity material.",
  "Do not commit production secrets.",
  "Use minimized operational references.",
  "Let revocation override previous approval.",
  "Keep JOKER-C2 access dependent on verified IPR."
];

const demoRecords = [
  {
    title: "Approved",
    record: approvedOnboardingRecord
  },
  {
    title: "Pending",
    record: pendingOnboardingRecord
  },
  {
    title: "Denied",
    record: deniedOnboardingRecord
  },
  {
    title: "Revoked",
    record: revokedOnboardingRecord
  }
];

export default function SecurityPage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Security Boundary</p>

        <h1 className="hbce-title">Fail-closed access by design.</h1>

        <p className="hbce-lead">
          HBCE IPR Onboarding App denies JOKER-C2 access by default. Access is
          enabled only when the operational identity chain is valid: verified
          IPR, issued IPR Card, active certificate and clear revocation state.
        </p>
      </section>

      <section className="hbce-section">
        <BoundaryNotice title="Core security rule" tone="danger">
          {SECURITY_BOUNDARY_TEXT}
        </BoundaryNotice>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card hbce-card--soft">
            <h2>Required access conditions</h2>
            <p>
              These conditions must all be valid before governed JOKER-C2 access
              can be enabled.
            </p>

            <ul className="hbce-list">
              {ACCESS_REQUIRED_CONDITIONS.map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ul>
          </div>

          <div className="hbce-card">
            <h2>Security principles</h2>
            <p>
              The MVP must already behave like a security-oriented onboarding
              system, even while using mock data.
            </p>

            <ul className="hbce-list">
              {securityPrinciples.map((principle) => (
                <li key={principle}>{principle}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <h2>Forbidden repository data</h2>
          <p>
            These materials must never be committed to the repository, included
            in mock datasets or exposed through public routes.
          </p>

          <ul className="hbce-list">
            {FORBIDDEN_REPOSITORY_DATA.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card hbce-card--soft">
          <p className="hbce-kicker">Access gate validation</p>
          <h2>Only the approved operational identity opens JOKER-C2.</h2>
          <p>
            The following mock states demonstrate that the access gate is a real
            decision layer, not a visual decoration.
          </p>

          <div className="hbce-grid hbce-grid--2" style={{ marginTop: "18px" }}>
            {demoRecords.map((item) => {
              const result = evaluateJokerC2Access(item.record);

              return (
                <div className="hbce-card" key={item.title}>
                  <div className="hbce-card-preview__top">
                    <div>
                      <h3>{item.title}</h3>
                      <p className="hbce-small">{result.decisionReason}</p>
                    </div>

                    <StatusBadge status={result.decision} />
                  </div>

                  <div className="hbce-divider" />

                  <div className="hbce-card-preview__meta">
                    <div className="hbce-meta">
                      <span className="hbce-meta__label">IPR status</span>
                      <span className="hbce-meta__value">
                        <StatusBadge status={item.record.iprStatus} />
                      </span>
                    </div>

                    <div className="hbce-meta">
                      <span className="hbce-meta__label">IPR Card</span>
                      <span className="hbce-meta__value">
                        <StatusBadge status={item.record.iprCardStatus} />
                      </span>
                    </div>

                    <div className="hbce-meta">
                      <span className="hbce-meta__label">Certificate</span>
                      <span className="hbce-meta__value">
                        <StatusBadge status={item.record.certificateStatus} />
                      </span>
                    </div>

                    <div className="hbce-meta">
                      <span className="hbce-meta__label">Revocation</span>
                      <span className="hbce-meta__value">
                        <StatusBadge status={item.record.revocationState} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <h2>Frontend is not authority</h2>
          <p>
            Future production implementation must enforce the access decision on
            the server side. Browser state, local storage, hidden form fields,
            query parameters, unsigned payloads and manually edited frontend
            values must never authorize JOKER-C2.
          </p>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-actions">
          <Link className="hbce-btn" href={ROUTES.legal}>
            View Legal Boundary
          </Link>

          <Link className="hbce-btn" href={ROUTES.privacy}>
            View Privacy Boundary
          </Link>

          <Link
            className="hbce-btn hbce-btn--primary"
            href={ROUTES.jokerC2Access}
          >
            View Access Gate
          </Link>
        </div>
      </section>
    </div>
  );
}
