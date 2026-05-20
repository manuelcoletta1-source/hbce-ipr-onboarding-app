# HBCE IPR Onboarding App — Roadmap

## 1. Purpose

This roadmap defines the development path for HBCE IPR Onboarding App.

The application is designed to become the operational identity onboarding gateway for:

- IPR Verified status;
- IPR Card issuance;
- operational certificate activation;
- governed JOKER-C2 access;
- future EVT and OPC integration.

The core rule remains:

```txt
No verified IPR, no governed JOKER-C2 access.

2. Strategic Development Principle

HBCE IPR Onboarding App must not evolve as a generic registration page.

It must evolve as a bank-grade operational identity onboarding system for governed AI access.

The development path must preserve four principles:

identity_before_access
verification_before_runtime
fail_closed_by_default
audit_ready_by_design

3. Phase 0 — Repository Foundation

Status:

active

Purpose:

Create the canonical documentation base of the repository.

Required files:

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

Success criteria:

The repository clearly explains what the app is.
The repository clearly explains what the app is not.
The repository defines onboarding flow, data model, routes and MVP scope.
The repository contains no sensitive personal data.
The repository contains no production secret.

4. Phase 1 — Static MVP Interface

Purpose:

Build the first static web interface for the onboarding app.

Required pages:

/
 /onboarding
 /onboarding/start
 /onboarding/identity
 /onboarding/documents
 /onboarding/fiscal
 /onboarding/photo-video
 /onboarding/review
 /ipr-card
 /certificate
 /access/joker-c2
 /legal
 /privacy
 /security

Primary objective:

Show the full onboarding sequence without production data processing.

Required behavior:

display onboarding steps
display mock status values
display IPR Card preview
display operational certificate preview
display JOKER-C2 access gate
display denied state by default

Success criteria:

A user can understand the entire IPR onboarding process.
A user can understand that JOKER-C2 is not accessed by email only.
A user can see the difference between classic AI login and HBCE governed AI access.

5. Phase 2 — Mock State Engine

Purpose:

Introduce a mock state engine for onboarding status, IPR status, card status, certificate status and access decision.

Required state groups:

onboarding_status
email_status
identity_data_status
document_status
fiscal_identifier_status
photo_verification_status
video_verification_status
review_status
ipr_status
ipr_card_status
certificate_status
revocation_state
joker_c2_access_status

Required access logic:

if ipr_status != "verified":
    deny_access

if ipr_card_status != "issued":
    deny_access

if certificate_status != "active":
    deny_access

if revocation_state != "clear":
    deny_access

allow_governed_access

Success criteria:

The app denies access by default.
The app allows access only when all required mock states are valid.
The app displays the reason for denial.
The app displays the reason for approval.

6. Phase 3 — Form-Based MVP

Purpose:

Convert static pages into form-based onboarding steps.

Required forms:

account registration form
identity data form
document metadata form
fiscal identifier metadata form
photo/video placeholder form
review simulation form

Required output:

mock onboarding record
mock identity profile
mock document record
mock fiscal identifier record
mock photo/video verification state
mock review decision
mock IPR record
mock IPR Card
mock operational certificate
mock access gate decision

Data rule:

Only synthetic or user-provided test data may be used during MVP development.
No real document file must be stored.
No real biometric data must be processed.

Success criteria:

The user can complete the simulated onboarding flow.
The app can generate a complete mock operational identity state.
The app can show the final access decision.

7. Phase 4 — IPR Card Preview

Purpose:

Create a strong visual and operational IPR Card preview.

Required displayed fields:

ipr_card_id
ipr_id
card_status
issuer
issued_at
expires_at
access_scope
revocation_state

Required hidden or protected fields:

raw identity data
raw document data
raw fiscal identifier
raw photo
raw video
biometric material
private review notes

Success criteria:

The IPR Card is understandable as an operational identity credential.
The card does not look like a state identity document.
The card clearly belongs to the HBCE ecosystem.
The card does not expose sensitive raw identity material.

8. Phase 5 — Operational Certificate Preview

Purpose:

Create the internal operational certificate preview linked to verified IPR status.

Required displayed fields:

certificate_id
ipr_id
issuer
issued_at
expires_at
scope
certificate_status
hash_reference
revocation_state

Legal boundary:

The certificate must be described as internal to HBCE.
It must not be presented as a qualified eIDAS certificate.

Success criteria:

The certificate explains the operational authorization scope.
The certificate links IPR to governed access.
The certificate preserves the legal boundary.

9. Phase 6 — JOKER-C2 Access Gate

Purpose:

Create the access gate that allows or denies governed access to JOKER-C2.

Required displayed values:

access_status
decision
decision_reason
required_conditions
current_conditions
joker_c2_gateway_reference

Default condition:

deny_access

Allowed condition:

allow_governed_access

Success criteria:

The access gate blocks incomplete onboarding.
The access gate blocks revoked or suspended identities.
The access gate allows access only with verified IPR, issued IPR Card, active certificate and clear revocation state.

10. Phase 7 — EVT Mock Integration

Purpose:

Prepare event continuity for future HBCE EVT integration.

Suggested events:

ONBOARDING_STARTED
EMAIL_REGISTERED
EMAIL_VERIFIED
IDENTITY_DATA_SUBMITTED
DOCUMENT_SUBMITTED
FISCAL_IDENTIFIER_SUBMITTED
PHOTO_VIDEO_SUBMITTED
REVIEW_APPROVED
REVIEW_REJECTED
IPR_VERIFIED
IPR_CARD_ISSUED
CERTIFICATE_CREATED
JOKER_C2_ACCESS_ENABLED
JOKER_C2_ACCESS_DENIED
IPR_SUSPENDED
IPR_REVOKED

Minimum event fields:

event_id
event_type
subject_id
ipr_id
onboarding_id
previous_event_reference
event_hash
event_timestamp
decision_state

Success criteria:

Each major onboarding step can generate a mock event reference.
The app is ready for future EVT continuity integration.

11. Phase 8 — OPC Mock Integration

Purpose:

Prepare operational proof references for future HBCE OPC integration.

Suggested proof references:

proof_id
linked_event_id
ipr_id
operation_scope
input_hash
output_hash
decision_hash
policy_snapshot_hash
created_at
issuer

Success criteria:

The app can show how onboarding decisions become proof-ready.
The app can connect review, IPR issuance, card issuance, certificate activation and access decision to mock OPC proof references.

12. Phase 9 — Operator Review Console

Purpose:

Create a protected operator console for onboarding case review.

Suggested routes:

/operator/review
/operator/review/[onboarding_id]
/operator/revocations

Allowed decisions:

approve
reject
request_more_information
expire
suspend
revoke

Security rule:

The operator console must never be public.

Success criteria:

An operator can inspect a mock onboarding case.
An operator can assign a review decision.
The decision updates downstream IPR, card, certificate and access states.

13. Phase 10 — Secure Storage Preparation

Purpose:

Prepare the architecture for protected storage without committing real sensitive data.

Required preparation:

storage abstraction
document reference model
hash reference model
private file boundary
environment variable placeholders
no production secret in source code

Success criteria:

The app can later connect to secure storage.
The repository still contains no real identity material.
The code separates raw files from operational references.

14. Phase 11 — Authentication Layer

Purpose:

Introduce secure authentication for user onboarding sessions and operator access.

Required distinction:

user session
operator session
admin session
service integration credential

Security rule:

Authentication alone must not grant JOKER-C2 access.

Success criteria:

Users can access only their own onboarding status.
Operators can access only authorized review functions.
JOKER-C2 access still depends on verified IPR state.

15. Phase 12 — JOKER-C2 Runtime Bridge

Purpose:

Connect the onboarding app to the JOKER-C2 governed runtime access layer.

Required bridge data:

ipr_id
ipr_status
ipr_card_status
certificate_status
revocation_state
access_scope
decision
decision_timestamp

Security rule:

JOKER-C2 must not trust a simple frontend redirect.

Success criteria:

The bridge passes only minimized authorization state.
The runtime receives verified operational access context.
The access decision remains fail-closed.

16. Phase 13 — Real Verification Provider Study

Purpose:

Evaluate future integration with identity verification providers.

Possible provider categories:

document verification provider
liveness verification provider
KYC provider
KYB provider
qualified trust service provider
enterprise identity provider
institutional identity registry

Boundary:

Provider integration requires legal, privacy, security and contractual review.

Success criteria:

The project identifies compliant integration options.
The architecture remains provider-agnostic.
The app does not falsely claim official identity issuance.

17. Phase 14 — European Identity Compatibility Study

Purpose:

Evaluate compatibility with European digital identity frameworks.

Study areas:

eIDAS
EUDI Wallet
qualified trust services
national digital identity systems
cross-border identity verification
data protection obligations
institutional integration requirements

Boundary:

The app does not issue official European identity by itself.

Success criteria:

The project can explain how HBCE operational identity may connect to official systems in future lawful integrations.

18. Phase 15 — Institutional Pilot Preparation

Purpose:

Prepare the app for a controlled pilot with institutional, B2B or B2G stakeholders.

Required material:

technical brief
security brief
privacy brief
legal boundary brief
MVP demo
IPR Card demo
JOKER-C2 access gate demo
EVT/OPC continuity demo

Success criteria:

The app can be presented as a governed AI access onboarding system.
The pilot can demonstrate operational identity before AI access.
The pilot can show audit-ready continuity.

19. Development Priorities

Priority order:

1. documentation foundation
2. static MVP interface
3. mock state engine
4. form-based flow
5. IPR Card preview
6. certificate preview
7. JOKER-C2 access gate
8. mock EVT references
9. mock OPC references
10. operator review console
11. secure storage abstraction
12. authentication layer
13. JOKER-C2 runtime bridge
14. provider study
15. European identity compatibility study
16. institutional pilot preparation

20. Non-Negotiable Rules

The following rules must remain stable across all phases:

No raw sensitive identity data in repository.
No production secrets in source code.
No JOKER-C2 access without verified IPR.
No official identity claim without lawful integration.
No qualified eIDAS claim without recognized trust service integration.
No banking claim.
No public exposure of documents, fiscal identifiers, photos or videos.
Fail closed by default.

21. Success Definition

The roadmap is successful if HBCE IPR Onboarding App becomes:

a clear operational identity gateway
a bank-grade onboarding prototype
a verifiable IPR issuance flow
an IPR Card issuance interface
an operational certificate interface
a fail-closed JOKER-C2 access gate
an audit-ready onboarding system
a future-ready bridge toward EVT, OPC and European identity integrations

22. Canonical Roadmap Formula

First document the boundary.
Then build the interface.
Then simulate the states.
Then enforce the access gate.
Then prepare events and proofs.
Then add review and storage.
Then connect JOKER-C2.
Then study regulated integrations.
Then prepare controlled pilots.

23. Organization

HERMETICUM B.C.E. S.r.l.

24. Canonical Trademark

HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA

HERMETICUM B.C.E. S.r.l.

