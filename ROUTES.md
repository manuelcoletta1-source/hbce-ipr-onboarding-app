# HBCE IPR Onboarding App — Routes

**HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA**  
**HERMETICUM B.C.E. S.r.l.**

---

## 1. Purpose

This document defines the canonical route map for HBCE IPR Onboarding App.

The application is not a generic registration website.

It is an operational identity onboarding gateway for:

```txt
progressive HBCE-IPR certificate release
IPR Verified status
IPR Card issuance
operational certificate activation
governed JOKER-C2 access evaluation
```

The core route rule is:

```txt
No verified IPR, no governed JOKER-C2 access.
```

The application route structure follows the completed MVP certificate chain:

```txt
01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → JOKER-C2 gate
```

---

## 2. Route Categories

The app routes are organized into six categories:

```txt
public routes
certificate continuation routes
onboarding certificate phase routes
admin/operator approval routes
operational identity routes
access gate routes
legal and boundary routes
```

---

## 3. Public Routes

### `/`

Purpose:

```txt
Operational landing page and entry point for the HBCE IPR Onboarding App.
```

Main content:

```txt
explain the app
explain IPR Verified
explain IPR Card
explain operational certificate activation
explain governed JOKER-C2 access
explain that email and subscription are not enough
start or continue onboarding
```

Primary action:

```txt
Start IPR onboarding
```

Next route:

```txt
/onboarding/phase-1
```

Access level:

```txt
public
```

Sensitive data:

```txt
none
```

---

## 4. Certificate Continuation Route

### `/onboarding`

Purpose:

```txt
Central continuation page for existing HBCE-IPR certificates.
```

Main content:

```txt
explain the certificate chain
allow previous certificate upload
detect next required phase
redirect to the correct route
preserve manual fallback
```

Access level:

```txt
public_or_session
```

Sensitive data:

```txt
uploaded HBCE-IPR certificate only
no raw evidence
```

Route rule:

```txt
The onboarding continuation page must not treat any uploaded certificate as trusted until it has been validated fail-closed.
```

---

## 5. Canonical Onboarding Certificate Phase Routes

The completed MVP route sequence is:

| Step | Route | Phase | Output |
|---|---|---|---|
| 01 | `/onboarding/phase-1` | `SUBJECT_CREATED` | `hbce-ipr-01-subject-created.hbce.json` |
| 02 | `/onboarding/phase-2` | `FISCAL_IDENTITY_COLLECTED` | `hbce-ipr-02-fiscal-identity.hbce.json` |
| 03 | `/onboarding/phase-3` | `OFFICIAL_DOCUMENT_SUBMITTED` | `hbce-ipr-03-official-document.hbce.json` |
| 04 | `/onboarding/photo-video` | `LIVENESS_SUBMITTED` | `hbce-ipr-04-liveness-submitted.hbce.json` |
| 05 | `/onboarding/phase-5` | `COMPLIANCE_ACCEPTED` | `hbce-ipr-05-privacy-compliance.hbce.json` |
| 06 | `/onboarding/review` | `PENDING_REVIEW` | `hbce-ipr-06-review-pending.hbce.json` |
| 07 | `/admin/review` | `IPR_APPROVED` | `hbce-ipr-07-ipr-approved.hbce.json` |
| 08 | `/ipr-card` | `IPR_CARD_ISSUED` | `hbce-ipr-08-ipr-card.hbce.json` |
| 09 | `/certificate` | `IPR_VERIFIED` | `hbce-ipr-09-operational-certificate.hbce.json` |
| Gate | `/access/joker-c2` | `JOKER_C2_ACCESS` | `ACCESS_GRANTED` or `ACCESS_DENIED` |

Legacy route note:

```txt
/onboarding/phase-4 may exist as a compatibility alias.
The canonical current UI route for Phase 04 is /onboarding/photo-video.
```

---

## 6. Phase 01 Route — Subject Created

### `/onboarding/phase-1`

Purpose:

```txt
Create the initial HBCE-IPR subject record and release Certificate 01.
```

Required fields:

```txt
email
phone number
first name
last name
country
date of birth
email verification state
phone verification state
```

Generated phase:

```txt
SUBJECT_CREATED
```

Generated file:

```txt
hbce-ipr-01-subject-created.hbce.json
```

Next required phase:

```txt
FISCAL_IDENTITY
```

