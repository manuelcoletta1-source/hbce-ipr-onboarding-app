import type {
  HbceEvidenceUpload,
  HbceEvidenceUploadKind,
  HbceIprCertificate,
  HbceIprCertificateFileName,
  HbceIprCertificatePhaseCode,
  HbceIprNextPhaseCode,
  HbceIprPhaseDefinition,
  HbceIprPhaseNumber,
  HbceIprRoute
} from "./types";

export type HbceIprPhaseKey =
  | "phase_1_subject_created"
  | "phase_2_fiscal_identity"
  | "phase_3_official_document"
  | "phase_4_liveness"
  | "phase_5_privacy_compliance"
  | "phase_6_review_pending"
  | "phase_7_ipr_approved"
  | "phase_8_ipr_card"
  | "phase_9_operational_certificate";

export type HbceIprDocumentEvidenceProfile =
  | "ITALIAN_CIE"
  | "DRIVING_LICENCE"
  | "PASSPORT"
  | "EU_IDENTITY_CARD"
  | "OTHER_AUTHORIZED_OFFICIAL_DOCUMENT";

export type HbceIprFiscalEvidenceProfile =
  | "ITALIAN_TESSERA_SANITARIA"
  | "ITALIAN_CODICE_FISCALE"
  | "EU_TAX_ID_DOCUMENT"
  | "NATIONAL_FISCAL_DOCUMENT"
  | "OTHER_AUTHORIZED_FISCAL_DOCUMENT";

export type HbceEvidenceRequirementSet = {
  code: string;
  label: string;
  description: string;
  uploads: HbceEvidenceUploadKind[];
};

export type HbceFieldValidationResult = {
  valid: boolean;
  missing_fields: string[];
};

export type HbceUploadValidationResult = {
  valid: boolean;
  missing_uploads: HbceEvidenceUploadKind[];
};

const PHASE_4_LIVENESS_ROUTE = "/onboarding/photo-video" as HbceIprRoute;

