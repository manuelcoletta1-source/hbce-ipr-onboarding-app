# HBCE IPR Onboarding Flow

**HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA**  
**HERMETICUM B.C.E. S.r.l.**

---

## 1. Purpose

HBCE IPR Onboarding Flow defines the operational sequence required to verify a subject before governed access to JOKER-C2.

The onboarding flow is designed as a bank-grade operational identity process for governed AI access.

The app is not a generic account registration website.

The app is not a simple email/password login surface.

The app is the HBCE operational identity gateway for progressive HBCE-IPR certificate release, IPR Card issuance, operational certificate activation and JOKER-C2 access evaluation.

The core rule is:

```txt
No verified IPR, no governed JOKER-C2 access.
```

The operating formula is:

```txt
First, verify who you are.
Then access operational artificial intelligence.
```

---

## 2. Canonical Flow

The canonical MVP flow is:

```txt
01 — SUBJECT_CREATED
02 — FISCAL_IDENTITY_COLLECTED
03 — OFFICIAL_DOCUMENT_SUBMITTED
04 — LIVENESS_SUBMITTED
05 — COMPLIANCE_ACCEPTED
06 — PENDING_REVIEW
07 — IPR_APPROVED
08 — IPR_CARD_ISSUED
09 — IPR_VERIFIED / OPERATIONAL_CERTIFICATE
Gate — JOKER_C2_ACCESS → ACCESS_GRANTED or ACCESS_DENIED
```

The user-facing flow is:

```txt
Start
→ Subject creation
→ Fiscal identity evidence
→ Official document evidence
→ Photo/video liveness evidence
→ Privacy and compliance acceptance
→ HBCE review submission
→ HBCE approval
→ IPR Card issuance
→ Operational certificate activation
→ JOKER-C2 access gate
→ Governed runtime access
```

The certificate flow is:

```txt
Certificate 01 unlocks Fiscal Identity
Certificate 02 unlocks Official ID Document
Certificate 03 unlocks Photo / Video Liveness
Certificate 04 unlocks Privacy & Compliance
Certificate 05 unlocks Review Submission
Certificate 06 unlocks HBCE Approval
Certificate 07 unlocks IPR Card Issuance
Certificate 08 unlocks Operational Certificate
Certificate 09 unlocks JOKER-C2 Access Gate
```

---

## 3. Flow Diagram

```txt
USER
  ↓
Landing page
  ↓
Phase 01 — Subject Created
  ↓
Certificate 01
  ↓
Phase 02 — Fiscal Identity
  ↓
Certificate 02
  ↓
Phase 03 — Official ID Document
  ↓
Certificate 03
  ↓
Phase 04 — Photo / Video Liveness
  ↓
Certificate 04
  ↓
Phase 05 — Privacy & Compliance
  ↓
Certificate 05
  ↓
Phase 06 — Review Pending
  ↓
Certificate 06
  ↓
Phase 07 — HBCE Admin Approval
  ├── REJECT / REQUEST_MORE_DATA → future backend/admin workflow
  └── APPROVE
        ↓
    Certificate 07
        ↓
    Phase 08 — IPR Card Issuance
        ↓
    Certificate 08
        ↓
    Phase 09 — Operational Certificate
        ↓
    Certificate 09
        ↓
    JOKER-C2 Access Gate
        ├── invalid certificate → ACCESS_DENIED
        └── valid certificate → ACCESS_GRANTED
                                  ↓
                             Governed runtime access
```

---

## 4. Phase 01 — Subject Created

Route:

```txt
/onboarding/phase-1
```

Purpose:

```txt
Create the initial HBCE-IPR subject record and release Certificate 01.
```

