"use client";

import Link from "next/link";

import { ROUTES } from "@/lib/constants";

type ErrorPageProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Application boundary</p>

        <h1 className="hbce-title">The onboarding gateway stopped safely.</h1>

        <p className="hbce-lead">
          An application error occurred inside the HBCE IPR Onboarding App. The
          runtime remains fail-closed: no operational identity state, IPR Card,
          operational certificate or JOKER-C2 access can be created from an
          interrupted execution.
        </p>

        <div className="hbce-actions">
          <button className="hbce-btn hbce-btn--primary" onClick={reset} type="button">
            Try again
          </button>

          <Link className="hbce-btn" href={ROUTES.onboarding}>
            Return to Onboarding
          </Link>

          <Link className="hbce-btn" href={ROUTES.jokerC2Access}>
            View Access Gate
          </Link>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card hbce-card--soft">
          <p className="hbce-kicker">Fail-closed error rule</p>
          <h2>Errors do not authorize operational access.</h2>

          <p>
            The application can display onboarding state, IPR Card previews,
            certificate previews and access-gate decisions, but an error state
            must never be treated as approval. Production authorization must
            remain server-side and fail-closed.
          </p>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <h2>Error reference</h2>
            <p className="hbce-small">
              This diagnostic information is safe for development and does not
              include identity documents, fiscal identifiers, photos, videos or
              biometric material.
            </p>

            <div className="hbce-divider" />

            <div className="hbce-meta">
              <span className="hbce-meta__label">Message</span>
              <span className="hbce-meta__value hbce-mono">
                {error.message || "Unhandled application error"}
              </span>
            </div>

            {error.digest ? (
              <div className="hbce-meta" style={{ marginTop: "14px" }}>
                <span className="hbce-meta__label">Digest</span>
                <span className="hbce-meta__value hbce-mono">
                  {error.digest}
                </span>
              </div>
            ) : null}
          </div>

          <div className="hbce-card">
            <h2>Safe recovery routes</h2>
            <p>
              Return to a defined route and continue only through the canonical
              onboarding flow.
            </p>

            <div className="hbce-actions">
              <Link className="hbce-btn" href={ROUTES.home}>
                Home
              </Link>

              <Link className="hbce-btn" href={ROUTES.legal}>
                Legal Boundary
              </Link>

              <Link className="hbce-btn" href={ROUTES.security}>
                Security Boundary
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-notice hbce-notice--danger" role="alert">
          <strong>Error boundary</strong>
          <div className="hbce-small" style={{ marginTop: "8px" }}>
            An application error is not an access decision. JOKER-C2 must remain
            unavailable unless verified IPR, issued IPR Card, active operational
            certificate and clear revocation state are all present.
          </div>
        </div>
      </section>
    </div>
  );
}
