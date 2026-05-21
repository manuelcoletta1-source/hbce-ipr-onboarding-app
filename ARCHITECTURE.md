# HBCE IPR Onboarding App — Architecture

Bank-grade operational identity onboarding architecture for progressive HBCE-IPR certificate release, IPR Verified status, IPR Card issuance, operational certificate activation and governed JOKER-C2 access evaluation.

**HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA**  
**HERMETICUM B.C.E. S.r.l.**

---

## 1. Architectural Purpose

HBCE IPR Onboarding App is the operational identity onboarding layer of the HBCE ecosystem.

Its purpose is to verify a subject before access to governed AI runtime services.

The application does not replace official state identity systems.

It creates an internal operational identity certificate chain that may be connected to official identity systems, trust services or institutional integrations in future compliant implementations.

The core architectural rule is:

```txt
No verified IPR, no governed JOKER-C2 access.
```

The operating formula is:

```txt
First, verify who you are.
Then access operational artificial intelligence.
```

---

## 2. System Position

The application sits between the public HBCE Platform and the JOKER-C2 governed AI runtime.

```txt
HBCE Platform
     ↓
HBCE IPR Onboarding App
     ↓
HBCE-IPR Certificate Chain
     ↓
IPR Verified
     ↓
IPR Card
     ↓
Operational Certificate
     ↓
JOKER-C2 Access Gate
     ↓
JOKER-C2 Governed AI Runtime
```

HBCE Platform is the public and institutional access threshold.

HBCE IPR Onboarding App is the operational identity onboarding gateway.

HBCE-IPR Certificate Chain is the progressive evidence and continuity layer.

IPR Card is the internal operational identity key.

Operational Certificate is the internal runtime authorization certificate.

JOKER-C2 Access Gate is the fail-closed validation threshold.

JOKER-C2 is the governed artificial intelligence runtime.

---

## 3. Core Architectural Principle

Classic AI platforms usually identify users through email, password, OAuth or payment.

HBCE requires operational identity verification before access.

The access model is:

```txt
Subject creation
→ Fiscal identity evidence
→ Official document evidence
→ Photo/video liveness evidence
→ Privacy and compliance acceptance
→ HBCE review submission
→ HBCE approval
→ IPR Card issuance
→ Operational certificate activation
→ JOKER-C2 access gate
→ Governed JOKER-C2 runtime
```

This creates a bank-grade onboarding posture for governed AI access without turning HBCE into a banking service, public identity provider or qualified trust service.

The architectural distinction is structural:

```txt
Classic AI
→ email
→ password / OAuth
→ subscription / payment
→ direct model access

HBCE / JOKER-C2
→ subject onboarding
→ certificate chain
→ IPR Card
→ operational certificate
→ access gate
→ governed runtime access
```

---

## 4. Completed MVP Architecture

The current MVP implements the complete client-side HBCE-IPR certificate chain:

```txt
01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → JOKER-C2 gate
```

The MVP includes:

```txt
progressive certificate generation
downloadable .hbce.json files
previous certificate validation
automatic session continuity
manual certificate fallback
HBCE approval checkpoint
IPR Card issuance
operational certificate activation
JOKER-C2 access gate
fail-closed validation
legal boundary
privacy boundary
security boundary
```

The MVP demonstrates the architecture.

The MVP is not the production trust source.

Production requires backend enforcement, protected storage, server-side signing, operator authentication, revocation control and audit logging.

---

## 5. Certificate Chain Architecture

The HBCE-IPR certificate chain is the central architecture of the app.

Each certificate:

```txt
represents one onboarding phase
contains issuer data
contains phase state
contains subject reference
contains previous payload hash
contains current payload hash
contains private phase payload
contains public hash-only registry reference
unlocks the next required phase
```

The certificate chain is:

