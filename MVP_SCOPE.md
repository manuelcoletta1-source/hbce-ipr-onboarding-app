# HBCE IPR Onboarding App — MVP Scope

**HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA**  
**HERMETICUM B.C.E. S.r.l.**

---

## 1. Purpose

This document defines the MVP scope for HBCE IPR Onboarding App.

The MVP demonstrates the complete operational identity onboarding chain for:

```txt
progressive HBCE-IPR certificate release
IPR Verified status
IPR Card issuance
operational certificate activation
governed JOKER-C2 access evaluation
fail-closed authorization logic
```

The MVP is not a production identity verification system.

The MVP is not a regulated banking service.

The MVP is not a qualified trust service.

The MVP is a controlled operational prototype for the HBCE identity gateway.

The core MVP rule is:

```txt
No verified IPR, no governed JOKER-C2 access.
```

The app must never behave like a classic AI login based only on email, password or subscription.

The MVP must demonstrate that governed AI access requires operational identity verification.

---

## 2. MVP Position

The MVP sits between the public HBCE Platform and JOKER-C2.

Canonical position:

```txt
HBCE Platform
→ HBCE IPR Onboarding App
→ HBCE-IPR Certificate Chain
→ IPR Verified
→ IPR Card
→ Operational Certificate
→ JOKER-C2 Access Gate
→ JOKER-C2 Governed Runtime
```

Strategic distinction:

```txt
Classic AI:
email + password + subscription + direct model access

HBCE:
identity onboarding + verification + IPR Card + operational certificate + access gate + governed JOKER-C2 runtime
```

---

## 3. Current MVP Status

Current status:

```txt
Working MVP certificate chain completed.
```

Validated MVP chain:

```txt
01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → JOKER-C2 gate
```

Final MVP result:

```txt
IPR Verified
IPR Card Active
Operational Certificate Active
JOKER-C2 Access Granted
```

The MVP currently demonstrates the complete client-side certificate chain and fail-closed gate logic.

Production trust still requires backend enforcement.

---

## 4. What the MVP Includes

The MVP includes:

```txt
landing page
central onboarding continuation page
progressive certificate generation
manual certificate upload fallback
automatic session continuity
certificate uploader
phase form generator
subject created certificate
fiscal identity certificate
official document certificate
photo/video liveness certificate
privacy and compliance certificate
review pending certificate
HBCE approval certificate
IPR Card certificate
operational certificate
JOKER-C2 certificate gate
final IPR Verified access summary
legal boundary page
privacy boundary page
security boundary page
canonical constants
canonical type model
phase map
hash chain logic
fail-closed validation logic
downloadable .hbce.json certificates
```

---

## 5. What the MVP Does Not Include

The MVP does not include:

```txt
production KYC system
production KYB system
real identity document verification
real fiscal identifier verification
real biometric verification
real liveness verification
real document provider integration
real eID integration
official public identity issuance
qualified eIDAS certificate issuance
SPID issuance
CIE issuance
EUDI Wallet issuance
bank account creation
IBAN issuance
regulated financial services
regulated trust services
production user onboarding
production customer database
production evidence storage
production secrets
real personal datasets
```

The MVP must never claim to issue an official European identity.

The MVP issues an internal operational identity certificate chain for HBCE-governed workflows.

---

## 6. MVP Data Rule

Only mock, synthetic, demonstration, minimized or user-controlled local data may be used inside the MVP repository.

Forbidden in the MVP repository:

```txt
real passports
real identity cards
real driving licences
real fiscal codes
real tax identifiers
real national identification numbers
real photos
real videos
real biometric templates
real face templates
real liveness recordings
real onboarding records
production credentials
private keys
API secrets
database credentials
storage credentials
```

Evidence must be represented through:

```txt
metadata
protected references
SHA-256 hashes
private portable certificate fields
hash-only public references
```

Raw evidence files must not be committed.

---

## 7. MVP Route Scope

The MVP implements the following route scope:

