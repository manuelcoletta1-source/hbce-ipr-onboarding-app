# HBCE IPR Onboarding App — Data Model

**HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA**  
**HERMETICUM B.C.E. S.r.l.**

---

## 1. Purpose

This document defines the operational data model for HBCE IPR Onboarding App.

The app is designed to support:

```txt
progressive HBCE-IPR certificate release
identity onboarding
fiscal identity evidence
official document evidence
photo/video liveness evidence
privacy and compliance acceptance
review submission
HBCE approval
IPR Card issuance
operational certificate activation
governed JOKER-C2 access evaluation
future EVT integration
future OPC integration
future revocation registry
```

The core rule is:

```txt
No verified IPR, no governed JOKER-C2 access.
```

The current MVP data model is centered on a progressive certificate chain:

```txt
01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → JOKER-C2 gate
```

---

## 2. Data Model Principle

The data model must separate:

```txt
raw sensitive data
private portable certificate fields
protected storage references
hash references
operational status values
public-safe display values
registry references
audit event references
access decision state
revocation state
```

The repository must never contain real raw identity data.

The MVP may use private portable certificate files generated locally by the user.

Public verification must expose hash-only references wherever possible.

---

## 3. Canonical Protocols

The release protocol is:

```txt
HBCE-IPR-RELEASE-v3
```

The payload protocol is:

```txt
HBCE-IPR-PAYLOAD-v3
```

Canonical certificate kinds:

```txt
IPR_PHASE_CERTIFICATE
IPR_OPERATIONAL_CERTIFICATE
```

Canonical jurisdiction:

```txt
EU
```

Canonical hash algorithm:

```txt
SHA-256
```

Canonical payload canonicalization:

```txt
stableStringify(keys-sorted)
```

Canonical issuer:

```json
{
  "hallmark": "HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA",
  "legal_name": "HERMETICUM B.C.E. S.r.l.",
  "jurisdiction": "EU"
}
```

---

## 4. Core Certificate Structure

Every portable HBCE-IPR certificate follows this structure:

```json
{
  "proto": "HBCE-IPR-RELEASE-v3",
  "kind": "IPR_PHASE_CERTIFICATE",
  "issuer": {
    "hallmark": "HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA",
    "legal_name": "HERMETICUM B.C.E. S.r.l.",
    "jurisdiction": "EU"
  },
  "phase": {
    "number": 1,
    "code": "SUBJECT_CREATED",
    "status": "PENDING",
    "next_required_phase": "FISCAL_IDENTITY"
  },
  "subject": {
    "entity_type": "HUMAN",
    "subject_ref": "hash-only-subject-reference"
  },
  "hash_integrity": {
    "algo": "SHA-256",
    "canonicalization": "stableStringify(keys-sorted)",
    "previous_payload_sha256": null,
    "payload_sha256": "generated-current-hash"
  },
  "payload": {
    "proto": "HBCE-IPR-PAYLOAD-v3",
    "jurisdiction": "EU",
    "policy": {
      "UE_FIRST": true,
      "AUDIT_FIRST": true,
      "FAIL_CLOSED": true,
      "HASH_ONLY": true,
      "GDPR_MIN": true,
      "APPEND_ONLY": true,
      "NO_PUBLIC_IDENTITY_CUSTODY": true
    },
    "phase_data": {}
  },
  "registry": {
    "kind": "HASH_ONLY_PUBLIC_ENTRY",
    "public_entry": {
      "payload_sha256": "generated-current-hash",
      "timestamp": "generated-timestamp",
      "phase": "SUBJECT_CREATED"
    }
  },
  "next": {
    "upload_required": true,
    "next_phase": "FISCAL_IDENTITY"
  },
  "issued_at": "generated-timestamp"
}
```

The final operational certificate uses:

```txt
kind = IPR_OPERATIONAL_CERTIFICATE
phase.code = IPR_VERIFIED
certificate_status = ACTIVE
certificate_scope = JOKER_C2_ACCESS
```

---

## 5. Hash Chain Rule

Every certificate follows this rule:

```txt
previous_payload_sha256 + current canonical payload → payload_sha256
```

Certificate 01 has:

```txt
previous_payload_sha256 = null
```

Every later certificate must contain:

```txt
previous_payload_sha256 = hash of previous certificate payload
payload_sha256 = hash of current certificate payload
```

If the chain is malformed, missing, wrong-phase, wrong-next-phase or hash-invalid, the system must fail closed.

---

## 6. Main Data Entities

The minimum data entities are:

```txt
HbceIssuer
HbceIprPolicy
HbceIprSubject
HbceIprPhase
HbceIprHashIntegrity
HbceIprPayloadEnvelope
HbceIprRegistry
HbceIprCertificate
HbceIprPhaseCertificate
HbceIprOperationalCertificate
HbceEvidenceUpload
HbcePreviousCertificateUpload
HbceGeneratedCertificate
HbceCertificateValidationResult
HbceJokerC2AccessGateResult
SubjectRecord
OnboardingRecord
IdentityProfile
DocumentRecord
FiscalIdentifierRecord
PhotoVideoVerificationRecord
ReviewRecord
IprRecord
IprCardRecord
OperationalCertificateRecord
AccessGateResult
AuditEventReference
RevocationRecord
PublicIprCardView
PublicCertificateView
PublicHbceIprCertificateView
```

---

## 7. Certificate Chain Phase Model

The canonical certificate phases are:

| Number | Phase Code | Runtime Status | Next Required Phase |
|---|---|---|---|
| 1 | `SUBJECT_CREATED` | `PENDING` | `FISCAL_IDENTITY` |
| 2 | `FISCAL_IDENTITY_COLLECTED` | `PENDING` | `OFFICIAL_ID_DOCUMENT` |
| 3 | `OFFICIAL_DOCUMENT_SUBMITTED` | `PENDING` | `LIVENESS_CHECK` |
| 4 | `LIVENESS_SUBMITTED` | `PENDING` | `PRIVACY_COMPLIANCE` |
| 5 | `COMPLIANCE_ACCEPTED` | `PENDING` | `REVIEW_SUBMISSION` |
| 6 | `PENDING_REVIEW` | `PENDING_REVIEW` | `HBCE_APPROVAL` |
| 7 | `IPR_APPROVED` | `APPROVED` | `IPR_CARD_ISSUANCE` |
| 8 | `IPR_CARD_ISSUED` | `ACTIVE` | `OPERATIONAL_CERTIFICATE` |
| 9 | `IPR_VERIFIED` | `COMPLETED` | `JOKER_C2_ACCESS` |

Allowed phase numbers:

```txt
1
2
3
4
5
6
7
8
9
```

Allowed phase codes:

```txt
SUBJECT_CREATED
FISCAL_IDENTITY_COLLECTED
OFFICIAL_DOCUMENT_SUBMITTED
LIVENESS_SUBMITTED
COMPLIANCE_ACCEPTED
PENDING_REVIEW
IPR_APPROVED
IPR_CARD_ISSUED
IPR_VERIFIED
```

Allowed next phase codes:

```txt
FISCAL_IDENTITY
OFFICIAL_ID_DOCUMENT
LIVENESS_CHECK
PRIVACY_COMPLIANCE
REVIEW_SUBMISSION
HBCE_APPROVAL
IPR_CARD_ISSUANCE
OPERATIONAL_CERTIFICATE
JOKER_C2_ACCESS
COMPLETED
```

Allowed runtime statuses:

```txt
ACTIVE
PENDING
PENDING_REVIEW
APPROVED
REJECTED
REQUEST_MORE_DATA
EXPIRED
REVOKED
SUSPENDED
COMPLETED
```

---

## 8. Certificate File Names

Canonical generated certificate files:

```txt
hbce-ipr-01-subject-created.hbce.json
hbce-ipr-02-fiscal-identity.hbce.json
hbce-ipr-03-official-document.hbce.json
hbce-ipr-04-liveness-submitted.hbce.json
hbce-ipr-05-privacy-compliance.hbce.json
hbce-ipr-06-review-pending.hbce.json
hbce-ipr-07-ipr-approved.hbce.json
hbce-ipr-08-ipr-card.hbce.json
hbce-ipr-09-operational-certificate.hbce.json
```

The final file required by the JOKER-C2 gate is:

```txt
hbce-ipr-09-operational-certificate.hbce.json
```

---

## 9. Phase 01 Data — Subject Created

Generated file:

```txt
hbce-ipr-01-subject-created.hbce.json
```

Phase code:

```txt
SUBJECT_CREATED
```

Phase data may include:

```txt
certificate_role
certificate_visibility
certificate_boundary
privacy_boundary
public_registry_mode
subject_creation_mode
ipr_status
ipr_card_status
joker_c2_access
issued_at
issued_at_utc
issued_at_local
created_at
timezone
previous_payload_sha256
next_required_phase
private_fields
client_private_data
client_private_data_included
hash_fields
verification_state
```

