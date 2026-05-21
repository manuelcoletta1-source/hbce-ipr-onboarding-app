# HBCE IPR Onboarding App

Operational IPR Onboarding Gateway for progressive HBCE-IPR certificate release, IPR Card issuance, operational certificate activation and governed JOKER-C2 access.

**HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA**  
**HERMETICUM B.C.E. S.r.l.**

---

## Purpose

HBCE IPR Onboarding App is the operational identity onboarding application of **HERMETICUM B.C.E. S.r.l.**

The application registers, verifies and activates a subject before access to governed AI runtime services.

Core principle:

```txt
First, verify who you are.
Then access operational artificial intelligence.

This repository defines the onboarding gateway for progressive HBCE-IPR certificate release, IPR Verified status, IPR Card issuance, operational certificate activation and controlled access to JOKER-C2.

HBCE IPR Onboarding App is not a simple login form.

It is an operational identity gateway.


---

Strategic Positioning

Classic AI access normally follows a minimal pattern:

1. email registration;


2. password or OAuth login;


3. subscription or payment;


4. direct model access.



HBCE follows a different operational model:

1. subject creation;


2. fiscal identity evidence;


3. official identity document evidence;


4. selfie and video verification;


5. privacy and compliance acceptance;


6. HBCE review submission;


7. HBCE approval;


8. IPR Card issuance;


9. operational certificate activation;


10. governed access to JOKER-C2.



This makes the system closer to a digital onboarding workflow than to a generic AI login page.

The market distinction is structural:

Classic AI
→ email
→ password
→ subscription
→ model access

HBCE / JOKER-C2
→ subject onboarding
→ fiscal identity evidence
→ official document evidence
→ liveness check
→ HBCE review
→ IPR Card
→ operational certificate
→ governed AI access


---

Core Product Rule

No verified IPR, no governed JOKER-C2 access.

Public formula:

Access JOKER-C2 only through verified IPR.
An email is not enough.
A subscription is not enough.
An operational identity is required: documented, traceable and verifiable.


---

Canonical Operating Flow

The app now follows a validated progressive flow:

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

The standard MVP flow is:

01 → 02 → 03 → 04 → 05 → 06
automatic continuity with fail-closed validation

07
HBCE approval checkpoint / operator decision

08 → 09 → JOKER-C2 gate
automatic continuity with fail-closed validation

The system does not need to force the user to manually upload the previous certificate at every step when the certificate is already available in the same browser session.

However, the system must verify the previous certificate at every step.

Correct rule:

The system does not ask for the file every time.
The system verifies the file every time.

Manual upload remains available through the “Use another certificate” action.


---

Canonical Certificate Chain

The application releases progressive downloadable HBCE-IPR certificates.

Each phase produces a .hbce.json file.

Each new certificate contains the hash of the previous certificate.

Each new certificate becomes the required input for the next phase.

The final certificate is the only file accepted by the JOKER-C2 access gate.

Phase 1 — Customer Intake / Subject Created

Route:
  /onboarding/phase-1

Output:
  hbce-ipr-01-subject-created.hbce.json

Phase:
  SUBJECT_CREATED

Status:
  PENDING

Next phase unlocked:
  FISCAL_IDENTITY

This phase records the customer profile, customer data, exact creation timestamp and hash references.

It does not verify identity.

It does not issue an IPR Card.

It does not grant JOKER-C2 access.

Phase 2 — Fiscal Identity

Route:
  /onboarding/phase-2

Input:
  Certificate 01

Evidence:
  codice fiscale
  tessera sanitaria
  tax ID
  national tax identifier
  equivalent fiscal document

Output:
  hbce-ipr-02-fiscal-identity.hbce.json

Phase:
  FISCAL_IDENTITY_COLLECTED

Next phase unlocked:
  OFFICIAL_ID_DOCUMENT

The certificate contains fiscal values inside private fields and hash references for audit.

Uploaded fiscal evidence is represented by SHA-256 file hashes.

Raw fiscal documents are not embedded in the certificate.

Phase 3 — Official ID Document

Route:
  /onboarding/phase-3

Input:
  Certificate 02

Evidence:
  CIE
  driving licence
  passport
  EU identity card
  other authorized official document

Output:
  hbce-ipr-03-official-document.hbce.json

Phase:
  OFFICIAL_DOCUMENT_SUBMITTED

Next phase unlocked:
  LIVENESS_CHECK

The certificate contains document metadata and hash references.

Uploaded official document files are represented by SHA-256 hashes.

Raw document images are not embedded in the certificate.

Phase 4 — Liveness Check

Route:
  /onboarding/phase-4

Input:
  Certificate 03

Evidence:
  front selfie
  video verification
  liveness declaration

Output:
  hbce-ipr-04-liveness-submitted.hbce.json

Phase:
  LIVENESS_SUBMITTED

Next phase unlocked:
  PRIVACY_COMPLIANCE

Canonical declaration:

Confermo di essere il soggetto che richiede il certificato operativo HBCE IPR.

The certificate contains the liveness declaration and hash references.

Raw photo and video material are not embedded in the certificate.

Phase 5 — Privacy & Compliance

Route:
  /onboarding/phase-5

Input:
  Certificate 04

Output:
  hbce-ipr-05-privacy-compliance.hbce.json

Phase:
  COMPLIANCE_ACCEPTED

Next phase unlocked:
  REVIEW_SUBMISSION

This phase records privacy consent, hash-only acknowledgement, data accuracy confirmation, document authenticity confirmation, HBCE policy acceptance and the legal boundary that IPR does not replace official state identity systems.

Phase 6 — Review Pending

Route:
  /onboarding/review

Input:
  Certificate 05

Output:
  hbce-ipr-06-review-pending.hbce.json

Phase:
  PENDING_REVIEW

Next phase unlocked:
  HBCE_APPROVAL

This phase submits the onboarding package for HBCE review.

It does not approve the IPR.

It does not issue the IPR Card.

It does not grant JOKER-C2 access.

Phase 7 — HBCE Approval

Route:
  /admin/review

Input:
  Certificate 06

Output:
  hbce-ipr-07-ipr-approved.hbce.json

Phase:
  IPR_APPROVED

Status:
  APPROVED

Next phase unlocked:
  IPR_CARD_ISSUANCE

This is the admin/operator checkpoint.

The certificate 06 may be loaded automatically from session in the MVP flow, but the approval decision must remain explicit.

Correct rule:

Certificate 06 may be recovered automatically.
Approval 07 must be performed by an operator/admin action.

The certificate 07 authorizes IPR Card issuance.

It does not itself issue the IPR Card.

It does not issue the final operational certificate.

It does not grant JOKER-C2 access.

Phase 8 — IPR Card Issued

Route:
  /ipr-card

Input:
  Certificate 07

Output:
  hbce-ipr-08-ipr-card.hbce.json

Phase:
  IPR_CARD_ISSUED

Next phase unlocked:
  OPERATIONAL_CERTIFICATE

The IPR Card is the internal operational identity credential of the HBCE ecosystem.

It contains:

ipr_id
subject_id
card_serial
card_status
issuer
issued_at
valid_until
previous_payload_sha256
payload_sha256

The IPR Card does not replace CIE, SPID, EUDI Wallet, passport, driving licence, national identity card, qualified eIDAS certificate or official state identity.

Phase 9 — Operational Certificate

Route:
  /certificate

Input:
  Certificate 08

Output:
  hbce-ipr-09-operational-certificate.hbce.json

Phase:
  IPR_VERIFIED

Kind:
  IPR_OPERATIONAL_CERTIFICATE

Status:
  ACTIVE

Scope:
  JOKER_C2_ACCESS

Next phase unlocked:
  JOKER_C2_ACCESS

The operational certificate is the final HBCE certificate that links the verified subject to governed runtime access evaluation.

It contains:

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

JOKER-C2 Access Gate

Route:
  /access/joker-c2

Input:
  Certificate 09

Decision:
  ACCESS_GRANTED
  or
  ACCESS_DENIED

The gate validates the final certificate fail-closed.

When valid, the final screen shows:

IPR Verified
IPR Card Active
Operational Certificate Active
JOKER-C2 Access Granted


---

Hash Chain Rule

Every certificate follows this rule:

previous_payload_sha256 + current canonical payload
→ payload_sha256

The first certificate has:

previous_payload_sha256: null

Every later certificate must contain:

previous_payload_sha256: hash of the previous certificate payload
payload_sha256: hash of the current certificate payload

If the previous certificate is missing, malformed, from the wrong phase, has the wrong next phase, or has a mismatched canonical payload hash, the app must fail closed.


---

Automatic Continuity and Manual Fallback

The MVP supports automatic continuity through browser session storage.

When a certificate is generated:

1. the file is downloaded to the user;


2. the certificate is stored temporarily in browser session storage for the next phase;


3. the app redirects to the next route;


4. the next route reloads the certificate from session;


5. the next route validates it fail-closed before enabling the phase.



Manual upload remains available.

This means the app has two modes:

Standard mode:
  automatic continuity + fail-closed validation

Manual fallback:
  upload previous certificate manually

The session copy is a convenience layer.

It is not the final trust source for production.


---

Single IPR Upload Point

HBCE-IPR certificates are uploaded through the same logical component:

Upload Previous HBCE IPR Certificate

This is different from evidence upload.

Clear separation:

Previous HBCE-IPR certificate
→ uploaded through the IPR certificate upload component

CIE / driving licence / passport / codice fiscale / tessera sanitaria / selfie / video
→ uploaded only inside the specific phase evidence area

The app must never confuse certificate continuation files with personal evidence files.


---

Official Evidence Required

Fiscal Identity Evidence

Phase 2 requires fiscal identity data and fiscal evidence.

Supported evidence includes:

Italian codice fiscale
Italian tessera sanitaria
EU tax ID document
National tax identifier
National fiscal document
Other authorized fiscal document

The portable certificate may contain private fiscal values and hash references.

It must not contain raw fiscal document files.

Official Identity Document Evidence

Phase 3 requires official identity document evidence.

Supported evidence includes:

Carta d’Identità Elettronica — CIE
Driving licence / patente di guida
Passport / passaporto
EU national identity card
Other authorized official identity document

For CIE or identity card:

front side
back side

For driving licence:

front side
back side

For passport:

passport data page

The portable certificate may contain private document metadata and hash references.

It must not contain raw document images.

Liveness Evidence

Phase 4 requires:

front selfie
video verification
liveness declaration

The portable certificate may contain the liveness declaration and hash references.

It must not contain raw photo or video material.


---

Canonical Certificate Schema

Every portable .hbce.json certificate follows this structural model:

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

For the final certificate:

kind = IPR_OPERATIONAL_CERTIFICATE
phase.code = IPR_VERIFIED
certificate_status = ACTIVE
certificate_scope = JOKER_C2_ACCESS


---

Routes

Route	Function

/	Operational landing page and certificate continuation gateway
/onboarding	Central continuation page for existing HBCE-IPR certificates
/onboarding/phase-1	Customer intake / Subject Created — release certificate 01
/onboarding/phase-2	Fiscal Identity — validate certificate 01 and release certificate 02
/onboarding/phase-3	Official ID Document — validate certificate 02 and release certificate 03
/onboarding/phase-4	Liveness Check — validate certificate 03 and release certificate 04
/onboarding/phase-5	Privacy & Compliance — validate certificate 04 and release certificate 05
/onboarding/review	Review Pending — validate certificate 05 and release certificate 06
/admin/review	HBCE Approval — validate certificate 06 and release certificate 07
/ipr-card	IPR Card issuance — validate certificate 07 and release certificate 08
/certificate	Operational Certificate issuance — validate certificate 08 and release certificate 09
/access/joker-c2	JOKER-C2 access gate — validate certificate 09
/legal	Legal and operational boundary
/privacy	Privacy and data minimization boundary
/security	Security and fail-closed boundary



---

Core Components

IPR Onboarding Gateway

The onboarding gateway collects and organizes the minimum information required to generate the progressive HBCE-IPR certificate chain.

It is the operational identity threshold of the HBCE ecosystem.

HBCE-IPR Certificate

An HBCE-IPR certificate is a portable .hbce.json file that represents a specific phase of the onboarding chain.

It contains:

protocol
kind
issuer
phase
subject reference
previous payload hash
current payload hash
payload data
registry reference
next phase
timestamp

It does not contain raw identity documents, raw photos or raw videos.

IPR Verified

IPR Verified is the final operational status assigned when the certificate chain reaches the operational certificate phase.

It does not mean official state identity issuance.

It means that the HBCE internal operational identity chain has reached the verified operational state.

IPR Card

The IPR Card is the internal operational identity credential issued inside the HBCE ecosystem.

It connects the verified subject to:

IPR identifier
subject identifier
card serial
card status
issuer
issue date
validity date
previous payload hash
payload hash

The IPR Card does not replace official identity documents.

Operational Certificate

The operational certificate is the final HBCE certificate that links the verified subject to governed runtime access.

It contains:

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

The required scope for JOKER-C2 is:

JOKER_C2_ACCESS

JOKER-C2 Access Gate

JOKER-C2 is not an AI service accessible through a simple email account.

JOKER-C2 is a governed AI operational runtime accessible through a valid HBCE operational certificate.

The gate checks:

proto = HBCE-IPR-RELEASE-v3
kind = IPR_OPERATIONAL_CERTIFICATE
phase.code = IPR_VERIFIED
certificate_status = ACTIVE
certificate_scope = JOKER_C2_ACCESS
issuer.legal_name = HERMETICUM B.C.E. S.r.l.
previous_payload_sha256 present
payload_sha256 valid

If valid:

ACCESS_GRANTED

If invalid:

ACCESS_DENIED


---

Legal and Operational Boundary

HBCE IPR Onboarding App does not issue:

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

HBCE issues an internal operational identity certificate chain that may be connected to official European identity systems in future integrations, subject to applicable law, recognized trust service providers and institutional partnerships.

Correct claim:

HBCE issues a verifiable operational identity that can be linked to official European identity systems.

Incorrect claim:

HBCE issues an official European identity.

This repository is intended as an R&D and MVP surface, not as a regulated identity issuance service, financial service, banking service or qualified trust service.


---

Architecture Role

This repository is part of the HBCE operational architecture:

Layer	Role

HBCE Platform	Public and institutional gateway
HBCE IPR Onboarding App	Operational identity onboarding and certificate chain application
HBCE-IPR Certificate Chain	Progressive .hbce.json release sequence
IPR Card	Internal operational identity credential
Operational Certificate	Internal certificate for governed JOKER-C2 access evaluation
JOKER-C2	Governed AI operational runtime
EVT	Event continuity layer
OPC	Operational proof and compliance layer
MATRIX	Coordination framework
HBCE	Governance ecosystem



---

MVP Scope

The current MVP includes:

operational landing page
central certificate continuation page
certificate uploader
automatic session continuity
manual certificate fallback
phase form generator
subject created certificate
fiscal identity certificate
official document certificate
liveness certificate
privacy and compliance certificate
review pending certificate
HBCE approval certificate
IPR Card certificate
operational certificate
JOKER-C2 certificate gate
final IPR Verified access summary
legal boundary page
privacy boundary page
security posture page

The MVP demonstrates the chain logic without exposing real identity documents, real user photos, real videos or production identity records inside the repository.


---

Security Posture

The application must be designed with a fail-closed approach.

If identity status is incomplete, unclear, expired, revoked, suspended, malformed or unverifiable, access to JOKER-C2 must remain blocked.

Security principles:

no sensitive document should be publicly exposed
no raw identity document should be committed to this repository
no production secret should be stored in source code
no access to JOKER-C2 should be granted without valid final operational certificate
document files, images and videos must remain in protected storage in production
portable certificates should expose minimized metadata and hash-only references where public
revocation state must override access state
incomplete verification must produce blocked access by default
each phase must validate the previous certificate fail-closed


---

Privacy Posture

The application follows a data minimization principle.

Only data necessary for operational identity verification should be collected.

Private identity data, documents, images and videos must remain protected inside controlled storage and processing environments.

Portable HBCE-IPR certificates may contain private phase data for the subject’s downloadable copy.

Public registry references must remain hash-only.

Portable HBCE-IPR certificates should use:

hash references
minimized metadata
phase status
issuer data
previous payload hash
current payload hash
next phase reference
clear privacy boundaries

They must not contain:

raw personal document files
raw fiscal document files
raw official document image files
raw photos
raw videos
biometric material
production identity records
private keys
production secrets


---

Repository Scope

This repository should contain:

frontend onboarding interface
certificate generation logic for MVP
certificate upload and validation logic
public legal and security boundary pages
controlled MVP logic for fail-closed access simulation
hash-only certificate chain model
JOKER-C2 certificate gate
final IPR Verified access summary

This repository should not contain:

real identity documents
real user photos or videos
production secrets
unencrypted private records
regulated identity credentials
banking or financial account logic
private keys
API credentials


---

Production Boundary

The current implementation can generate local client-side certificates for MVP demonstration.

A production implementation requires:

backend API
database
protected evidence storage
server-side certificate signing
admin authentication
operator permissions
audit logging
EVT event continuity
OPC proof references
revocation registry
secure KYC / eID / eIDAS integration where applicable

Client-side certificate generation and browser session continuity are not sufficient as production trust sources.

Production trust requires backend enforcement.


---

Development Status

Current status: working MVP certificate chain.

Primary objective: build the HBCE IPR Onboarding App as the operational onboarding layer for progressive identity verification, HBCE-IPR certificate release and governed AI access.

Validated MVP result:

01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → JOKER-C2 gate

Final expected outcome:

IPR Verified
IPR Card Active
Operational Certificate Active
JOKER-C2 Access Granted


---

Development Commands

npm run dev
npm run build
npm run lint
npm run typecheck
npm run check


---

Organization

HERMETICUM B.C.E. S.r.l.


---

Canonical Trademark

HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA
HERMETICUM B.C.E. S.r.l.