Required operational elements:

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
creation timestamp
hash references
```

Generated certificate:

```txt
hbce-ipr-01-subject-created.hbce.json
```

Generated phase:

```txt
SUBJECT_CREATED
```

Phase status:

```txt
PENDING
```

Next required phase:

```txt
FISCAL_IDENTITY
```

Allowed next route:

```txt
/onboarding/phase-2
```

Fail-closed conditions:

```txt
missing required customer data
invalid email verification state
invalid phone verification state
malformed payload
missing payload hash
invalid canonical payload hash
```

Boundary:

```txt
Certificate 01 does not verify final identity.
Certificate 01 does not issue IPR Card.
Certificate 01 does not issue the operational certificate.
Certificate 01 does not grant JOKER-C2 access.
```

---

## 5. Phase 02 — Fiscal Identity

Route:

```txt
/onboarding/phase-2
```

Purpose:

```txt
Collect fiscal identity evidence and release Certificate 02.
```

Required input:

```txt
Certificate 01
```

Expected previous phase:

```txt
SUBJECT_CREATED
```

Expected next phase from previous certificate:

```txt
FISCAL_IDENTITY
```

Required fiscal evidence may include:

```txt
Italian codice fiscale
Italian tessera sanitaria
EU tax ID document
national tax identifier
national fiscal document
other authorized fiscal document
```

Generated certificate:

```txt
hbce-ipr-02-fiscal-identity.hbce.json
```

Generated phase:

```txt
FISCAL_IDENTITY_COLLECTED
```

Next required phase:

```txt
OFFICIAL_ID_DOCUMENT
```

Allowed next route:

```txt
/onboarding/phase-3
```

Fail-closed conditions:

```txt
missing Certificate 01
wrong previous phase
wrong next required phase
invalid issuer
invalid protocol
missing fiscal evidence
missing fiscal hash reference
invalid canonical payload hash
```

Boundary:

```txt
Fiscal identity evidence supports onboarding continuity.
Raw fiscal documents are not embedded in the portable certificate.
Raw fiscal identifiers must not be committed to the repository.
Certificate 02 does not approve the IPR.
Certificate 02 does not issue IPR Card.
Certificate 02 does not grant JOKER-C2 access.
```

---

## 6. Phase 03 — Official ID Document

Route:

```txt
/onboarding/phase-3
```

Purpose:

```txt
Collect official identity document metadata and protected evidence hashes.
```

Required input:

```txt
Certificate 02
```

Expected previous phase:

```txt
FISCAL_IDENTITY_COLLECTED
```

Expected next phase from previous certificate:

```txt
OFFICIAL_ID_DOCUMENT
```

Supported document evidence includes:

```txt
CIE
EU identity card
passport
driving licence
residence document
other authorized official document
```

Generated certificate:

```txt
hbce-ipr-03-official-document.hbce.json
```

Generated phase:

```txt
OFFICIAL_DOCUMENT_SUBMITTED
```

Next required phase:

```txt
LIVENESS_CHECK
```

Allowed next route:

```txt
/onboarding/photo-video
```

Fail-closed conditions:

```txt
missing Certificate 02
wrong previous phase
wrong next required phase
missing document metadata
missing protected document hash reference
invalid document type
invalid canonical payload hash
```

Boundary:

```txt
Official document evidence supports identity verification.
Raw identity document images are not embedded in the portable certificate.
Raw document files must not be committed to the repository.
Certificate 03 does not approve the IPR.
Certificate 03 does not issue IPR Card.
Certificate 03 does not grant JOKER-C2 access.
```

---

## 7. Phase 04 — Photo / Video Liveness

Canonical route:

```txt
/onboarding/photo-video
```

Legacy route alias, if present:

```txt
/onboarding/phase-4
```

Purpose:

```txt
Prepare photo/video evidence metadata and liveness review state.
```

Required input:

```txt
Certificate 03
```

Expected previous phase:

```txt
OFFICIAL_DOCUMENT_SUBMITTED
```

Expected next phase from previous certificate:

```txt
LIVENESS_CHECK
```

Required liveness evidence may include:

```txt
front selfie
video verification
liveness declaration
protected photo reference
protected video reference
photo SHA-256 reference
video SHA-256 reference
```

Generated certificate:

```txt
hbce-ipr-04-liveness-submitted.hbce.json
```

Generated phase:

```txt
LIVENESS_SUBMITTED
```

Next required phase:

```txt
PRIVACY_COMPLIANCE
```

Allowed next route:

```txt
/onboarding/phase-5
```

Canonical declaration:

```txt
Confermo di essere il soggetto che richiede il certificato operativo HBCE IPR.
```

Fail-closed conditions:

```txt
missing Certificate 03
wrong previous phase
wrong next required phase
missing liveness metadata
missing photo hash reference
missing video hash reference
invalid canonical payload hash
```

Forbidden repository data:

```txt
real photo
real video
biometric template
face template
liveness recording
raw biometric material
```

Boundary:

```txt
Photo/video verification prepares review only.
Certificate 04 does not issue IPR Verified status.
Certificate 04 does not issue IPR Card.
Certificate 04 does not activate the operational certificate.
Certificate 04 does not grant JOKER-C2 access.
```

---

## 8. Phase 05 — Privacy & Compliance

Route:

```txt
/onboarding/phase-5
```

Purpose:

```txt
Collect mandatory privacy and compliance acknowledgements.
```

Required input:

```txt
Certificate 04
```

Expected previous phase:

```txt
LIVENESS_SUBMITTED
```

Expected next phase from previous certificate:

```txt
PRIVACY_COMPLIANCE
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

