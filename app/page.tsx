import Link from "next/link";

import {
  CLASSIC_AI_ACCESS_MODEL,
  CORE_PRODUCT_RULE,
  HBCE_GOVERNED_ACCESS_MODEL,
  LEGAL_BOUNDARY_TEXT,
  PUBLIC_WEBSITE_FORMULA,
  ROUTES
} from "@/lib/constants";

import { BoundaryNotice } from "@/components/BoundaryNotice";
import { OnboardingStepper } from "@/components/OnboardingStepper";

const ONBOARDING_OPERATIONS = [
  "Personal identity data collection",
  "Official identity document submission",
  "Fiscal code, national tax identifier or national identification number linkage",
  "Photo and video verification step",
  "Internal HBCE review",
  "IPR Verified status assignment",
  "IPR Card issuance",
  "Operational certificate activation",
  "Governed JOKER-C2 access decision"
] as const;

const ACCESS_CONTROL_STATES = [
  "Pending onboarding",
  "Identity data received",
  "Document review required",
  "Photo and video verification required",
  "Manual review required",
  "IPR Verified",
  "IPR Card issued",
  "Operational certificate active",
  "JOKER-C2 access enabled"
] as const;

const TRUST_BOUNDARIES = [
  {
    title: "Not a public identity document",
    text:
      "The IPR Card is an internal HBCE operational credential. It does not replace a national identity card, passport, driving licence, SPID, CIE, EUDI Wallet or qualified eIDAS certificate."
  },
  {
    title: "Connected to official identity evidence",
    text:
      "The onboarding process is designed to link the subject to official identity evidence, tax or national identifiers and reviewable verification steps."
  },
  {
    title: "Governed AI access after verification",
    text:
      "JOKER-C2 is not exposed as a generic email-and-password AI interface. Access is conditioned by the verified operational state of the subject."
  }
] as const;

const OPERATIONAL_LAYERS = [
  {
    title: "IPR Onboarding Gateway",
    text:
      "The application collects and organizes the identity evidence required to create an internal operational identity record."
  },
  {
    title: "IPR Card",
    text:
      "The IPR Card represents the operational access key issued after verification inside the HBCE framework."
  },
  {
    title: "Operational Certificate",
    text:
      "The certificate reference links the verified subject to governed workflows, audit continuity and controlled runtime access."
  },
  {
    title: "JOKER-C2 Access Gate",
    text:
      "JOKER-C2 access is enabled only when the subject state, IPR Card state and certificate state are compatible with governed access."
  }
] as const;

export default function HomePage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">IPR Onboarding Gateway</p>

        <h1 className="hbce-title">
          Verify the subject before opening governed AI access.
        </h1>

        <p className="hbce-lead">
          HBCE IPR Onboarding App is the operational identity gateway for IPR
          Verified status, IPR Card issuance, operational certificate activation
          and governed JOKER-C2 access. An email is not enough. A subscription is
          not enough. Access to operational AI requires a verified operational
          identity.
        </p>

        <div className="hbce-actions">
          <Link className="hbce-btn hbce-btn--primary" href={ROUTES.onboarding}>
            Start IPR Onboarding
          </Link>

          <Link className="hbce-btn" href={ROUTES.legal}>
            View Legal Boundary
          </Link>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card hbce-card--soft">
          <p className="hbce-kicker">Core product rule</p>
          <h2>{CORE_PRODUCT_RULE}</h2>
          <p>{PUBLIC_WEBSITE_FORMULA}</p>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <p className="hbce-kicker">Classic AI model</p>
            <h2>Email, payment and model access</h2>
            <p>
              Generic AI platforms usually reduce access to account creation,
              authentication and payment. The user creates an account, pays or
              subscribes, and receives direct access to the AI interface.
            </p>

            <ul className="hbce-list">
              {CLASSIC_AI_ACCESS_MODEL.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">HBCE model</p>
            <h2>Identity first, governed AI after</h2>
            <p>
              HBCE separates ordinary login from operational authorization. The
              subject is onboarded, verified, reviewed, assigned an IPR state,
              issued an IPR Card and connected to an operational certificate
              before JOKER-C2 access can be enabled.
            </p>

            <ul className="hbce-list">
              {HBCE_GOVERNED_ACCESS_MODEL.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <p className="hbce-kicker">Operational sequence</p>
            <h2>Bank-grade onboarding logic</h2>
            <p>
              The application follows a structured digital onboarding model:
              identity data, official documents, fiscal identifiers, photo and
              video verification, internal review and controlled activation.
            </p>

            <ul className="hbce-list">
              {ONBOARDING_OPERATIONS.map((operation) => (
                <li key={operation}>{operation}</li>
              ))}
            </ul>
          </div>

          <div className="hbce-card">
            <p className="hbce-kicker">Runtime protection</p>
            <h2>Fail-closed access state</h2>
            <p>
              If identity evidence is incomplete, the IPR state is not verified,
              the IPR Card is missing, the operational certificate is inactive or
              the revocation state is unclear, access remains denied.
            </p>

            <ul className="hbce-list">
              {ACCESS_CONTROL_STATES.map((state) => (
                <li key={state}>{state}</li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ marginTop: "18px" }}>
          <OnboardingStepper currentStep="start" />
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--4">
          {OPERATIONAL_LAYERS.map((layer) => (
            <div className="hbce-card" key={layer.title}>
              <h3>{layer.title}</h3>
              <p>{layer.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card hbce-card--soft">
          <p className="hbce-kicker">Trust boundary</p>
          <h2>
            IPR is an operational identity layer, not a state identity system.
          </h2>
          <p>
            HBCE issues a verifiable operational identity layer that can be
            connected to official identity systems and evidence. It does not
            claim to replace public identity documents or regulated trust
            services unless future integrations with recognized providers are
            formally activated.
          </p>
        </div>

        <div className="hbce-grid hbce-grid--3" style={{ marginTop: "18px" }}>
          {TRUST_BOUNDARIES.map((boundary) => (
            <div className="hbce-card" key={boundary.title}>
              <h3>{boundary.title}</h3>
              <p>{boundary.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="hbce-section">
        <BoundaryNotice title="Legal boundary">
          {LEGAL_BOUNDARY_TEXT}
        </BoundaryNotice>
      </section>
    </div>
  );
}