Private customer fields may include:

```txt
email
phone_number
first_name
last_name
country
date_of_birth
```

Hash fields may include:

```txt
email_hash
phone_hash
first_name_hash
last_name_hash
country_hash
date_of_birth_hash
```

Boundary:

```txt
Certificate 01 creates the subject record.
Certificate 01 does not verify final identity.
Certificate 01 does not issue IPR Card.
Certificate 01 does not grant JOKER-C2 access.
```

---

## 10. Phase 02 Data — Fiscal Identity

Generated file:

```txt
hbce-ipr-02-fiscal-identity.hbce.json
```

Phase code:

```txt
FISCAL_IDENTITY_COLLECTED
```

Phase data may include:

```txt
tax_id_value_hash
tax_id_document_front_sha256
tax_id_document_back_sha256
tax_id_document_sha256
tax_id_metadata_hash
citizenship_hash
fiscal_country_hash
issued_at
issued_at_utc
issued_at_local
timezone
previous_payload_sha256
next_required_phase
```

Supported fiscal document types:

```txt
ITALIAN_TESSERA_SANITARIA
ITALIAN_CODICE_FISCALE
EU_TAX_ID_DOCUMENT
NATIONAL_FISCAL_DOCUMENT
NATIONAL_TAX_IDENTIFIER_CERTIFICATE
OTHER_AUTHORIZED_FISCAL_DOCUMENT
```

Boundary:

```txt
Raw fiscal identifiers must not be publicly exposed.
Raw fiscal documents must not be committed to the repository.
Certificate 02 does not approve IPR.
Certificate 02 does not grant JOKER-C2 access.
```

---

## 11. Phase 03 Data — Official Document

Generated file:

```txt
hbce-ipr-03-official-document.hbce.json
```

Phase code:

```txt
OFFICIAL_DOCUMENT_SUBMITTED
```

Phase data may include:

```txt
document_type
document_country
document_number_hash
document_issuer_hash
document_issue_date_hash
document_expiry_date_hash
document_front_sha256
document_back_sha256
document_passport_page_sha256
document_metadata_hash
issued_at
issued_at_utc
issued_at_local
timezone
previous_payload_sha256
next_required_phase
```

Supported official document types:

```txt
ITALIAN_CIE
EU_IDENTITY_CARD
DRIVING_LICENCE
PASSPORT
RESIDENCE_DOCUMENT
OTHER_AUTHORIZED_OFFICIAL_DOCUMENT
```

Boundary:

```txt
Raw document images must not be embedded.
Raw document numbers must not be publicly exposed.
Certificate 03 does not approve IPR.
Certificate 03 does not grant JOKER-C2 access.
```

---

## 12. Phase 04 Data — Liveness Submitted

Generated file:

```txt
hbce-ipr-04-liveness-submitted.hbce.json
```

Phase code:

```txt
LIVENESS_SUBMITTED
```

Phase data may include:

```txt
selfie_sha256
video_sha256
liveness_declaration_sha256
liveness_timestamp
protected_photo_reference
protected_video_reference
photo_verification_status
video_verification_status
liveness_status
issued_at
issued_at_utc
issued_at_local
timezone
previous_payload_sha256
next_required_phase
```

Boundary:

```txt
Real photos must not be committed to the repository.
Real videos must not be committed to the repository.
Biometric templates must not be exposed.
Certificate 04 does not issue IPR Card.
Certificate 04 does not grant JOKER-C2 access.
```

---

## 13. Phase 05 Data — Privacy & Compliance

Generated file:

```txt
hbce-ipr-05-privacy-compliance.hbce.json
```

Phase code:

```txt
COMPLIANCE_ACCEPTED
```

Phase data may include:

```txt
privacy_consent_hash
hash_only_acknowledgement_hash
data_accuracy_confirmation_hash
document_authenticity_confirmation_hash
hbce_policy_acceptance_hash
no_state_identity_claim_acknowledgement_hash
internal_operational_identity_acknowledgement_hash
terms_consent_hash
identity_verification_consent_hash
gdpr_min_acknowledgement
hash_only_acknowledgement
no_state_identity_claim_acknowledgement
internal_operational_identity_acknowledgement
all_consents_accepted
private_fields
consent_fields
consent_private_data
hash_fields
issued_at
issued_at_utc
previous_payload_sha256
next_required_phase
certificate_boundary
privacy_boundary
```

Fail-closed rule:

```txt
All mandatory acknowledgements must be accepted before Certificate 05 can be generated.
```