Generated certificate:

```txt
hbce-ipr-05-privacy-compliance.hbce.json
```

Generated phase:

```txt
COMPLIANCE_ACCEPTED
```

Next required phase:

```txt
REVIEW_SUBMISSION
```

Allowed next route:

```txt
/onboarding/review
```

Fail-closed rule:

```txt
All mandatory acknowledgements must be accepted before Certificate 05 can be generated.
```

Fail-closed conditions:

```txt
missing Certificate 04
wrong previous phase
wrong next required phase
one or more mandatory acknowledgements not accepted
invalid canonical payload hash
```

Boundary:

```txt
Certificate 05 records privacy and compliance acceptance.
Certificate 05 does not approve IPR.
Certificate 05 does not issue IPR Card.
Certificate 05 does not activate the operational certificate.
Certificate 05 does not grant JOKER-C2 access.
```

---

## 9. Phase 06 — Review Pending

Route:

```txt
/onboarding/review
```

Purpose:

```txt
Submit the HBCE-IPR onboarding package for HBCE review.
```

Required input:

```txt
Certificate 05
```

Expected previous phase:

```txt
COMPLIANCE_ACCEPTED
```

Expected next phase from previous certificate:

```txt
REVIEW_SUBMISSION
```

Generated certificate:

```txt
hbce-ipr-06-review-pending.hbce.json
```

Generated phase:

```txt
PENDING_REVIEW
```

Next required phase:

```txt
HBCE_APPROVAL
```

Allowed next route:

```txt
/admin/review
```

Fail-closed rule:

```txt
Certificate 06 can be generated only after explicit review submission.
```

Fail-closed conditions:

```txt
missing Certificate 05
wrong previous phase
wrong next required phase
review submission not explicitly accepted
invalid canonical payload hash
```

Boundary:

```txt
Certificate 06 records review submission only.
Certificate 06 does not approve IPR.
Certificate 06 does not issue IPR Card.
Certificate 06 does not activate the operational certificate.
Certificate 06 does not grant JOKER-C2 access.
```

---

## 10. Phase 07 — HBCE Approval

Route:

```txt
/admin/review
```

Purpose:

```txt
Perform explicit HBCE admin/operator approval and release Certificate 07.
```

Required input:

```txt
Certificate 06
```

Expected previous phase:

```txt
PENDING_REVIEW
```

Expected next phase from previous certificate:

```txt
HBCE_APPROVAL
```

Generated certificate:

```txt
hbce-ipr-07-ipr-approved.hbce.json
```

Generated phase:

```txt
IPR_APPROVED
```

Phase status:

```txt
APPROVED
```

Next required phase:

```txt
IPR_CARD_ISSUANCE
```

Allowed next route:

```txt
/ipr-card
```

MVP approval behavior:

```txt
Certificate 06 may be loaded from browser session.
Manual Certificate 06 upload remains available.
Only APPROVE generates Certificate 07 in the MVP.
REJECT and REQUEST_MORE_DATA require future protected backend/admin workflow.
```

Fail-closed conditions:

```txt
missing Certificate 06
wrong previous phase
wrong next required phase
approval decision not equal to APPROVE
missing HBCE operator reference
invalid canonical payload hash
```

Boundary:

```txt
Certificate 07 authorizes IPR Card issuance.
Certificate 07 does not issue IPR Card.
Certificate 07 does not issue the operational certificate.
Certificate 07 does not grant JOKER-C2 access.
```

Production boundary:

```txt
Client-side MVP approval is not a production trust source.
Production approval requires authenticated backend/admin enforcement, operator authorization, audit logging, revocation control and protected evidence review.
```

