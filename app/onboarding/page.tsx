"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import IprCertificateUploader from "@/components/IprCertificateUploader";

import { getContinuationRouteFromCertificate } from "@/lib/ipr-phase-map";

import { ROUTES } from "@/lib/constants";

import type { AcceptedIprCertificateUpload } from "@/components/IprCertificateUploader";

const CONTINUATION_RULES = [
  {
    title: "Carica il certificato HBCE-IPR più recente",
    text:
      "Utilizza il file `.hbce.json` più recente generato dall'applicazione. Il sistema legge la fase del certificato e determina il passaggio successivo."
  },
  {
    title: "Non caricare documenti personali in questa sezione",
    text:
      "CIE, patente, passaporto, tessera sanitaria, codice fiscale, fotografie e video devono essere caricati esclusivamente nelle rispettive fasi."
  },
  {
    title: "Blocco di sicurezza predefinito",
    text:
      "Se protocollo, emittente, fase o hash del certificato non sono validi, il sistema rifiuta il file e blocca la continuazione."
  }
] as const;

const CERTIFICATE_CHAIN = [
  {
    code: "01",
    title: "Soggetto registrato",
    route: "/onboarding/phase-1",
    description:
      "Crea il soggetto HBCE-IPR dopo la verifica di email e telefono mediante codici OTP."
  },
  {
    code: "02",
    title: "Identità fiscale",
    route: "/onboarding/phase-2",
    description:
      "Collega il soggetto ai dati fiscali e ai riferimenti hash della documentazione presentata."
  },
  {
    code: "03",
    title: "Documento d’identità ufficiale",
    route: "/onboarding/phase-3",
    description:
      "Registra i metadati del documento d'identità e gli hash delle evidenze documentali."
  },
  {
    code: "04",
    title: "Verifica presenza con foto e video",
    route: "/onboarding/photo-video",
    description:
      "Predispone i riferimenti a volto, fotografia, video e stato della verifica di presenza."
  },
  {
    code: "05",
    title: "Privacy e conformità",
    route: "/onboarding/phase-5",
    description:
      "Registra i consensi privacy, conformità, verifica biometrica e ruolo operativo di JOKER-C2."
  },
  {
    code: "06",
    title: "In attesa di revisione",
    route: "/onboarding/review",
    description:
      "Invia il fascicolo alla revisione H.B.C.E. senza approvare automaticamente l'IPR."
  },
  {
    code: "07",
    title: "IPR approvata",
    route: "/admin/review",
    description:
      "Fase riservata all'approvazione H.B.C.E. Il richiedente non può approvarsi autonomamente."
  },
  {
    code: "08",
    title: "Carta IPR emessa",
    route: "/ipr-card",
    description:
      "Emette la Carta IPR soltanto dopo il certificato di revisione approvato."
  },
  {
    code: "09",
    title: "Certificato operativo H.B.C.E.",
    route: "/certificate",
    description:
      "Emette il certificato operativo necessario per valutare l'accesso governato a JOKER-C2."
  }
] as const;

const POSITIONING_POINTS = [
  {
    title: "Non è una semplice registrazione a un servizio AI",
    text:
      "Un normale servizio AI può consentire l'accesso con email, password e abbonamento. H.B.C.E. richiede un percorso di identità operativa."
  },
  {
    title: "IPR prima di JOKER-C2",
    text:
      "JOKER-C2 non viene autorizzato da un semplice account, ma attraverso una catena di certificati operativi verificabili."
  },
  {
    title: "Verifica pubblica limitata agli hash",
    text:
      "I certificati portabili possono contenere dati privati. La verifica pubblica deve esporre soltanto riferimenti hash minimizzati."
  },
  {
    title: "Nessun file biometrico originale nei certificati portabili",
    text:
      "Fotografie, video originali e modelli biometrici devono restare fuori dai certificati portabili e dai percorsi pubblici."
  }
] as const;

const SECURITY_BOUNDARIES = [
  "No verified IPR, no governed JOKER-C2 access.",
  "One certificate unlocks only the next required phase.",
  "The latest valid `.hbce.json` certificate is the continuation key.",
  "Invalid protocol, issuer, phase or payload hash blocks continuation.",
  "Official documents are uploaded only in the official document phase.",
  "Fiscal documents are uploaded only in the fiscal identity phase.",
  "Photo, selfie and video liveness references are handled only in the liveness phase.",
  "The onboarding page is a continuation gateway, not a document intake page.",
  "IPR does not replace CIE, SPID, EUDI Wallet, passport or official state identity.",
  "JOKER-C2 access remains denied until the operational certificate is valid."
] as const;

function getSafeNextPhase(upload: AcceptedIprCertificateUpload): string {
  return upload.certificate.next.next_phase ?? "NO_NEXT_PHASE";
}

function getSafePreviousPayloadSha256(
  upload: AcceptedIprCertificateUpload
): string {
  return upload.previousPayloadSha256 ?? "ROOT_CERTIFICATE";
}