export const HBCE_IPR_PHASE_DEFINITIONS: readonly HbceIprPhaseDefinition[] = [
  {
    phase_number: 1,
    phase_code: "SUBJECT_CREATED",
    route: "/onboarding/phase-1",
    file_name: "hbce-ipr-01-subject-created.hbce.json",
    expected_previous_phase: null,
    expected_previous_file_name: null,
    next_required_phase: "FISCAL_IDENTITY",
    title: "Fase 1 — Registrazione del soggetto",
    description:
      "Crea il primo certificato privato HBCE-IPR dopo la verifica di email e telefono tramite OTP. Registra il profilo, lo stato dei contatti, la data di creazione, i dati dichiarati e i riferimenti hash. Non verifica ufficialmente l'identità, non emette la Carta IPR e non autorizza JOKER-C2.",
    requires_previous_certificate: false,
    requires_hbce_operator: false,
    required_fields: [
      "email",
      "phone_number",
      "first_name",
      "last_name",
      "country",
      "date_of_birth"
    ],
    required_uploads: []
  },
  {
    phase_number: 2,
    phase_code: "FISCAL_IDENTITY_COLLECTED",
    route: "/onboarding/phase-2",
    file_name: "hbce-ipr-02-fiscal-identity.hbce.json",
    expected_previous_phase: "SUBJECT_CREATED",
    expected_previous_file_name: "hbce-ipr-01-subject-created.hbce.json",
    next_required_phase: "OFFICIAL_ID_DOCUMENT",
    title: "Fase 2 — Identità fiscale",
    description:
      "Carica il Certificato 01 e fornisci le evidenze fiscali: codice fiscale, tessera sanitaria o documento fiscale equivalente. Questa fase collega il profilo ai riferimenti fiscali e produce una registrazione dei dati fiscali.",
    requires_previous_certificate: true,
    requires_hbce_operator: false,
    required_fields: [
      "tax_id",
      "citizenship",
      "fiscal_country",
      "fiscal_document_type"
    ],
    required_uploads: ["TAX_ID_DOCUMENT_FRONT", "TAX_ID_DOCUMENT_BACK"]
  },
  {
    phase_number: 3,
    phase_code: "OFFICIAL_DOCUMENT_SUBMITTED",
    route: "/onboarding/phase-3",
    file_name: "hbce-ipr-03-official-document.hbce.json",
    expected_previous_phase: "FISCAL_IDENTITY_COLLECTED",
    expected_previous_file_name: "hbce-ipr-02-fiscal-identity.hbce.json",
    next_required_phase: "LIVENESS_CHECK",
    title: "Fase 3 — Documento d’identità ufficiale",
    description:
      "Carica il Certificato 02 e presenta un documento ufficiale: CIE, patente, passaporto, carta d'identità UE o altro documento autorizzato. I dati e i riferimenti del documento saranno utilizzati nella successiva fase di verifica della presenza.",
    requires_previous_certificate: true,
    requires_hbce_operator: false,
    required_fields: [
      "document_type",
      "document_number",
      "document_country",
      "document_issuer",
      "document_issue_date",
      "document_expiry_date"
    ],
    required_uploads: ["OFFICIAL_DOCUMENT_FRONT"]
  },
  {
    phase_number: 4,
    phase_code: "LIVENESS_SUBMITTED",
    route: PHASE_4_LIVENESS_ROUTE,
    file_name: "hbce-ipr-04-liveness-submitted.hbce.json",
    expected_previous_phase: "OFFICIAL_DOCUMENT_SUBMITTED",
    expected_previous_file_name: "hbce-ipr-03-official-document.hbce.json",
    next_required_phase: "PRIVACY_COMPLIANCE",
    title: "Fase 4 — Verifica presenza con foto e video",
    description:
      "Carica il Certificato 03 e fornisci una fotografia del volto e un video di verifica. Il sistema registra riferimenti, hash SHA-256, dichiarazioni e stato della revisione. La presentazione dei file non equivale all'approvazione dell'identità.",
    requires_previous_certificate: true,
    requires_hbce_operator: false,
    required_fields: [
      "document_face_reference",
      "selfie_reference",
      "liveness_video_reference",
      "document_face_sha256",
      "selfie_sha256",
      "video_sha256",
      "face_match_method",
      "biometric_verification_consent",
      "descriptor_accuracy_declaration"
    ],
    required_uploads: []
  },
  {
    phase_number: 5,
    phase_code: "COMPLIANCE_ACCEPTED",
    route: "/onboarding/phase-5",
    file_name: "hbce-ipr-05-privacy-compliance.hbce.json",
    expected_previous_phase: "LIVENESS_SUBMITTED",
    expected_previous_file_name: "hbce-ipr-04-liveness-submitted.hbce.json",
    next_required_phase: "REVIEW_SUBMISSION",
    title: "Fase 5 — Privacy e conformità",
    description:
      "Carica il Certificato 04 e consulta i consensi relativi a privacy, riferimenti hash, correttezza dei dati, autenticità dei documenti, verifica biometrica, ruolo di JOKER-C2 e condizioni operative interne H.B.C.E.",
    requires_previous_certificate: true,
    requires_hbce_operator: false,
    required_fields: [
      "privacy_consent",
      "hash_only_acknowledgement",
      "data_accuracy_confirmation",
      "document_authenticity_confirmation",
      "hbce_policy_acceptance",
      "biometric_liveness_verification_consent",
      "joker_c2_custody_acknowledgement",
      "no_state_identity_claim_acknowledgement",
      "internal_operational_identity_acknowledgement"
    ],
    required_uploads: []
  },
  {
    phase_number: 6,
    phase_code: "PENDING_REVIEW",
    route: "/onboarding/review",
    file_name: "hbce-ipr-06-review-pending.hbce.json",
    expected_previous_phase: "COMPLIANCE_ACCEPTED",
    expected_previous_file_name: "hbce-ipr-05-privacy-compliance.hbce.json",
    next_required_phase: "HBCE_APPROVAL",
    title: "Fase 6 — Invio alla revisione H.B.C.E.",
    description:
      "Carica il Certificato 05 e presenta la documentazione per la revisione H.B.C.E. Il fascicolo viene sottoposto a valutazione: questa operazione non approva automaticamente l'IPR.",
    requires_previous_certificate: true,
    requires_hbce_operator: false,
    required_fields: ["submit_for_review"],
    required_uploads: []
  },
  {
    phase_number: 7,
    phase_code: "IPR_APPROVED",
    route: "/admin/review",
    file_name: "hbce-ipr-07-ipr-approved.hbce.json",
    expected_previous_phase: "PENDING_REVIEW",
    expected_previous_file_name: "hbce-ipr-06-review-pending.hbce.json",
    next_required_phase: "IPR_CARD_ISSUANCE",
    title: "Fase 7 — Approvazione H.B.C.E.",
    description:
      "Fase riservata all'approvazione dell'operatore H.B.C.E. Il richiedente non può approvare autonomamente la propria IPR. La decisione è necessaria prima dell'emissione della Carta IPR.",
    requires_previous_certificate: true,
    requires_hbce_operator: true,
    required_fields: [
      "approved_by",
      "approval_decision",
      "approval_decision_hash"
    ],
    required_uploads: []
  },
  {
    phase_number: 8,
    phase_code: "IPR_CARD_ISSUED",
    route: "/ipr-card",
    file_name: "hbce-ipr-08-ipr-card.hbce.json",
    expected_previous_phase: "IPR_APPROVED",
    expected_previous_file_name: "hbce-ipr-07-ipr-approved.hbce.json",
    next_required_phase: "OPERATIONAL_CERTIFICATE",
    title: "Fase 8 — Emissione carta IPR",
    description:
      "Carica il Certificato 07 e procedi all'emissione della Carta IPR virtuale. La carta costituisce una credenziale operativa interna H.B.C.E. e precede il certificato operativo finale.",
    requires_previous_certificate: true,
    requires_hbce_operator: false,
    required_fields: [
      "ipr_id",
      "subject_id",
      "card_serial",
      "card_status",
      "issued_at",
      "valid_until"
    ],
    required_uploads: []
  },
  {
    phase_number: 9,
    phase_code: "IPR_VERIFIED",
    route: "/certificate",
    file_name: "hbce-ipr-09-operational-certificate.hbce.json",
    expected_previous_phase: "IPR_CARD_ISSUED",
    expected_previous_file_name: "hbce-ipr-08-ipr-card.hbce.json",
    next_required_phase: "JOKER_C2_ACCESS",
    title: "Fase 9 — Certificato operativo H.B.C.E.",
    description:
      "Carica il Certificato 08 e procedi all'emissione del certificato operativo finale H.B.C.E., necessario per la valutazione dell'accesso governato a JOKER-C2.",
    requires_previous_certificate: true,
    requires_hbce_operator: false,
    required_fields: [
      "certificate_id",
      "ipr_id",
      "subject_id",
      "card_serial",
      "certificate_status",
      "certificate_scope",
      "issued_at",
      "valid_until"
    ],
    required_uploads: []
  }
] as const;