---

## 11. Phase 08 — IPR Card Issuance

Route:

```txt
/ipr-card
```

Purpose:

```txt
Issue the internal HBCE IPR Card certificate.
```

Required input:

```txt
Certificate 07
```

Expected previous phase:

```txt
IPR_APPROVED
```

Expected next phase from previous certificate:

```txt
IPR_CARD_ISSUANCE
```

Generated certificate:

```txt
hbce-ipr-08-ipr-card.hbce.json
```

Generated phase:

```txt
IPR_CARD_ISSUED
```

Next required phase:

```txt
OPERATIONAL_CERTIFICATE
```

Allowed next route:

```txt
/certificate
```

Generated IPR Card fields:

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

Fail-closed conditions:

```txt
missing Certificate 07
wrong previous phase
wrong next required phase
missing operator reference
invalid validity date
expired validity date
invalid canonical payload hash
```

Boundary:

```txt
IPR Card is an internal HBCE operational identity credential.
IPR Card does not replace CIE, SPID, EUDI Wallet, passport, driving licence, national identity card or qualified eIDAS certificate.
Certificate 08 does not issue the final operational certificate.
Certificate 08 does not grant JOKER-C2 access.
```

---

## 12. Phase 09 — Operational Certificate

Route:

```txt
/certificate
```

Purpose:

```txt
Issue the final HBCE operational certificate required by the JOKER-C2 access gate.
```

Required input:

```txt
Certificate 08
```

Expected previous phase:

```txt
IPR_CARD_ISSUED
```

Expected next phase from previous certificate:

```txt
OPERATIONAL_CERTIFICATE
```

Generated certificate:

```txt
hbce-ipr-09-operational-certificate.hbce.json
```

Generated phase:

```txt
IPR_VERIFIED
```

Generated kind:

```txt
IPR_OPERATIONAL_CERTIFICATE
```

Required status:

```txt
ACTIVE
```

Required scope:

```txt
JOKER_C2_ACCESS
```

Next required phase:

```txt
JOKER_C2_ACCESS
```

Allowed next route:

```txt
/access/joker-c2
```

Generated operational certificate fields:

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

Fail-closed conditions:

```txt
missing Certificate 08
wrong previous phase
wrong next required phase
missing operator reference
invalid validity date
expired validity date
invalid canonical payload hash
invalid certificate scope
invalid certificate status
```

Boundary:

```txt
Certificate 09 enables JOKER-C2 access evaluation.
Certificate 09 does not bypass the gate.
Certificate 09 does not grant runtime access by itself.
```

Legal boundary:

```txt
The operational certificate is internal to HBCE.
It is not a qualified eIDAS certificate unless issued through a recognized and compliant trust service integration.
```

---

## 13. JOKER-C2 Access Gate

Route:

```txt
/access/joker-c2
```

Purpose:

```txt
Allow or deny governed access to JOKER-C2 after validating Certificate 09.
```

Required input:

```txt
Certificate 09
```

Expected previous phase:

```txt
IPR_VERIFIED
```

Expected next phase:

```txt
JOKER_C2_ACCESS
```

Required certificate conditions:

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

Deny conditions:

```txt
missing certificate
malformed certificate
invalid protocol
invalid issuer
invalid kind
wrong phase
inactive certificate status
wrong certificate scope
missing previous payload hash
payload hash mismatch
revoked state
suspended state
expired state
under review state
```

The access gate must not trust:

```txt
browser state
session storage
local storage
query parameters
hidden form fields
unsigned frontend payloads
manual client-side status changes
```

Boundary:

```txt
The HBCE operational certificate enables access evaluation.
It does not bypass governance, revocation, suspension, expiry, runtime policy or future server-side enforcement.
```

Production rule:

```txt
Final access decision must be server-side in production.
```

---

## 14. Automatic Continuity and Manual Fallback

The MVP supports automatic certificate continuity through browser session storage.

When a certificate is generated:

```txt
1. the certificate is downloaded to the user
2. the certificate is stored temporarily in browser session storage
3. the app redirects to the next phase route
4. the next phase reloads the certificate from session
5. the next phase validates the certificate fail-closed
6. the next phase enables continuation only if the certificate is valid
```

Manual fallback remains available:

```txt
Use another Certificate
Upload previous HBCE-IPR certificate manually
```