Boundary:

```txt
Certificate 05 records privacy and compliance.
Certificate 05 does not approve IPR.
Certificate 05 does not issue IPR Card.
Certificate 05 does not grant JOKER-C2 access.
```

---

## 14. Phase 06 Data — Review Pending

Generated file:

```txt
hbce-ipr-06-review-pending.hbce.json
```

Phase code:

```txt
PENDING_REVIEW
```

Phase data may include:

```txt
submit_for_review
review_statement
review_status
review_package_hash
submitted_at
user_self_approval_allowed
backend_or_admin_review_required
hbce_operator_decision_required
ipr_approval_granted
ipr_card_issuance_authorized
joker_c2_access_authorized
private_fields
review_fields
review_private_data
hash_fields
previous_payload_sha256
next_required_phase
certificate_boundary
privacy_boundary
trust_boundary
```

Fail-closed rule:

```txt
Certificate 06 can be generated only after explicit review submission.
```

Boundary:

```txt
Certificate 06 records review submission only.
Certificate 06 does not approve IPR.
Certificate 06 does not issue IPR Card.
Certificate 06 does not grant JOKER-C2 access.
```

---

## 15. Phase 07 Data — IPR Approved

Generated file:

```txt
hbce-ipr-07-ipr-approved.hbce.json
```

Phase code:

```txt
IPR_APPROVED
```

Phase data may include:

```txt
approved_by
approved_at
approval_decision
approval_note
approval_decision_hash
approved_by_hash
approval_status_hash
approval_boundary_hash
production_boundary_hash
approval_metadata_hash
approval_note_hash
user_self_approval_allowed
backend_or_admin_review_required
hbce_operator_decision_required
production_backend_required
ipr_card_issuance_authorized
private_fields
approval_fields
approval_private_data
hash_fields
previous_payload_sha256
next_required_phase
certificate_boundary
privacy_boundary
trust_boundary
```

Allowed MVP approval decision:

```txt
APPROVE
```

Future backend/admin decisions:

```txt
REJECT
REQUEST_MORE_DATA
EXPIRE
SUSPEND
REVOKE
```

Boundary:

```txt
Certificate 07 authorizes IPR Card issuance.
Certificate 07 does not issue IPR Card.
Certificate 07 does not issue operational certificate.
Certificate 07 does not grant JOKER-C2 access.
```

---

## 16. Phase 08 Data — IPR Card Issued

Generated file:

```txt
hbce-ipr-08-ipr-card.hbce.json
```

Phase code:

```txt
IPR_CARD_ISSUED
```

Phase data may include:

```txt
ipr_id
subject_id
card_serial
card_status
issuer
operator_reference
issued_at
issued_at_utc
valid_until
ipr_id_hash
subject_id_hash
card_serial_hash
card_status_hash
operator_reference_hash
validity_hash
non_replacement_boundary_hash
card_boundary_hash
card_metadata_hash
private_fields
card_fields
card_private_data
hash_fields
previous_payload_sha256
next_required_phase
non_replacement_boundary
card_issuance_boundary
certificate_boundary
privacy_boundary
trust_boundary
```

Required card status:

```txt
ACTIVE
```

Boundary:

```txt
IPR Card is an internal HBCE operational identity credential.
IPR Card does not replace official identity documents.
Certificate 08 does not issue operational certificate.
Certificate 08 does not grant JOKER-C2 access.
```

---

## 17. Phase 09 Data — Operational Certificate

Generated file:

```txt
hbce-ipr-09-operational-certificate.hbce.json
```

Phase code:

```txt
IPR_VERIFIED
```

Certificate kind:

```txt
IPR_OPERATIONAL_CERTIFICATE
```

Phase data may include:

```txt
certificate_id
ipr_id
subject_id
card_serial
certificate_status
certificate_scope
issuer
operator_reference
issued_at
issued_at_utc
valid_until
certificate_id_hash
ipr_id_hash
subject_id_hash
card_serial_hash
certificate_status_hash
certificate_scope_hash
operator_reference_hash
validity_hash
access_boundary_hash
legal_boundary_hash
gate_validation_boundary_hash
verification_hash
private_fields
certificate_fields
operational_certificate_private_data
hash_fields
previous_payload_sha256
next_required_phase
access_boundary
legal_boundary
gate_validation_boundary
certificate_boundary
privacy_boundary
trust_boundary
joker_c2_access_granted
joker_c2_gate_validation_required
```

Required certificate status:

```txt
ACTIVE
```

