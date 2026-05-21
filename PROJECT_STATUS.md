# HBCE IPR Onboarding App — Project Status

**HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA**  
**HERMETICUM B.C.E. S.r.l.**

---

## 1. Current Status

HBCE IPR Onboarding App is now a working MVP repository for operational identity onboarding, progressive HBCE-IPR certificate release, IPR Card issuance, operational certificate activation and governed JOKER-C2 access evaluation.

Current operational status:

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

The repository now demonstrates the complete client-side certificate continuity flow.

The project remains an MVP and R&D demonstrator.

It is not a production KYC system, regulated identity provider, banking service, public authority service or qualified trust service.

---

## 2. Core Operational Rule

Canonical rule:

```txt
No verified IPR, no governed JOKER-C2 access.
```

Operational formula:

```txt
First, verify who you are.
Then access operational artificial intelligence.
```

Public formula:

```txt
Access JOKER-C2 only through verified IPR.
An email is not enough.
A subscription is not enough.
An operational identity is required: documented, traceable and verifiable.
```

This rule is implemented through the progressive certificate chain and the final JOKER-C2 access gate.

---

## 3. Strategic Positioning

Classic AI access normally follows a minimal pattern:

```txt
email
password / OAuth
subscription / payment
direct model access
```

HBCE / JOKER-C2 follows a different operational model:

```txt
subject onboarding
fiscal identity evidence
official document evidence
photo / video liveness evidence
privacy and compliance acceptance
HBCE review submission
HBCE approval
IPR Card issuance
operational certificate activation
JOKER-C2 access gate
governed AI runtime access
```

This repository is the operational onboarding layer of that distinction.

It does not treat AI access as a simple account login.

It treats AI access as a governed operational identity process.

---

## 4. Repository Nature

This repository is:

```txt
MVP
R&D demonstrator
operational identity onboarding prototype
progressive HBCE-IPR certificate chain
IPR Card issuance prototype
operational certificate activation prototype
governed JOKER-C2 access gate prototype
EVT-ready architecture surface
OPC-ready architecture surface
EU-first governance demonstration
```

This repository is not:

```txt
production KYC system
regulated identity provider
official public identity issuer
banking service
payment service
IBAN issuer
qualified eIDAS trust service
CIE issuer
SPID issuer
EUDI Wallet issuer
production biometric verification system
production document verification service
```

---

## 5. Completed MVP Certificate Chain

The current MVP implements the following progressive certificate chain:

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

The route `/onboarding/phase-4` may remain as a legacy phase alias if present, but the current canonical UI route for Phase 04 is:

```txt
/onboarding/photo-video
```

---

## 6. Phase 01 — Subject Created

Status:

```txt
implemented
```

Route:

```txt
/onboarding/phase-1
```

Output:

```txt
hbce-ipr-01-subject-created.hbce.json
```

Function:

```txt
customer intake
email verification
phone verification
subject creation
first portable certificate release
```

Boundary:

```txt
does not verify identity
does not issue IPR Card
does not issue operational certificate
does not grant JOKER-C2 access
```

---

## 7. Phase 02 — Fiscal Identity

Status:

```txt
implemented
```

Route:

```txt
/onboarding/phase-2
```

Input:

```txt
Certificate 01
```

Output:

```txt
hbce-ipr-02-fiscal-identity.hbce.json
```

Function:

```txt
collect fiscal identity values
represent fiscal evidence through hashes
prepare official document phase
```

Boundary:

```txt
raw fiscal documents are not embedded in the portable certificate
raw fiscal evidence must not be committed to the repository
does not verify final identity
does not issue IPR Card
does not grant JOKER-C2 access
```

---

## 8. Phase 03 — Official ID Document

Status:

```txt
implemented
```

Route:

```txt
/onboarding/phase-3
```

Input:

```txt
Certificate 02
```

Output:

```txt
hbce-ipr-03-official-document.hbce.json
```

Function:

```txt
collect official document metadata
represent official document evidence through hashes
prepare liveness phase
```

Supported document evidence includes:

```txt
CIE
EU identity card
passport
driving licence
other authorized official document
```

Boundary:

```txt
raw identity document images are not embedded in the portable certificate
raw document files must not be committed to the repository
does not issue IPR Card
does not grant JOKER-C2 access
```

---

## 9. Phase 04 — Photo / Video Liveness

Status:

```txt
implemented
```

Canonical route:

```txt
/onboarding/photo-video
```

Input:

```txt
Certificate 03
```

Output:

```txt
hbce-ipr-04-liveness-submitted.hbce.json
```

Function:

```txt
prepare photo evidence metadata
prepare video evidence metadata
prepare liveness review state
represent evidence through protected references and hashes
```

Boundary:

```txt
does not process real biometric templates
does not expose real photos or videos
does not issue IPR Verified status
does not issue IPR Card
does not activate the operational certificate
does not grant JOKER-C2 access
```

---

## 10. Phase 05 — Privacy & Compliance

Status:

```txt
implemented
```

Route:

```txt
/onboarding/phase-5
```

Input:

```txt
Certificate 04
```

Output:

```txt
hbce-ipr-05-privacy-compliance.hbce.json
```

Function:

```txt
record privacy consent
record hash-only acknowledgement
record data accuracy confirmation
record document authenticity confirmation
record HBCE policy acceptance
record legal non-replacement acknowledgement
```

Fail-closed rule:

```txt
all mandatory acknowledgements must be accepted before Certificate 05 can be generated
```

Boundary:

```txt
does not approve IPR
does not issue IPR Card
does not grant JOKER-C2 access
```

---

## 11. Phase 06 — Review Pending

Status:

```txt
implemented
```

Route:

```txt
/onboarding/review
```

Input:

```txt
Certificate 05
```

Output:

```txt
hbce-ipr-06-review-pending.hbce.json
```

Function:

```txt
submit onboarding package for HBCE review
record pending review state
prepare admin approval phase
```

Fail-closed rule:

```txt
Certificate 06 can be generated only after explicit review submission
```

Boundary:

```txt
does not approve IPR
does not issue IPR Card
does not activate operational certificate
does not grant JOKER-C2 access
```

---

## 12. Phase 07 — HBCE Approval

Status:

```txt
implemented
```

Route:

```txt
/admin/review
```

Input:

```txt
Certificate 06
```

Output:

```txt
hbce-ipr-07-ipr-approved.hbce.json
```

Function:

```txt
admin/operator approval checkpoint
explicit HBCE approval decision
authorization for IPR Card issuance
```

Fail-closed rule:

```txt
Certificate 06 must validate as PENDING_REVIEW and unlock HBCE_APPROVAL
only APPROVE generates Certificate 07 in the current MVP
```

Boundary:

```txt
Certificate 07 authorizes IPR Card issuance
Certificate 07 does not issue the IPR Card
Certificate 07 does not issue the operational certificate
Certificate 07 does not grant JOKER-C2 access
```

Production boundary:

```txt
client-side MVP approval is not a production trust source
production approval requires authenticated backend/admin enforcement
```

---

## 13. Phase 08 — IPR Card Issuance

Status:

```txt
implemented
```

Route:

```txt
/ipr-card
```

Input:

```txt
Certificate 07
```

Output:

```txt
hbce-ipr-08-ipr-card.hbce.json
```

Function:

```txt
issue internal HBCE IPR Card certificate
generate IPR ID
generate subject ID
generate card serial
set card status ACTIVE
prepare operational certificate phase
```

Boundary:

```txt
IPR Card is an internal operational identity credential
IPR Card does not replace CIE, SPID, EUDI Wallet, passport, driving licence, national identity card or qualified eIDAS certificate
Certificate 08 does not issue the final operational certificate
Certificate 08 does not grant JOKER-C2 access
```

---

## 14. Phase 09 — Operational Certificate

Status:

```txt
implemented
```

Route:

```txt
/certificate
```

Input:

```txt
Certificate 08
```

Output:

```txt
hbce-ipr-09-operational-certificate.hbce.json
```

Function:

```txt
issue final HBCE operational certificate
set certificate kind to IPR_OPERATIONAL_CERTIFICATE
set phase to IPR_VERIFIED
set certificate status to ACTIVE
set certificate scope to JOKER_C2_ACCESS
prepare JOKER-C2 access gate evaluation
```

Boundary:

```txt
Certificate 09 enables access evaluation
Certificate 09 does not bypass the JOKER-C2 gate
Certificate 09 does not grant runtime access by itself
```

---

## 15. JOKER-C2 Access Gate

Status:

```txt
implemented
```

Route:

```txt
/access/joker-c2
```

Input:

```txt
Certificate 09
```

Decision:

```txt
ACCESS_GRANTED
ACCESS_DENIED
```

Function:

```txt
validate final operational certificate fail-closed
read operational certificate fields
check issuer
check protocol
check certificate kind
check phase
check status
check scope
check previous payload hash
check payload hash
show final IPR Verified access summary
```

