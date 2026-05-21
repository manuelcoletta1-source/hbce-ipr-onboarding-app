# HBCE IPR Onboarding App — Technical Specification

**HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA**  
**HERMETICUM B.C.E. S.r.l.**

---

## 1. Purpose

This document defines the technical specification for HBCE IPR Onboarding App.

The application implements a bank-grade operational identity onboarding flow for:

```txt
progressive HBCE-IPR certificate release
IPR Verified status
IPR Card issuance
operational certificate activation
governed JOKER-C2 access evaluation
fail-closed certificate validation
future EVT integration
future OPC integration
future revocation registry
```

The core technical rule is:

```txt
No verified IPR, no governed JOKER-C2 access.
```

The operating formula is:

```txt
First, verify who you are.
Then access operational artificial intelligence.
```

The application is not a static brochure.

The application is not a classic email/password AI login.

The application is an operational identity gateway for governed AI runtime access.

---

## 2. Current Technical Status

Current status:

```txt
Working MVP certificate chain completed.
```

Validated MVP chain:

```txt
01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → JOKER-C2 gate
```

The MVP currently supports:

```txt
client-side certificate generation
downloadable .hbce.json certificates
previous certificate validation
automatic browser session continuity
manual certificate upload fallback
explicit HBCE approval checkpoint
IPR Card certificate issuance
operational certificate issuance
JOKER-C2 final certificate gate
fail-closed access validation
```

Production trust still requires:

```txt
backend enforcement
database persistence
protected evidence storage
server-side certificate signing
server-side session management
authenticated admin/operator workflow
audit logging
revocation registry
monitoring
legal review
privacy review
security review
```

---

## 3. Recommended Stack

The implementation uses:

```txt
Next.js
React
TypeScript
CSS shared design system
Vercel-compatible deployment
client-side MVP certificate flow
browser session storage for continuity
downloadable JSON certificates
SHA-256 canonical payload hashing
strict TypeScript types
fail-closed validation helpers
```

The architecture must remain compatible with future backend, storage, verification provider and trust-service integrations.

---

## 4. Application Type

The app is an onboarding workflow application with operational states and certificate continuity.

Minimum functional layers:

```txt
presentation layer
certificate phase UI layer
certificate upload layer
certificate generation layer
certificate validation layer
hash chain layer
session continuity layer
manual fallback layer
admin/operator MVP approval layer
IPR Card issuance layer
operational certificate layer
JOKER-C2 access gate layer
legal boundary layer
privacy boundary layer
security boundary layer
future API boundary
future backend trust layer
```

---

## 5. Current Folder Structure

Current application structure should follow this model:

```txt
app/
  layout.tsx
  globals.css
  page.tsx
  not-found.tsx

  onboarding/
    page.tsx
    phase-1/
      page.tsx
    phase-2/
      page.tsx
    phase-3/
      page.tsx
    photo-video/
      page.tsx
    phase-5/
      page.tsx
    review/
      page.tsx

  admin/
    review/
      page.tsx

  ipr-card/
    page.tsx

  certificate/
    page.tsx

  access/
    joker-c2/
      page.tsx

  legal/
    page.tsx

  privacy/
    page.tsx

  security/
    page.tsx

components/
  AppHeader.tsx
  AppFooter.tsx
  BoundaryNotice.tsx
  StatusBadge.tsx
  OnboardingStepper.tsx
  IprCertificateUploader.tsx
  IprPhaseForm.tsx
  IPRCardPreview.tsx
  CertificatePreview.tsx
  AccessGatePanel.tsx

lib/
  constants.ts
  types.ts
  ipr-certificate-chain.ts
  ipr-phase-map.ts
  mock-onboarding.ts
  access-decision.ts
  format.ts
```

Documentation files remain at repository root.

---

## 6. Required Routes

Current MVP routes:

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

Legacy compatibility note:

```txt
/onboarding/phase-4 may exist as an alias.
The current canonical UI route for Phase 04 is /onboarding/photo-video.
```

---

## 7. Certificate Chain Technical Model