| Route | Function |
|---|---|
| `/` | Operational landing page |
| `/onboarding` | Central certificate continuation page |
| `/onboarding/phase-1` | Subject Created / Certificate 01 |
| `/onboarding/phase-2` | Fiscal Identity / Certificate 02 |
| `/onboarding/phase-3` | Official ID Document / Certificate 03 |
| `/onboarding/photo-video` | Photo / Video Liveness / Certificate 04 |
| `/onboarding/phase-5` | Privacy & Compliance / Certificate 05 |
| `/onboarding/review` | Review Pending / Certificate 06 |
| `/admin/review` | HBCE Approval / Certificate 07 |
| `/ipr-card` | IPR Card Issuance / Certificate 08 |
| `/certificate` | Operational Certificate / Certificate 09 |
| `/access/joker-c2` | JOKER-C2 Access Gate |
| `/legal` | Legal boundary |
| `/privacy` | Privacy boundary |
| `/security` | Security boundary |

Legacy note:

```txt
/onboarding/phase-4 may exist as a compatibility alias.
The current canonical UI route for Phase 04 is /onboarding/photo-video.
```

---

## 8. MVP Certificate Chain Scope

The MVP certificate chain includes:

| Step | Phase | Output |
|---|---|---|
| 01 | `SUBJECT_CREATED` | `hbce-ipr-01-subject-created.hbce.json` |
| 02 | `FISCAL_IDENTITY_COLLECTED` | `hbce-ipr-02-fiscal-identity.hbce.json` |
| 03 | `OFFICIAL_DOCUMENT_SUBMITTED` | `hbce-ipr-03-official-document.hbce.json` |
| 04 | `LIVENESS_SUBMITTED` | `hbce-ipr-04-liveness-submitted.hbce.json` |
| 05 | `COMPLIANCE_ACCEPTED` | `hbce-ipr-05-privacy-compliance.hbce.json` |
| 06 | `PENDING_REVIEW` | `hbce-ipr-06-review-pending.hbce.json` |
| 07 | `IPR_APPROVED` | `hbce-ipr-07-ipr-approved.hbce.json` |
| 08 | `IPR_CARD_ISSUED` | `hbce-ipr-08-ipr-card.hbce.json` |
| 09 | `IPR_VERIFIED` | `hbce-ipr-09-operational-certificate.hbce.json` |
| Gate | `JOKER_C2_ACCESS` | `ACCESS_GRANTED` or `ACCESS_DENIED` |

Each certificate must contain:

```txt
proto
kind
issuer
phase
subject reference
payload envelope
previous payload hash
current payload hash
registry reference
next phase
issued timestamp
```

---

## 9. MVP User Flow

The MVP user flow is:

```txt
User opens landing page.
User starts onboarding.
User creates Certificate 01.
User submits fiscal identity evidence and creates Certificate 02.
User submits official document evidence and creates Certificate 03.
User submits photo/video liveness evidence and creates Certificate 04.
User accepts privacy/compliance acknowledgements and creates Certificate 05.
User submits review package and creates Certificate 06.
HBCE admin/operator approves and creates Certificate 07.
System issues IPR Card certificate and creates Certificate 08.
System issues operational certificate and creates Certificate 09.
JOKER-C2 gate validates Certificate 09.
If all required conditions are valid, access is granted.
If any required condition fails, access is denied.
```

---

## 10. MVP Automatic Continuity

The MVP supports automatic certificate continuity through browser session storage.

When a certificate is generated:

```txt
1. the certificate is downloaded to the user
2. the certificate is stored temporarily in browser session storage
3. the app redirects to the next route
4. the next route reloads the certificate from session
5. the next route validates the certificate fail-closed
6. the next route enables continuation only if the certificate is valid
```

Manual fallback remains available:

```txt
Use another Certificate
Upload previous HBCE-IPR certificate manually
```

Boundary:

```txt
browser session continuity is a convenience layer only
browser session continuity is not a production trust source
production requires backend enforcement
production requires server-side signing
production requires protected storage
```

---

## 11. MVP Hash Chain Rule

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

## 12. MVP Phase 01 Scope

Phase 01 scope:

```txt
subject creation
customer intake
email verification state
phone verification state
private portable certificate generation
Certificate 01 download
next phase unlock: FISCAL_IDENTITY
```

Out of scope:

```txt
final identity verification
IPR approval
IPR Card issuance
operational certificate activation
JOKER-C2 access
```

---

## 13. MVP Phase 02 Scope

Phase 02 scope:

```txt
fiscal identity evidence metadata
tax identifier references
protected fiscal document hash references
Certificate 02 generation
next phase unlock: OFFICIAL_ID_DOCUMENT
```

Out of scope:

```txt
raw fiscal document storage
public exposure of fiscal identifiers
final identity approval
JOKER-C2 access
```

---

## 14. MVP Phase 03 Scope

Phase 03 scope:

```txt
official document metadata
official document evidence hash references
document type selection
Certificate 03 generation
next phase unlock: LIVENESS_CHECK
```

Out of scope:

```txt
raw document image storage
real document provider verification
public exposure of document numbers
IPR approval
JOKER-C2 access
```

---

## 15. MVP Phase 04 Scope

Phase 04 scope:

```txt
photo evidence metadata
video evidence metadata
liveness declaration
protected photo reference
protected video reference
photo hash reference
video hash reference
Certificate 04 generation
next phase unlock: PRIVACY_COMPLIANCE
```

Out of scope:

```txt
real biometric processing
face template generation
real liveness provider integration
raw photo storage
raw video storage
IPR approval
JOKER-C2 access
```

---

## 16. MVP Phase 05 Scope

Phase 05 scope:

```txt
privacy consent
hash-only acknowledgement
data accuracy confirmation
document authenticity confirmation
HBCE policy acceptance
non-replacement identity acknowledgement
internal operational identity acknowledgement
Certificate 05 generation
next phase unlock: REVIEW_SUBMISSION
```

Fail-closed rule:

```txt
all mandatory acknowledgements must be accepted before Certificate 05 can be generated
```

Out of scope:

```txt
IPR approval
IPR Card issuance
operational certificate activation
JOKER-C2 access
```

---

## 17. MVP Phase 06 Scope

Phase 06 scope:

```txt
review package submission
pending review state
Certificate 06 generation
next phase unlock: HBCE_APPROVAL
```

Fail-closed rule:

```txt
Certificate 06 can be generated only after explicit review submission
```

Out of scope:

```txt
approval
IPR Card issuance
operational certificate activation
JOKER-C2 access
```

---

## 18. MVP Phase 07 Scope

Phase 07 scope:

```txt
HBCE admin/operator approval
operator reference
approval decision
Certificate 07 generation
next phase unlock: IPR_CARD_ISSUANCE
```

MVP decision rule:

```txt
only APPROVE generates Certificate 07
REJECT and REQUEST_MORE_DATA require future protected backend/admin workflow
```

Out of scope:

```txt
production admin authentication
production operator authorization
production evidence review
production revocation registry
automatic approval
JOKER-C2 access
```

---

## 19. MVP Phase 08 Scope

Phase 08 scope:

```txt
IPR Card issuance
IPR ID generation
subject ID generation
card serial generation
card status ACTIVE
Certificate 08 generation
next phase unlock: OPERATIONAL_CERTIFICATE
```

Out of scope:

```txt
state identity issuance
CIE issuance
SPID issuance
EUDI Wallet issuance
qualified eIDAS certificate issuance
bank account creation
IBAN issuance
JOKER-C2 access
```

---

## 20. MVP Phase 09 Scope

Phase 09 scope:

```txt
operational certificate issuance
certificate ID generation
certificate status ACTIVE
certificate scope JOKER_C2_ACCESS
Certificate 09 generation
next phase unlock: JOKER_C2_ACCESS
```

Out of scope:

```txt
qualified eIDAS issuance
regulated trust service issuance
automatic runtime access
bypass of JOKER-C2 gate
```

---

## 21. MVP JOKER-C2 Gate Scope

The MVP JOKER-C2 access gate validates Certificate 09.

The gate must check:

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

The gate must deny:

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

---

## 22. MVP UI Principle

