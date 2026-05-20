import Link from "next/link";

import { ROUTES } from "@/lib/constants";

import { BoundaryNotice } from "@/components/BoundaryNotice";

export default function NotFoundPage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Route not found</p>

        <h1 className="hbce-title">This onboarding route does not exist.</h1>

        <p className="hbce-lead">
          The requested page is outside the current HBCE IPR Onboarding App
          route map. No operational identity state, IPR Card, certificate or
          JOKER-C2 access can be created from an unknown route.
        </p>

        <div className="hbce-actions">
          <Link className="hbce-btn hbce-btn--primary" href={ROUTES.onboarding}>
            Return to Onboarding
          </Link>

          <Link className="hbce-btn" href={ROUTES.jokerC2Access}>
            View Access Gate
          </Link>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--3">
          <div className="hbce-card">
            <h2>Onboarding</h2>
            <p>
              Start from the canonical onboarding path: registration, identity,
              documents, fiscal identifier, photo/video and review.
            </p>

            <div className="hbce-actions">
              <Link className="hbce-btn" href={ROUTES.onboarding}>
                Open Onboarding
              </Link>
            </div>
          </div>

          <div className="hbce-card">
            <h2>IPR Card</h2>
            <p>
              View the internal operational identity card preview issued after
              verified IPR status.
            </p>

            <div className="hbce-actions">
              <Link className="hbce-btn" href={ROUTES.iprCard}>
                Open IPR Card
              </Link>
            </div>
          </div>

          <div className="hbce-card">
            <h2>JOKER-C2 Access</h2>
            <p>
              Evaluate the fail-closed access gate for governed JOKER-C2
              runtime authorization.
            </p>

            <div className="hbce-actions">
              <Link className="hbce-btn" href={ROUTES.jokerC2Access}>
                Open Access Gate
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <BoundaryNotice title="Fail-closed route boundary" tone="danger">
          Unknown routes do not create operational identity state and do not
          authorize JOKER-C2 access. The user must return to a defined HBCE
          onboarding route.
        </BoundaryNotice>
      </section>
    </div>
  );
}
