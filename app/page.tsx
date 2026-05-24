"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import IprCertificateUploader from "@/components/IprCertificateUploader";

import { getContinuationRouteFromCertificate } from "@/lib/ipr-phase-map";

import type { AcceptedIprCertificateUpload } from "@/components/IprCertificateUploader";

const CERTIFICATE_CHAIN = [
  {
    code: "01",
    title: "Subject Created",
    text:
      "Email OTP, phone SMS OTP, name, country and date of birth create the first private HBCE-IPR subject certificate.",
    route: "/onboarding/phase-1"
  },
  {
    code: "02",
    title: "Fiscal Identity",
    text:
      "Codice fiscale, tax ID, fiscal country and tessera sanitaria or equivalent fiscal evidence are linked through hash-only references.",
    route: "/onboarding/phase-2"
  },
  {
    code: "03",
    title: "Official ID Document",
    text:
      "CIE, driving licence, passport, EU identity card or another authorized official document is recorded through metadata and evidence hashes.",
    route: "/onboarding/phase-3"
  },
  {
    code: "04",
    title: "Photo / Video Liveness",
    text:
      "Selfie, document-face reference, liveness video reference and physical descriptor profile prepare anti-impersonation review.",
    route: "/onboarding/photo-video"
  },
  {
    code: "05",
    title: "Privacy & Compliance",
    text:
      "Privacy consent, hash-only acknowledgement, biometric/liveness consent, policy acceptance and JOKER-C2 custody acknowledgement are recorded.",
    route: "/onboarding/phase-5"
  },
  {
    code: "06",
    title: "Review Pending",
    text:
      "The onboarding package is submitted for HBCE review. The subject cannot self-approve the IPR.",
    route: "/onboarding/review"
  },
  {
    code: "07",
    title: "IPR Approved",
    text:
      "HBCE approval certificate is generated through admin/operator workflow after review.",
    route: "/admin/review"
  },
  {
    code: "08",
    title: "IPR Card",
    text:
      "The virtual IPR Card is issued as the internal HBCE operational identity key.",
    route: "/ipr-card"
  },
  {
    code: "09",
    title: "Operational Certificate",
    text:
      "The final HBCE operational certificate activates JOKER_C2_ACCESS scope for the governed access gate.",
    route: "/certificate"
  }
] as const;

const OPERATIONAL_BOUNDARIES = [
  "The app does not issue IBANs, bank accounts, payment accounts or electronic money.",
  "The app does not replace CIE, SPID, EUDI Wallet, passport, tax ID or official state identity.",
  "Official documents are verification inputs. IPR is the internal HBCE operational output.",
  "The portable certificate stores private fields, hashes, references, states and metadata, not raw document files.",
  "Raw photos, raw videos, face templates and biometric templates must remain outside portable certificates and public routes.",
  "Real production verification requires backend infrastructure, protected storage, server-side validation and signing.",
  "JOKER-C2 access remains denied unless the final operational certificate is valid."
] as const;

const PRODUCT_RULES = [
  {
    title: "IPR Onboarding Gateway",
    text:
      "The app registers, links and verifies the subject before governed runtime access. It is not a static brochure and not a normal AI signup page."
  },
  {
    title: "IPR Card as operational key",
    text:
      "The IPR Card is the internal HBCE operational identity key issued only after the review and approval chain."
  },
  {
    title: "JOKER-C2 as governed runtime",
    text:
      "JOKER-C2 is opened only through a valid operational certificate. Email, password and subscription are not enough."
  },
  {
    title: "Fail-closed certificate logic",
    text:
      "Wrong protocol, wrong issuer, wrong phase, wrong scope or payload mismatch blocks continuation and access."
  }
] as const;

const COMPARISON_ROWS = [
  {
    classic: "Email registration",
    hbce: "Subject creation with email OTP and phone SMS OTP"
  },
  {
    classic: "Password or OAuth login",
    hbce: "Progressive certificate chain continuation"
  },
  {
    classic: "Payment or subscription",
    hbce: "Fiscal identity, official document and liveness evidence"
  },
  {
    classic: "Direct model access",
    hbce: "IPR Card and operational certificate before JOKER-C2"
  },
  {
    classic: "Account-based access",
    hbce: "Operational identity, event continuity and audit-oriented access"
  }
] as const;