The MVP interface should communicate one central difference:

```txt
Classic AI access:
email + password + subscription

HBCE governed AI access:
verified identity + IPR Card + operational certificate + access gate
```

The user should immediately understand that JOKER-C2 is not accessed through a simple email account.

The user should understand that each phase releases a certificate and that the final certificate is required for governed runtime access.

---

## 23. MVP Security Requirements

The MVP must preserve these requirements:

```txt
fail_closed_by_default
no_raw_documents
no_raw_fiscal_identifiers
no_real_photos
no_real_videos
no_biometric_data
no_face_templates
no_liveness_recordings
no_production_secrets
mock_or_hash_reference_data_only
clear_legal_boundary
clear_privacy_boundary
clear_security_boundary
manual_certificate_fallback
certificate_hash_validation
```

---

## 24. MVP Privacy Requirements

The MVP must preserve these privacy principles:

```txt
data_minimization
hash_references
private_portable_certificates
protected_storage_references
hash_only_public_registry_logic
no_public_raw_identity_data
no_real_user_records_in_repository
```

---

## 25. MVP Event References

The MVP may simulate event references for future EVT and OPC integration.

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

These events remain demonstration-only in the MVP unless connected to real EVT and OPC infrastructure.

---

## 26. MVP Success Criteria

The MVP is successful if it demonstrates:

```txt
complete certificate onboarding path
operational difference from classic AI login
subject creation
fiscal evidence phase
official document phase
photo/video liveness phase
privacy and compliance phase
review submission phase
explicit HBCE approval phase
IPR Card concept
operational certificate concept
fail-closed JOKER-C2 gate
legal boundary
privacy boundary
security boundary
future compatibility with real verification integrations
```

---

## 27. MVP Acceptance Criteria

The MVP is acceptable when:

```txt
all public pages load
all certificate phases load
Certificate 01 can be generated
Certificate 02 can be generated from Certificate 01
Certificate 03 can be generated from Certificate 02
Certificate 04 can be generated from Certificate 03
Certificate 05 can be generated from Certificate 04
Certificate 06 can be generated from Certificate 05
Certificate 07 can be generated from Certificate 06 by explicit admin/operator action
Certificate 08 can be generated from Certificate 07
Certificate 09 can be generated from Certificate 08
JOKER-C2 gate grants access only with valid Certificate 09
malformed certificates are denied
wrong phase certificates are denied
wrong scope certificates are denied
legal boundary is visible
privacy boundary is visible
security boundary is visible
no sensitive data is committed
build succeeds
```

---

## 28. MVP Non-Goals

The MVP does not need to solve:

```txt
production KYC
production KYB
production biometric verification
production document verification
regulated trust service issuance
official identity federation
EUDI Wallet integration
SPID integration
CIE integration
payment processing
banking services
enterprise customer onboarding
multi-tenant operator console
full EVT ledger
full OPC proof system
production revocation registry
```

These are future phases.

---

## 29. Future Production Path

After the MVP, the project may evolve toward:

```txt
secure authentication
backend API
database persistence
encrypted storage
protected document storage
protected photo/video storage
real verification provider integration
operator review dashboard
server-side certificate signing
server-side session management
audit logging
EVT integration
OPC integration
revocation registry
JOKER-C2 authorization bridge
EUDI Wallet compatibility study
eIDAS trust service integration study
enterprise onboarding
institutional pilot
B2B pilot
B2G pilot
```

Each future phase requires legal, privacy, security and technical review.

---

## 30. Production Readiness Requirements

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

## 31. Canonical MVP Formula

```txt
The MVP shows the threshold.
The user does not simply log in.
The user is onboarded.
The subject is verified through a progressive certificate chain.
The IPR is approved.
The IPR Card is issued.
The operational certificate is activated.
The access gate decides.
JOKER-C2 opens only after verified operational identity.
```

---

## 32. Organization

```txt
HERMETICUM B.C.E. S.r.l.
```

---

## 33. Canonical Trademark

```txt
HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA
HERMETICUM B.C.E. S.r.l.
```

