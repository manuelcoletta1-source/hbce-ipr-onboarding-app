# Privacy Policy

**HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA**  
**HERMETICUM B.C.E. S.r.l.**

---

## 1. Purpose

HBCE IPR Onboarding App is designed to support operational identity onboarding for progressive HBCE-IPR certificate release, IPR Verified status, IPR Card issuance, operational certificate activation and governed JOKER-C2 access evaluation.

The application may process identity data, official document metadata, fiscal identity references, photo/video evidence metadata, liveness declarations, privacy acknowledgements, review states, approval states, IPR Card data and operational certificate data.

For this reason, privacy protection must be part of the architecture from the first MVP implementation.

The core privacy rule is:

```txt
Collect only what is necessary.
Expose only what is minimized.
Protect everything sensitive.
```

The core access rule is:

```txt
No verified IPR, no governed JOKER-C2 access.
```

---

## 2. Privacy Scope

This privacy policy applies to:

```txt
onboarding forms
subject creation data
email verification state
phone verification state
fiscal identity metadata
official document metadata
photo/video evidence metadata
liveness declaration data
privacy and compliance acknowledgements
review submission data
HBCE approval data
IPR status
IPR Card status
operational certificate status
JOKER-C2 access status
downloadable private portable certificates
hash-only public registry references
manual certificate upload fallback
browser session continuity
audit-ready event references
future EVT integration
future OPC integration
future revocation registry
future backend API
future protected storage
```

This policy applies to both current MVP behavior and future production architecture.

---

## 3. Current MVP Privacy Model

The current MVP implements the complete HBCE-IPR certificate chain:

```txt
01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → JOKER-C2 gate
```

The MVP produces private portable `.hbce.json` certificates:

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

The MVP demonstrates the operational privacy model.

It is not a production identity verification system.

It is not a regulated trust service.

It is not an official public identity system.

Production trust requires backend enforcement, protected storage, server-side signing, operator authentication, audit logging, revocation control and privacy-governed data processing.

---

## 4. Repository Boundary

This repository must not contain real personal data.

The following materials must never be committed:

```txt
real identity documents
real passports
real identity cards
real CIE images
real driving licences
real residence documents
real fiscal codes
real tax identifiers
real national identification numbers
real social security style numbers
real document numbers
real photos
real videos
biometric templates
face templates
liveness recordings
real onboarding records
real user files
private review notes containing sensitive material
production credentials
private keys
access tokens
API secrets
database credentials
storage credentials
session secrets
JWT secrets
webhook secrets
signed production certificates
```

Only synthetic, anonymized, minimized, mock or user-controlled local demonstration data may be used for development and demonstration.

---

## 5. Private Portable Certificate Boundary

The MVP generates downloadable private portable HBCE-IPR certificates.

These certificates may contain private phase data for the subject’s local copy.

Private portable certificates are not public registry entries.

They may include:

```txt
private customer fields
private fiscal fields
private document metadata
private consent statements
private review submission data
private approval data
private IPR Card fields
private operational certificate fields
hash fields
previous payload hash
current payload hash
phase state
next required phase
issuer data
issued timestamp
privacy boundary text
trust boundary text
```

They must not embed raw evidence files such as:

```txt
raw identity document images
raw fiscal document images
raw photos
raw videos
biometric templates
face templates
liveness recordings
```

Public verification must expose hash-only references, not private phase data.

---

## 6. Hash-Only Public Reference Rule

Public or semi-public verification must use hash-only references wherever possible.

Allowed public-safe references may include:

```txt
payload_sha256
previous_payload_sha256
phase code
phase status
issuer
issued timestamp
public registry mode
revocation state
access decision
decision reason
```

Forbidden public exposure includes:

```txt
full identity data
full fiscal identifiers
full document numbers
raw document images
raw photos
raw videos
private consent fields
private review notes
private approval notes containing sensitive data
biometric material
protected storage URLs
```

Hash references reduce exposure but do not remove all privacy obligations.

A hash can still be personal data depending on context, linkage and identifiability.

---

## 7. Data Minimization

The app must collect only data required for operational identity verification and certificate chain continuity.