The application implements the following chain:

| Step | Phase | File |
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

Every certificate must unlock exactly one next phase.

Every protected route must verify the previous certificate fail-closed before continuation.

---

## 8. Certificate Protocol

Release protocol:

```txt
HBCE-IPR-RELEASE-v3
```

Payload protocol:

```txt
HBCE-IPR-PAYLOAD-v3
```

Canonical certificate kinds:

```txt
IPR_PHASE_CERTIFICATE
IPR_OPERATIONAL_CERTIFICATE
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

## 9. Canonical Certificate Shape

Every portable certificate should follow this structure:

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

Final operational certificate requirements:

```txt
kind = IPR_OPERATIONAL_CERTIFICATE
phase.code = IPR_VERIFIED
certificate_status = ACTIVE
certificate_scope = JOKER_C2_ACCESS
next.next_phase = JOKER_C2_ACCESS
```

---

## 10. Hash Chain Technical Rule

Every certificate follows:

```txt
previous_payload_sha256 + current canonical payload → payload_sha256
```

Certificate 01:

```txt
previous_payload_sha256 = null
```

Certificates 02-09:

```txt
previous_payload_sha256 = previous certificate payload hash
payload_sha256 = current canonical payload hash
```

The system must fail closed if:

```txt
previous certificate is missing
uploaded JSON is malformed
protocol is invalid
issuer is invalid
phase is invalid
next required phase is invalid
payload hash is missing
previous payload hash is missing when required
payload hash does not match canonical payload
certificate kind is wrong
certificate scope is wrong where applicable
```

---

## 11. Core TypeScript Files

### `lib/types.ts`

Purpose:

```txt
Define canonical protocols, certificate types, phase types, legacy operational records and access gate result types.
```

Required type groups:

```txt
JsonObject
JsonValue
HashReference
IsoDateTime
HbceIprReleaseProtocol
HbceIprPayloadProtocol
HbceIprCertificateKind
HbceIssuer
HbceIprPolicy
HbceIprPhase
HbceIprSubject
HbceIprHashIntegrity
HbceIprPayloadEnvelope
HbceIprRegistry
HbceIprCertificate
HbceIprPhaseCertificate
HbceIprOperationalCertificate
HbceGeneratedCertificate
HbceCertificateValidationResult
HbceJokerC2AccessGateResult
OnboardingStep
VerificationStatus
RevocationState
AccessDecision
```

---

### `lib/constants.ts`

Purpose:

```txt
Centralize product constants, route constants, formulas, public legal boundaries and onboarding step definitions.
```

Required constants:

```txt
APP_NAME
APP_DESCRIPTION
ORG_NAME
CANONICAL_TRADEMARK
JOKER_C2_GATEWAY_URL
HBCE_PLATFORM_URL
CORE_PRODUCT_RULE
PUBLIC_WEBSITE_FORMULA
PRODUCT_FORMULA
LEGAL_BOUNDARY_TEXT
CERTIFICATE_BOUNDARY_TEXT
PRIVACY_BOUNDARY_TEXT
SECURITY_BOUNDARY_TEXT
ROUTES
ONBOARDING_STEPS
HBCE_IPR_CERTIFICATE_FILES
ACCESS_REQUIRED_CONDITIONS
```

The route constants must include:

```txt
/onboarding/photo-video
/admin/review
/ipr-card
/certificate
/access/joker-c2
```

---

### `lib/ipr-certificate-chain.ts`

Purpose:

```txt
Generate, canonicalize, hash, download and validate HBCE-IPR certificates.
```

Required functions may include:

```txt
stableStringify
sha256Canonical
nowIso
generateHbceIprCertificate
downloadHbceIprCertificate
validatePreviousHbceIprCertificate
validateJokerC2OperationalCertificate
```

The module must enforce:

```txt
canonical payload hashing
previous payload hash continuity
issuer validation
phase validation
next phase validation
operational certificate validation
JOKER-C2 scope validation
fail-closed decision behavior
```

---

### `lib/ipr-phase-map.ts`

Purpose:

```txt
Define the phase map from Certificate 01 to Certificate 09 and resolve continuation routes.
```

Required functions may include:

```txt
getPhaseDefinitionByNumber
getContinuationRouteFromCertificate
```

The phase map must align:

```txt
01 SUBJECT_CREATED → /onboarding/phase-2
02 FISCAL_IDENTITY_COLLECTED → /onboarding/phase-3
03 OFFICIAL_DOCUMENT_SUBMITTED → /onboarding/photo-video
04 LIVENESS_SUBMITTED → /onboarding/phase-5
05 COMPLIANCE_ACCEPTED → /onboarding/review
06 PENDING_REVIEW → /admin/review
07 IPR_APPROVED → /ipr-card
08 IPR_CARD_ISSUED → /certificate
09 IPR_VERIFIED → /access/joker-c2
```

---

## 12. Core Components

### `IprPhaseForm`

Purpose:

```txt
Render a phase form, validate previous certificate input, build phase data, generate the next certificate and download it.
```

Responsibilities:

```txt
receive phase definition
render configured fields
accept previous certificate
validate previous certificate fail-closed
call buildPhaseData
generate certificate
download certificate
store certificate in browser session for next phase
redirect to next route
```

Boundary:

```txt
It is an MVP client-side workflow helper.
It is not a production trust source.
```

---

### `IprCertificateUploader`

Purpose:

```txt
Upload and validate previous HBCE-IPR certificates.
```

Responsibilities:

```txt
parse JSON certificate
validate protocol
validate issuer
validate expected previous phase
validate expected next phase
validate payload hash
return accepted upload state
display fail-closed validation messages
```

Boundary:

```txt
The component must validate content.
It must not trust file name alone.
```

---

### `BoundaryNotice`

Purpose:

```txt
Render legal, privacy and security notices.
```

Supported tones:

```txt
info
warning
danger
```

---

### `OnboardingStepper`

Purpose:

```txt
Render the complete onboarding certificate chain and current position.
```

It must support both legacy aliases and canonical phase IDs:

```txt
start
identity
fiscal
documents
photo_video
review
ipr_card
certificate
joker_c2_access
phase_1_subject
phase_2_fiscal_identity
phase_3_official_document
phase_4_liveness
phase_5_privacy_compliance
phase_6_review_pending
phase_7_ipr_approved
phase_8_ipr_card
phase_9_operational_certificate
completed
blocked
```

---

### `StatusBadge`

Purpose:

```txt
Display operational states consistently.
```

Required status families:

```txt
pending
submitted
manual_review
approved
rejected
in_progress
denied
granted
active
verified
```

---

### `IPRCardPreview`

Purpose:

```txt
Display public-safe IPR Card information.
```

Forbidden display:

```txt
raw identity data
raw document data
raw fiscal identifier
raw photo
raw video
biometric material
```

---

### `CertificatePreview`

Purpose:

```txt
Display internal operational certificate references.
```

Boundary:

```txt
The certificate is internal to HBCE.
It is not a qualified eIDAS certificate unless issued through a recognized and compliant trust service integration.
```

---

### `AccessGatePanel`

Purpose:

```txt
Display access decision, required conditions and current conditions.
```

Default visual state:

```txt
denied
```

---

## 13. Phase Page Specifications

### Phase 01 Page

Route:

```txt
/onboarding/phase-1
```

Technical role:

```txt
generate Certificate 01
collect customer intake data
record email and phone verification states
```

Output:

```txt
hbce-ipr-01-subject-created.hbce.json
```

---

### Phase 02 Page

Route:

```txt
/onboarding/phase-2
```

Technical role:

```txt
validate Certificate 01
collect fiscal identity evidence metadata
generate Certificate 02
```

Output:

```txt
hbce-ipr-02-fiscal-identity.hbce.json
```

---

### Phase 03 Page

Route:

```txt
/onboarding/phase-3
```

Technical role:

```txt
validate Certificate 02
collect official document evidence metadata
generate Certificate 03
```

Output:

```txt
hbce-ipr-03-official-document.hbce.json
```

---

### Phase 04 Page

Route:

```txt
/onboarding/photo-video
```

Technical role:

```txt
validate Certificate 03
collect photo/video/liveness metadata
generate Certificate 04
```

Output:

```txt
hbce-ipr-04-liveness-submitted.hbce.json
```

---

### Phase 05 Page

Route:

```txt
/onboarding/phase-5
```

Technical role:

```txt
validate Certificate 04
enforce mandatory privacy/compliance acknowledgements
generate Certificate 05
```

Output:

```txt
hbce-ipr-05-privacy-compliance.hbce.json
```

Fail-closed rule:

```txt
All mandatory acknowledgements must be accepted.
```

---

### Phase 06 Page

Route:

```txt
/onboarding/review
```

Technical role:

```txt
validate Certificate 05
require explicit review submission
generate Certificate 06
```

Output:

```txt
hbce-ipr-06-review-pending.hbce.json
```

---

### Phase 07 Page

Route:

```txt
/admin/review
```

Technical role:

```txt
validate Certificate 06
require explicit HBCE operator reference
allow APPROVE only in MVP
generate Certificate 07
```

Output:

```txt
hbce-ipr-07-ipr-approved.hbce.json
```

Boundary:

```txt
Client-side approval is MVP-only.
Production requires authenticated backend/admin enforcement.
```

---

### Phase 08 Page

Route:

```txt
/ipr-card
```

Technical role:

```txt
validate Certificate 07
generate deterministic IPR ID
generate subject ID
generate card serial
issue IPR Card certificate
generate Certificate 08
```

Output:

```txt
hbce-ipr-08-ipr-card.hbce.json
```

---

### Phase 09 Page

Route:

```txt
/certificate
```

Technical role:

```txt
validate Certificate 08
generate operational certificate ID
set certificate_status ACTIVE
set certificate_scope JOKER_C2_ACCESS
generate Certificate 09
```

Output:

```txt
hbce-ipr-09-operational-certificate.hbce.json
```

---

### JOKER-C2 Gate Page

Route:

```txt
/access/joker-c2
```

Technical role:

```txt
validate Certificate 09
deny by default
grant access only when final operational certificate is valid
display ACCESS_GRANTED or ACCESS_DENIED
```

Required checks:

```txt
proto
issuer
kind
phase
certificate_status
certificate_scope
previous_payload_sha256
payload_sha256
```

---

## 14. Browser Session Continuity

The MVP may use browser session storage.

Session key pattern:

```txt
HBCE_IPR_CERTIFICATE_FOR_NEXT_PHASE:<NEXT_PHASE>
```

Allowed use:

```txt
store generated certificate temporarily
load certificate on next route
reduce repeated manual upload
preserve MVP continuity
```

Security requirement:

```txt
Every certificate loaded from session must be revalidated fail-closed.
```

Boundary:

```txt
Browser session storage is not a production trust source.
```

Production replacement:

```txt
backend session management
protected storage
server-side certificate signing
authenticated user state
authenticated operator state
audit logging
revocation control
```

---

## 15. Manual Fallback

Manual fallback must remain available in every phase after Certificate 01.

Manual fallback action:

```txt
Use another Certificate
```

Manual upload must validate:

```txt
valid JSON
protocol
issuer
expected previous phase
expected next phase
hash integrity
certificate kind
certificate scope where applicable
```

The application must never trust:

```txt
file name alone
browser state alone
query parameter
hidden field
manual frontend status
```

---

## 16. JOKER-C2 Access Gate Logic

Minimum final gate logic:

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

The gate must not grant access because of:

```txt
uploaded file name
button click
session storage alone
frontend state
query parameter
payment state
email account state
```

---

## 17. UI Requirements

The interface must communicate:

```txt
Classic AI access is based on email, password and subscription.
HBCE governed AI access requires verified operational identity.
The user is onboarded before access.
Each phase produces a certificate.
The IPR Card is the operational key.
The operational certificate enables gate evaluation.
JOKER-C2 opens only after valid Certificate 09.
```

The UI should be:

```txt
clear
institutional
technical
privacy-aware
security-aware
fail-closed by language and behavior
```

The interface must not imitate official state identity cards.

The interface must not claim banking status.

The interface must not claim qualified eIDAS status.

---

## 18. Data Display Rules

Allowed public-safe display fields:

```txt
ipr_id
subject_id where appropriate
card_serial
card_status
certificate_id
certificate_status
certificate_scope
issuer
issued_at
valid_until
access_decision
decision_reason
payload_sha256
previous_payload_sha256
revocation_state
```

Forbidden public display fields:

```txt
raw document number
raw fiscal identifier
raw identity document
raw photo
raw video
biometric data
face template
liveness recording
private review notes
private storage URL
production secrets
```

---

## 19. Security Requirements

The MVP must preserve:

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
manual_certificate_validation
session_certificate_revalidation
hash_chain_validation
legal_boundary_visibility
privacy_boundary_visibility
security_boundary_visibility
```