export const HBCE_FISCAL_EVIDENCE_REQUIREMENTS: Record<
  HbceIprFiscalEvidenceProfile,
  HbceEvidenceRequirementSet
> = {
  ITALIAN_TESSERA_SANITARIA: {
    code: "ITALIAN_TESSERA_SANITARIA",
    label: "Italian tessera sanitaria",
    description:
      "Upload front and back of the Italian tessera sanitaria / codice fiscale card.",
    uploads: ["TAX_ID_DOCUMENT_FRONT", "TAX_ID_DOCUMENT_BACK"]
  },
  ITALIAN_CODICE_FISCALE: {
    code: "ITALIAN_CODICE_FISCALE",
    label: "Italian codice fiscale",
    description: "Upload a valid codice fiscale document or certificate.",
    uploads: ["TAX_ID_DOCUMENT_SINGLE"]
  },
  EU_TAX_ID_DOCUMENT: {
    code: "EU_TAX_ID_DOCUMENT",
    label: "EU tax ID document",
    description:
      "Upload an official EU tax ID document or national tax identifier document.",
    uploads: ["TAX_ID_DOCUMENT_SINGLE"]
  },
  NATIONAL_FISCAL_DOCUMENT: {
    code: "NATIONAL_FISCAL_DOCUMENT",
    label: "National fiscal document",
    description:
      "Upload a national fiscal document or national tax identifier certificate.",
    uploads: ["TAX_ID_DOCUMENT_SINGLE"]
  },
  OTHER_AUTHORIZED_FISCAL_DOCUMENT: {
    code: "OTHER_AUTHORIZED_FISCAL_DOCUMENT",
    label: "Other authorized fiscal document",
    description: "Upload another authorized fiscal evidence document.",
    uploads: ["TAX_ID_DOCUMENT_SINGLE"]
  }
};