Next route:

```txt
/onboarding/phase-2
```

Access level:

```txt
public
```

Sensitive data:

```txt
private customer data
email hash
phone hash
subject reference
```

Forbidden public exposure:

```txt
raw private customer data in public registry
production secrets
identity documents
photos
videos
```

Boundary:

```txt
Certificate 01 does not verify identity.
Certificate 01 does not issue IPR Card.
Certificate 01 does not activate the operational certificate.
Certificate 01 does not grant JOKER-C2 access.
```

---

## 7. Phase 02 Route — Fiscal Identity

### `/onboarding/phase-2`

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

Required fields and evidence:

```txt
codice fiscale
tessera sanitaria
EU tax ID document
national tax identifier
national fiscal document
protected fiscal evidence hash
```

Generated phase:

```txt
FISCAL_IDENTITY_COLLECTED
```

Generated file:

```txt
hbce-ipr-02-fiscal-identity.hbce.json
```

Next required phase:

```txt
OFFICIAL_ID_DOCUMENT
```

Next route:

```txt
/onboarding/phase-3
```

Access level:

```txt
valid_certificate_01_required
```

Sensitive data:

```txt
fiscal identifier metadata
fiscal identifier hash
protected fiscal evidence reference
```

Forbidden public exposure:

```txt
raw fiscal identifier
raw tax identifier
raw national identifier
raw fiscal document image
unprotected storage URL
```

Boundary:

```txt
Fiscal identity collection does not complete identity verification.
Certificate 02 does not issue IPR Card.
Certificate 02 does not grant JOKER-C2 access.
```

---

## 8. Phase 03 Route — Official ID Document

### `/onboarding/phase-3`

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

Supported document types:

```txt
CIE
EU identity card
passport
driving licence
residence document
other authorized official document
```

Generated phase:

```txt
OFFICIAL_DOCUMENT_SUBMITTED
```

Generated file:

```txt
hbce-ipr-03-official-document.hbce.json
```

Next required phase:

```txt
LIVENESS_CHECK
```

Next route:

```txt
/onboarding/photo-video
```

Access level:

```txt
valid_certificate_02_required
```

Sensitive data:

```txt
document metadata
document number hash
issuer hash
issue date hash
expiry date hash
protected document hash reference
```

Forbidden public exposure:

```txt
raw document image
raw document scan
raw document number
passport image
CIE image
driving licence image
unprotected storage URL
```

Boundary:

```txt
Certificate 03 records official document submission.
Certificate 03 does not complete HBCE approval.
Certificate 03 does not issue IPR Card.
Certificate 03 does not grant JOKER-C2 access.
```

---

## 9. Phase 04 Route — Photo / Video Liveness

### `/onboarding/photo-video`

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

Required fields and evidence:

```txt
protected photo reference
protected video reference
photo SHA-256 reference
video SHA-256 reference
photo verification status
video verification status
liveness review status
liveness declaration
```

Generated phase:

```txt
LIVENESS_SUBMITTED
```

Generated file:

```txt
hbce-ipr-04-liveness-submitted.hbce.json
```

Next required phase:

```txt
PRIVACY_COMPLIANCE
```

Next route:

```txt
/onboarding/phase-5
```

Access level:

```txt
valid_certificate_03_required
```

Sensitive data:

```txt
photo reference
video reference
photo hash
video hash
liveness declaration hash
verification status
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

## 10. Phase 05 Route — Privacy & Compliance

### `/onboarding/phase-5`

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

Generated phase:

```txt
COMPLIANCE_ACCEPTED
```

Generated file:

```txt
hbce-ipr-05-privacy-compliance.hbce.json
```

Next required phase:

```txt
REVIEW_SUBMISSION
```

Next route:

```txt
/onboarding/review
```

Access level:

```txt
valid_certificate_04_required
```

Fail-closed rule:

```txt
All mandatory acknowledgements must be accepted before Certificate 05 can be generated.
```

Boundary:

```txt
Certificate 05 records privacy and compliance acceptance.
Certificate 05 does not approve IPR.
Certificate 05 does not issue IPR Card.
Certificate 05 does not grant JOKER-C2 access.
```

---

## 11. Phase 06 Route — Review Pending

### `/onboarding/review`

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

Generated phase:

```txt
PENDING_REVIEW
```

Generated file:

```txt
hbce-ipr-06-review-pending.hbce.json
```

Next required phase:

```txt
HBCE_APPROVAL
```

Next route:

```txt
/admin/review
```

Access level:

```txt
valid_certificate_05_required
```

Fail-closed rule:

```txt
Certificate 06 can be generated only after explicit submission for HBCE review.
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

