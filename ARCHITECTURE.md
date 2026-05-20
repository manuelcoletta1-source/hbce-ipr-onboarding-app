# HBCE IPR Onboarding App — Architecture

Bank-grade operational identity onboarding architecture for IPR Verified status, IPR Card issuance, operational certificate activation and governed JOKER-C2 access.

**HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA**  
**HERMETICUM B.C.E. S.r.l.**

---

## 1. Architectural Purpose

HBCE IPR Onboarding App is the operational identity onboarding layer of the HBCE ecosystem.

Its purpose is to verify a subject before access to governed AI runtime services.

The application does not replace official state identity systems. It creates an internal operational identity record that can be connected to official identity systems, trust services or institutional integrations in future compliant implementations.

The core architectural rule is:

```txt
No verified IPR, no governed JOKER-C2 access.
```

---

## 2. System Position

The application sits between the public HBCE Platform and the JOKER-C2 governed AI runtime.

```txt
HBCE Platform
     ↓
HBCE IPR Onboarding App
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

IPR Card is the operational access key.

JOKER-C2 is the governed artificial intelligence runtime.

---

## 3. Core Architectural Principle

Classic AI platforms usually identify users through email, password, OAuth or payment.

HBCE requires operational identity verification before access.

The access model is:

```txt
Registration
→ Identity data
→ Official document metadata
→ Fiscal or national identifier linkage
→ Photo/video verification
→ Review
→ IPR Verified
→ IPR Card
→ Operational Certificate
→ JOKER-C2 Access Gate
→ Governed JOKER-C2 Runtime
```

This creates a bank-grade onboarding posture for governed AI access without turning HBCE into a banking service, public identity provider or qualified trust service.

---

## 4. Main Modules

### 4.1 Landing Module

The landing module explains the function of the application and redirects the user to the onboarding flow.

Primary route:

```txt
/
```

Main function:

```txt
Explain the IPR onboarding purpose and start the verification process.
```

### 4.2 Registration Module

The registration module collects the first user-level access data.

Primary routes:

```txt
/onboarding
/onboarding/start
```

Minimum fields:

```txt
email
first_name
last_name
country
accept_terms
accept_privacy
```

The registration module does not grant access to JOKER-C2.

It only opens the onboarding process.

### 4.3 Identity Module

The identity module collects personal identity data required for the operational identity record.

Primary route:

```txt
/onboarding/identity
```

Minimum fields:

```txt
first_name
last_name
date_of_birth
place_of_birth
country
nationality
residential_country
residential_city
```

Sensitive information must be handled under strict data minimization.

### 4.4 Document Module

The document module handles official identity document metadata and protected references.

Primary route:

```txt
/onboarding/documents
```

Supported document classes may include:

```txt
identity_card
passport
driving_license
residence_document
other_official_document
```

The app should store only protected references, hashes, metadata and verification states in the operational record.

Raw documents must not be committed to the repository.

Raw documents must not be exposed in any public route.

### 4.5 Fiscal Identifier Module

The fiscal identifier module links the subject to a fiscal code, national tax identifier or national identification number.

Primary route:

```txt
/onboarding/fiscal
```

Supported fields:

```txt
fiscal_identifier_type
fiscal_identifier_country
fiscal_identifier_hash
fiscal_identifier_masked
```

The raw fiscal identifier should be minimized, protected and never exposed publicly.

### 4.6 Photo and Video Verification Module

The photo and video verification module supports liveness-style onboarding and subject-document coherence checks.

Primary route:

```txt
/onboarding/photo-video
```

Initial MVP status:

```txt
placeholder
manual_review
integration_ready
```

Future integrations may include identity verification providers, liveness verification providers, qualified trust service providers or official European digital identity frameworks where legally available.

The MVP must not process or expose real photos, real videos, biometric templates, face templates or liveness recordings.

### 4.7 Review Module

The review module determines whether the onboarding case is pending, approved, rejected, expired or requires additional documentation.

Primary route:

```txt
/onboarding/review
```

Review states:

```txt
not_started
in_progress
pending_review
approved
rejected
needs_more_information
expired
revoked
suspended
```

Fail-closed rule:

```txt
Only approved identity cases may proceed to IPR Verified.
```

### 4.8 IPR Verified Module

The IPR Verified module assigns internal operational identity status to the subject.

Primary state:

```txt
ipr_status
```

Allowed values:

```txt
not_created
pending
verified
rejected
expired
revoked
suspended
```

Only the following state can enable downstream access:

```txt
verified
```

### 4.9 IPR Card Module

The IPR Card module displays the operational identity card issued by HBCE.

Primary route:

```txt
/ipr-card
```

The IPR Card should include:

```txt
ipr_card_id
ipr_id
subject_reference
issuer
issued_at
expires_at
access_scope
certificate_reference
revocation_state
card_hash_reference
```

The card must not expose raw identity documents, raw fiscal identifiers, photos, videos or biometric material.

### 4.10 Operational Certificate Module

The operational certificate module links the verified subject to an internal HBCE operational certificate.

Primary route:

```txt
/certificate
```

The certificate should include:

```txt
certificate_id
ipr_id
subject_id
issuer
issued_at
expires_at
scope
certificate_status
hash_reference
revocation_state
```

The operational certificate is not a qualified eIDAS certificate unless issued through a recognized and compliant trust service integration.

### 4.11 JOKER-C2 Access Gate

The access gate determines whether the subject can access JOKER-C2.

Primary route:

```txt
/access/joker-c2
```

Access must be denied unless:

```txt
ipr_status = verified
ipr_card_status = issued
certificate_status = active
revocation_state = clear
```

Default behavior:

```txt
deny
```

This is the fail-closed access posture.

---

## 5. Suggested Route Map

| Route | Function |
| --- | --- |
| `/` | Landing page |
| `/onboarding` | Onboarding entry point |
| `/onboarding/start` | Initial registration |
| `/onboarding/identity` | Identity data |
| `/onboarding/documents` | Document metadata |
| `/onboarding/fiscal` | Fiscal or national identifier linkage |
| `/onboarding/photo-video` | Photo and video verification |
| `/onboarding/review` | Review and compliance status |
| `/ipr-card` | IPR Card preview and issuance state |
| `/certificate` | Operational certificate state |
| `/access/joker-c2` | Governed access gate |
| `/legal` | Legal and operational boundary |
| `/privacy` | Privacy and data minimization boundary |
| `/security` | Security and fail-closed boundary |

---

## 6. Minimal Operational Data Model

A minimal onboarding record should include:

```txt
subject_id
onboarding_id
ipr_id
email_hash
first_name
last_name
date_of_birth
country
nationality
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
photo_verification_status
video_verification_status
liveness_status
review_status
ipr_status
ipr_card_status
certificate_id
certificate_status
joker_c2_access_status
revocation_state
created_at
updated_at
```

Sensitive raw documents should not be stored publicly and should never be committed to this repository.

---

## 7. Sensitive Data Boundary

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

Public layers should expose only minimized operational data, masked values and hash references.

---

## 8. Security Model

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
server_side_authorization
```