Access granted only when:

```txt
proto = HBCE-IPR-RELEASE-v3
kind = IPR_OPERATIONAL_CERTIFICATE
issuer = HERMETICUM B.C.E. S.r.l.
phase.code = IPR_VERIFIED
certificate_status = ACTIVE
certificate_scope = JOKER_C2_ACCESS
previous_payload_sha256 is present
payload_sha256 is valid
```

Any malformed, incomplete, expired, revoked, suspended, wrong-phase or wrong-scope certificate must produce:

```txt
ACCESS_DENIED
```

---

## 16. Documentation Completed

The following documentation files are present or expected in the repository:

```txt
README.md
ARCHITECTURE.md
SECURITY.md
PRIVACY.md
LEGAL.md
ONBOARDING_FLOW.md
DATA_MODEL.md
ROUTES.md
MVP_SCOPE.md
ROADMAP.md
PRODUCT_SPEC.md
TECHNICAL_SPEC.md
API_SPEC.md
UI_SPEC.md
IMPLEMENTATION_PLAN.md
DEPLOYMENT.md
TESTING.md
PROJECT_STATUS.md
```

Documentation status:

```txt
complete for MVP
updated for certificate chain
ready for technical review
ready for controlled MVP deployment explanation
ready for institutional explanation with legal boundary
```

---

## 17. Technical Foundation Completed

The following technical foundation files are present:

```txt
package.json
tsconfig.json
next.config.ts
eslint.config.mjs
.gitignore
.env.example
```

Technical status:

```txt
Next.js app initialized
TypeScript strict configuration enabled
ESLint configured
security headers configured
sensitive onboarding folders ignored
environment variable template present
Vercel deployment path validated
```

---

## 18. Application Structure Completed

The application structure includes:

```txt
app/
  layout.tsx
  globals.css
  page.tsx
  not-found.tsx
  onboarding/
    phase-1/
    phase-2/
    phase-3/
    photo-video/
    phase-5/
    review/
  admin/
    review/
  ipr-card/
  certificate/
  access/
    joker-c2/
  legal/
  privacy/
  security/
components/
lib/
```

Application status:

```txt
public route map implemented
progressive onboarding route map implemented
operational identity pages implemented
boundary pages implemented
certificate chain pages implemented
JOKER-C2 access gate implemented
```

---

## 19. Core Components Completed

The following core components are implemented:

```txt
components/StatusBadge.tsx
components/BoundaryNotice.tsx
components/OnboardingStepper.tsx
components/IprCertificateUploader.tsx
components/IprPhaseForm.tsx
components/IPRCardPreview.tsx
components/CertificatePreview.tsx
components/AccessGatePanel.tsx
```

Component status:

```txt
usable across MVP pages
status display centralized
boundary notices centralized
warning and danger notices supported
certificate upload centralized
phase form generation centralized
IPR Card preview implemented
certificate preview implemented
access gate panel implemented
```

---

## 20. Library Layer Completed

The following library files are implemented:

```txt
lib/types.ts
lib/constants.ts
lib/ipr-certificate-chain.ts
lib/ipr-phase-map.ts
lib/mock-onboarding.ts
lib/access-decision.ts
lib/format.ts
```

Library status:

```txt
canonical type model defined
canonical constants centralized
phase map implemented
certificate generation implemented
certificate validation implemented
JOKER-C2 operational certificate validation implemented
fail-closed access decision implemented
safe formatting helpers available
```

---

## 21. Certificate Continuity Implemented

The MVP supports automatic certificate continuity through browser session storage.

When a certificate is generated:

```txt
the certificate is downloaded to the user
the certificate is stored temporarily in browser session storage
the app redirects to the next phase route
the next phase loads the certificate from session
the next phase validates the previous certificate fail-closed
```

Manual fallback remains available:

```txt
Use another Certificate
Upload previous HBCE-IPR certificate manually
```

Boundary:

```txt
browser session continuity is a convenience layer only
it is not a production trust source
production requires backend enforcement and server-side signing
```

---

## 22. Hash Chain Implemented

Each certificate contains:

```txt
previous_payload_sha256
payload_sha256
phase code
phase status
next required phase
issuer
subject reference
payload envelope
registry reference
```

The chain rule is:

```txt
previous_payload_sha256 + current canonical payload → payload_sha256
```

The first certificate has:

```txt
previous_payload_sha256 = null
```

All later certificates must include the previous payload hash.

If the chain is malformed, missing, wrong-phase, wrong-next-phase or hash-invalid, the system must fail closed.