| Step | Phase | Route | Output |
|---|---|---|---|
| 01 | `SUBJECT_CREATED` | `/onboarding/phase-1` | `hbce-ipr-01-subject-created.hbce.json` |
| 02 | `FISCAL_IDENTITY_COLLECTED` | `/onboarding/phase-2` | `hbce-ipr-02-fiscal-identity.hbce.json` |
| 03 | `OFFICIAL_DOCUMENT_SUBMITTED` | `/onboarding/phase-3` | `hbce-ipr-03-official-document.hbce.json` |
| 04 | `LIVENESS_SUBMITTED` | `/onboarding/photo-video` | `hbce-ipr-04-liveness-submitted.hbce.json` |
| 05 | `COMPLIANCE_ACCEPTED` | `/onboarding/phase-5` | `hbce-ipr-05-privacy-compliance.hbce.json` |
| 06 | `PENDING_REVIEW` | `/onboarding/review` | `hbce-ipr-06-review-pending.hbce.json` |
| 07 | `IPR_APPROVED` | `/admin/review` | `hbce-ipr-07-ipr-approved.hbce.json` |
| 08 | `IPR_CARD_ISSUED` | `/ipr-card` | `hbce-ipr-08-ipr-card.hbce.json` |
| 09 | `IPR_VERIFIED` | `/certificate` | `hbce-ipr-09-operational-certificate.hbce.json` |
| Gate | `JOKER_C2_ACCESS` | `/access/joker-c2` | `ACCESS_GRANTED` or `ACCESS_DENIED` |

Canonical Phase 04 route:

```txt
/onboarding/photo-video
```

Legacy alias, if preserved:

```txt
/onboarding/phase-4
```

---

## 6. Hash Chain Architecture

Every certificate follows this rule:

```txt
previous_payload_sha256 + current canonical payload → payload_sha256
```

The first certificate has:

```txt
previous_payload_sha256 = null
```

Every following certificate must contain:

```txt
previous_payload_sha256 = hash of the previous certificate payload
payload_sha256 = hash of the current certificate payload
```

If the previous certificate is missing, malformed, wrong-phase, wrong-next-phase or hash-invalid, the system must fail closed.

The hash chain provides:

```txt
phase continuity
tamper evidence
portable audit reference
manual fallback validation
JOKER-C2 access precondition
future EVT/OPC integration readiness
```

---

## 7. Main Architectural Modules

### 7.1 Landing Module

Primary route:

```txt
/
```

Main function:

```txt
Explain the IPR onboarding purpose and start the verification process.
```

The landing module communicates the difference between classic AI login and HBCE governed AI access.

It does not collect sensitive evidence.

It does not grant JOKER-C2 access.

---

### 7.2 Certificate Continuation Module

Primary route:

```txt
/onboarding
```

Main function:

```txt
Load an existing HBCE-IPR certificate.
Validate it fail-closed.
Detect the next required phase.
Redirect to the correct route.
```

The continuation module supports manual fallback.

It must not treat an uploaded certificate as trusted until validation succeeds.

---

### 7.3 Phase 01 Module — Subject Created

Primary route:

```txt
/onboarding/phase-1
```

Main function:

```txt
Create the first subject record and release Certificate 01.
```

Minimum data:

```txt
email
phone number
first name
last name
country
date of birth
email verification state
phone verification state
subject reference
```

Generated file:

```txt
hbce-ipr-01-subject-created.hbce.json
```

Boundary:

```txt
does not verify final identity
does not approve IPR
does not issue IPR Card
does not issue operational certificate
does not grant JOKER-C2 access
```

---

### 7.4 Phase 02 Module — Fiscal Identity

Primary route:

```txt
/onboarding/phase-2
```

Required input:

```txt
Certificate 01
```

Main function:

```txt
Collect fiscal identity metadata and evidence hash references.
```

Supported fiscal evidence may include:

```txt
Italian codice fiscale
Italian tessera sanitaria
EU tax ID document
national tax identifier
national fiscal document
other authorized fiscal document
```

Generated file:

```txt
hbce-ipr-02-fiscal-identity.hbce.json
```

Boundary:

```txt
raw fiscal documents are not embedded
raw fiscal identifiers must not be exposed publicly
does not approve IPR
does not issue IPR Card
does not grant JOKER-C2 access
```

---

### 7.5 Phase 03 Module — Official ID Document

Primary route:

```txt
/onboarding/phase-3
```

Required input:

```txt
Certificate 02
```

Main function:

```txt
Collect official identity document metadata and protected evidence hashes.
```

Supported document classes may include:

```txt
CIE
EU identity card
passport
driving licence
residence document
other authorized official document
```

Generated file:

```txt
hbce-ipr-03-official-document.hbce.json
```

Boundary:

```txt
raw identity document images are not embedded
raw document files must not be committed
does not approve IPR
does not issue IPR Card
does not grant JOKER-C2 access
```

---

### 7.6 Phase 04 Module — Photo / Video Liveness

Primary route:

```txt
/onboarding/photo-video
```

Required input:

```txt
Certificate 03
```

Main function:

```txt
Prepare photo/video evidence metadata and liveness review state.
```