export default function OnboardingPage() {
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
        <p className="hbce-kicker">HBCE IPR Onboarding App</p>

        <h1 className="hbce-title">
          Avvia o continua il percorso di identità operativa HBCE-IPR.
        </h1>

        <p className="hbce-lead">
          Questo portale permette di iniziare o continuare il
          percorso HBCE-IPR. Dopo la verifica dei contatti, il sistema
          genera un certificato privato portabile. Ogni certificato
          valido consente di proseguire alla fase successiva, fino
          alla valutazione del certificato operativo finale.
        </p>

        <div className="hbce-actions">
          <Link
            className="hbce-btn hbce-btn--primary"
            href={ROUTES.onboardingStart}
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
            <p className="hbce-kicker">Regola fondamentale</p>
            <h2>No verified IPR, no governed JOKER-C2 access.</h2>

            <p>
              L’accesso a JOKER-C2 non dipende soltanto da email e password.
              Il percorso comprende registrazione, identità fiscale,
              documenti, verifica della presenza, privacy, revisione,
              approvazione, Carta IPR e certificato operativo.
            </p>
          </div>

          <div className="hbce-card hbce-card--danger">
            <p className="hbce-kicker">Condizioni di accesso</p>
            <h2>Il portale IPR non coincide con il runtime JOKER-C2.</h2>

            <p>
              Questa pagina avvia o riprende la procedura IPR.
              Non approva autonomamente la richiesta, non emette
              la Carta IPR e non autorizza direttamente JOKER-C2.
            </p>
          </div>
        </div>
      </section>

      <section className="hbce-section" id="continue-ipr">
        <IprCertificateUploader
          mode="read_any"
          required={false}
          title="Continue with Existing HBCE IPR Certificate"
          description="Upload the latest HBCE-IPR `.hbce.json` certificate you own. The app will read the chain state and open the next required phase."
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
            <p className="hbce-kicker">Pronto per continuare</p>

            <h2>Certificato accettato.</h2>

            <p>
              The uploaded HBCE-IPR certificate is valid. Continue to the next
              required onboarding phase. If no continuation route is available,
              the chain has either reached a terminal state or the phase map
              must be updated.
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
        <div className="hbce-grid hbce-grid--3">
          {CONTINUATION_RULES.map((rule) => (
            <article className="hbce-card" key={rule.title}>
              <h2>{rule.title}</h2>
              <p>{rule.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <p className="hbce-kicker">Catena dei certificati</p>

          <h2>Progressione dei certificati HBCE-IPR</h2>

          <p>
            La procedura utilizza una catena progressiva di certificati.
            Ogni file valido costituisce il riferimento necessario
            per il successivo passaggio controllato.
          </p>

          <div className="hbce-grid hbce-grid--3">
            {CERTIFICATE_CHAIN.map((item) => (
              <article className="hbce-card hbce-card--soft" key={item.code}>
                <p className="hbce-kicker">Certificato {item.code}</p>
                <h2>{item.title}</h2>
                <p>{item.description}</p>

                <div className="hbce-actions">
                  <Link className="hbce-btn" href={item.route}>
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
            <p className="hbce-kicker">Posizionamento operativo</p>

            <h2>Il percorso HBCE-IPR richiede verifiche aggiuntive rispetto a una normale registrazione AI.</h2>

            <p>
              Una normale registrazione AI può limitarsi a email e account.
              Il percorso H.B.C.E. aggiunge verifiche dei contatti,
              identità fiscale, documenti, presenza, conformità,
              revisione ed emissione dei certificati.
            </p>

            <ul className="hbce-list">
              {POSITIONING_POINTS.map((point) => (
                <li key={point.title}>
                  <strong>{point.title}:</strong> {point.text}
                </li>
              ))}
            </ul>
          </div>

          <div className="hbce-card hbce-card--danger">
            <p className="hbce-kicker">Gestione dei documenti</p>

            <h2>I documenti personali non si caricano in questa pagina.</h2>

            <p>
              CIE, patente, passaporto, tessera sanitaria, codice fiscale,
              fotografie e video sono evidenze delle singole fasi.
              Devono essere caricati nella sezione appropriata.
              Il certificato portabile registra hash, riferimenti e stati,
              non i file originali.
            </p>

            <ul className="hbce-list">
              {SECURITY_BOUNDARIES.map((boundary) => (
                <li key={boundary}>{boundary}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card hbce-card--soft">
          <p className="hbce-kicker">Regole di accesso finale</p>

          <h2>L’accesso a JOKER-C2 richiede il certificato operativo.</h2>

          <p>
            La Carta IPR è la credenziale operativa interna.
            Il certificato operativo costituisce una condizione
            necessaria per valutare l’accesso a JOKER-C2.
            Fino ad allora l’accesso rimane negato.
          </p>

          <div className="hbce-actions">
            <Link className="hbce-btn hbce-btn--primary" href="/certificate">
              Genera certificato operativo
            </Link>

            <Link className="hbce-btn" href="/access/joker-c2">
              Verifica accesso JOKER-C2
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