A minimal production onboarding record may include:

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
privacy_compliance_status
review_status
approval_status
ipr_status
ipr_card_status
operational_certificate_status
joker_c2_access_status
revocation_state
previous_payload_sha256
payload_sha256
created_at
updated_at
```

Where possible, the app should use:

```txt
hash references
masked values
verification states
internal identifiers
minimized metadata
protected storage references
private portable certificate fields
hash-only public references
```

---

## 8. Personal Data Categories

The app may process the following categories of personal data in a real implementation:

```txt
account registration data
contact verification state
identity data
official document metadata
fiscal or national identifier metadata
photo/video evidence metadata
liveness verification data
privacy and compliance acknowledgement data
review status data
approval status data
operational identity status data
IPR Card data
operational certificate data
access authorization data
audit and event continuity data
revocation data
```

The app should not expose raw sensitive data in public views.

Production processing requires lawful basis, data minimization, access control, retention governance and privacy review.

---

## 9. Sensitive Identity Material

Sensitive identity material includes:

```txt
document images
document scans
document numbers
fiscal identifiers
national identification numbers
photos
videos
biometric or liveness material
face templates
internal review notes
approval notes containing personal data
protected storage links
third-party verification payloads containing personal data
```

Sensitive identity material must remain private and protected.

It must not be exposed in:

```txt
public routes
public repositories
public screenshots
public logs
frontend-only query parameters
unprotected browser state
demo datasets
documentation examples
```

---

## 10. Public Data Boundary

Public or semi-public views should expose only minimized operational information.

Allowed examples:

```txt
IPR status: verified
IPR Card status: active
Operational certificate status: active
JOKER-C2 access: granted or denied
Revocation state: clear
Payload SHA-256
Previous payload SHA-256
Issuer
Phase code
Access decision
```

Forbidden examples:

```txt
full document number
full fiscal code
full national identifier
raw identity document
raw photo
raw video
private review note
private approval note containing personal data
unprotected storage URL
biometric template
liveness recording
```

---

## 11. Masking Principle

Where display is required, sensitive values should be masked.

Examples:

```txt
Fiscal identifier: CLT*********44R
Document number: CA******XQ
Certificate: CERT-HBCE-2026-****
Card serial: IPR-CARD-****
```

The full value should not be displayed unless there is a strict operational need and the view is protected.

Public views must prefer hashes, masked values or status references.

---

## 12. Hash Reference Principle

The app should use hash references to support verification without unnecessary exposure.

Examples:

```txt
email_hash
phone_hash
document_number_hash
fiscal_identifier_hash
document_file_hash
photo_hash
video_hash
liveness_declaration_hash
payload_sha256
previous_payload_sha256
event_hash_reference
proof_hash_reference
```

Hash references are privacy-reducing mechanisms.

They are not a magic invisibility cloak, because apparently reality refuses to be that convenient.

Hash references must still be handled carefully when they can be linked back to an identifiable subject.

---

## 13. Photo and Video Verification

Photo and video verification must be handled as sensitive identity processing.

The MVP may use placeholder verification states and protected references.

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

The repository must not contain:

```txt
real photos
real videos
biometric templates
face templates
liveness recordings
third-party verification payloads containing personal data
```

Future production versions must use:

```txt
protected storage
access control
lawful processing basis
retention rules
deletion rules
operator authorization
audit logging
provider security review
privacy review
```

---

## 14. Phase-by-Phase Privacy Boundary

### Phase 01 — Subject Created

Phase 01 may process:

```txt
email
phone number
first name
last name
country
date of birth
verification state
subject reference
```

Privacy boundary:

```txt
Certificate 01 does not verify final identity.
Certificate 01 must not expose raw private customer data in public registry references.
```

---

### Phase 02 — Fiscal Identity

Phase 02 may process:

```txt
fiscal identifier type
fiscal identifier country
fiscal identifier hash
fiscal document hash references
protected fiscal evidence references
```

Privacy boundary:

```txt
raw fiscal identifiers must not be publicly exposed
raw fiscal documents must not be embedded in portable public references
```

---

### Phase 03 — Official ID Document

Phase 03 may process:

```txt
document type
document country
document number hash
document issuer hash
document issue date hash
document expiry date hash
document evidence hash references
protected document references
```

Privacy boundary:

```txt
raw document images must not be embedded
raw document numbers must not be publicly exposed
```

---

### Phase 04 — Photo / Video Liveness

Phase 04 may process:

```txt
protected photo reference
protected video reference
photo hash
video hash
liveness declaration hash
photo verification status
video verification status
liveness status
```

Privacy boundary:

```txt
real photos and real videos must remain protected
biometric templates must not be generated or stored by the MVP
liveness recordings must not be committed to the repository
```

---

### Phase 05 — Privacy & Compliance

Phase 05 may process:

```txt
privacy consent
hash-only acknowledgement
data accuracy confirmation
document authenticity confirmation
HBCE policy acceptance
no state identity claim acknowledgement
internal operational identity acknowledgement
```

Privacy boundary:

```txt
consent values may be present in the private portable certificate
public verification must expose hash-only references
```

---

### Phase 06 — Review Pending

Phase 06 may process:

```txt
review submission state
review statement
review package hash
submitted timestamp
```

Privacy boundary:

```txt
review submission does not approve IPR
private review fields must not be publicly exposed
```

---

### Phase 07 — HBCE Approval

Phase 07 may process:

```txt
operator reference
approval decision
approval note
approval timestamp
approval hashes
```

Privacy boundary:

```txt
approval notes must not contain raw identity documents
approval notes must not contain unnecessary sensitive personal data
production approval requires protected backend/admin workflow
```

---

### Phase 08 — IPR Card

Phase 08 may process:

```txt
ipr_id
subject_id
card_serial
card_status
issuer
issued_at
valid_until
operator reference
```

Privacy boundary:

```txt
IPR Card is internal to HBCE
IPR Card does not replace official identity documents
IPR Card data must not expose raw identity evidence
```

---

### Phase 09 — Operational Certificate

Phase 09 may process:

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
operator reference
```