function getSafeNextPhase(upload: AcceptedIprCertificateUpload): string {
  return upload.certificate.next.next_phase ?? "NO_NEXT_PHASE";
}

function getSafePreviousPayloadSha256(
  upload: AcceptedIprCertificateUpload
): string {
  return upload.previousPayloadSha256 ?? "ROOT_CERTIFICATE";
}

export default function HomePage() {
  const router = useRouter();

  const [acceptedUpload, setAcceptedUpload] =
    useState<AcceptedIprCertificateUpload | null>(null);

  const continuationRoute = useMemo(() => {
    if (!acceptedUpload) {
      return null;
    }

    return getContinuationRouteFromCertificate(acceptedUpload.certificate);
  }, [acceptedUpload]);

  function continueFromCertificate(): void {
    if (!continuationRoute) {
      return;
    }

    router.push(continuationRoute);
  }

  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">HBCE IPR Onboarding Gateway</p>

        <h1 className="hbce-title">
          Verify the subject before opening governed AI access.
        </h1>

        <p className="hbce-lead">
          HBCE IPR Onboarding App is the operational identity gateway for
          progressive HBCE-IPR certificate release, IPR Card issuance,
          operational certificate activation and governed JOKER-C2 access. An
          email is not enough. A subscription is not enough. Access to
          operational AI requires a verified operational identity chain.
        </p>

        <div className="hbce-actions">
          <Link
            className="hbce-btn hbce-btn--primary"
            href="/onboarding/phase-1"
          >
            Start New IPR
          </Link>

          <a className="hbce-btn" href="#continue-ipr">
            Continue Existing IPR
          </a>

          <Link className="hbce-btn" href="/access/joker-c2">
            Access JOKER-C2
          </Link>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">Core product rule</p>

            <h2>First verify who you are. Then access operational AI.</h2>

            <p>
              Classic AI access usually follows email, password, payment and
              direct model access. HBCE follows a different rule: subject
              onboarding, fiscal identity, official evidence, liveness check,
              privacy and compliance, review, IPR Card, operational certificate
              and only then JOKER-C2 access evaluation.
            </p>
          </div>

          <div className="hbce-card hbce-card--danger">
            <p className="hbce-kicker">Access boundary</p>

            <h2>No verified IPR, no governed JOKER-C2 access.</h2>

            <p>
              JOKER-C2 is not an AI runtime opened by a normal account. It is
              accessed through an IPR-verified operational certificate. Until
              that certificate exists and passes validation, the access gate
              remains closed.
            </p>
          </div>
        </div>
      </section>

      <section className="hbce-section" id="continue-ipr">
        <IprCertificateUploader
          mode="read_any"
          required={false}
          title="Continue with Existing HBCE IPR Certificate"
          description="Upload the latest HBCE-IPR `.hbce.json` certificate generated by the app. The system reads the certificate phase and opens the next required step."
          onCertificateAccepted={(upload) => {
            setAcceptedUpload(upload);
          }}
          onValidation={(validation) => {
            if (!validation.valid) {
              setAcceptedUpload(null);
            }
          }}
        />

        {acceptedUpload ? (
          <div className="hbce-card hbce-card--success">
            <p className="hbce-kicker">Certificate accepted</p>

            <h2>Ready to continue the HBCE-IPR chain.</h2>

            <p>
              The uploaded certificate is valid. Continue to the next required
              onboarding phase. If no route is available, the certificate is
              either terminal or the phase map must be updated.
            </p>

            <div className="hbce-card-preview__meta">
              <div className="hbce-meta">
                <span className="hbce-meta__label">current_phase</span>
                <span className="hbce-meta__value hbce-mono">
                  {acceptedUpload.certificate.phase.code}
                </span>
              </div>

              <div className="hbce-meta">
                <span className="hbce-meta__label">next_phase</span>
                <span className="hbce-meta__value hbce-mono">
                  {getSafeNextPhase(acceptedUpload)}
                </span>
              </div>

              <div className="hbce-meta">
                <span className="hbce-meta__label">payload_sha256</span>
                <span className="hbce-meta__value hbce-mono">
                  {acceptedUpload.payloadSha256}
                </span>
              </div>

              <div className="hbce-meta">
                <span className="hbce-meta__label">
                  previous_payload_sha256
                </span>
                <span className="hbce-meta__value hbce-mono">
                  {getSafePreviousPayloadSha256(acceptedUpload)}
                </span>
              </div>

              <div className="hbce-meta">
                <span className="hbce-meta__label">continuation_route</span>
                <span className="hbce-meta__value hbce-mono">
                  {continuationRoute ?? "NO_ROUTE_AVAILABLE"}
                </span>
              </div>
            </div>

            <div className="hbce-actions">
              <button
                className="hbce-btn hbce-btn--primary"
                disabled={!continuationRoute}
                type="button"
                onClick={continueFromCertificate}
              >
                Continue to next phase
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <p className="hbce-kicker">Classic AI model</p>

            <h2>Email, payment and model access.</h2>

            <p>
              Generic AI systems usually expose access after account creation,
              authentication and subscription. The access condition is mainly
              commercial or account-based.
            </p>

            <ul className="hbce-list">
              {COMPARISON_ROWS.map((row) => (
                <li key={row.classic}>{row.classic}</li>
              ))}
            </ul>
          </div>

          <div className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">HBCE model</p>

            <h2>Operational identity before governed AI.</h2>

            <p>
              HBCE separates ordinary login from operational authorization. The
              subject must produce a verifiable certificate chain before JOKER-C2
              can be opened.
            </p>

            <ul className="hbce-list">
              {COMPARISON_ROWS.map((row) => (
                <li key={row.hbce}>{row.hbce}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <p className="hbce-kicker">Certificate chain</p>

          <h2>Every certificate unlocks the next phase.</h2>

          <p>
            The app works through downloadable `.hbce.json` files. Each file
            contains the hash of the previous phase and the hash of its own
            canonical payload. The final operational certificate is the only
            file accepted by the JOKER-C2 access gate.
          </p>

          <div className="hbce-grid hbce-grid--3">
            {CERTIFICATE_CHAIN.map((step) => (
              <article className="hbce-card hbce-card--soft" key={step.code}>
                <p className="hbce-kicker">Certificate {step.code}</p>

                <h3>{step.title}</h3>

                <p>{step.text}</p>

                <div className="hbce-actions">
                  <Link className="hbce-btn" href={step.route}>
                    Open phase
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <p className="hbce-kicker">IPR upload rule</p>

            <h2>Certificates are uploaded in one logical point.</h2>

            <p>
              The HBCE-IPR certificate upload is always the same logical action:
              upload the previous `.hbce.json` certificate, validate it, then
              continue to the next phase. CIE, driving licence, passport,
              tessera sanitaria, codice fiscale, selfie and video are
              phase-specific evidence, not continuation certificates.
            </p>
          </div>

          <div className="hbce-card hbce-card--danger">
            <p className="hbce-kicker">Fail-closed boundary</p>

            <h2>Invalid certificates do not continue.</h2>

            <p>
              Wrong protocol, wrong issuer, wrong phase, wrong next phase,
              missing previous hash, payload hash mismatch, inactive status or
              invalid scope blocks continuation and access.
            </p>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <p className="hbce-kicker">Product architecture</p>

          <h2>IPR Onboarding Gateway · IPR Card · JOKER-C2.</h2>

          <div className="hbce-grid hbce-grid--2">
            {PRODUCT_RULES.map((rule) => (
              <article className="hbce-card hbce-card--soft" key={rule.title}>
                <h3>{rule.title}</h3>
                <p>{rule.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <p className="hbce-kicker">Legal and operational boundary</p>

          <h2>IPR is an internal operational identity layer.</h2>

          <p>
            HBCE IPR is a verifiable operational identity layer linked to
            official evidence. It is not a state identity system and does not
            replace public identity documents or regulated trust services unless
            future integrations with recognized providers are formally
            activated.
          </p>

          <ul className="hbce-list">
            {OPERATIONAL_BOUNDARIES.map((boundary) => (
              <li key={boundary}>{boundary}</li>
            ))}
          </ul>

          <div className="hbce-actions">
            <Link className="hbce-btn hbce-btn--primary" href="/onboarding">
              Open Onboarding Gateway
            </Link>

            <Link className="hbce-btn" href="/certificate">
              Operational Certificate
            </Link>

            <Link className="hbce-btn" href="/access/joker-c2">
              JOKER-C2 Access Gate
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
