import Link from "next/link";

import {
  FORBIDDEN_REPOSITORY_DATA,
  PRIVACY_BOUNDARY_TEXT,
  PUBLIC_SAFE_FIELDS,
  ROUTES
} from "@/lib/constants";

import { BoundaryNotice } from "@/components/BoundaryNotice";

const protectedDataCategories = [
  "Identity data",
  "Official document metadata",
  "Fiscal or national identifier metadata",
  "Photo verification state",
  "Video verification state",
  "Liveness verification state",
  "Review state",
  "IPR status",
  "IPR Card status",
  "Operational certificate status",
  "Revocation state",
  "JOKER-C2 access state"
] as const;

const privacyPrinciples = [
  "Collect only what is necessary for operational identity onboarding.",
  "Expose only minimized metadata, masked values, operational states and hash references.",
  "Keep raw identity material outside public views and outside the repository.",
  "Use protected storage references instead of public document URLs.",
  "Never commit real identity documents, fiscal identifiers, photos, videos or biometric material.",
  "Deny JOKER-C2 access when operational identity state is incomplete, expired, suspended or revoked."
] as const;

const minimizationModel = [
  {
    label: "Document number",
    value: "sha256_demo_document_number_hash"
  },
  {
    label: "Fiscal identifier",
    value: "DEM*********VED"
  },
  {
    label: "Document file",
    value: "protected_storage_reference_demo"
  },
  {
    label: "Photo / video material",
    value: "protected_media_reference_demo"
  },
  {
    label: "Access state",
    value: "denied_by_default"
  },
  {
    label: "Public proof layer",
    value: "hash_only_reference"
  }
] as const;

const jokerC2AllowedFields = [
  "IPR ID",
  "IPR status",
  "IPR Card status",
  "Operational certificate status",
  "Revocation state",
  "Access scope",
  "Access decision",
  "Decision reason"
] as const;

export default function PrivacyPage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Tutela dei dati personali</p>

        <h1 className="hbce-title">Minimizzazione dei dati per l’identità operativa.</h1>

        <p className="hbce-lead">
          HBCE IPR Onboarding App follows data minimization. The MVP must use
          synthetic data only and must not expose real identity documents,
          fiscal identifiers, photos, videos, biometric material or private
          review notes.
        </p>
      </section>

      <section className="hbce-section">
        <BoundaryNotice title="Regola fondamentale sulla privacy">
          {PRIVACY_BOUNDARY_TEXT}
        </BoundaryNotice>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <p className="hbce-kicker">Categorie protette</p>
            <h2>Dati soggetti a protezione</h2>

            <p>
              These categories may exist in a future real implementation, but
              the MVP must treat them as protected and must not expose raw
              sensitive material.
            </p>

            <ul className="hbce-list">
              {protectedDataCategories.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">Principi di tutela dei dati</p>
            <h2>Utilità operativa senza esposizione superflua</h2>

            <p>
              The app should preserve verification value while reducing the
              amount of private material visible to public routes, demo records
              and development artifacts.
            </p>

            <ul className="hbce-list">
              {privacyPrinciples.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <p className="hbce-kicker">Campi ammessi alla visualizzazione pubblica</p>
            <h2>Campi operativi minimizzati consentiti</h2>

            <p>
              Public or semi-public UI areas may display minimized operational
              fields only. These fields are still contextual and should remain
              limited to demonstration, audit or verification surfaces.
            </p>

            <ul className="hbce-list">
              {PUBLIC_SAFE_FIELDS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="hbce-card">
            <p className="hbce-kicker">Dati vietati nel repository</p>
            <h2>Materiali da non inserire nel repository</h2>

            <p>
              These materials must not be committed to the repository or used in
              public screenshots, examples, seed data, demo records or mock
              onboarding flows.
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
          <p className="hbce-kicker">Modello di hash e oscuramento dei dati</p>
          <h2>Verifica senza esposizione superflua.</h2>

          <p>
            The app should prefer hash references, masked values and protected
            storage references. Hashes do not remove all privacy obligations, but
            they reduce direct exposure of raw identity material.
          </p>

          <div className="hbce-card-preview__meta">
            {minimizationModel.map((item) => (
              <div className="hbce-meta" key={item.label}>
                <span className="hbce-meta__label">{item.label}</span>
                <span className="hbce-meta__value hbce-mono">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <p className="hbce-kicker">Limiti privacy di JOKER-C2</p>
          <h2>Il runtime governato non richiede i documenti di identità originali.</h2>

          <p>
            The access gate should pass only minimized authorization state to
            JOKER-C2. JOKER-C2 does not need raw identity documents, raw fiscal
            identifiers, photos, videos, biometric templates or liveness
            recordings to evaluate governed access.
          </p>

          <div className="hbce-divider" />

          <ul className="hbce-list">
            {jokerC2AllowedFields.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="hbce-section">
        <BoundaryNotice title="MVP privacy boundary" tone="danger">
          This repository is a public R&amp;D and MVP surface. It must use
          synthetic data only. Real onboarding records, real documents, real
          photos, real videos, production identifiers, secrets and private keys
          must remain outside the repository.
        </BoundaryNotice>
      </section>

      <section className="hbce-section">
        <div className="hbce-actions">
          <Link className="hbce-btn" href={ROUTES.legal}>
            View Legal Boundary
          </Link>

          <Link className="hbce-btn" href={ROUTES.security}>
            View Security Boundary
          </Link>

          <Link className="hbce-btn hbce-btn--primary" href={ROUTES.onboarding}>
            Return to Onboarding
          </Link>
        </div>
      </section>
    </div>
  );
}
