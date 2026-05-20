# HBCE IPR Onboarding App — Technical Specification

## 1. Purpose

This document defines the technical specification for HBCE IPR Onboarding App.

The application must implement a bank-grade operational identity onboarding flow for:

- IPR Verified status;
- IPR Card issuance;
- operational certificate activation;
- governed JOKER-C2 access;
- fail-closed authorization logic;
- future EVT and OPC integration.

The core technical rule is:

```txt
No verified IPR, no governed JOKER-C2 access.

2. Recommended Stack

The first implementation should use:

Next.js
TypeScript
React
CSS modules or shared design system CSS
server-side route logic where possible
mock state engine for MVP
static or JSON-based demo data for first version

The app should be deployable as a modern web application and remain compatible with future backend, storage and verification provider integrations.

3. Application Type

The app is not a static brochure.

It is an onboarding workflow application with operational states.

Minimum functional layers:

presentation layer
onboarding flow layer
mock state layer
access decision layer
IPR Card presentation layer
certificate presentation layer
legal boundary layer
future API boundary

4. Suggested Folder Structure

Suggested initial structure:

app/
  page.tsx
  onboarding/
    page.tsx
    start/
      page.tsx
    identity/
      page.tsx
    documents/
      page.tsx
    fiscal/
      page.tsx
    photo-video/
      page.tsx
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
  OnboardingStepper.tsx
  StatusBadge.tsx
  IPRCardPreview.tsx
  CertificatePreview.tsx
  AccessGatePanel.tsx
  BoundaryNotice.tsx

lib/
  mock-onboarding.ts
  access-decision.ts
  types.ts
  constants.ts
  format.ts

docs/
  README_REFERENCE.md

The documentation files may remain at repository root.

5. Route Implementation

Required MVP routes:

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

Each route must communicate its operational purpose clearly.

6. Core TypeScript Types

The app should define shared TypeScript types for onboarding states.

Suggested file:

lib/types.ts

Suggested types:

export type OnboardingStatus =
  | "not_started"
  | "started"
  | "in_progress"
  | "pending_review"
  | "approved"
  | "rejected"
  | "needs_more_information"
  | "expired"
  | "revoked"
  | "suspended"
  | "completed";

export type VerificationStatus =
  | "not_started"
  | "pending"
  | "submitted"
  | "in_review"
  | "manual_review"
  | "approved"
  | "rejected"
  | "expired"
  | "needs_more_information";

export type IprStatus =
  | "not_created"
  | "pending"
  | "verified"
  | "rejected"
  | "expired"
  | "revoked"
  | "suspended";

export type IprCardStatus =
  | "not_issued"
  | "pending"
  | "issued"
  | "expired"
  | "revoked"
  | "suspended";

export type CertificateStatus =
  | "not_created"
  | "pending"
  | "active"
  | "expired"
  | "revoked"
  | "suspended";

export type RevocationState =
  | "clear"
  | "suspended"
  | "revoked"
  | "expired"
  | "under_review";

export type JokerAccessStatus =
  | "denied"
  | "pending"
  | "enabled"
  | "disabled"
  | "revoked"
  | "suspended";

export type AccessDecision =
  | "deny_access"
  | "allow_governed_access";

7. Onboarding Record Type

The MVP should use a single mock onboarding record.

Suggested type:

export type OnboardingRecord = {
  subjectId: string;
  onboardingId: string;
  iprId: string;
  onboardingStatus: OnboardingStatus;
  emailStatus: VerificationStatus;
  identityDataStatus: VerificationStatus;
  documentStatus: VerificationStatus;
  fiscalIdentifierStatus: VerificationStatus;
  photoVerificationStatus: VerificationStatus;
  videoVerificationStatus: VerificationStatus;
  reviewStatus: VerificationStatus;
  iprStatus: IprStatus;
  iprCardStatus: IprCardStatus;
  certificateStatus: CertificateStatus;
  revocationState: RevocationState;
  jokerC2AccessStatus: JokerAccessStatus;
  createdAt: string;
  updatedAt: string;
};

8. Mock State Engine

Suggested file:

lib/mock-onboarding.ts

The MVP should provide at least two mock records:

approved demo record
denied demo record

The approved record should show the complete valid path.

The denied record should show fail-closed behavior.

9. Access Decision Logic

Suggested file:

lib/access-decision.ts

Minimum logic:

import type { AccessDecision, OnboardingRecord } from "./types";

export function evaluateJokerC2Access(record: OnboardingRecord): {
  decision: AccessDecision;
  reason: string;
} {
  if (record.iprStatus !== "verified") {
    return {
      decision: "deny_access",
      reason: "IPR status is not verified"
    };
  }

  if (record.iprCardStatus !== "issued") {
    return {
      decision: "deny_access",
      reason: "IPR Card is not issued"
    };
  }

  if (record.certificateStatus !== "active") {
    return {
      decision: "deny_access",
      reason: "Operational certificate is not active"
    };
  }

  if (record.revocationState !== "clear") {
    return {
      decision: "deny_access",
      reason: "Revocation state is not clear"
    };
  }

  return {
    decision: "allow_governed_access",
    reason: "Verified IPR, issued IPR Card, active certificate and clear revocation state"
  };
}

The default result must be denial.

10. Components

AppHeader

Purpose:

Display product name, HBCE identity and primary navigation.

AppFooter

Purpose:

Display organization, trademark and legal boundary links.

OnboardingStepper

Purpose:

Show the full onboarding process and current step.

Steps:

Start
Identity
Documents
Fiscal Identifier
Photo/Video
Review
IPR Card
Certificate
JOKER-C2 Access

StatusBadge

Purpose:

Display operational states in a readable and consistent format.

IPRCardPreview

Purpose:

Display public-safe IPR Card information.

Forbidden display:

raw identity data
raw document data
raw fiscal identifier
raw photo
raw video
biometric material

CertificatePreview

Purpose:

Display internal operational certificate reference.

Boundary:

The certificate is internal to HBCE and is not a qualified eIDAS certificate.

AccessGatePanel

Purpose:

Display access decision, required conditions and current conditions.

Default visual state:

denied

BoundaryNotice

Purpose:

Display legal, privacy or security boundary notice.

11. UI Requirements

The interface must communicate:

Classic AI access is based on email, password and subscription.
HBCE governed AI access requires verified operational identity.
IPR Card is the operational key.
JOKER-C2 opens only after verified IPR.

The UI should be clear, institutional and technical.

The interface should not imitate official state identity cards.

The interface should not claim banking status.

12. Data Display Rules

Allowed public-safe display fields:

ipr_id
ipr_card_id
card_status
certificate_id
certificate_status
issuer
issued_at
expires_at
access_scope
revocation_state
access_decision
decision_reason

Forbidden public display fields:

raw document number
raw fiscal identifier
raw identity document
raw photo
raw video
biometric data
private review notes
private storage URL

13. Security Requirements

The MVP must preserve:

fail_closed_by_default
mock_data_only
no_real_documents
no_real_fiscal_identifiers
no_real_photos
no_real_videos
no_biometric_data
no_production_secrets
no_frontend_only_access_trust

JOKER-C2 access must never be granted only because the user clicked a button.

14. Environment Variables

Future environment variables may include:

JOKER_C2_GATEWAY_URL=
IDENTITY_PROVIDER_API_KEY=
DOCUMENT_STORAGE_BUCKET=
DATABASE_URL=
JWT_SECRET=
OPC_ENDPOINT=
EVT_REGISTRY_ENDPOINT=

The repository must not contain real production values.

15. Future API Routes

Suggested future API routes:

/api/onboarding/start
/api/onboarding/identity
/api/onboarding/documents
/api/onboarding/fiscal
/api/onboarding/photo-video
/api/onboarding/review
/api/ipr-card
/api/certificate
/api/access/joker-c2
/api/events
/api/revocation

All API routes must validate input server-side.

16. Future Backend Requirements

Before production use, the app will require:

secure authentication
database persistence
encrypted storage
protected document storage
server-side verification states
operator review dashboard
audit logging
revocation management
access token issuance
JOKER-C2 runtime bridge
privacy controls
retention policy
incident response

17. EVT and OPC Technical Boundary

The MVP may simulate EVT and OPC references.

Future integration should support:

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

EVT traces operational continuity.

OPC proves operational state and decision context.

18. Implementation Acceptance Criteria

The first technical implementation is acceptable when:

all required routes exist
shared components are implemented
mock onboarding record exists
access decision function exists
IPR Card preview exists
certificate preview exists
access gate exists
denied state works
approved state works only with valid conditions
legal, privacy and security routes exist
no real sensitive data is present
no production secret is present

19. Technical Product Formula

The app collects onboarding state.
The app computes operational status.
The app issues IPR Card preview.
The app activates certificate preview.
The app evaluates access.
The app denies by default.
The app opens JOKER-C2 only after verified IPR.

20. Organization

HERMETICUM B.C.E. S.r.l.

21. Canonical Trademark

HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA

HERMETICUM B.C.E. S.r.l.