Evidence may include:

```txt
protected photo reference
protected video reference
photo SHA-256 reference
video SHA-256 reference
liveness declaration
photo verification status
video verification status
liveness review status
```

Generated file:

```txt
hbce-ipr-04-liveness-submitted.hbce.json
```

Boundary:

```txt
does not process real biometric templates in the MVP
does not expose real photos or videos
does not approve IPR
does not issue IPR Card
does not activate operational certificate
does not grant JOKER-C2 access
```

Future integrations may include identity verification providers, liveness verification providers, qualified trust service providers or official European digital identity frameworks where legally available.

---

### 7.7 Phase 05 Module — Privacy & Compliance

Primary route:

```txt
/onboarding/phase-5
```

Required input:

```txt
Certificate 04
```

Main function:

```txt
Collect mandatory privacy and compliance acknowledgements.
```

Required acknowledgements:

```txt
privacy consent
hash-only acknowledgement
data accuracy confirmation
document authenticity confirmation
HBCE policy acceptance
no state identity claim acknowledgement
internal operational identity acknowledgement
```

Generated file:

```txt
hbce-ipr-05-privacy-compliance.hbce.json
```

Fail-closed rule:

```txt
all mandatory acknowledgements must be accepted before Certificate 05 can be generated
```

Boundary:

```txt
does not approve IPR
does not issue IPR Card
does not activate operational certificate
does not grant JOKER-C2 access
```

---

### 7.8 Phase 06 Module — Review Pending

Primary route:

```txt
/onboarding/review
```

Required input:

```txt
Certificate 05
```

Main function:

```txt
Submit onboarding package for HBCE review.
```

Generated file:

```txt
hbce-ipr-06-review-pending.hbce.json
```

Fail-closed rule:

```txt
Certificate 06 can be generated only after explicit review submission.
```

Boundary:

```txt
does not approve IPR
does not issue IPR Card
does not activate operational certificate
does not grant JOKER-C2 access
```

---

### 7.9 Phase 07 Module — HBCE Approval

Primary route:

```txt
/admin/review
```

Required input:

```txt
Certificate 06
```

Main function:

```txt
Perform explicit HBCE admin/operator approval and release Certificate 07.
```

Generated file:

```txt
hbce-ipr-07-ipr-approved.hbce.json
```

MVP behavior:

```txt
Certificate 06 may be loaded from browser session.
Manual Certificate 06 upload remains available.
Only APPROVE generates Certificate 07.
REJECT and REQUEST_MORE_DATA require future protected backend/admin workflow.
```

Production requirement:

```txt
authenticated admin/operator identity
server-side approval enforcement
operator authorization
audit logging
revocation control
protected evidence review
```

Boundary:

```txt
Certificate 07 authorizes IPR Card issuance.
Certificate 07 does not issue IPR Card.
Certificate 07 does not issue operational certificate.
Certificate 07 does not grant JOKER-C2 access.
```

---

### 7.10 Phase 08 Module — IPR Card Issuance

Primary route:

```txt
/ipr-card
```

Required input:

```txt
Certificate 07
```

Main function:

```txt
Issue internal HBCE IPR Card certificate.
```

Generated card fields:

```txt
ipr_id
subject_id
card_serial
card_status
issuer
issued_at
valid_until
previous_payload_sha256
payload_sha256
```

Generated file:

```txt
hbce-ipr-08-ipr-card.hbce.json
```

Boundary:

```txt
IPR Card is an internal operational identity credential.
IPR Card does not replace CIE, SPID, EUDI Wallet, passport, driving licence, national identity card or qualified eIDAS certificate.
Certificate 08 does not issue operational certificate.
Certificate 08 does not grant JOKER-C2 access.
```

---

### 7.11 Phase 09 Module — Operational Certificate

Primary route:

```txt
/certificate
```

Required input:

```txt
Certificate 08
```

Main function:

```txt
Issue final HBCE operational certificate required for JOKER-C2 access evaluation.
```

Generated certificate fields:

```txt
certificate_id
ipr_id
subject_id
card_serial
certificate_status
certificate_scope
issuer
issued_at
valid_until
previous_payload_sha256
payload_sha256
```

Generated file:

```txt
hbce-ipr-09-operational-certificate.hbce.json
```

Required kind:

```txt
IPR_OPERATIONAL_CERTIFICATE
```

Required phase:

```txt
IPR_VERIFIED
```

Required status:

```txt
ACTIVE
```

