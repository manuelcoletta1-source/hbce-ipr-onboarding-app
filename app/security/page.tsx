import Link from "next/link";

import { evaluateJokerC2Access } from "@/lib/access-gate";
import {
  ACCESS_REQUIRED_CONDITIONS,
  FAIL_CLOSED_REASONS,
  FORBIDDEN_REPOSITORY_DATA,
  ROUTES,
  SECURITY_BOUNDARY_TEXT
} from "@/lib/constants";
import {
  approvedOnboardingRecord,
  deniedOnboardingRecord,
  pendingOnboardingRecord,
  revokedOnboardingRecord
} from "@/lib/mock-data";

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
] as const;

const demoRecords = [
  {
    title: "Approved",
    description:
      "Verified IPR, issued IPR Card, active operational certificate and clear revocation state are present.",
    record: approvedOnboardingRecord
  },
  {
    title: "Pending",
    description:
      "The onboarding case is still pending or under review. Access remains unavailable.",
    record: pendingOnboardingRecord
  },
  {
    title: "Denied",
    description:
      "The onboarding case failed verification. Access remains blocked.",
    record: deniedOnboardingRecord
  },
  {
    title: "Revoked",
    description:
      "The operational identity state is revoked. Revocation overrides every previous approval.",
    record: revokedOnboardingRecord
  }
] as const;

const frontendNonAuthorityItems = [
  "Browser state",
  "Local storage",
  "Hidden form fields",
  "Query parameters",
  "Unsigned payloads",
  "Manually edited frontend values",
  "Client-side approval flags"
] as const;

export default function SecurityPage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Security Boundary</p>

        <h1 className="hbce-title">Fail-closed access by design.</h1>

        <p className="hbce-lead">
          HBCE IPR Onboarding App denies JOKER-C2 access by default. Access is
          enabled only when the operational identity chain is valid: verified
          IPR, issued IPR Card, active operational certificate and clear
          revocation state.
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
            <p className="hbce-kicker">Access requirements</p>
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
            <p className="hbce-kicker">Security principles</p>
            <h2>MVP security posture</h2>

            <p>
              The MVP must already behave like a security-oriented onboarding
              system, even while using synthetic records and demonstration
              states.
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
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <p className="hbce-kicker">Fail-closed reasons</p>
            <h2>When access must remain blocked</h2>

            <p>
              If any required identity, card, certificate or revocation state is
              incomplete, unclear or invalid, the runtime must remain
              unavailable.
            </p>

            <ul className="hbce-list">
              {FAIL_CLOSED_REASONS.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>

          <div className="hbce-card">
            <p className="hbce-kicker">Forbidden repository data</p>
            <h2>Materials that must never be committed</h2>

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
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card hbce-card--soft">
          <p className="hbce-kicker">Access gate validation</p>
          <h2>Only the approved operational identity opens JOKER-C2.</h2>

          <p>
            The following synthetic states demonstrate that the access gate is a
            real decision layer, not a visual decoration.
          </p>

          <div className="hbce-grid hbce-grid--2" style={{ marginTop: "18px" }}>
            {demoRecords.map((item) => {
              const result = evaluateJokerC2Access(item.record);

              return (
                <div className="hbce-card" key={item.title}>
                  <div className="hbce-card-preview__top">
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
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
          <p className="hbce-kicker">Authority boundary</p>
          <h2>Frontend is not authority.</h2>

          <p>
            Future production implementation must enforce the access decision on
            the server side. The frontend can display state, but it must never
            be the source of authorization for JOKER-C2.
          </p>

          <div className="hbce-divider" />

          <ul className="hbce-list">
            {frontendNonAuthorityItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="hbce-section">
        <BoundaryNotice title="Server-side enforcement boundary" tone="danger">
          Runtime authorization must be enforced server-side. Client-side UI
          state, browser storage, local route state and manually edited payloads
          must never authorize governed JOKER-C2 access.
        </BoundaryNotice>
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
