# Security Policy

**HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA**  
**HERMETICUM B.C.E. S.r.l.**

---

## 1. Purpose

HBCE IPR Onboarding App is designed to support bank-grade operational identity onboarding for progressive HBCE-IPR certificate release, IPR Verified status, IPR Card issuance, operational certificate activation and governed JOKER-C2 access evaluation.

Because the application may process identity data, official document metadata, fiscal identity references, photo/video evidence metadata, liveness declarations, review decisions and operational certificate data, the security posture must be strict from the first MVP implementation.

The core rule is:

```txt
No verified IPR, no governed JOKER-C2 access.
```

The second rule is:

```txt
No raw sensitive identity material must ever be committed to this repository.
```

The third rule is:

```txt
Every phase must validate the previous certificate fail-closed.
```

---

## 2. Security Scope

This security policy applies to:

```txt
source code
configuration files
documentation
onboarding forms
certificate generation logic
certificate validation logic
certificate upload logic
manual fallback logic
browser session continuity
hash chain logic
public routes
admin/operator routes
access gate routes
legal boundary pages
privacy boundary pages
security boundary pages
deployment settings
storage references
IPR Card issuance logic
operational certificate activation logic
JOKER-C2 access gate logic
future API routes
future backend services
future EVT integration
future OPC integration
future revocation registry
```

The policy applies to both current MVP behavior and future production architecture.

---

## 3. Completed MVP Security Model

The current MVP implements the complete HBCE-IPR certificate chain:

```txt
01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → JOKER-C2 gate
```

The completed MVP phases are:

| Step | Phase | Route | Security Function |
|---|---|---|---|
| 01 | `SUBJECT_CREATED` | `/onboarding/phase-1` | create first subject certificate |
| 02 | `FISCAL_IDENTITY_COLLECTED` | `/onboarding/phase-2` | collect fiscal evidence references |
| 03 | `OFFICIAL_DOCUMENT_SUBMITTED` | `/onboarding/phase-3` | collect official document evidence references |
| 04 | `LIVENESS_SUBMITTED` | `/onboarding/photo-video` | collect photo/video/liveness metadata |
| 05 | `COMPLIANCE_ACCEPTED` | `/onboarding/phase-5` | enforce mandatory privacy/compliance acknowledgements |
| 06 | `PENDING_REVIEW` | `/onboarding/review` | submit package for review |
| 07 | `IPR_APPROVED` | `/admin/review` | explicit HBCE approval checkpoint |
| 08 | `IPR_CARD_ISSUED` | `/ipr-card` | issue internal IPR Card certificate |
| 09 | `IPR_VERIFIED` | `/certificate` | issue operational certificate |
| Gate | `JOKER_C2_ACCESS` | `/access/joker-c2` | validate final certificate and allow or deny access |

The current MVP is client-side and demonstration-oriented.

It is not a production trust source.

Production requires backend enforcement, protected storage, server-side signing, authenticated operators, revocation control and audit logging.

---

## 4. Sensitive Data Boundary

The following data must never be committed to this repository:

```txt
raw identity documents
raw passports
raw identity cards
raw CIE images
raw driving licences
raw residence documents
raw fiscal codes
raw national tax identifiers
raw national identification numbers
raw social security style numbers
raw document numbers
raw photos
raw videos
biometric templates
face templates
liveness verification recordings
third-party verification payloads containing personal data
private review notes containing sensitive material
private keys
production secrets
database credentials
API credentials
access tokens
session secrets
JWT secrets
webhook secrets
cloud storage keys
encryption keys
signed production certificates
real onboarding records
real user datasets
```

Only mock, synthetic, minimized, anonymized, hash-only or demonstration data may be used inside this repository.

---

## 5. Repository Evidence Policy

The repository may contain:

```txt
metadata examples
synthetic examples
hash references
placeholder storage references
mock phase states
public-safe documentation
public-safe route definitions
public-safe certificate schemas
```

The repository must not contain:

```txt
real evidence files
real identity documents
real fiscal documents
real official document images
real photos
real videos
real biometric data
real onboarding packages
real production approval records
real customer files
```

Evidence must be represented through:

```txt
SHA-256 hash references
protected storage references
private portable certificate fields
hash-only public registry references
minimized metadata
```

---

## 6. Data Minimization Principle

The app must collect and expose only the minimum data required for operational identity onboarding.

Public or semi-public layers should use:

```txt
hash references
status values
minimized metadata
internal identifiers
non-sensitive operational references
public-safe certificate states
```

The app must avoid exposing:

```txt
document numbers in clear text
fiscal identifiers in clear text
full identity data in public views
raw document images
raw photo material
raw video material
private review notes
sensitive storage URLs
biometric information
```

Portable HBCE-IPR certificates may contain private phase data for the subject’s downloadable copy.

Public verification must remain hash-only.

---

## 7. Fail-Closed Access Rule

The default access decision must always be denial.

JOKER-C2 access must be denied if any required condition is missing, incomplete, expired, rejected, suspended, revoked, malformed, wrong-scope or unverifiable.

The final access gate must validate Certificate 09.

Minimum final certificate conditions:

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

If one of these conditions is not satisfied, access must remain blocked.

Default decision:

```txt
ACCESS_DENIED
```

Allowed decision:

```txt
ACCESS_GRANTED
```

---

## 8. Forbidden Access Pattern

The following access pattern is forbidden:

```txt
email + password + payment = JOKER-C2 access
```

The correct HBCE access pattern is:

```txt
subject creation
→ fiscal identity evidence
→ official document evidence
→ photo/video liveness evidence
→ privacy and compliance acceptance
→ review submission
→ HBCE approval
→ IPR Card issuance
→ operational certificate activation
→ JOKER-C2 access gate
→ governed runtime access
```

The final access decision must not be based only on:

```txt
browser state
session storage
local storage
query parameters
hidden form fields
manual client-side status changes
unsigned frontend payloads
payment state
email account state
```

---

## 9. Certificate Chain Security

Each certificate must be treated as a phase-specific continuity artifact.

Every certificate must contain:

```txt
protocol
kind
issuer
phase code
phase status
subject reference
payload envelope
previous payload hash
current payload hash
registry reference
next required phase
issued timestamp
```

The hash chain rule is:

```txt
previous_payload_sha256 + current canonical payload → payload_sha256
```

The first certificate has:

```txt
previous_payload_sha256 = null
```

All later certificates must contain the previous payload hash.

The app must fail closed if:

```txt
previous certificate is missing
uploaded file is not valid JSON
protocol is invalid
certificate kind is invalid
issuer is invalid
previous phase is invalid
next phase is invalid
payload hash is missing
previous payload hash is missing when required
payload hash mismatch is detected
required field is missing
required upload reference is missing
certificate is revoked
certificate is suspended
certificate is expired
certificate is under review
certificate scope is invalid
```

---

## 10. Phase Security Rules

### Phase 01 — Subject Created

Certificate 01 must not be treated as verified identity.

It does not authorize:

```txt
IPR approval
IPR Card issuance
operational certificate issuance
JOKER-C2 access
```

---

### Phase 02 — Fiscal Identity

Fiscal evidence must be represented through protected references and hashes.

Forbidden:

```txt
raw fiscal document files
raw fiscal identifiers in public output
unprotected fiscal storage URLs
```

---

### Phase 03 — Official ID Document

Official document evidence must be represented through metadata and hashes.

Forbidden:

```txt
raw document images
raw document scans
raw document numbers in public output
real document samples in tests
real document samples in screenshots
```

---

### Phase 04 — Photo / Video Liveness

Photo and video verification material must be treated as sensitive identity material.

Forbidden:

```txt
real user photos
real onboarding videos
biometric samples
liveness check recordings
face templates
third-party verification payloads containing personal data
```

The MVP may use placeholder states only.

Allowed MVP states:

```txt
not_started
pending
submitted
manual_review
approved
rejected
expired
```

---

### Phase 05 — Privacy & Compliance

All mandatory acknowledgements must be accepted before Certificate 05 can be generated.

Required acknowledgements include:

```txt
privacy consent
hash-only acknowledgement
data accuracy confirmation
document authenticity confirmation
HBCE policy acceptance
no state identity claim acknowledgement
internal operational identity acknowledgement
```

If any mandatory acknowledgement is missing, the phase must fail closed.

---

### Phase 06 — Review Pending

Certificate 06 can only record review submission.

It must not approve the IPR.

It must not authorize IPR Card issuance.

It must not grant JOKER-C2 access.

---

### Phase 07 — HBCE Approval

Certificate 07 requires explicit HBCE admin/operator approval.

In the MVP, only `APPROVE` generates Certificate 07.

The following decisions require future protected backend/admin workflow:

```txt
REJECT
REQUEST_MORE_DATA
EXPIRE
SUSPEND
REVOKE
```

Client-side MVP approval is not a production trust source.

Production approval requires:

```txt
authenticated admin/operator identity
operator authorization
server-side enforcement
audit logging
revocation control
protected evidence review
```

---

### Phase 08 — IPR Card Issuance

Certificate 08 issues the internal HBCE IPR Card.

It does not issue the operational certificate.