Required scope:

```txt
JOKER_C2_ACCESS
```

Boundary:

```txt
Certificate 09 enables JOKER-C2 access evaluation.
Certificate 09 does not bypass the JOKER-C2 gate.
Certificate 09 does not grant runtime access by itself.
```

Legal boundary:

```txt
The operational certificate is internal to HBCE.
It is not a qualified eIDAS certificate unless issued through a recognized and compliant trust service integration.
```

---

### 7.12 JOKER-C2 Access Gate Module

Primary route:

```txt
/access/joker-c2
```

Required input:

```txt
Certificate 09
```

Main function:

```txt
Validate the final operational certificate and allow or deny governed JOKER-C2 access.
```

The gate checks:

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

Allow decision:

```txt
ACCESS_GRANTED
```

Boundary:

```txt
Access is governed, not automatic.
The operational certificate enables access evaluation.
It does not bypass governance, revocation, suspension, expiry, runtime policy or future server-side enforcement.
```

---

## 8. Suggested Route Map

| Route | Function |
|---|---|
| `/` | Landing page |
| `/onboarding` | Central certificate continuation page |
| `/onboarding/phase-1` | Subject Created / Certificate 01 |
| `/onboarding/phase-2` | Fiscal Identity / Certificate 02 |
| `/onboarding/phase-3` | Official ID Document / Certificate 03 |
| `/onboarding/photo-video` | Photo / Video Liveness / Certificate 04 |
| `/onboarding/phase-5` | Privacy & Compliance / Certificate 05 |
| `/onboarding/review` | Review Pending / Certificate 06 |
| `/admin/review` | HBCE Approval / Certificate 07 |
| `/ipr-card` | IPR Card issuance / Certificate 08 |
| `/certificate` | Operational certificate issuance / Certificate 09 |
| `/access/joker-c2` | Governed JOKER-C2 access gate |
| `/legal` | Legal and operational boundary |
| `/privacy` | Privacy and data minimization boundary |
| `/security` | Security and fail-closed boundary |

---

## 9. Minimal Operational Data Model

A minimal production onboarding architecture should include:

```txt
subject_id
onboarding_id
ipr_id
certificate_id
card_serial
email_hash
phone_hash
first_name_hash
last_name_hash
date_of_birth_hash
country_hash
document_type
document_country
document_number_hash
document_file_hash
document_storage_reference
fiscal_identifier_type
fiscal_identifier_country
fiscal_identifier_hash
fiscal_identifier_masked
photo_reference
video_reference
photo_hash
video_hash
liveness_declaration_hash
photo_verification_status
video_verification_status
liveness_status
privacy_compliance_status
review_status
approval_decision
approved_by
approved_at
ipr_status
ipr_card_status
certificate_status
certificate_scope
joker_c2_access_status
revocation_state
previous_payload_sha256
payload_sha256
created_at
updated_at
```

Sensitive raw documents should not be stored publicly.

Sensitive raw documents should never be committed to this repository.

Production storage requires encryption, access control and retention governance.

---

## 10. Sensitive Data Boundary

The application may process sensitive identity data in a future protected implementation, but the repository must never contain:

```txt
raw identity documents
raw fiscal identifiers
raw document numbers
raw biometric data
raw photos
raw videos
liveness recordings
face templates
private keys
production secrets
database credentials
API credentials
production onboarding records
```

Public layers should expose only:

```txt
minimized operational data
masked values
hash references
public-safe status fields
non-sensitive route metadata
```

---

## 11. Security Model

The application must follow these principles:

```txt
fail_closed_by_default
least_privilege_access
data_minimization
private_document_storage
private_media_storage
hash_based_reference
audit_ready_events
revocation_support
manual_review_support
no_public_raw_documents
no_secret_in_source_code
server_side_authorization_in_production
```

Access to JOKER-C2 must never be based only on:

```txt
email registration
payment state
frontend state
query parameters
browser storage
hidden form fields
unsigned client-side flags
```

---

## 12. Verification Logic

The minimum JOKER-C2 access gate logic is:

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

Revocation must override any previous approval in production.

Pending, expired, suspended, rejected or incomplete states must not authorize JOKER-C2.

---

## 13. Automatic Continuity and Manual Fallback

The MVP supports browser session continuity.

When a certificate is generated:

```txt
1. the certificate is downloaded to the user
2. the certificate is stored temporarily in browser session storage
3. the app redirects to the next route
4. the next route reloads the certificate from session
5. the next route validates the certificate fail-closed
6. the next route enables continuation only if valid
```