export const HBCE_DOCUMENT_EVIDENCE_REQUIREMENTS: Record<
  HbceIprDocumentEvidenceProfile,
  HbceEvidenceRequirementSet
> = {
  ITALIAN_CIE: {
    code: "ITALIAN_CIE",
    label: "Carta d’Identità Elettronica — CIE",
    description:
      "Upload front and back of the Italian Carta d’Identità Elettronica.",
    uploads: ["OFFICIAL_DOCUMENT_FRONT", "OFFICIAL_DOCUMENT_BACK"]
  },
  DRIVING_LICENCE: {
    code: "DRIVING_LICENCE",
    label: "Driving licence",
    description: "Upload front and back of the driving licence.",
    uploads: ["OFFICIAL_DOCUMENT_FRONT", "OFFICIAL_DOCUMENT_BACK"]
  },
  PASSPORT: {
    code: "PASSPORT",
    label: "Passport",
    description: "Upload the passport data page.",
    uploads: ["PASSPORT_DATA_PAGE"]
  },
  EU_IDENTITY_CARD: {
    code: "EU_IDENTITY_CARD",
    label: "EU national identity card",
    description: "Upload front and back of the EU national identity card.",
    uploads: ["OFFICIAL_DOCUMENT_FRONT", "OFFICIAL_DOCUMENT_BACK"]
  },
  OTHER_AUTHORIZED_OFFICIAL_DOCUMENT: {
    code: "OTHER_AUTHORIZED_OFFICIAL_DOCUMENT",
    label: "Other authorized official identity document",
    description:
      "Upload front and back of another authorized official identity document.",
    uploads: ["OFFICIAL_DOCUMENT_FRONT", "OFFICIAL_DOCUMENT_BACK"]
  }
};

export function getPhaseDefinitionByNumber(
  phaseNumber: HbceIprPhaseNumber
): HbceIprPhaseDefinition {
  const phase = HBCE_IPR_PHASE_DEFINITIONS.find(
    (definition) => definition.phase_number === phaseNumber
  );

  if (!phase) {
    throw new Error(`Unknown HBCE IPR phase number: ${phaseNumber}`);
  }

  return phase;
}

export function getPhaseDefinitionByCode(
  phaseCode: HbceIprCertificatePhaseCode
): HbceIprPhaseDefinition {
  const phase = HBCE_IPR_PHASE_DEFINITIONS.find(
    (definition) => definition.phase_code === phaseCode
  );

  if (!phase) {
    throw new Error(`Unknown HBCE IPR phase code: ${phaseCode}`);
  }

  return phase;
}

export function getPhaseDefinitionByRoute(
  route: HbceIprRoute
): HbceIprPhaseDefinition | null {
  return (
    HBCE_IPR_PHASE_DEFINITIONS.find(
      (definition) => definition.route === route
    ) ?? null
  );
}

export function getPhaseDefinitionByFileName(
  fileName: HbceIprCertificateFileName
): HbceIprPhaseDefinition {
  const phase = HBCE_IPR_PHASE_DEFINITIONS.find(
    (definition) => definition.file_name === fileName
  );

  if (!phase) {
    throw new Error(`Unknown HBCE IPR certificate file name: ${fileName}`);
  }

  return phase;
}

export function getNextPhaseDefinitionFromCertificate(
  certificate: HbceIprCertificate
): HbceIprPhaseDefinition | null {
  switch (certificate.next.next_phase) {
    case "FISCAL_IDENTITY":
      return getPhaseDefinitionByNumber(2);
    case "OFFICIAL_ID_DOCUMENT":
      return getPhaseDefinitionByNumber(3);
    case "LIVENESS_CHECK":
      return getPhaseDefinitionByNumber(4);
    case "PRIVACY_COMPLIANCE":
      return getPhaseDefinitionByNumber(5);
    case "REVIEW_SUBMISSION":
      return getPhaseDefinitionByNumber(6);
    case "HBCE_APPROVAL":
      return getPhaseDefinitionByNumber(7);
    case "IPR_CARD_ISSUANCE":
      return getPhaseDefinitionByNumber(8);
    case "OPERATIONAL_CERTIFICATE":
      return getPhaseDefinitionByNumber(9);
    case "JOKER_C2_ACCESS":
    case "COMPLETED":
      return null;
  }
}