Privacy boundary:

```txt
Operational certificate enables JOKER-C2 access evaluation
Operational certificate does not bypass gate validation
Operational certificate is not a qualified eIDAS certificate unless issued through a recognized compliant trust service integration
```

---

### JOKER-C2 Access Gate

The access gate may process:

```txt
final operational certificate
certificate status
certificate scope
payload hash
previous payload hash
access decision
decision reason
checked timestamp
```

Privacy boundary:

```txt
JOKER-C2 access decision must use minimized certificate data
JOKER-C2 access must not expose raw identity evidence
```

---

## 15. Access Control

Access to private onboarding data must be restricted.

The user may view only their own onboarding status and locally generated certificates.

Reviewers or operators may view only the data required for verification.

JOKER-C2 access must not reveal unnecessary identity data.

The access gate should receive only the minimum certificate state required to decide access.

Minimum access state:

```txt
proto
issuer
kind
phase
certificate_status
certificate_scope
payload_sha256
previous_payload_sha256
revocation_state where available
```

---

## 16. Fail-Closed Privacy Rule

If identity state is incomplete, unclear, expired, rejected, suspended, revoked, malformed or unverifiable, access must remain denied.

The default state must be:

```txt
ACCESS_DENIED
```

Privacy and security must not rely on user-declared frontend values.

Access decisions must be enforced server-side in production.

The MVP may demonstrate validation client-side, but client-side validation is not a production trust source.

---

## 17. Browser Session Storage Boundary

The MVP may use browser session storage to preserve certificate continuity between phases.

Session storage may contain temporary local copies of generated certificates.

Session storage must be treated as a convenience layer only.

Every certificate loaded from session must be revalidated fail-closed before use.

Session storage must not be treated as production trust.

Production must replace this with:

```txt
backend enforcement
server-side session management
protected storage
server-side certificate signing
authenticated user state
authenticated operator state
audit logging
revocation control
```

---

## 18. Manual Certificate Upload Boundary

Manual upload is the fallback mechanism.

Manual uploads must be validated before any continuation.

The app must not trust:

```txt
file name
browser state
query parameter
manual frontend status
unsigned client-side payload
```

The app must validate:

```txt
protocol
issuer
kind
phase
next required phase
previous payload hash
payload hash
certificate status
certificate scope where applicable
```

---

## 19. Retention Principle

A real implementation must define retention rules for:

```txt
account data
onboarding records
document metadata
document files
fiscal evidence
photo material
video material
liveness material
audit events
review notes
approval records
IPR Card records
certificate records
revocation records
access decision records
```

The MVP should not store real sensitive identity material.

Production retention must be lawful, documented and proportionate.

---

## 20. Deletion and Revocation

The architecture should support:

```txt
deletion requests
correction requests
revocation of IPR status
revocation of IPR Card
revocation of phase certificates
revocation of operational certificate
disabling JOKER-C2 access
audit preservation where legally required
```

Revocation must override previous approval.

If revocation state is not clear, JOKER-C2 access must be denied.

---

## 21. Logs

Logs must not contain:

```txt
raw document numbers
raw fiscal identifiers
raw photos
raw videos
private document URLs
biometric data
full onboarding payloads
production secrets
access tokens
private keys
database credentials
approval notes containing personal data
```

Logs may contain minimized operational events, such as:

```txt
ONBOARDING_STARTED
SUBJECT_CREATED
FISCAL_IDENTITY_COLLECTED
OFFICIAL_DOCUMENT_SUBMITTED
LIVENESS_SUBMITTED
PRIVACY_COMPLIANCE_ACCEPTED
REVIEW_SUBMITTED
REVIEW_APPROVED
IPR_APPROVED
IPR_CARD_ISSUED
OPERATIONAL_CERTIFICATE_CREATED
IPR_VERIFIED
JOKER_C2_ACCESS_ENABLED
JOKER_C2_ACCESS_DENIED
IPR_REVOKED
```

---

## 22. EVT and OPC Privacy Boundary

Future EVT and OPC integration should preserve data minimization.

EVT should record event continuity.

OPC should record operational proof references.

Neither layer should expose unnecessary raw identity material.

Preferred architecture:

```txt
private sensitive data
→ protected storage
→ hash reference
→ minimized event reference
→ audit-ready proof state
```

EVT/OPC records should use:

```txt
event type
subject reference
IPR reference
timestamp
previous event reference
decision state
hash reference
issuer or reviewer reference where applicable
```

They should not expose:

```txt
raw documents
raw photos
raw videos
biometric data
full fiscal identifiers
private review notes
```

---

## 23. Legal Boundary

HBCE IPR Onboarding App does not issue official public identity credentials.

It does not replace:

```txt
national identity cards
passports
driving licences
CIE
SPID
EUDI Wallet
qualified eIDAS certificates
bank accounts
IBANs
regulated financial identity services
regulated trust services
```

The app supports an internal verifiable operational identity record.

Correct claim:

```txt
HBCE issues a verifiable operational identity that can be linked to official European identity systems.
```

Incorrect claim:

```txt
HBCE issues an official European identity.
```

Future connection with official European identity systems may require recognized trust service providers, lawful integrations, institutional agreements and specific compliance review.

---

## 24. User Transparency

The user should be informed about:

```txt
what data is collected
why the data is collected
what verification steps are required
which certificate phase has been generated
which phase is pending
whether review has been submitted
whether HBCE approval has been granted
whether IPR Card has been issued
whether operational certificate is active
whether JOKER-C2 access is granted or denied
whether the identity state is suspended or revoked
```

The system should not create hidden access states that the user cannot understand.

---

## 25. MVP Privacy Status

The current MVP may use mock data, local certificate generation and browser session continuity.

Even in MVP mode, the app must preserve the correct privacy posture:

```txt
no real documents
no real fiscal identifiers
no real photos
no real videos
no real biometric data
no real liveness recordings
no production secrets
no public exposure of sensitive identity data
no JOKER-C2 access without valid Certificate 09
private portable certificates are downloaded locally by the user
public registry references remain hash-only
```

---

## 26. Future Production Requirements

Before production use, the app will require:

```txt
legal privacy review
data protection impact assessment where applicable
secure authentication
backend API
database persistence
secure storage
encryption at rest
encryption in transit
role-based access control
operator authorization
retention policy
deletion policy
revocation flow
incident response process
audit logging
provider review
data processing agreements where required
compliance assessment for applicable jurisdictions
server-side certificate signing
server-side access gate
```

---

## 27. Canonical Privacy Formula

```txt
Identity data must be protected.
Documents must remain private.
Fiscal identifiers must be minimized.
Photo and video verification must be controlled.
Portable certificates must distinguish private fields from public proof.
Public proof must be hash-based where possible.
JOKER-C2 access must depend on valid operational certificate verification.
```

---

## 28. Organization

```txt
HERMETICUM B.C.E. S.r.l.
```

---

## 29. Canonical Trademark

```txt
HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA
HERMETICUM B.C.E. S.r.l.
```
