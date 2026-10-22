import Link from "next/link";

import {
  CERTIFICATE_BOUNDARY_TEXT,
  CORRECT_LEGAL_CLAIM,
  INCORRECT_LEGAL_CLAIM,
  LEGAL_BOUNDARY_TEXT,
  NON_REPLACEMENT_BOUNDARY,
  PRODUCT_FORMULA,
  ROUTES
} from "@/lib/constants";

import { BoundaryNotice } from "@/components/BoundaryNotice";

const LEGAL_SCOPE_ITEMS = [
  "Registro interno di identità operativa",
  "Stato IPR verificata nel sistema H.B.C.E.",
  "Carta IPR come credenziale operativa interna",
  "Riferimento al certificato operativo",
  "Valutazione dell’accesso governato a JOKER-C2",
  "Riferimenti di continuità per le verifiche di audit"
] as const;

const NOT_A_SERVICE_ITEMS = [
  "Nessuna apertura di conti bancari",
  "Nessuna apertura di conti di pagamento",
  "Nessuna raccolta di depositi",
  "Nessuna concessione di prestiti",
  "Nessuna custodia di attività finanziarie",
  "Nessun prodotto finanziario regolamentato",
  "Nessuna dichiarazione di erogazione di servizi fiduciari qualificati"
] as const;

export default function LegalPage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Limiti giuridici</p>

        <h1 className="hbce-title">
          Identità operativa, non identità pubblica.
        </h1>

        <p className="hbce-lead">
          HBCE IPR Onboarding App crea un registro interno verificabile di identità
          operativa per l’accesso governato nell’ecosistema H.B.C.E. Non
          emette credenziali pubbliche ufficiali, documenti di identità
          statali, servizi finanziari regolamentati o servizi fiduciari
          qualificati.
        </p>
      </section>

      <section className="hbce-section">
        <BoundaryNotice title="Limiti giuridici fondamentali">
          {LEGAL_BOUNDARY_TEXT}
        </BoundaryNotice>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">Dichiarazione corretta</p>
            <h2>Identità operativa verificabile</h2>
            <p>{CORRECT_LEGAL_CLAIM}</p>

            <div className="hbce-divider" />

            <ul className="hbce-list">
              {LEGAL_SCOPE_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="hbce-card">
            <p className="hbce-kicker">Dichiarazione non corretta</p>
            <h2>Nessuna emissione di documenti pubblici di identità</h2>
            <p>{INCORRECT_LEGAL_CLAIM}</p>

            <div className="hbce-divider" />

            <p>
              H.B.C.E. non sostituisce i sistemi nazionali di identità, le autorità
              pubbliche competenti, i fornitori regolamentati di identità
              digitale, i prestatori riconosciuti di servizi fiduciari o le
              procedure pubbliche di rilascio dell’identità.
            </p>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <p className="hbce-kicker">Limiti di sostituzione</p>
          <h2>Sistemi e servizi non sostituiti dalla Carta IPR</h2>

          <p>
            HBCE IPR Onboarding App non sostituisce i seguenti sistemi ufficiali, pubblici
            o regolamentati.
          </p>

          <ul className="hbce-list">
            {NON_REPLACEMENT_BOUNDARY.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--3">
          <div className="hbce-card">
            <h3>IPR</h3>
            <p>
              In questa applicazione IPR indica Identity Primary Record. È un registro
              interno che collega soggetto, stato della verifica, ambito di
              accesso e continuità delle evidenze di audit. Non è un documento
              di identità statale.
            </p>
          </div>

          <div className="hbce-card">
            <h3>IPR Card</h3>
            <p>
              La Carta IPR è una credenziale operativa interna per l’accesso ai servizi
              H.B.C.E. Può rappresentare uno stato operativo verificato nel
              sistema H.B.C.E., ma non sostituisce i documenti pubblici di
              identità.
            </p>
          </div>

          <div className="hbce-card">
            <h3>Certificato operativo</h3>
            <p>{CERTIFICATE_BOUNDARY_TEXT}</p>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card hbce-card--soft">
          <p className="hbce-kicker">Struttura del prodotto</p>
          <h2>Sequenza di accesso H.B.C.E.</h2>

          <ul className="hbce-list">
            {PRODUCT_FORMULA.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <p className="hbce-kicker">Limiti del modello di verifica di livello bancario</p>
          <h2>Verifiche di livello bancario non significano servizi bancari.</h2>

          <p>
            L’applicazione può adottare procedure strutturate di verifica dell’identità
            prima dell’accesso all’AI governata. Questo non significa che
            H.B.C.E. offra conti bancari, depositi, servizi di pagamento,
            prodotti finanziari, prestiti, custodia di attività o servizi
            finanziari regolamentati.
          </p>

          <div className="hbce-divider" />

          <ul className="hbce-list">
            {NOT_A_SERVICE_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-actions">
          <Link className="hbce-btn" href={ROUTES.privacy}>
            Consulta la sezione Privacy
          </Link>

          <Link className="hbce-btn" href={ROUTES.security}>
            Consulta la sezione Sicurezza
          </Link>

          <Link className="hbce-btn hbce-btn--primary" href={ROUTES.onboarding}>
            Torna alla registrazione IPR
          </Link>
        </div>
      </section>
    </div>
  );
}