Required certificate scope:

```txt
JOKER_C2_ACCESS
```

Boundary:

```txt
Certificate 09 enables JOKER-C2 access evaluation.
Certificate 09 does not bypass the gate.
Certificate 09 does not grant runtime access by itself.
```

---

## 18. JOKER-C2 Access Gate Result

The final access gate validates Certificate 09.

Minimum gate result:

```json
{
  "decision": "ACCESS_GRANTED",
  "certificate_status": "ACTIVE",
  "certificate_scope": "JOKER_C2_ACCESS",
  "payload_sha256": "payload-hash",
  "previous_payload_sha256": "previous-payload-hash",
  "reason": "Valid HBCE operational certificate accepted.",
  "checked_at": "generated-timestamp"
}
```

Allowed decisions:

```txt
ACCESS_GRANTED
ACCESS_DENIED
```

Access granted only when:

```txt
proto = HBCE-IPR-RELEASE-v3
kind = IPR_OPERATIONAL_CERTIFICATE
issuer.legal_name = HERMETICUM B.C.E. S.r.l.
phase.code = IPR_VERIFIED
certificate_status = ACTIVE
certificate_scope = JOKER_C2_ACCESS
previous_payload_sha256 present
payload_sha256 valid
```

Default decision:

```txt
ACCESS_DENIED
```

---

## 19. Evidence Upload Model

Evidence upload kinds may include:

```txt
TAX_ID_DOCUMENT_FRONT
TAX_ID_DOCUMENT_BACK
TAX_ID_DOCUMENT_SINGLE
CIE_FRONT
CIE_BACK
DRIVING_LICENCE_FRONT
DRIVING_LICENCE_BACK
PASSPORT_DATA_PAGE
OFFICIAL_DOCUMENT_FRONT
OFFICIAL_DOCUMENT_BACK
SELFIE
VIDEO_VERIFICATION
```

Evidence upload fields:

```txt
kind
file_name
mime_type
size_bytes
sha256
storage_reference
uploaded_at
```

Boundary:

```txt
Evidence files must not be committed to the repository.
Portable certificates should reference evidence through hashes and protected references.
Production evidence requires protected storage.
```

---

## 20. Previous Certificate Upload Model

Previous certificate upload fields:

```txt
file_name
certificate
uploaded_at
```

Accepted upload UI may also expose:

```txt
payloadSha256
previousPayloadSha256
source
```

Boundary:

```txt
The app must validate certificate content.
The app must not trust file name alone.
```

Yes, filenames are still not magic. The tragic education of software continues.

---

## 21. Validation Result Model

Certificate validation result fields:

```txt
decision
valid
reason
message
expected_phase
received_phase
expected_next_phase
received_next_phase
payload_sha256
previous_payload_sha256
checked_at
```

Allowed decisions:

```txt
VALID
FAIL_CLOSED
```

Fail-closed reasons include:

```txt
MISSING_PREVIOUS_CERTIFICATE
INVALID_JSON
INVALID_PROTO
INVALID_KIND
INVALID_ISSUER
INVALID_PHASE
INVALID_NEXT_PHASE
MISSING_PAYLOAD_HASH
MISSING_PREVIOUS_HASH
HASH_MISMATCH
MISSING_REQUIRED_FIELD
MISSING_REQUIRED_UPLOAD
REVOKED
SUSPENDED
EXPIRED
UNDER_REVIEW
NOT_OPERATIONAL_CERTIFICATE
INVALID_CERTIFICATE_SCOPE
```

---

## 22. Legacy Operational Records

The MVP also preserves legacy-style operational records for compatibility with older UI and future backend planning.

These records are not the final trust source in the MVP certificate chain.

They include:

```txt
SubjectRecord
OnboardingRecord
IdentityProfile
DocumentRecord
FiscalIdentifierRecord
PhotoVideoVerificationRecord
ReviewRecord
IprRecord
IprCardRecord
OperationalCertificateRecord
AccessGateResult
AuditEventReference
RevocationRecord
```

---

## 23. SubjectRecord

The SubjectRecord represents the person being onboarded.

Minimum fields:

```txt
subjectId
emailHash
firstName
lastName
country
preferredLanguage
createdAt
updatedAt
```

Privacy boundary:

```txt
Public views should avoid exposing full personal data.
Hash references should be preferred where possible.
```

---

## 24. OnboardingRecord

The OnboardingRecord tracks the full onboarding process.

Minimum fields:

```txt
subjectId
onboardingId
iprId
currentStep
onboardingStatus
emailStatus
identityDataStatus
documentStatus
fiscalIdentifierStatus
photoVerificationStatus
videoVerificationStatus
reviewStatus
iprStatus
iprCardStatus
certificateStatus
revocationState
jokerC2AccessStatus
latestPhaseCertificateHash
latestPhaseCertificateFileName
latestPhaseNumber
createdAt
updatedAt
```

Allowed current step values:

```txt
start
identity
documents
fiscal
photo_video
review
ipr_card
certificate
joker_c2_access
completed
blocked
phase_1_subject
phase_2_fiscal_identity
phase_3_official_document
phase_4_liveness
phase_5_privacy_compliance
phase_6_review_pending
phase_7_ipr_approved
phase_8_ipr_card
phase_9_operational_certificate
```

---

## 25. IdentityProfile

IdentityProfile stores private identity data required for the operational identity record.

Minimum fields:

```txt
identityProfileId
subjectId
firstName
lastName
dateOfBirth
placeOfBirth
country
nationality
residentialCountry
residentialRegion
residentialCity
identityDataStatus
createdAt
updatedAt
```

Privacy boundary:

```txt
Identity data must remain private.
Identity data must not be exposed in public routes.
Identity data must not be stored in mock examples using real persons.
```

---

## 26. DocumentRecord

DocumentRecord stores document metadata and protected references.

Minimum fields:

```txt
documentRecordId
subjectId
onboardingId
documentType
documentCountry
documentExpiryDate
documentNumberHash
documentFileHash
documentStorageReference
documentFrontHash
documentBackHash
documentPassportPageHash
documentFrontStorageReference
documentBackStorageReference
documentPassportPageStorageReference
documentStatus
createdAt
updatedAt
```

Allowed document type values:

```txt
identity_card
passport
driving_license
residence_document
other_official_document
italian_cie
eu_identity_card
national_identity_card
```

Forbidden fields in public output:

```txt
raw_document_number
raw_document_image
raw_document_scan
unprotected_document_url
```

---

## 27. FiscalIdentifierRecord

FiscalIdentifierRecord links the subject to a fiscal code, tax identifier or national identification number.

Minimum fields:

```txt
fiscalIdentifierId
subjectId
onboardingId
fiscalIdentifierType
fiscalIdentifierCountry
fiscalIdentifierHash
fiscalIdentifierMasked
fiscalDocumentFrontHash
fiscalDocumentBackHash
fiscalDocumentHash
fiscalDocumentFrontStorageReference
fiscalDocumentBackStorageReference
fiscalDocumentStorageReference
fiscalIdentifierStatus
createdAt
updatedAt
```

Allowed fiscal identifier type values:

```txt
fiscal_code
tax_identifier
national_identification_number
social_security_style_number
other_public_identifier
italian_codice_fiscale
italian_tessera_sanitaria
eu_tax_id
national_tax_identifier
```

Display rule:

```txt
Only masked values may be shown in the interface.
```

Example:

```txt
CLT*********44R
```

---

## 28. PhotoVideoVerificationRecord

PhotoVideoVerificationRecord tracks photo/video verification state.

Minimum fields:

```txt
photoVideoVerificationId
subjectId
onboardingId
photoReference
videoReference
photoHash
videoHash
livenessDeclarationHash
photoVerificationStatus
videoVerificationStatus
livenessStatus
createdAt
updatedAt
```

Allowed status values:

```txt
not_started
pending
submitted
in_review
manual_review
approved
rejected
expired
needs_more_information
```

MVP rule:

```txt
The MVP may use placeholder states only.
Real photos and videos must not be committed to the repository.
```

---

## 29. ReviewRecord

ReviewRecord tracks the decision process before IPR approval.

Minimum fields:

```txt
reviewId
subjectId
onboardingId
reviewStatus
riskFlags
reviewDecision
reviewerReference
decisionTimestamp
createdAt
updatedAt
```

Allowed review decision values:

```txt
none
approve
reject
request_more_information
expire
revoke
suspend
```

Privacy boundary:

```txt
private review notes must never be exposed publicly.
reviewer reference should be minimized where possible.
```

---

## 30. IprRecord

IprRecord represents the internal operational identity record.

Minimum fields:

```txt
iprId
subjectId
onboardingId
iprStatus
issuer
issuedAt
expiresAt
scope
hashReference
previousIprReference
phaseCertificateHashReference
operationalCertificateHashReference
createdAt
updatedAt
```

Allowed IPR status values:

```txt
not_created
pending
verified
rejected
expired
revoked
suspended
```

Canonical meaning:

```txt
IPR identifies the operational subject inside the HBCE ecosystem.
IPR connects identity, verification, access and audit continuity.
IPR is not an official public identity document.
```

---

## 31. IprCardRecord

IprCardRecord represents the operational card issued after HBCE approval.

Minimum fields:

```txt
iprCardId
iprId
subjectId
cardStatus
issuer
issuedAt
expiresAt
accessScope
certificateReference
revocationState
cardHashReference
previousPayloadSha256
payloadSha256
createdAt
updatedAt
```

Allowed card status values:

```txt
not_issued
pending
issued
expired
revoked
suspended
```

Public-safe display fields:

```txt
iprCardId
iprId
cardStatus
issuer
issuedAt
expiresAt
accessScope
revocationState
```

Forbidden public display fields:

```txt
raw identity data
raw document data
raw fiscal identifier
raw photo
raw video
biometric material
```

---

## 32. OperationalCertificateRecord

OperationalCertificateRecord links the verified IPR to governed access.

Minimum fields:

```txt
certificateId
iprId
subjectId
certificateStatus
issuer
issuedAt
expiresAt
scope
hashReference
previousPayloadSha256
payloadSha256
revocationState
createdAt
updatedAt
```

Allowed certificate status values:

```txt
not_created
pending
active
expired
revoked
suspended
```

Legal boundary:

```txt
The operational certificate is internal to HBCE.
It is not a qualified eIDAS certificate unless issued through a recognized and compliant trust service integration.
```

---

## 33. AccessGateResult

AccessGateResult determines whether the subject may access JOKER-C2.

Minimum fields:

```txt
subjectId
iprId
iprStatus
iprCardStatus
certificateStatus
revocationState
jokerC2AccessStatus
decision
decisionReason
requiredConditions
currentConditions
gatewayReference
decidedAt
```

Allowed access decision values:

```txt
deny_access
allow_governed_access
pending_access
```

Default decision:

```txt
deny_access
```

Minimum allow conditions:

```txt
iprStatus = verified
iprCardStatus = issued
certificateStatus = active
revocationState = clear
```

The current certificate-gate model uses `HbceJokerC2AccessGateResult` with:

```txt
ACCESS_GRANTED
ACCESS_DENIED
```

---

## 34. AuditEventReference

AuditEventReference prepares the system for EVT and OPC integration.

Minimum fields:

```txt
eventReferenceId
eventType
subjectId
iprId
onboardingId
previousEventReference
eventHash
eventTimestamp
decisionState
createdAt
```

Suggested event types:

```txt
ONBOARDING_STARTED
EMAIL_REGISTERED
EMAIL_VERIFIED
SUBJECT_CREATED
FISCAL_IDENTITY_COLLECTED
OFFICIAL_DOCUMENT_SUBMITTED
PHOTO_VIDEO_SUBMITTED
LIVENESS_SUBMITTED
PRIVACY_COMPLIANCE_ACCEPTED
REVIEW_SUBMITTED
REVIEW_APPROVED
REVIEW_REJECTED
REVIEW_NEEDS_MORE_INFORMATION
IPR_APPROVED
IPR_CARD_ISSUED
OPERATIONAL_CERTIFICATE_CREATED
IPR_VERIFIED
JOKER_C2_ACCESS_ENABLED
JOKER_C2_ACCESS_DENIED
IPR_SUSPENDED
IPR_REVOKED
```

Boundary:

```txt
Audit events should store minimized operational references.
Audit events should not expose raw identity documents or raw biometric material.
```

---

## 35. RevocationRecord

RevocationRecord tracks suspension, revocation and expiry.

Minimum fields:

```txt
revocationId
subjectId
iprId
targetType
targetId
revocationState
reasonCode
issuedBy
issuedAt
createdAt
updatedAt
```

Allowed target type values:

```txt
ipr
ipr_card
certificate
joker_c2_access
onboarding_record
hbce_ipr_phase_certificate
hbce_ipr_operational_certificate
```

Allowed revocation state values:

```txt
clear
suspended
revoked
expired
under_review
```

Rule:

```txt
Any state other than clear must deny JOKER-C2 access.
```

---

## 36. Public View Models

### PublicIprCardView

Public-safe fields:

```txt
iprId
iprCardId
subjectId
issuer
cardStatus
certificateStatus
accessScope
revocationState
issuedAt
expiresAt
cardHashReference
```

---

### PublicCertificateView