export function getContinuationRouteFromCertificate(
  certificate: HbceIprCertificate
): HbceIprRoute {
  switch (certificate.next.next_phase) {
    case "FISCAL_IDENTITY":
      return "/onboarding/phase-2";
    case "OFFICIAL_ID_DOCUMENT":
      return "/onboarding/phase-3";
    case "LIVENESS_CHECK":
      return PHASE_4_LIVENESS_ROUTE;
    case "PRIVACY_COMPLIANCE":
      return "/onboarding/phase-5";
    case "REVIEW_SUBMISSION":
      return "/onboarding/review";
    case "HBCE_APPROVAL":
      return "/admin/review";
    case "IPR_CARD_ISSUANCE":
      return "/ipr-card";
    case "OPERATIONAL_CERTIFICATE":
      return "/certificate";
    case "JOKER_C2_ACCESS":
      return "/access/joker-c2";
    case "COMPLETED":
      return "/access/joker-c2";
  }
}

export function getRequiredPreviousPhaseForRoute(
  route: HbceIprRoute
): HbceIprCertificatePhaseCode | null {
  const phase = getPhaseDefinitionByRoute(route);

  return phase?.expected_previous_phase ?? null;
}

export function getExpectedNextPhaseForRoute(
  route: HbceIprRoute
): HbceIprNextPhaseCode | null {
  const phase = getPhaseDefinitionByRoute(route);

  return phase?.next_required_phase ?? null;
}

export function getRequiredUploadsForFiscalProfile(
  profile: HbceIprFiscalEvidenceProfile
): HbceEvidenceUploadKind[] {
  return HBCE_FISCAL_EVIDENCE_REQUIREMENTS[profile].uploads;
}

export function getRequiredUploadsForDocumentProfile(
  profile: HbceIprDocumentEvidenceProfile
): HbceEvidenceUploadKind[] {
  return HBCE_DOCUMENT_EVIDENCE_REQUIREMENTS[profile].uploads;
}

export function validateRequiredFields(
  requiredFields: string[],
  values: Record<string, unknown>
): HbceFieldValidationResult {
  const missingFields = requiredFields.filter((field) => {
    const value = values[field];

    if (typeof value === "string") {
      return value.trim().length === 0;
    }

    return value === undefined || value === null || value === false;
  });

  return {
    valid: missingFields.length === 0,
    missing_fields: missingFields
  };
}

export function validateRequiredUploads(
  requiredUploads: HbceEvidenceUploadKind[],
  uploads: HbceEvidenceUpload[]
): HbceUploadValidationResult {
  const uploadedKinds = new Set(uploads.map((upload) => upload.kind));

  const missingUploads = requiredUploads.filter(
    (requiredUpload) => !uploadedKinds.has(requiredUpload)
  );

  return {
    valid: missingUploads.length === 0,
    missing_uploads: missingUploads
  };
}

export function isOperatorOnlyPhase(
  phaseCode: HbceIprCertificatePhaseCode
): boolean {
  return getPhaseDefinitionByCode(phaseCode).requires_hbce_operator;
}

export function isFinalOperationalPhase(
  phaseCode: HbceIprCertificatePhaseCode
): boolean {
  return phaseCode === "IPR_VERIFIED";
}

export function isJokerC2AccessRoute(route: HbceIprRoute): boolean {
  return route === "/access/joker-c2";
}

export function getPhaseFileName(
  phaseCode: HbceIprCertificatePhaseCode
): HbceIprCertificateFileName {
  return getPhaseDefinitionByCode(phaseCode).file_name;
}

export function getPhaseRoute(
  phaseCode: HbceIprCertificatePhaseCode
): HbceIprRoute {
  return getPhaseDefinitionByCode(phaseCode).route;
}

export function getExpectedPreviousFileName(
  phaseCode: HbceIprCertificatePhaseCode
): HbceIprCertificateFileName | null {
  return getPhaseDefinitionByCode(phaseCode).expected_previous_file_name;
}
