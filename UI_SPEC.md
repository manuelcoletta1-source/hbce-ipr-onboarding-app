# HBCE IPR Onboarding App — UI Specification

## 1. Purpose

This document defines the user interface specification for HBCE IPR Onboarding App.

The interface must support:

- operational identity onboarding;
- IPR Verified status;
- IPR Card preview;
- operational certificate preview;
- governed JOKER-C2 access gate;
- legal, privacy and security boundary communication.

The UI must make the product distinction clear:

```txt
Classic AI access: email + password + subscription.
HBCE governed AI access: verified identity + IPR Card + operational certificate + access gate.

2. UI Principle

The interface must be:

institutional
technical
minimal
clear
audit-oriented
privacy-conscious
fail-closed by design

The interface must not look like:

a state identity document issuer
a public authority portal
a bank account opening product
a financial services platform
a generic chatbot login page

3. Core UI Message

The main message must be:

Access JOKER-C2 only through verified IPR.
An email is not enough.
A subscription is not enough.
An operational identity is required: documented, traceable and verifiable.

4. Visual Identity

The UI should use a sober HBCE visual language.

Recommended tone:

dark institutional background
high-contrast text
technical cards
clear status badges
structured sections
minimal animation
no decorative excess

The interface should communicate operational trust, not consumer entertainment.

5. Layout System

Recommended layout components:

AppHeader
AppFooter
PageShell
SectionBlock
InfoCard
StatusBadge
StepCard
BoundaryNotice
ActionPanel
IPRCardPreview
CertificatePreview
AccessGatePanel

6. Header

The header should include:

HBCE IPR Onboarding App
IPR Verified
IPR Card
JOKER-C2 Access
Legal
Privacy
Security

Primary header message:

Operational identity onboarding for governed AI access.

The header must not suggest official public identity issuance.

7. Footer

The footer should include:

HERMETICUM B.C.E. S.r.l.
HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA
Legal Boundary
Privacy
Security

Footer boundary text:

IPR Card is an internal operational identity credential. It does not replace official identity documents, CIE, SPID, EUDI Wallet or qualified eIDAS certificates.

8. Landing Page UI

Route:

/

Purpose:

Introduce the onboarding app and start the verification flow.

Required sections:

Hero
Classic AI vs HBCE governed AI
Onboarding flow preview
IPR Card explanation
JOKER-C2 access gate explanation
Legal boundary notice
Primary call to action

Hero title:

IPR Onboarding for Governed AI Access

Hero subtitle:

Before accessing JOKER-C2, the subject must complete operational identity verification and receive IPR Verified status.

Primary button:

Start IPR Onboarding

Secondary button:

View Legal Boundary

9. Classic AI vs HBCE Comparison

The landing page should include a comparison block.

Classic AI:

Email registration
Password or OAuth
Subscription
Direct model access
Limited identity verification

HBCE:

Identity onboarding
Official document metadata
Fiscal or national identifier linkage
Photo/video verification step
Review
IPR Verified
IPR Card
Operational certificate
Governed JOKER-C2 access

Main comparison sentence:

JOKER-C2 is not accessed like a generic AI account. It opens only after verified operational identity.

10. Onboarding Overview UI

Route:

/onboarding

Purpose:

Show the complete onboarding sequence before the user enters the flow.

Required steps:

Start
Identity
Documents
Fiscal Identifier
Photo/Video
Review
IPR Verified
IPR Card
Certificate
JOKER-C2 Access

Each step should show:

step number
step title
step purpose
current state
next action

11. Start Registration UI

Route:

/onboarding/start

Required fields:

email
first_name
last_name
country
accept_terms
accept_privacy

Required notices:

This step starts onboarding only.
This step does not grant JOKER-C2 access.

Primary button:

Continue to Identity Verification

Default status display:

JOKER-C2 access: denied

12. Identity UI

Route:

/onboarding/identity

Required fields:

first_name
last_name
date_of_birth
place_of_birth
country
nationality
residential_country

Boundary notice:

Identity data is used for operational verification inside the HBCE ecosystem. It does not create an official public identity credential.

Primary button:

Continue to Documents

13. Documents UI

Route:

/onboarding/documents

Required fields:

document_type
document_country
document_expiry_date
document_number_hash
document_reference

Supported document types:

Identity card
Passport
Driving license
Residence document
Other official document

Boundary notice:

The MVP uses metadata and protected references only. Do not upload or commit real identity documents to the repository.

Primary button:

Continue to Fiscal Identifier

Forbidden UI behavior:

Do not display raw document scans.
Do not display raw document numbers.
Do not display public storage URLs.

14. Fiscal Identifier UI

Route:

/onboarding/fiscal

Required fields:

fiscal_identifier_type
fiscal_identifier_country
fiscal_identifier_hash
fiscal_identifier_masked

Supported identifier types:

Fiscal code
Tax identifier
National identification number
Social security style number
Other public identifier

Display example:

CLT*********44R

Boundary notice:

Fiscal identifiers must be minimized, masked or hash-referenced wherever possible.

Primary button:

Continue to Photo/Video Verification

15. Photo/Video UI

Route:

/onboarding/photo-video

MVP behavior:

show placeholder panel
show simulated photo status
show simulated video status
show manual review state

Required status values:

not_started
pending
submitted
manual_review
approved
rejected
expired

Boundary notice:

The MVP does not process real biometric data, real photos or real videos.

Primary button:

Submit for Review

Forbidden UI behavior:

Do not display real faces.
Do not display real liveness videos.
Do not display biometric templates.

16. Review UI

Route:

/onboarding/review

Purpose:

Show the current onboarding review state and downstream access consequences.

Required panels:

Onboarding status
Identity status
Document status
Fiscal identifier status
Photo/video status
Review decision
IPR status
JOKER-C2 access status

Allowed review states:

pending_review
approved
rejected
needs_more_information
expired
revoked

If approved, show:

Continue to IPR Card

If denied, show:

Access remains denied

If more information is needed, show:

Return to required step

17. IPR Card UI

Route:

/ipr-card

Purpose:

Display the internal operational identity card issued by HBCE.

Required fields:

ipr_card_id
ipr_id
card_status
issuer
issued_at
expires_at
access_scope
revocation_state

Required boundary label:

Internal operational identity credential

Required legal note:

The IPR Card does not replace national identity cards, passports, CIE, SPID, EUDI Wallet or qualified eIDAS certificates.

The IPR Card must look operational and technical, not like an official state ID.

Primary button:

Continue to Operational Certificate

18. Operational Certificate UI

Route:

/certificate

Purpose:

Display the internal operational certificate reference linked to verified IPR.

Required fields:

certificate_id
ipr_id
issuer
issued_at
expires_at
scope
certificate_status
hash_reference
revocation_state

Required boundary label:

Internal HBCE operational certificate

Required legal note:

This is not a qualified eIDAS certificate unless issued through a recognized and compliant trust service integration.

Primary button:

Evaluate JOKER-C2 Access

19. JOKER-C2 Access Gate UI

Route:

/access/joker-c2

Purpose:

Show the final governed access decision.

Required conditions panel:

IPR status = verified
IPR Card status = issued
Certificate status = active
Revocation state = clear

Current conditions panel:

ipr_status
ipr_card_status
certificate_status
revocation_state

Decision panel:

decision
decision_reason
joker_c2_access_status
joker_c2_gateway_reference

Default decision:

deny_access

Allow decision:

allow_governed_access

Primary denied message:

JOKER-C2 access remains blocked because the operational identity requirements are incomplete.

Primary allowed message:

JOKER-C2 governed access is enabled because verified IPR, issued IPR Card, active certificate and clear revocation state are present.

20. Legal UI

Route:

/legal

Required message:

HBCE IPR Onboarding App creates an internal verifiable operational identity record. It does not issue official public identity credentials.

Must list non-replacement boundary:

National identity card
Passport
Driving license
CIE
SPID
EUDI Wallet
Qualified eIDAS certificate
Bank account
Regulated financial identity service

21. Privacy UI

Route:

/privacy

Required message:

The app follows data minimization. Sensitive identity material must remain protected and must not be exposed publicly.

Must list protected categories:

identity data
document data
fiscal identifiers
photo verification
video verification
review notes
certificate references
access states

22. Security UI

Route:

/security

Required message:

The app follows a fail-closed access model. JOKER-C2 access is denied unless all required operational identity states are valid.

Must list forbidden repository data:

raw identity documents
raw fiscal identifiers
raw photos
raw videos
biometric data
production secrets
private keys
API credentials

23. Status Badges

The UI should use consistent status badges.

Positive states:

verified
approved
issued
active
clear
enabled
allow_governed_access

Neutral states:

pending
submitted
manual_review
in_progress
not_started

Negative states:

denied
rejected
expired
revoked
suspended
blocked
deny_access

24. Copywriting Rules

Use clear operational language.

Preferred terms:

operational identity
verified IPR
IPR Card
operational certificate
governed access
access gate
fail-closed
verification state
revocation state

Avoid overclaiming terms:

official identity
European identity issued by HBCE
state identity card
bank account
qualified eIDAS certificate
public authority credential

25. Accessibility Requirements

The MVP UI should support:

readable contrast
clear labels
visible error states
keyboard navigation where possible
descriptive button text
non-color-only status communication
responsive layout

26. Responsive Layout

The app should work on:

desktop
tablet
mobile

Mobile priority:

clear steps
single-column forms
large buttons
short status cards
visible access decision

27. UI Acceptance Criteria

The UI is acceptable when:

the landing page explains the product in less than one screen
the onboarding steps are visible
the user can understand every required step
IPR Card is visually distinct and legally bounded
certificate is visually distinct and legally bounded
JOKER-C2 access gate clearly shows denied or allowed state
legal, privacy and security boundaries are visible
no screen exposes raw sensitive data
no screen claims official public identity issuance

28. Canonical UI Formula

Landing explains the threshold.
Onboarding collects the state.
Review decides the identity.
IPR Card operationalizes the subject.
Certificate authorizes the scope.
Access gate protects JOKER-C2.
Boundary pages protect the claim.

29. Organization

HERMETICUM B.C.E. S.r.l.

30. Canonical Trademark

HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA

HERMETICUM B.C.E. S.r.l.

