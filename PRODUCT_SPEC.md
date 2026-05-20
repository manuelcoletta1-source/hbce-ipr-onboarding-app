# HBCE IPR Onboarding App — Product Specification

## 1. Product Name

HBCE IPR Onboarding App

## 2. Product Definition

HBCE IPR Onboarding App is a bank-grade operational identity onboarding application for IPR Verified status, IPR Card issuance, operational certificate activation and governed JOKER-C2 access.

The product is not a generic login page.

The product is an operational identity gateway.

## 3. Product Thesis

Classic AI platforms usually allow access through:

```txt
email
password
subscription
direct model access

HBCE follows a different model:

identity onboarding
official document submission
fiscal or national identifier linkage
photo/video verification
review
IPR Verified status
IPR Card issuance
operational certificate activation
governed JOKER-C2 access

The product thesis is:

Operational artificial intelligence should not be accessed only through email and payment.
Governed AI access requires verified operational identity.

4. Core Product Rule

No verified IPR, no governed JOKER-C2 access.

5. Target Users

The first target users are:

individual subjects requiring IPR onboarding
operators reviewing onboarding cases
HBCE internal R&D users
future B2B clients
future B2G stakeholders
future institutional pilot users

6. Primary Use Case

The primary use case is:

A subject enters the HBCE IPR Onboarding App, completes a structured identity onboarding flow, receives IPR Verified status, receives an IPR Card, activates an operational certificate and accesses JOKER-C2 through a governed authorization gate.

7. Product Differentiation

The app differs from classic AI access systems because it requires:

identity verification before access
document-backed onboarding
fiscal or national identifier linkage
photo/video verification step
review state
IPR Verified status
IPR Card issuance
operational certificate
fail-closed access gate
audit-ready event continuity

8. MVP Product Scope

The first MVP must demonstrate:

landing page
onboarding sequence
mock registration
mock identity form
mock document metadata form
mock fiscal identifier form
mock photo/video placeholder
mock review state
IPR Verified state
IPR Card preview
operational certificate preview
JOKER-C2 access gate
legal boundary
privacy boundary
security boundary
fail-closed decision logic

9. MVP Product Non-Goals

The first MVP must not claim or implement:

real KYC production verification
real biometric verification
real banking service
official identity issuance
CIE issuance
SPID issuance
EUDI Wallet issuance
qualified eIDAS certificate issuance
bank account creation
payment services
regulated financial services
production onboarding of real users

10. User Journey

The intended user journey is:

User opens landing page.
User understands that JOKER-C2 requires verified IPR.
User starts onboarding.
User submits registration data.
User submits identity data.
User submits official document metadata.
User submits fiscal or national identifier metadata.
User completes photo/video verification placeholder.
User reaches review state.
System approves or denies the onboarding case.
If approved, system creates IPR Verified status.
System displays IPR Card.
System displays operational certificate.
System evaluates JOKER-C2 access.
System grants access only if all required states are valid.

11. Main Product Screens

The MVP should include the following screens:

Landing
Onboarding Overview
Start Registration
Identity Data
Official Documents
Fiscal Identifier
Photo/Video Verification
Review Status
IPR Card
Operational Certificate
JOKER-C2 Access Gate
Legal Boundary
Privacy Boundary
Security Boundary

12. Landing Screen

Purpose:

Explain the product and start onboarding.

Must communicate:

HBCE is not classic AI login.
JOKER-C2 requires verified IPR.
IPR Card is the operational key.
Email and subscription are not enough.

Primary action:

Start IPR onboarding

13. Onboarding Overview Screen

Purpose:

Show the complete onboarding path before the user starts.

Must show:

registration
identity data
official documents
fiscal identifier
photo/video verification
review
IPR Verified
IPR Card
certificate
JOKER-C2 access

14. Registration Screen

Purpose:

Create the initial onboarding session.

Fields:

email
first_name
last_name
country
terms_acceptance
privacy_acceptance

Output state:

onboarding_status = started
email_status = pending
joker_c2_access_status = denied

15. Identity Screen

Purpose:

Collect identity data required for the operational identity record.

Fields:

first_name
last_name
date_of_birth
place_of_birth
country
nationality
residential_country

Output state:

identity_data_status = submitted

16. Documents Screen

Purpose:

Collect official document metadata and protected document references.

Fields:

document_type
document_country
document_expiry_date
document_number_hash
document_reference

Output state:

document_status = submitted

Forbidden MVP content:

real document image
real document scan
real document number in clear text

17. Fiscal Identifier Screen

Purpose:

Link the subject to a fiscal code, national tax identifier or national identification number.

Fields:

fiscal_identifier_type
fiscal_identifier_country
fiscal_identifier_hash
fiscal_identifier_masked

Output state:

fiscal_identifier_status = submitted

Display rule:

Only masked identifiers may be displayed.

18. Photo/Video Verification Screen

Purpose:

Simulate subject-document coherence and liveness verification.

MVP behavior:

display placeholder verification step
simulate photo submission
simulate video submission
mark verification as submitted or approved

Output states:

photo_verification_status
video_verification_status

Forbidden MVP content:

real photo
real video
biometric template
liveness recording
face template

19. Review Screen

Purpose:

Display onboarding review status and final decision.

Allowed review states:

not_started
in_progress
pending_review
approved
rejected
needs_more_information
expired
revoked

Only this state can create IPR Verified:

approved

20. IPR Card Screen

Purpose:

Display the operational identity card issued inside the HBCE ecosystem.

Displayed fields:

ipr_card_id
ipr_id
card_status
issuer
issued_at
expires_at
access_scope
revocation_state

Boundary:

The IPR Card is not an official state identity document.

21. Operational Certificate Screen

Purpose:

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

Boundary:

The operational certificate is not a qualified eIDAS certificate unless issued through a recognized and compliant trust service integration.

22. JOKER-C2 Access Gate Screen

Purpose:

Allow or deny governed access to JOKER-C2.

Required allow conditions:

ipr_status = verified
ipr_card_status = issued
certificate_status = active
revocation_state = clear

Default decision:

deny_access

Allowed decision:

allow_governed_access

Displayed values:

decision
decision_reason
required_conditions
current_conditions
joker_c2_gateway_reference

23. Product States

The product must track:

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

24. Access Decision Logic

if ipr_status != "verified":
    deny_access

if ipr_card_status != "issued":
    deny_access

if certificate_status != "active":
    deny_access

if revocation_state != "clear":
    deny_access

allow_governed_access

25. Product Acceptance Criteria

The MVP is acceptable when:

the user can navigate the full onboarding flow
the user can see every onboarding step
the system denies access by default
the system grants access only after valid mock states
the IPR Card preview is visible after verified status
the certificate preview is visible after card issuance
the access gate shows allow or deny decision
legal boundary is clear
privacy boundary is clear
security boundary is clear
no real sensitive data is stored in the repository

26. Demo Acceptance Criteria

The MVP demo is successful if a viewer understands:

HBCE is not a simple AI login.
JOKER-C2 requires verified operational identity.
IPR identifies the subject operationally.
IPR Card functions as the operational key.
The certificate defines access scope.
The access gate protects the governed runtime.

27. Product Risks

Main risks:

confusing IPR with official public identity
confusing IPR Card with state identity document
confusing operational certificate with qualified eIDAS certificate
storing real sensitive data too early
building only a visual mock without fail-closed logic
allowing JOKER-C2 access through frontend-only state
overclaiming banking or regulated identity status

28. Risk Controls

Required controls:

clear legal boundary
clear privacy boundary
clear security boundary
mock data only in MVP
fail-closed access logic
server-side decision logic where possible
no raw sensitive data in repository
no production secrets in source code

29. Product Success Metrics

Initial product success can be measured by:

complete route map implemented
complete onboarding flow visible
all required product states represented
IPR Card preview implemented
certificate preview implemented
access gate implemented
deny decision working
allow decision working only with valid states
documentation aligned with implementation

30. Product Formula

The user does not simply register.
The user is onboarded.

The system does not simply authenticate.
The system verifies operational identity.

The AI does not simply open.
JOKER-C2 opens only through verified IPR.

31. Organization

HERMETICUM B.C.E. S.r.l.

32. Canonical Trademark

HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA

HERMETICUM B.C.E. S.r.l.