## 12. Phase 07 Route — HBCE Approval

### `/admin/review`

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

Generated phase:

```txt
IPR_APPROVED
```

Generated file:

```txt
hbce-ipr-07-ipr-approved.hbce.json
```

Next required phase:

```txt
IPR_CARD_ISSUANCE
```

Next route:

```txt
/ipr-card
```

Access level:

```txt
admin_or_operator_action_required_in_production
valid_certificate_06_required
```

MVP behavior:

```txt
Certificate 06 may be loaded from browser session.
Manual Certificate 06 upload remains available.
Only APPROVE generates Certificate 07 in the MVP.
REJECT and REQUEST_MORE_DATA require future protected backend/admin workflow.
```

Production requirement:

```txt
authenticated admin/operator identity
server-side approval enforcement
audit logging
revocation control
protected evidence review
```

Boundary:

```txt
Certificate 07 authorizes IPR Card issuance.
Certificate 07 does not issue IPR Card.
Certificate 07 does not issue the operational certificate.
Certificate 07 does not grant JOKER-C2 access.
```

---

## 13. Phase 08 Route — IPR Card Issuance

### `/ipr-card`

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

Generated phase:

```txt
IPR_CARD_ISSUED
```

Generated file:

```txt
hbce-ipr-08-ipr-card.hbce.json
```

Next required phase:

```txt
OPERATIONAL_CERTIFICATE
```

Next route:

```txt
/certificate
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

Access level:

```txt
valid_certificate_07_required
```

Boundary:

```txt
IPR Card is an internal HBCE operational identity credential.
IPR Card does not replace official identity documents.
Certificate 08 does not issue the final operational certificate.
Certificate 08 does not grant JOKER-C2 access.
```

---

## 14. Phase 09 Route — Operational Certificate

### `/certificate`

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

Generated phase:

```txt
IPR_VERIFIED
```

Generated kind:

```txt
IPR_OPERATIONAL_CERTIFICATE
```

Generated file:

```txt
hbce-ipr-09-operational-certificate.hbce.json
```

Next required phase:

```txt
JOKER_C2_ACCESS
```

Next route:

```txt
/access/joker-c2
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

Required status:

```txt
ACTIVE
```

Required scope:

```txt
JOKER_C2_ACCESS
```

Access level:

```txt
valid_certificate_08_required
```

Legal boundary:

```txt
The operational certificate is internal to HBCE.
It is not a qualified eIDAS certificate unless issued through a recognized and compliant trust service integration.
```

Trust boundary:

```txt
Certificate 09 enables JOKER-C2 access evaluation.
Certificate 09 does not bypass the gate.
Certificate 09 does not grant runtime access by itself.
```

---

## 15. Access Gate Route

### `/access/joker-c2`

Purpose:

```txt
Allow or deny governed JOKER-C2 access after validating Certificate 09.
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

Access level:

```txt
valid_operational_certificate_required
```

Allowed output:

```txt
access decision
decision reason
certificate status
certificate scope
payload SHA-256
previous payload SHA-256
checked timestamp
JOKER-C2 runtime link when granted
```

Forbidden output:

```txt
raw identity data
raw document data
raw fiscal identifier
raw photo
raw video
private review notes
biometric material
```

---

## 16. Legal and Boundary Routes

### `/legal`

Purpose:

```txt
Explain the legal and operational boundary of the app.
```

Main content:

```txt
IPR is an internal operational identity record.
IPR Card does not replace official identity documents.
HBCE does not issue passports, CIE, SPID, EUDI Wallet credentials or qualified eIDAS certificates.
HBCE does not issue bank accounts or IBANs.
JOKER-C2 access requires verified IPR and final operational certificate validation.
```

Access level:

```txt
public
```

Sensitive data:

```txt
none
```

---

### `/privacy`

Purpose:

```txt
Explain privacy posture, data minimization and sensitive data boundaries.
```

Main content:

```txt
hash references
protected storage references
private portable certificates
hash-only public registry logic
no raw sensitive data in public views
no real sensitive data in repository
```

Access level:

```txt
public
```

Sensitive data:

```txt
none
```

---

### `/security`

Purpose:

```txt
Explain security posture, fail-closed access and no raw sensitive material in repository.
```

Main content:

```txt
fail-closed validation
no frontend-only production trust
no production secrets
no raw identity evidence
revocation must override access
JOKER-C2 access requires valid Certificate 09
```

Access level:

```txt
public
```

Sensitive data:

```txt
none
```

---

## 17. Optional Operator Routes

These routes are not required for the first public MVP, but may be added later.

### `/operator/review`

Purpose:

```txt
Review onboarding cases.
```

Access level:

```txt
operator_required
```

Sensitive data:

```txt
private_review_data
```

---

### `/operator/review/[onboarding_id]`

Purpose:

```txt
Inspect a specific onboarding case and assign review decision.
```

Access level:

```txt
operator_required
```

Allowed decisions:

```txt
approve
reject
request_more_information
expire
suspend
revoke
```

---

### `/operator/revocations`

Purpose:

```txt
Manage revoked, suspended or expired operational identities.
```

Access level:

```txt
operator_required
```

---

## 18. Optional API Routes

Suggested future API route map:

```txt
/api/onboarding/phase-1
/api/onboarding/phase-2
/api/onboarding/phase-3
/api/onboarding/photo-video
/api/onboarding/phase-5
/api/onboarding/review
/api/admin/review
/api/ipr-card
/api/certificate
/api/access/joker-c2
/api/events
/api/opc/proof
/api/revocation
```

All API routes must enforce server-side validation.

The frontend must never be the source of final production trust.

---

## 19. Route Access Matrix

| Route | Access Level |
|---|---|
| `/` | `public` |
| `/onboarding` | `public_or_session` |
| `/onboarding/phase-1` | `public` |
| `/onboarding/phase-2` | `valid_certificate_01_required` |
| `/onboarding/phase-3` | `valid_certificate_02_required` |
| `/onboarding/photo-video` | `valid_certificate_03_required` |
| `/onboarding/phase-5` | `valid_certificate_04_required` |
| `/onboarding/review` | `valid_certificate_05_required` |
| `/admin/review` | `valid_certificate_06_required_admin_action_required_in_production` |
| `/ipr-card` | `valid_certificate_07_required` |
| `/certificate` | `valid_certificate_08_required` |
| `/access/joker-c2` | `valid_certificate_09_required` |
| `/legal` | `public` |
| `/privacy` | `public` |
| `/security` | `public` |

---

## 20. Fail-Closed Route Logic

```txt
if route requires Certificate 01 and Certificate 01 is missing or invalid:
    block continuation

if route requires Certificate 02 and Certificate 02 is missing or invalid:
    block continuation

if route requires Certificate 03 and Certificate 03 is missing or invalid:
    block continuation

if route requires Certificate 04 and Certificate 04 is missing or invalid:
    block continuation

if route requires Certificate 05 and Certificate 05 is missing or invalid:
    block continuation

if route requires Certificate 06 and Certificate 06 is missing or invalid:
    block HBCE approval

if route requires Certificate 07 and Certificate 07 is missing or invalid:
    block IPR Card issuance

if route requires Certificate 08 and Certificate 08 is missing or invalid:
    block operational certificate issuance

if route requires Certificate 09 and Certificate 09 is missing or invalid:
    deny JOKER-C2 access

if certificate phase does not match expected previous phase:
    fail closed

if certificate next phase does not match expected route phase:
    fail closed

if payload hash is invalid:
    fail closed

if revocation_state is not clear:
    deny JOKER-C2 access

otherwise:
    allow route continuation or access evaluation
```

---

## 21. Session Continuity Rule

The MVP supports browser session continuity.

When a certificate is generated:

```txt
download certificate to the user
store certificate temporarily in session storage
redirect to the next route
reload certificate from session
validate certificate fail-closed
enable next phase only if valid
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

## 22. Public Communication Formula

```txt
Access JOKER-C2 only through verified IPR.
An email is not enough.
A subscription is not enough.
An operational identity is required: documented, traceable and verifiable.
```

---

## 23. Canonical Route Formula

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

## 24. Production Boundary

The current MVP route map demonstrates the operational logic.

Production requires:

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
legal review
privacy review
security review
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