Access to JOKER-C2 must never be based only on email registration, payment state, frontend state, query parameters, browser storage or unsigned client-side flags.

---

## 9. Verification Logic

The minimum access decision logic is:

```txt
if revocation_state is not clear:
    deny access

if ipr_status is not verified:
    deny access

if ipr_card_status is not issued:
    deny access

if certificate_status is not active:
    deny access

otherwise:
    allow governed JOKER-C2 access
```

Revocation must override any previous approval.

Pending, expired, suspended, rejected or incomplete states must not authorize JOKER-C2.

---

## 10. EVT and OPC Integration

Each relevant onboarding step should generate an event reference.

Suggested events:

```txt
ONBOARDING_STARTED
EMAIL_REGISTERED
EMAIL_VERIFIED
IDENTITY_DATA_SUBMITTED
DOCUMENT_SUBMITTED
FISCAL_IDENTIFIER_SUBMITTED
PHOTO_VIDEO_SUBMITTED
REVIEW_STARTED
REVIEW_APPROVED
REVIEW_REJECTED
REVIEW_NEEDS_MORE_INFORMATION
IPR_VERIFIED
IPR_CARD_ISSUED
CERTIFICATE_CREATED
JOKER_C2_ACCESS_ENABLED
JOKER_C2_ACCESS_DENIED
IPR_SUSPENDED
IPR_REVOKED
```

EVT should provide continuity.

OPC should provide operational proof and compliance reference.

The onboarding app should eventually connect to the broader HBCE audit layer.

---

## 11. Legal Boundary

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

## 12. MVP Implementation Priorities

The first implementation should build:

```txt
public landing page
onboarding start page
identity form
document metadata form
fiscal identifier form
photo/video placeholder page
review status page
IPR Card preview
certificate preview
JOKER-C2 access gate
legal boundary page
privacy boundary page
security boundary page
mock data layer
fail-closed access logic
error boundary
loading boundary
sitemap
robots policy
manifest
```

The first version may use simulated verification states, but the architecture must already be compatible with real identity verification integrations.

---

## 13. Future Integration Layer

Future integrations may include:

```txt
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
```

All future integrations must preserve the legal boundary: HBCE may issue an internal operational identity layer, not an official public identity credential, unless a formally recognized and compliant integration changes that scope.

---

## 14. Public Metadata and Discovery

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

## 15. Canonical Product Formula

```txt
HERMETICUM B.C.E. Platform is the access threshold.
IPR Card is the operational key.
JOKER-C2 is the governed artificial intelligence runtime.
```

---

## 16. Canonical Website Formula

```txt
Access JOKER-C2 only through verified IPR.
An email is not enough.
A subscription is not enough.
An operational identity is required: documented, traceable and verifiable.
```

---

## 17. Organization

```txt
HERMETICUM B.C.E. S.r.l.
```

---

## 18. Canonical Trademark

```txt
HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA
HERMETICUM B.C.E. S.r.l.
```