JOKER-C2 access must never be granted only because the user clicked a button.

That would be “security by vibes”, which is a charmingly doomed human tradition.

---

## 20. Environment Variables

Current or future environment variables may include:

```env
JOKER_C2_GATEWAY_URL=
HBCE_PLATFORM_URL=
IDENTITY_PROVIDER_API_KEY=
DOCUMENT_STORAGE_BUCKET=
DATABASE_URL=
JWT_SECRET=
OPC_ENDPOINT=
EVT_REGISTRY_ENDPOINT=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
RESEND_API_KEY=
```

The repository must not contain real production values.

All production secrets must live in deployment secret managers.

---

## 21. Future API Routes

Future API routes may include:

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

All API routes must validate input server-side.

The frontend must never be the source of final production trust.

---

## 22. Future Backend Requirements

Before production use, the app will require:

```txt
secure authentication
backend API
database persistence
encrypted storage
protected document storage
protected photo/video storage
server-side certificate signing
server-side verification states
server-side session management
operator review dashboard
operator authentication
operator authorization
audit logging
revocation management
rate limiting
abuse protection
access token issuance
JOKER-C2 runtime bridge
privacy controls
retention policy
deletion policy
incident response
monitoring
```

---

## 23. EVT and OPC Technical Boundary

The MVP may prepare EVT and OPC references.

