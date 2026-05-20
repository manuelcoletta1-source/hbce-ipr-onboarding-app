import Link from "next/link";

import { ROUTES } from "@/lib/constants";

import { BoundaryNotice } from "@/components/BoundaryNotice";

const RECOVERY_ROUTES = [
  {
    title: "Onboarding",
    text:
      "Start from the canonical onboarding path: registration, identity, documents, fiscal identifier, photo/video and review.",
    href: ROUTES.onboarding,
    label: "Open Onboarding"
  },
  {
    title: "IPR Card",
    text:
      "View the internal operational identity card preview issued after verified IPR status.",
    href: ROUTES.iprCard,
    label: "Open IPR Card"
  },
  {
    title: "Certificate",
    text:
      "View the internal operational certificate reference connected to IPR Card issuance.",
    href: ROUTES.certificate,
    label: "Open Certificate"
  },
  {
    title: "JOKER-C2 Access",
    text:
      "Evaluate the fail-closed access gate for governed JOKER-C2 runtime authorization.",
    href: ROUTES.jokerC2Access,
    label: "Open Access Gate"
  }
] as const;

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
        <div className="hbce-grid hbce-grid--4">
          {RECOVERY_ROUTES.map((route) => (
            <div className="hbce-card" key={route.href}>
              <h2>{route.title}</h2>
              <p>{route.text}</p>

              <div className="hbce-actions">
                <Link className="hbce-btn" href={route.href}>
                  {route.label}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--3">
          <div className="hbce-card">
            <h3>Legal boundary</h3>
            <p>
              Unknown routes do not create official identity, operational
              identity, IPR Verified status or legal authorization.
            </p>

            <div className="hbce-actions">
              <Link className="hbce-btn" href={ROUTES.legal}>
                View Legal
              </Link>
            </div>
          </div>

          <div className="hbce-card">
            <h3>Privacy boundary</h3>
            <p>
              Unknown routes must not expose identity data, document data,
              fiscal identifiers, photos, videos or protected records.
            </p>

            <div className="hbce-actions">
              <Link className="hbce-btn" href={ROUTES.privacy}>
                View Privacy
              </Link>
            </div>
          </div>

          <div className="hbce-card">
            <h3>Security boundary</h3>
            <p>
              Unknown routes must fail closed and must never authorize governed
              runtime access.
            </p>

            <div className="hbce-actions">
              <Link className="hbce-btn" href={ROUTES.security}>
                View Security
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