Boundary:

```txt
Browser session continuity is a convenience layer only.
It is not a production trust source.
Production requires backend enforcement, server-side signing and protected storage.
```

---

## 15. Hash Chain Rule

Every certificate follows this chain rule:

```txt
previous_payload_sha256 + current canonical payload → payload_sha256
```

The first certificate has:

```txt
previous_payload_sha256 = null
```

Every later certificate must contain:

```txt
previous_payload_sha256 = hash of the previous certificate payload
payload_sha256 = hash of the current certificate payload
```

If the chain is malformed, missing, wrong-phase, wrong-next-phase or hash-invalid, the system must fail closed.

---

## 16. Status Model

The complete onboarding status model should include:

```txt
onboarding_status
email_status
phone_status
fiscal_identity_status
official_document_status
photo_verification_status
video_verification_status
liveness_status
privacy_compliance_status
review_status
ipr_status
ipr_card_status
operational_certificate_status
revocation_state
joker_c2_access_status
```

The certificate chain status model includes:

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
JOKER_C2_ACCESS
```

---

## 17. Access Decision Logic

Minimum JOKER-C2 gate logic:

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

## 18. Event Continuity

Each major step should generate an event reference in future production architecture.

Suggested event types:

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

Each event should support future EVT and OPC integration.

---

## 19. MVP Mode

The current MVP may use client-side certificate generation and browser session continuity.

Allowed MVP behavior:

```txt
local certificate generation
downloadable private portable certificates
session continuity between phases
manual certificate upload fallback
hash-only public registry model
mock or protected evidence references
client-side demonstration of approval step
client-side demonstration of JOKER-C2 gate validation
```

Forbidden MVP behavior:

```txt
real documents in repo
real fiscal identifiers in repo
real photos in repo
real videos in repo
real biometric data in repo
production secrets in repo
production trust based only on browser session
automatic JOKER-C2 access without valid Certificate 09
```

---

## 20. Sensitive Data Boundary

The repository must not contain:

```txt
real identity documents
real passports
real identity cards
real driving licences
real fiscal codes
real tax identifiers
real national identification numbers
real photos
real videos
biometric templates
face templates
liveness recordings
private review notes containing sensitive material
production secrets
private keys
API credentials
database credentials
storage credentials
```

Evidence must be represented in the MVP only through:

```txt
metadata
protected references
SHA-256 hashes
private portable certificate fields
hash-only public references
```

---

## 21. Production Readiness Requirements

Before production use, the flow requires:

```txt
secure authentication
backend API
database persistence
encrypted storage
protected document storage
protected photo/video storage
server-side certificate signing
server-side review state
server-side access gate
role-based reviewer access
operator authentication
operator authorization
audit logging
retention policy
deletion policy
revocation flow
incident response
privacy review
legal review
security review
provider review
compliance assessment
KYC / eID / eIDAS integration study
EUDI Wallet compatibility study
EVT continuity integration
OPC proof integration
JOKER-C2 runtime bridge
```

---

## 22. Legal Boundary

HBCE IPR Onboarding App does not issue:

```txt
official state identity documents
passports
national identity cards
CIE
SPID
EUDI Wallet credentials
qualified eIDAS certificates
bank accounts
IBANs
regulated financial services
regulated trust services
```

Correct claim:

```txt
HBCE issues a verifiable operational identity that can be linked to official European identity systems.
```

Incorrect claim:

```txt
HBCE issues an official European identity.
```

---

## 23. Canonical Flow Formula

```txt
Landing explains.
Certificate 01 creates subject.
Certificate 02 anchors fiscal identity.
Certificate 03 records official document evidence.
Certificate 04 records liveness evidence.
Certificate 05 records privacy and compliance.
Certificate 06 submits review.
Certificate 07 approves IPR.
Certificate 08 issues IPR Card.
Certificate 09 activates operational certificate.
Access gate protects JOKER-C2.
```

---

## 24. Public Communication Formula

```txt
Access JOKER-C2 only through verified IPR.
An email is not enough.
A subscription is not enough.
An operational identity is required: documented, traceable and verifiable.
```

---

## 25. Organization

```txt
HERMETICUM B.C.E. S.r.l.
```

---

## 26. Canonical Trademark

```txt
HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA
HERMETICUM B.C.E. S.r.l.
```