It does not grant JOKER-C2 access.

The IPR Card must not be described as:

```txt
state identity document
passport
CIE
SPID credential
EUDI Wallet credential
qualified eIDAS certificate
bank account
IBAN
payment instrument
```

---

### Phase 09 — Operational Certificate

Certificate 09 must be the final HBCE operational certificate.

Required properties:

```txt
kind = IPR_OPERATIONAL_CERTIFICATE
phase.code = IPR_VERIFIED
certificate_status = ACTIVE
certificate_scope = JOKER_C2_ACCESS
```

Certificate 09 enables JOKER-C2 access evaluation.

It does not bypass the access gate.

It does not grant runtime access by itself.

---

## 11. JOKER-C2 Gate Security

The route `/access/joker-c2` is the final access gate.

It must validate Certificate 09 fail-closed.

It must deny:

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
revoked certificate
suspended certificate
expired certificate
under review certificate
```

It may show `ACCESS_GRANTED` only after final certificate validation succeeds.

It must not open JOKER-C2 based only on:

```txt
session storage
frontend state
query parameter
hidden form field
manual client-side variable
uploaded file name only
```

---

## 12. Browser Session Continuity Security

The MVP supports browser session continuity.

Session storage is allowed only as a convenience layer.

It may be used to:

```txt
store the generated certificate temporarily
reload the certificate on the next route
reduce repeated manual uploads
preserve local MVP flow continuity
```

It must not be treated as a production trust source.

Every certificate loaded from session must be revalidated fail-closed before use.

Production must replace this with:

```txt
backend enforcement
server-side session management
server-side certificate signing
protected storage
authenticated user state
authenticated operator state
audit logging
```

---

## 13. Manual Certificate Upload Security

Manual upload is the fallback mechanism.

Manual uploads must be validated before any continuation.

The upload flow must reject:

```txt
invalid JSON
wrong protocol
wrong issuer
wrong phase
wrong next phase
missing hash
mismatched hash
malformed payload
wrong certificate kind
wrong certificate scope
```

The app must never trust a file because its name looks correct.

The app must validate the certificate content.

Because apparently file names are not magical legal instruments. Tragic, but useful.

---

## 14. Identity Verification Boundary

HBCE IPR Onboarding App may support internal operational identity verification.

It does not issue:

```txt
official public identity documents
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

Future integration claim:

```txt
HBCE operational identity may be connected to official European identity systems, subject to applicable law, recognized trust service providers and institutional partnerships.
```

---

## 15. Document Handling Rules

Official identity document handling must follow these rules:

```txt
do not store raw documents in the repository
do not expose raw documents through public URLs
do not log document images
do not log document numbers in clear text
do not use real documents in tests
do not use real documents in screenshots
do not include document samples in documentation
use protected storage for real implementation
use hash references and storage references in operational records
restrict document access to authorized review processes only
```

---

## 16. Fiscal Identifier Handling Rules

Fiscal identifiers must be handled as sensitive data.

The app should store only protected or hashed references where possible.

The following values must not appear in public output:

```txt
full fiscal code
full national tax identifier
full national identification number
full social security style number
full personal fiscal identifier
```

Where display is required, use masking.

Example:

```txt
CLT*********44R
```

---

## 17. Photo and Video Verification Rules

Photo and video verification material must be treated as sensitive identity material.

The repository must not contain:

```txt
real user photos
real onboarding videos
biometric samples
liveness check recordings
face templates
third-party verification payloads containing personal data
```

Production photo/video verification requires:

```txt
lawful basis
protected storage
access control
retention control
deletion policy
provider security review
privacy review
operator authorization
audit logging
```

---

## 18. Review Status Security

Review status must never be bypassed from the client side.

The frontend may display review status, but production review and approval must be enforced by server-side logic.

Client-side approval is not valid as a production trust source.

The access gate must not trust:

```txt
browser state
local storage
session storage
query parameters
hidden form fields
unsigned client payloads
manually edited frontend status values
```

---

## 19. API Security Principles

Future API routes should follow these principles:

```txt
validate all input
reject unknown states
reject malformed payloads
deny by default
avoid returning raw sensitive data
use server-side access checks
separate user display data from verification data
log only minimized operational events
avoid storing secrets in code
use environment variables for secrets
avoid verbose production error messages
rate limit sensitive endpoints
protect admin endpoints
verify operator permissions
```

---

## 20. Audit and Event Continuity

Relevant onboarding actions should generate audit-ready event references.

Suggested event classes:

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

Events should support future EVT and OPC integration.

The event layer should record:

```txt
event type
subject reference
IPR reference
timestamp
previous event reference where applicable
status change
decision state
hash reference
issuer or reviewer reference where applicable
```

---

## 21. Secret Management

Production secrets must never be committed.

Forbidden in source code:

```txt
API keys
database URLs
private keys
JWT secrets
webhook secrets
cloud storage keys
provider credentials
encryption keys
session secrets
```

Use environment variables and deployment secret managers.

Example placeholders:

```env
IDENTITY_PROVIDER_API_KEY=
DATABASE_URL=
JWT_SECRET=
STORAGE_BUCKET=
JOKER_C2_GATEWAY_URL=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
RESEND_API_KEY=
```

These placeholders must not contain real production values in the repository.

---

## 22. Mock Data Policy

Mock data must be clearly synthetic.

Allowed:

```txt
fake names
fake document types
fake identifiers
fake hashes
fake status values
fake certificate IDs
fake IPR IDs
fake card serials
fake review states
fake operator references
```

Not allowed:

```txt
real identity records
real document numbers
real fiscal identifiers
real onboarding screenshots containing personal data
real user files
real photos
real videos
real approval notes containing personal data
```

---

## 23. MVP Security Status

The current MVP may use client-side certificate generation and browser session continuity.

However, even the MVP must preserve the correct security posture:

```txt
access denied by default
no direct JOKER-C2 access without valid Certificate 09
no sensitive data committed
no raw document exposure
no fake legal claim of official identity issuance
no uncontrolled public user data
no production secrets in source code
every phase validates previous certificate
manual fallback validates uploaded certificates
JOKER-C2 gate validates fail-closed
```

---

## 24. Revocation Principle

The production system must support revocation.

If an IPR, IPR Card, phase certificate or operational certificate is revoked, suspended, expired or placed under review, JOKER-C2 access must be disabled.

Revocation must override previous approval.

Allowed access condition:

```txt
revocation_state = clear
```

All other revocation states must deny access:

```txt
suspended
revoked
expired
under_review
```

Production revocation must be enforced server-side.

---

## 25. Future Production Requirements

Before production use, the app requires:

```txt
secure authentication
backend API
database persistence
encrypted storage
protected document storage
protected photo/video storage
server-side certificate signing
server-side verification state management
server-side access gate
role-based reviewer access
operator authentication
operator authorization
audit logging
rate limiting
abuse protection
retention policy
deletion policy
revocation flow
incident response process
privacy review
legal review
provider security review
compliance assessment
monitoring
backup and recovery process
```

---

## 26. Incident Response

A security incident may include:

```txt
exposed secret
exposed identity document
exposed fiscal identifier
exposed photo or video evidence
exposed biometric material
unauthorized status change
unauthorized JOKER-C2 access
public exposure of onboarding data
broken access gate
compromised storage
incorrect verification approval
unauthorized certificate issuance
unauthorized IPR Card issuance
unauthorized operational certificate issuance
malformed certificate accepted by mistake
revoked certificate accepted by mistake
```

Minimum response:

```txt
identify
contain
revoke
rotate secrets
disable affected access
preserve audit evidence
review logs
notify responsible operators
correct the vulnerability
document the incident
review affected trust chain
regenerate affected credentials where required
```

---

## 27. Responsible Disclosure

Security issues should be reported privately to the project maintainer.

Do not open a public issue containing:

```txt
secrets
personal data
identity documents
exploit payloads
production credentials
private security details
real onboarding evidence
```

Public issues must remain free of sensitive identity material.

---

## 28. Security Acceptance Criteria

The MVP security posture is acceptable when:

```txt
no real sensitive data is committed
no production secrets are committed
all certificate phases validate previous certificates
manual upload fallback validates certificate content
browser session certificates are revalidated before use
Certificate 07 requires explicit approval action
Certificate 08 does not grant JOKER-C2 access
Certificate 09 does not bypass the gate
JOKER-C2 gate denies malformed certificates
JOKER-C2 gate denies wrong phase certificates
JOKER-C2 gate denies wrong scope certificates
JOKER-C2 gate grants access only with valid Certificate 09
legal boundary is visible
privacy boundary is visible
security boundary is visible
build succeeds
```

---

## 29. Canonical Security Formula

```txt
Email is not enough.
Payment is not enough.
Subscription is not enough.
Operational identity is required.
Verified IPR is required.
IPR Card is required.
Active operational certificate is required.
Fail-closed access gate is required.
Governed access is required.
```

---

## 30. Organization

```txt
HERMETICUM B.C.E. S.r.l.
```

---

## 31. Canonical Trademark

```txt
HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA
HERMETICUM B.C.E. S.r.l.
```
