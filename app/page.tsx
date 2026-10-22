"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import IprCertificateUploader from "@/components/IprCertificateUploader";

import { getContinuationRouteFromCertificate } from "@/lib/ipr-phase-map";

import { ROUTES } from "@/lib/constants";

import type { AcceptedIprCertificateUpload } from "@/components/IprCertificateUploader";

const CERTIFICATE_CHAIN = [
  {
    code: "01",
    title: "Soggetto registrato",
    text:
      "La verifica OTP di email e telefono, insieme ai dati anagrafici, permette di creare il primo certificato privato HBCE-IPR.",
    route: "/onboarding/phase-1"
  },
  {
    code: "02",
    title: "Identità fiscale",
    text:
      "Il codice fiscale, il Paese fiscale e la documentazione fiscale vengono collegati al profilo mediante riferimenti hash.",
    route: "/onboarding/phase-2"
  },
  {
    code: "03",
    title: "Documento d’identità ufficiale",
    text:
      "I dati della CIE, della patente, del passaporto o di altro documento autorizzato vengono registrati con i relativi hash.",
    route: "/onboarding/phase-3"
  },
  {
    code: "04",
    title: "Verifica presenza con foto e video",
    text:
      "Fotografia del volto, video e riferimenti biometrici preparano la successiva revisione contro la sostituzione di persona.",
    route: "/onboarding/photo-video"
  },
  {
    code: "05",
    title: "Privacy e conformità",
    text:
      "Vengono registrati i consensi relativi a privacy, conformità, verifiche biometriche e ruolo operativo di JOKER-C2.",
    route: "/onboarding/phase-5"
  },
  {
    code: "06",
    title: "In attesa di revisione",
    text:
      "Il fascicolo viene inviato alla revisione H.B.C.E. Il richiedente non può approvare autonomamente la propria IPR.",
    route: "/onboarding/review"
  },
  {
    code: "07",
    title: "IPR approvata",
    text:
      "Il certificato di approvazione viene emesso tramite il procedimento riservato agli operatori H.B.C.E.",
    route: "/admin/review"
  },
  {
    code: "08",
    title: "Carta IPR",
    text:
      "La Carta IPR virtuale viene emessa come credenziale di identità operativa interna H.B.C.E.",
    route: "/ipr-card"
  },
  {
    code: "09",
    title: "Certificato operativo",
    text:
      "Il certificato operativo finale consente di valutare l'autorizzazione all'accesso governato a JOKER-C2.",
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
      "Il portale raccoglie e collega le informazioni del richiedente prima della valutazione dell'accesso al runtime governato. Non è una semplice registrazione AI."
  },
  {
    title: "Carta IPR as operational key",
    text:
      "La Carta IPR è la credenziale operativa interna H.B.C.E. emessa soltanto dopo la catena di revisione e approvazione."
  },
  {
    title: "JOKER-C2 as governed runtime",
    text:
      "L'accesso a JOKER-C2 richiede un certificato operativo valido. Email, password e abbonamento non sono sufficienti."
  },
  {
    title: "Fail-closed certificate logic",
    text:
      "Protocollo, emittente, fase, ambito o hash non validi impediscono di proseguire e mantengono l'accesso negato."
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
    hbce: "Carta IPR and operational certificate before JOKER-C2"
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
          Verifica l’identità prima di autorizzare l’accesso all’AI governata.
        </h1>

        <p className="hbce-lead">
          Il portale HBCE-IPR gestisce il percorso di registrazione
          dell&apos;identità operativa: emissione progressiva dei certificati,
          Carta IPR e valutazione dell&apos;accesso governato a JOKER-C2.
          Email e abbonamento non sono sufficienti per autorizzare
          l&apos;accesso. È necessaria una catena di certificati valida.
        </p>

        <div className="hbce-actions">
          <Link
            className="hbce-btn hbce-btn--primary"
            href={ROUTES.onboardingStart}
          >
            Avvia una nuova IPR
          </Link>

          <a className="hbce-btn" href="#continue-ipr">
            Continua una IPR esistente
          </a>

          <Link className="hbce-btn" href="/access/joker-c2">
            Accedi a JOKER-C2
          </Link>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">Regola fondamentale del prodotto</p>

            <h2>Prima verifica la tua identità. Poi accedi all’AI operativa.</h2>

            <p>
              Classic AI access usually follows email, password, payment and
              direct model access. HBCE follows a different rule: subject
              onboarding, fiscal identity, official evidence, liveness check,
              privacy and compliance, review, Carta IPR, operational certificate
              and only then JOKER-C2 access evaluation.
            </p>
          </div>

          <div className="hbce-card hbce-card--danger">
            <p className="hbce-kicker">Limite di accesso</p>

            <h2>Senza IPR verificata, l’accesso a JOKER-C2 resta negato.</h2>

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
            <p className="hbce-kicker">Certificato accettato</p>

            <h2>Puoi continuare il percorso HBCE-IPR.</h2>

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
                Continua alla fase successiva
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <p className="hbce-kicker">Modello AI tradizionale</p>

            <h2>Email, pagamento e accesso al modello.</h2>

            <p>
              Nei servizi AI tradizionali, l’accesso dipende generalmente
              dalla creazione di un account, dall’autenticazione e
              dall’eventuale abbonamento.
            </p>

            <ul className="hbce-list">
              {COMPARISON_ROWS.map((row) => (
                <li key={row.classic}>{row.classic}</li>
              ))}
            </ul>
          </div>

          <div className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">Modello H.B.C.E.</p>

            <h2>Identità operativa prima dell’accesso all’AI governata.</h2>

            <p>
              H.B.C.E. distingue il semplice accesso a un account
              dall’autorizzazione operativa. Prima di accedere a JOKER-C2
              è necessario disporre di una catena di certificati valida.
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
          <p className="hbce-kicker">Catena dei certificati</p>

          <h2>Ogni certificato abilita la fase successiva.</h2>

          <p>
            The app works through downloadable `.hbce.json` files. Each file
            contains the hash of the previous phase and the hash of its own
            canonical payload. The final operational certificate is the only
            file accepted by the JOKER-C2 access gate.
          </p>

          <div className="hbce-grid hbce-grid--3">
            {CERTIFICATE_CHAIN.map((step) => (
              <article className="hbce-card hbce-card--soft" key={step.code}>
                <p className="hbce-kicker">Certificato {step.code}</p>

                <h3>{step.title}</h3>

                <p>{step.text}</p>

                <div className="hbce-actions">
                  <Link className="hbce-btn" href={step.route}>
                    Apri la fase
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
            <p className="hbce-kicker">Regole di caricamento IPR</p>

            <h2>I certificati si caricano attraverso un unico procedimento.</h2>

            <p>
              Per proseguire, carica il precedente certificato `.hbce.json`.
              Il sistema verifica il file e determina la fase successiva.
              CIE, patente, passaporto, tessera sanitaria, fotografie e video
              sono evidenze delle rispettive fasi, non certificati di continuazione.
            </p>
          </div>

          <div className="hbce-card hbce-card--danger">
            <p className="hbce-kicker">Blocco di sicurezza</p>

            <h2>I certificati non validi non consentono di proseguire.</h2>

            <p>
              Un protocollo, un emittente, una fase, uno stato o un ambito
              non validi, oppure un hash mancante o incoerente,
              impediscono la continuazione e bloccano l’accesso.
            </p>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <p className="hbce-kicker">Architettura del prodotto</p>

          <h2>Portale HBCE-IPR · Carta IPR · JOKER-C2.</h2>

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
          <p className="hbce-kicker">Limiti legali e operativi</p>

          <h2>IPR è un sistema di identità operativa interna.</h2>

          <p>
            HBCE-IPR è un sistema interno di identità operativa collegato
            a evidenze documentali. Non costituisce un sistema di identità
            statale e non sostituisce i documenti ufficiali o i servizi
            fiduciari regolamentati.
          </p>

          <ul className="hbce-list">
            {OPERATIONAL_BOUNDARIES.map((boundary) => (
              <li key={boundary}>{boundary}</li>
            ))}
          </ul>

          <div className="hbce-actions">
            <Link className="hbce-btn hbce-btn--primary" href="/onboarding">
              Apri la registrazione IPR
            </Link>

            <Link className="hbce-btn" href="/certificate">
              Certificato operativo
            </Link>

            <Link className="hbce-btn" href="/access/joker-c2">
              Controllo accesso JOKER-C2
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
