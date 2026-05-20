# HBCE IPR Onboarding App — MVP Scope

## 1. Purpose

This document defines the first MVP scope for HBCE IPR Onboarding App.

The MVP must demonstrate the complete operational identity onboarding flow for:

- IPR Verified status;
- IPR Card issuance;
- operational certificate activation;
- governed JOKER-C2 access;
- fail-closed authorization logic.

The MVP is not a production identity verification system.

The MVP is a controlled operational prototype.

## 2. Core MVP Rule

```txt
No verified IPR, no governed JOKER-C2 access.

The app must never behave like a classic AI login based only on email, password or subscription.

The MVP must demonstrate that governed AI access requires operational identity verification.

3. MVP Position

The MVP sits between the public HBCE Platform and JOKER-C2.

HBCE Platform
→ HBCE IPR Onboarding App
→ IPR Verified
→ IPR Card
→ Operational Certificate
→ JOKER-C2 Access Gate
→ JOKER-C2 Governed Runtime

4. What the MVP Must Include

The first MVP must include:

landing page
onboarding start page
identity form
document metadata form
fiscal identifier form
photo/video verification placeholder
review status page
IPR Card preview
operational certificate preview
JOKER-C2 access gate
legal boundary page
privacy boundary page
security boundary page
mock data layer
fail-closed access logic

5. What the MVP Must Not Include

The first MVP must not include:

real identity document storage
real fiscal identifier storage
real biometric verification
real liveness verification
real KYC/KYB provider integration
official public identity issuance
qualified eIDAS certificate issuance
SPID issuance
CIE issuance
EUDI Wallet issuance
bank account creation
regulated financial services
production user onboarding
production secrets
real personal datasets

6. MVP Data Rule

Only mock, synthetic or demonstration data may be used.

Forbidden in the MVP repository:

real passports
real identity cards
real driving licenses
real fiscal codes
real tax identifiers
real national identification numbers
real photos
real videos
real biometric templates
real onboarding records
production credentials
private keys
API secrets

7. MVP Route Scope

The first MVP should implement the following routes:

/

Landing page.

/onboarding

Onboarding overview.

/onboarding/start

Initial registration.

/onboarding/identity

Identity data form.

/onboarding/documents

Official document metadata form.

/onboarding/fiscal

Fiscal or national identifier form.

/onboarding/photo-video

Photo and video verification placeholder.

/onboarding/review

Review status page.

/ipr-card

IPR Card preview.

/certificate

Operational certificate preview.

/access/joker-c2

JOKER-C2 access gate.

/legal

Legal boundary.

/privacy

Privacy boundary.

/security

Security boundary.

8. MVP User Flow

The MVP user flow is:

User opens landing page.
User starts onboarding.
User submits account data.
User submits identity data.
User submits document metadata.
User submits fiscal identifier metadata.
User completes photo/video placeholder.
System places case under review.
Mock review approves or denies the case.
If approved, system assigns IPR Verified.
System displays IPR Card preview.
System displays operational certificate preview.
System evaluates JOKER-C2 access.
If all required states are valid, access is enabled.
If any required state is missing, access remains denied.

9. MVP Status Model

The MVP must use the following status groups:

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

10. MVP Allow Conditions

JOKER-C2 access may be enabled only when:

ipr_status = verified
ipr_card_status = issued
certificate_status = active
revocation_state = clear

Any other condition must deny access.

11. MVP Deny Conditions

JOKER-C2 access must be denied if:

ipr_status is missing
ipr_status is not verified
ipr_card_status is missing
ipr_card_status is not issued
certificate_status is missing
certificate_status is not active
revocation_state is not clear
review_status is not approved
onboarding_status is incomplete

Default decision:

deny_access

12. MVP Mock Review

The MVP may include a mock review mechanism.

Allowed mock review decisions:

approve
reject
request_more_information
expire
suspend
revoke

The mock review must clearly be marked as non-production.

It must not claim real identity verification.

13. MVP IPR Card Preview

The MVP IPR Card preview should display:

ipr_card_id
ipr_id
card_status
issuer
issued_at
expires_at
access_scope
revocation_state

The MVP IPR Card must not display:

raw identity documents
raw fiscal identifiers
raw document numbers
raw photos
raw videos
biometric data
private review notes

14. MVP Operational Certificate Preview

The MVP operational certificate preview should display:

certificate_id
ipr_id
issuer
issued_at
expires_at
scope
certificate_status
hash_reference
revocation_state

Boundary:

The operational certificate is internal to HBCE.
It is not a qualified eIDAS certificate.

15. MVP JOKER-C2 Access Gate

The MVP access gate should display:

access_status
decision
decision_reason
required_conditions
current_conditions
joker_c2_gateway_reference

Allowed decision values:

deny_access
allow_governed_access

The decision must be computed from operational states.

It must not be based only on a button, query parameter or frontend-only flag.

16. MVP UI Principle

The MVP interface should communicate one central difference:

Classic AI access:
email + password + subscription

HBCE governed AI access:
verified identity + IPR Card + operational certificate + access gate

The user should immediately understand that JOKER-C2 is not accessed through a simple email account.

17. MVP Security Requirements

The MVP must preserve these requirements:

fail_closed_by_default
no_raw_documents
no_raw_fiscal_identifiers
no_real_photos
no_real_videos
no_biometric_data
no_production_secrets
server_side_access_decision_where_possible
mock_data_only
clear_legal_boundary
clear_privacy_boundary
clear_security_boundary

18. MVP Privacy Requirements

The MVP must preserve these privacy principles:

data_minimization
masked_values
hash_references
private_sensitive_material
no_public_raw_identity_data
no_real_user_records

19. MVP Event References

The MVP may simulate event references for future EVT and OPC integration.

Suggested event types:

ONBOARDING_STARTED
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

These events should be mock or demonstration-only in the first MVP.

20. MVP Success Criteria

The MVP is successful if it demonstrates:

the complete onboarding path
the operational difference from classic AI login
the IPR Verified status
the IPR Card concept
the operational certificate concept
the fail-closed JOKER-C2 gate
the legal boundary
the privacy boundary
the security boundary
the future compatibility with real verification integrations

21. MVP Non-Goals

The MVP does not need to solve:

production KYC
production biometric verification
production document verification
regulated trust service issuance
official identity federation
EUDI Wallet integration
payment processing
banking services
enterprise customer onboarding
multi-tenant operator console
full EVT ledger
full OPC proof system

These are future phases.

22. Future Production Path

After the MVP, the project may evolve toward:

secure authentication
encrypted storage
protected document storage
real verification provider integration
operator review dashboard
audit logging
EVT integration
OPC integration
revocation registry
JOKER-C2 authorization bridge
EUDI Wallet compatibility study
eIDAS trust service integration study
enterprise onboarding
institutional pilot

23. Canonical MVP Formula

The MVP must show the threshold.
The user does not simply log in.
The user is onboarded.
The subject is verified.
The IPR is issued.
The IPR Card is activated.
The certificate authorizes.
The access gate decides.
JOKER-C2 opens only after verified operational identity.

24. Organization

HERMETICUM B.C.E. S.r.l.

25. Canonical Trademark

HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA

HERMETICUM B.C.E. S.r.l.