---

## 23. Sensitive Data Boundary Implemented

The repository excludes and forbids:

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

The repository must not contain real onboarding evidence.

Evidence must be represented in the MVP only through metadata, protected references or hashes.

---

## 24. Legal Boundary Implemented

The app states that HBCE IPR Onboarding App does not issue:

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

This repository is intended as an R&D and MVP surface.

It is not a regulated identity issuance service, financial service, banking service or qualified trust service.

---

## 25. Privacy Boundary Implemented

The privacy posture is:

```txt
data minimization
hash references
protected storage references
public-safe operational states
private portable certificate copies
hash-only public registry logic
no raw sensitive data in public views
no real sensitive data in repository
```

Portable HBCE-IPR certificates may contain private phase data for the subject’s downloadable copy.

Public verification must expose hash-only references.

Production implementation requires protected storage and privacy-governed processing.

---

## 26. Security Boundary Implemented

The security posture is:

```txt
fail-closed by default
no frontend-only production trust
no raw sensitive material in repository
no production secrets in source code
revocation must override access
JOKER-C2 access requires valid final operational certificate
each phase validates the previous certificate
malformed certificates are denied
wrong phase certificates are denied
wrong scope certificates are denied
hash mismatch blocks continuation
```

---

## 27. EVT and OPC Preparation

EVT and OPC remain architectural layers prepared for future integration.

Current MVP status:

```txt
EVT-ready
OPC-ready
proof-ready
audit-ready demonstration
no regulated certification
no production ledger
```

Future integration may connect certificate generation, review events, approval events, card issuance, operational certificate activation and JOKER-C2 gate decisions to:

```txt
EVT event continuity
OPC proof references
append-only registry logic
revocation registry
audit reconstruction
```

---

## 28. Revocation Preparation

Revocation remains a required production feature.

Supported target categories should include:

```txt
ipr
ipr_card
certificate
joker_c2_access
onboarding_record
hbce_ipr_phase_certificate
hbce_ipr_operational_certificate
```

Supported revocation states should include:

```txt
clear
suspended
revoked
expired
under_review
```

Rule:

```txt
Any revocation_state other than clear must block JOKER-C2 access.
```

Production revocation must be enforced server-side.

---

## 29. Remaining Local Validation

Before every controlled deployment, run:

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

Expected result:

```txt
no TypeScript errors
no lint errors
build succeeds
```

If errors appear, fix the full affected file.

No partial patches.

No puzzle pieces.

---

## 30. Remaining Deployment Steps

Deployment preparation:

```txt
connect GitHub repo to Vercel
set Node.js version compatible with package.json
set required environment variables
run production build
verify all public routes
verify all certificate chain routes
verify session continuity
verify manual certificate upload fallback
verify JOKER-C2 gate behavior
verify legal/privacy/security boundary pages
```

The first deployment must remain MVP-only.

---

## 31. MVP Acceptance Criteria

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

## 32. Production Requirements

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
monitoring and incident response
legal review
privacy review
security review
```

Client-side certificate generation and browser session continuity are not sufficient as production trust sources.

Production trust requires backend enforcement.

---

## 33. Future Work

Future phases may include:

```txt
secure authentication
database persistence
protected document storage
operator review console
real document verification provider study
liveness verification provider study
server-side certificate signing
server-side session management
EVT registry integration
OPC proof integration
revocation registry integration
JOKER-C2 runtime bridge
EUDI Wallet compatibility study
eIDAS trust service integration study
controlled institutional pilot
B2B pilot
B2G pilot
```

Each future phase requires legal, privacy, security and technical review.

---

## 34. Current Strategic Position

The project now demonstrates the core HBCE distinction:

```txt
Classic AI:
email + password + subscription + direct model access

HBCE:
identity onboarding + verification + IPR Card + certificate + access gate + governed JOKER-C2 runtime
```

This repository is the operational onboarding layer of that distinction.

---

## 35. Project Status Formula

```txt
Documentation updated.
MVP certificate chain completed.
UI pages completed.
Certificate generation completed.
Certificate validation completed.
Session continuity completed.
Manual fallback completed.
HBCE approval checkpoint completed.
IPR Card issuance completed.
Operational certificate activation completed.
JOKER-C2 gate completed.
Boundary pages completed.
Ready for controlled MVP deployment and validation.
```

---

## 36. Organization

```txt
HERMETICUM B.C.E. S.r.l.
```

---

## 37. Canonical Trademark

```txt
HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA
HERMETICUM B.C.E. S.r.l.
```