Manual fallback remains available:

```txt
Use another Certificate
Upload previous HBCE-IPR certificate manually
```

Production boundary:

```txt
browser session continuity is not a production trust source
production requires backend enforcement
production requires server-side signing
production requires protected storage
production requires authenticated operator/admin actions
```

---

## 14. EVT and OPC Integration

Each relevant onboarding step should generate an event reference in future production architecture.

Suggested events:

```txt
ONBOARDING_STARTED
EMAIL_REGISTERED
EMAIL_VERIFIED
PHONE_VERIFIED
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

EVT should provide continuity.

OPC should provide operational proof and compliance reference.

The onboarding app should eventually connect to the broader HBCE audit layer.

Future EVT/OPC integration may bind:

```txt
certificate generation
certificate validation
manual upload fallback
admin approval
IPR Card issuance
operational certificate activation
JOKER-C2 gate decision
revocation state
```

---

## 15. Legal Boundary

HBCE IPR Onboarding App does not issue official public identity credentials.

It does not replace:

```txt
national identity card
passport
driving licence
CIE
SPID
EUDI Wallet
qualified eIDAS certificate
bank account
IBAN
regulated financial identity service
regulated trust service
```

The correct position is:

```txt
HBCE issues a verifiable operational identity that can be linked to official European identity systems.
```

The incorrect position is:

```txt
HBCE issues an official European identity.
```

The future integration position is:

```txt
HBCE operational identity may be connected to official European identity systems, subject to applicable law, recognized trust service providers and institutional partnerships.
```

---

## 16. MVP Implementation Status

The MVP now includes:

```txt
public landing page
central onboarding continuation page
subject created certificate phase
fiscal identity certificate phase
official document certificate phase
photo/video liveness certificate phase
privacy and compliance certificate phase
review pending certificate phase
HBCE approval certificate phase
IPR Card certificate phase
operational certificate phase
JOKER-C2 access gate
legal boundary page
privacy boundary page
security boundary page
certificate uploader
phase form generator
hash chain logic
fail-closed validation logic
automatic session continuity
manual certificate fallback
```

Current status:

```txt
Working MVP certificate chain completed.
```

---

## 17. Future Integration Layer

Future integrations may include:

```txt
backend API
database persistence
encrypted storage
protected document storage
protected media storage
document verification providers
liveness verification providers
qualified trust service providers
EUDI Wallet compatible services
eIDAS compliant trust services
secure storage providers
KYC/KYB providers
enterprise identity providers
institutional identity registries
HBCE EVT registry
HBCE OPC proof layer
revocation registry
JOKER-C2 runtime authorization
operator review console
monitoring and incident response
```

All future integrations must preserve the legal boundary: HBCE may issue an internal operational identity layer, not an official public identity credential, unless a formally recognized and compliant integration changes that scope.

---

## 18. Public Metadata and Discovery

The app may expose public metadata through:

```txt
app/sitemap.ts
app/robots.ts
app/manifest.ts
```

These files must include only public routes.

They must not expose:

```txt
private storage routes
document upload paths
identity records
production onboarding records
review notes
protected media
database resources
secret endpoints
```

---

## 19. Production Requirements

A production implementation requires:

```txt
backend API
database
protected evidence storage
server-side certificate signing
server-side session management
admin authentication
operator authorization
audit logging
revocation registry
secure document verification provider
secure liveness verification provider
KYC / eID / eIDAS integration study
EUDI Wallet compatibility study
EVT continuity integration
OPC proof integration
JOKER-C2 runtime bridge
monitoring
incident response
legal review
privacy review
security review
```

Client-side certificate generation and browser session continuity are not sufficient as production trust sources.

Production trust requires backend enforcement.

---

## 20. Canonical Product Formula

```txt
HERMETICUM B.C.E. Platform is the access threshold.
HBCE IPR Onboarding App is the operational identity gateway.
IPR Card is the operational key.
JOKER-C2 is the governed artificial intelligence runtime.
```

---

## 21. Canonical Website Formula

```txt
Access JOKER-C2 only through verified IPR.
An email is not enough.
A subscription is not enough.
An operational identity is required: documented, traceable and verifiable.
```

---

## 22. Organization

```txt
HERMETICUM B.C.E. S.r.l.
```

---

## 23. Canonical Trademark

```txt
HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA
HERMETICUM B.C.E. S.r.l.
```