Public-safe fields:

```txt
certificateId
iprId
subjectId
issuer
certificateStatus
scope
revocationState
issuedAt
expiresAt
hashReference
```

---

### PublicHbceIprCertificateView

Public-safe fields:

```txt
proto
kind
issuer
phase
subject
payload_sha256
previous_payload_sha256
issued_at
next_phase
```

Boundary:

```txt
Public views must not expose private phase data unless explicitly intended for the subject's own local private copy.
```

---

## 37. Minimal JSON Example

This example uses synthetic data only.

```json
{
  "subject_id": "sub_demo_001",
  "ipr_id": "IPR-HBCE-DEMO-001",
  "onboarding_status": "completed",
  "email_status": "verified",
  "phone_status": "verified",
  "fiscal_identity_status": "submitted",
  "official_document_status": "submitted",
  "photo_verification_status": "submitted",
  "video_verification_status": "submitted",
  "liveness_status": "manual_review",
  "privacy_compliance_status": "accepted",
  "review_status": "approved",
  "ipr_status": "verified",
  "ipr_card_status": "issued",
  "certificate_status": "active",
  "revocation_state": "clear",
  "joker_c2_access_status": "enabled"
}
```

---

## 38. Public-Safe IPR Card JSON Example

```json
{
  "ipr_card_id": "CARD-HBCE-DEMO-001",
  "ipr_id": "IPR-HBCE-DEMO-001",
  "card_status": "issued",
  "issuer": "HERMETICUM B.C.E. S.r.l.",
  "issued_at": "2026-05-20T12:00:00+02:00",
  "expires_at": "2027-05-20T12:00:00+02:00",
  "access_scope": "JOKER-C2-GOVERNED-RUNTIME",
  "revocation_state": "clear"
}
```

---

## 39. Access Decision JSON Example

```json
{
  "access_decision_id": "access_demo_001",
  "subject_id": "sub_demo_001",
  "ipr_id": "IPR-HBCE-DEMO-001",
  "ipr_status": "verified",
  "ipr_card_status": "issued",
  "certificate_status": "active",
  "revocation_state": "clear",
  "joker_c2_access_status": "enabled",
  "decision": "allow_governed_access",
  "decision_reason": "verified_ipr_card_and_active_certificate",
  "decided_at": "2026-05-20T12:00:00+02:00"
}
```

---

## 40. Final Certificate Gate JSON Example

```json
{
  "decision": "ACCESS_GRANTED",
  "certificate_status": "ACTIVE",
  "certificate_scope": "JOKER_C2_ACCESS",
  "payload_sha256": "demo_payload_hash",
  "previous_payload_sha256": "demo_previous_payload_hash",
  "reason": "Valid HBCE operational certificate accepted.",
  "checked_at": "2026-05-20T12:00:00+02:00"
}
```

---

## 41. Fail-Closed Access Logic

```txt
if certificate is missing:
    ACCESS_DENIED

if certificate is malformed:
    ACCESS_DENIED

if proto != HBCE-IPR-RELEASE-v3:
    ACCESS_DENIED

if kind != IPR_OPERATIONAL_CERTIFICATE:
    ACCESS_DENIED

if issuer != HERMETICUM B.C.E. S.r.l.:
    ACCESS_DENIED

if phase.code != IPR_VERIFIED:
    ACCESS_DENIED

if certificate_status != ACTIVE:
    ACCESS_DENIED

if certificate_scope != JOKER_C2_ACCESS:
    ACCESS_DENIED

if previous_payload_sha256 is missing:
    ACCESS_DENIED

if payload_sha256 is invalid:
    ACCESS_DENIED

otherwise:
    ACCESS_GRANTED
```

---

## 42. Forbidden Data in Repository

The repository must never include:

```txt
real identity documents
real fiscal identifiers
real document numbers
real photos
real videos
real biometric data
real liveness recordings
real review notes containing sensitive material
real onboarding records
production secrets
private keys
database credentials
API credentials
storage credentials
```

---

## 43. Canonical Data Formula

```txt
IPR identifies.
Certificates chain.
Documents support verification.
Hashes minimize exposure.
Statuses control access.
IPR Card operationalizes identity.
Operational certificate authorizes scope.
Access gate protects JOKER-C2.
EVT traces.
OPC proves.
HBCE governs.
```

---

## 44. Organization

```txt
HERMETICUM B.C.E. S.r.l.
```

---

## 45. Canonical Trademark

```txt
HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA
HERMETICUM B.C.E. S.r.l.
```