Future integration should support:

```txt
event_id
event_type
previous_event_reference
event_hash
proof_id
linked_event_id
operation_scope
decision_hash
policy_snapshot_hash
created_at
issuer
payload_sha256
previous_payload_sha256
certificate_id
ipr_id
card_serial
access_decision
```

EVT should trace operational continuity.

OPC should prove operational state and decision context.

Neither EVT nor OPC should expose unnecessary raw identity material.

---

## 24. Build and Validation Commands

Development commands:

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run check
```

Expected validation result:

```txt
no TypeScript errors
no lint errors
production build succeeds
```

If errors appear, fix the full affected file.

No partial patches.

No puzzle pieces.

---

## 25. Deployment Target

The MVP should be deployable on Vercel.

Deployment requirements:

```txt
Node.js version compatible with package.json
Next.js build succeeds
environment variables configured where needed
no production secrets committed
public routes reachable
certificate chain routes reachable
JOKER-C2 gate reachable
legal/privacy/security pages reachable
```

---

## 26. Technical Acceptance Criteria

The technical implementation is acceptable when:

```txt
all required routes exist
shared components are implemented
certificate uploader exists
phase form generator exists
certificate generation works
certificate download works
hash chain validation works
session continuity works
manual fallback works
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
legal, privacy and security pages exist
no real sensitive data is present
no production secret is present
build succeeds
```

---

## 27. Technical Product Formula

```txt
The app collects onboarding state.
The app generates progressive certificates.
The app chains hashes.
The app validates previous certificates.
The app issues IPR Card.
The app issues operational certificate.
The app denies by default.
The app opens JOKER-C2 only after valid Certificate 09.
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
