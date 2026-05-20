# HBCE IPR Onboarding App — Implementation Plan

## 1. Purpose

This document defines the first implementation plan for HBCE IPR Onboarding App.

The goal is to move from documentation to a working MVP while preserving the core architecture:

```txt
No verified IPR, no governed JOKER-C2 access.

The implementation must demonstrate that JOKER-C2 is not accessed through a simple email account, password or subscription, but through verified operational identity.

2. Implementation Principle

The app must be built in this order:

foundation
types
mock state
shared components
routes
IPR Card preview
certificate preview
access gate
boundary pages
demo validation

The first version may use mock data, but the fail-closed logic must already be real.

3. Recommended Technical Stack

Initial stack:

Next.js
TypeScript
React
CSS
server-side compatible logic
mock data layer
static deployment compatible structure

The app should remain compatible with future backend, secure storage, operator review, EVT, OPC and JOKER-C2 runtime bridge integrations.

4. Phase 1 — Project Foundation

Objective:

Create the initial application structure.

Required files and folders:

app/
components/
lib/
public/

Required root files:

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

Acceptance criteria:

The repository has a clear documentation base.
The app structure is ready for code.
No sensitive data is present.
No production secret is present.

5. Phase 2 — Shared Types

Objective:

Create the shared TypeScript model for onboarding state.

Suggested file:

lib/types.ts

Required type groups:

OnboardingStatus
VerificationStatus
IprStatus
IprCardStatus
CertificateStatus
RevocationState
JokerAccessStatus
AccessDecision
OnboardingRecord
IprCardRecord
OperationalCertificateRecord
AccessGateResult

Acceptance criteria:

All main operational states are typed.
Invalid states are minimized.
Routes and components can share the same model.

6. Phase 3 — Constants

Objective:

Create canonical labels, routes and product constants.

Suggested file:

lib/constants.ts

Required constants:

APP_NAME
ORG_NAME
CANONICAL_TRADEMARK
JOKER_C2_GATEWAY_URL
ONBOARDING_STEPS
ROUTES
LEGAL_BOUNDARY_TEXT
ACCESS_REQUIRED_CONDITIONS

Acceptance criteria:

Repeated product language is centralized.
Routes are not duplicated manually across the app.
Core formulas stay consistent.

7. Phase 4 — Mock Onboarding Data

Objective:

Create mock records for approved, denied and revoked onboarding states.

Suggested file:

lib/mock-onboarding.ts

Required mock records:

approvedOnboardingRecord
pendingOnboardingRecord
deniedOnboardingRecord
revokedOnboardingRecord

Acceptance criteria:

The app can demonstrate allow and deny states.
No real personal data is used.
No real document data is used.
No real fiscal identifier is used.
No real photo or video data is used.

8. Phase 5 — Access Decision Engine

Objective:

Create the fail-closed JOKER-C2 access decision function.

Suggested file:

lib/access-decision.ts

Required logic:

if ipr_status is not verified:
    deny_access

if ipr_card_status is not issued:
    deny_access

if certificate_status is not active:
    deny_access

if revocation_state is not clear:
    deny_access

otherwise:
    allow_governed_access

Acceptance criteria:

Denied state is default.
Approved state works only with valid operational conditions.
Revocation always blocks access.
Frontend cannot override the decision.

9. Phase 6 — Formatting Helpers

Objective:

Create safe formatting utilities for dates, labels and masked values.

Suggested file:

lib/format.ts

Required helpers:

formatStatusLabel
formatDate
formatAccessDecision
formatMaskedIdentifier
formatRouteLabel

Acceptance criteria:

Status labels are readable.
Sensitive values remain masked.
UI language remains consistent.

10. Phase 7 — Layout Components

Objective:

Create shared layout components.

Suggested files:

components/AppHeader.tsx
components/AppFooter.tsx
components/PageShell.tsx
components/SectionBlock.tsx
components/InfoCard.tsx

Acceptance criteria:

All pages share a consistent structure.
Footer always displays organization and trademark.
Boundary links are always visible.

11. Phase 8 — Operational Components

Objective:

Create onboarding-specific components.

Suggested files:

components/OnboardingStepper.tsx
components/StatusBadge.tsx
components/BoundaryNotice.tsx
components/IPRCardPreview.tsx
components/CertificatePreview.tsx
components/AccessGatePanel.tsx

Acceptance criteria:

Onboarding state is visible.
IPR Card preview is public-safe.
Certificate preview is legally bounded.
Access gate clearly shows allow or deny state.

12. Phase 9 — Landing Page

Route:

/

Objective:

Explain the product and start the onboarding flow.

Required sections:

hero
classic AI versus HBCE comparison
onboarding flow preview
IPR Card explanation
JOKER-C2 access gate explanation
legal boundary notice
call to action

Acceptance criteria:

The user understands the difference between generic AI login and HBCE governed AI access.
The page directs the user to onboarding.
The page does not overclaim official identity status.

13. Phase 10 — Onboarding Pages

Required routes:

/onboarding
/onboarding/start
/onboarding/identity
/onboarding/documents
/onboarding/fiscal
/onboarding/photo-video
/onboarding/review

Objective:

Implement the complete onboarding sequence as MVP screens.

Acceptance criteria:

Every onboarding step exists.
Every step explains what it collects.
Every step preserves legal, privacy and security boundaries.
No real sensitive data is required.

14. Phase 11 — IPR Card Page

Route:

/ipr-card

Objective:

Display the internal operational identity card preview.

Displayed fields:

ipr_card_id
ipr_id
card_status
issuer
issued_at
expires_at
access_scope
revocation_state

Acceptance criteria:

The card looks operational, not governmental.
The card does not expose raw identity data.
The card clearly states it is internal to HBCE.

15. Phase 12 — Certificate Page

Route:

/certificate

Objective:

Display the internal operational certificate reference.

Displayed fields:

certificate_id
ipr_id
issuer
issued_at
expires_at
scope
certificate_status
hash_reference
revocation_state

Acceptance criteria:

The certificate is clearly internal to HBCE.
The page does not claim qualified eIDAS status.
The certificate prepares the access gate decision.

16. Phase 13 — JOKER-C2 Access Gate Page

Route:

/access/joker-c2

Objective:

Display the final governed access decision.

Required panels:

required conditions
current conditions
decision
decision reason
JOKER-C2 gateway reference

Acceptance criteria:

Access is denied by default.
Access is allowed only with verified IPR, issued IPR Card, active certificate and clear revocation state.
Revoked, suspended or expired states block access.

17. Phase 14 — Boundary Pages

Required routes:

/legal
/privacy
/security

Objective:

Expose legal, privacy and security boundaries inside the app.

Acceptance criteria:

Legal page explains non-replacement of official identity systems.
Privacy page explains minimization and sensitive data protection.
Security page explains fail-closed access and forbidden repository data.

18. Phase 15 — MVP Demo States

Objective:

Allow the MVP to demonstrate different operational states.

Required demo states:

approved
pending
denied
revoked

Suggested behavior:

approved shows access allowed
pending shows access denied
denied shows access denied
revoked shows access denied

Acceptance criteria:

A viewer can test the logic.
A viewer can understand why access is allowed or denied.
The app proves the access gate is not decorative.

19. Phase 16 — First Internal Validation

Objective:

Check that implementation matches documentation.

Validation checklist:

all documented routes exist
all core components exist
mock state exists
access decision engine exists
IPR Card preview exists
certificate preview exists
access gate exists
legal boundary visible
privacy boundary visible
security boundary visible
no real sensitive data present
no production secrets present

20. Phase 17 — Future API Preparation

Objective:

Prepare API boundaries without forcing production backend too early.

Future route groups:

/api/onboarding
/api/ipr-card
/api/certificate
/api/access/joker-c2
/api/events
/api/opc
/api/revocation

Acceptance criteria:

The app can later move from mock state to server state.
Access decision remains fail-closed.
Frontend state never becomes the authority.

21. Phase 18 — Future JOKER-C2 Bridge

Objective:

Prepare integration with the JOKER-C2 runtime.

Bridge payload should include:

ipr_id
ipr_status
ipr_card_status
certificate_status
revocation_state
access_scope
decision
decision_timestamp

Acceptance criteria:

Only minimized authorization state is passed.
JOKER-C2 does not receive raw identity documents.
JOKER-C2 does not trust a simple redirect.

22. Phase 19 — Future EVT and OPC Integration

Objective:

Prepare audit-ready onboarding continuity.

Future EVT data:

event_id
event_type
previous_event_reference
event_hash
event_timestamp
decision_state

Future OPC data:

proof_id
linked_event_id
operation_scope
input_hash
output_hash
decision_hash
policy_snapshot_hash
issuer
created_at

Acceptance criteria:

Onboarding decisions can become event-ready.
Access decisions can become proof-ready.
The app remains compatible with HBCE audit architecture.

23. Non-Negotiable Implementation Rules

The implementation must never include:

real identity documents
real fiscal identifiers
real document numbers
real photos
real videos
real biometric material
production secrets
private keys
API credentials
unprotected storage URLs

The implementation must never claim:

official European identity issuance
replacement of CIE
replacement of SPID
replacement of EUDI Wallet
qualified eIDAS certificate issuance without lawful trust service integration
banking or financial service status

24. MVP Completion Criteria

The MVP is complete when:

landing page exists
onboarding flow exists
mock data layer exists
status components exist
IPR Card preview exists
certificate preview exists
access gate exists
legal page exists
privacy page exists
security page exists
access denied state works
access allowed state works only under valid conditions
repository contains no sensitive real data
repository contains no production secret

25. Implementation Formula

Build the structure.
Type the states.
Mock the records.
Compute the decision.
Render the onboarding.
Issue the IPR Card preview.
Activate the certificate preview.
Evaluate the access gate.
Deny by default.
Open JOKER-C2 only after verified IPR.

26. Organization

HERMETICUM B.C.E. S.r.l.

27. Canonical Trademark

HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA

HERMETICUM B.C.E. S.r.l.

