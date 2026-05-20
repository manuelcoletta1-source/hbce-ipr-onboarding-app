# HBCE IPR Onboarding Flow

## 1. Purpose

HBCE IPR Onboarding Flow defines the operational sequence required to verify a subject before access to JOKER-C2.

The onboarding flow is designed as a bank-grade identity verification process for governed AI access.

The core rule is:

```txt
No verified IPR, no governed JOKER-C2 access.

2. Canonical Flow

The canonical flow is:

Start
→ Account registration
→ Email verification
→ Identity data
→ Official document
→ Fiscal or national identifier
→ Photo/video verification
→ Review
→ IPR Verified
→ IPR Card issued
→ Operational certificate active
→ JOKER-C2 access enabled

3. Flow Diagram

USER
  ↓
Landing page
  ↓
Onboarding start
  ↓
Account registration
  ↓
Email verification
  ↓
Identity form
  ↓
Document submission
  ↓
Fiscal identifier submission
  ↓
Photo/video verification
  ↓
Review queue
  ↓
Decision
  ├── rejected → Access denied
  ├── needs more information → Return to required step
  ├── expired → Restart verification
  └── approved → IPR Verified
                         ↓
                    IPR Card issued
                         ↓
              Operational certificate active
                         ↓
                  JOKER-C2 access gate
                         ↓
                 Governed runtime access

4. Step 1 — Landing Page

Route:

/

Purpose:

Explain the app, the IPR onboarding process and the difference between classic AI access and HBCE governed AI access.

User action:

Start onboarding

Allowed next route:

/onboarding/start

5. Step 2 — Account Registration

Route:

/onboarding/start

Purpose:

Create the initial onboarding session and user account reference.

Required fields:

email
first_name
last_name
country
accept_terms
accept_privacy

Generated state:

onboarding_status = started
email_status = pending
review_status = not_started
ipr_status = not_created
joker_c2_access_status = denied

Failure conditions:

missing email
invalid email
terms not accepted
privacy not accepted
duplicate active onboarding

Allowed next route:

/onboarding/identity

6. Step 3 — Email Verification

Purpose:

Confirm that the submitted email can be used for onboarding communication.

State before verification:

email_status = pending

State after verification:

email_status = verified

Failure conditions:

expired verification link
invalid token
unverified email

Fail-closed rule:

If email_status is not verified, onboarding may continue in limited mode but JOKER-C2 access must remain denied.

7. Step 4 — Identity Data Submission

Route:

/onboarding/identity

Purpose:

Collect the minimum identity information required to create an operational identity record.

Required fields:

first_name
last_name
date_of_birth
place_of_birth
country
nationality
residential_country

Optional fields:

middle_name
residential_city
residential_region
preferred_language

Generated state:

identity_data_status = submitted

Failure conditions:

missing required field
invalid date format
inconsistent country value
unsupported jurisdiction

Allowed next route:

/onboarding/documents

8. Step 5 — Official Document Submission

Route:

/onboarding/documents

Purpose:

Collect official document metadata and protected document references.

Supported document types:

identity_card
passport
driving_license
residence_document
other_official_document

Required fields:

document_type
document_country
document_expiry_date
document_reference
document_number_hash

Forbidden repository data:

raw document image
raw document scan
raw document number
unprotected storage URL

Generated state:

document_status = submitted

Failure conditions:

missing document type
expired document
unsupported document type
missing protected reference
invalid hash reference

Allowed next route:

/onboarding/fiscal

9. Step 6 — Fiscal or National Identifier Submission

Route:

/onboarding/fiscal

Purpose:

Link the subject to a fiscal code, national tax identifier or national identification number.

Required fields:

fiscal_identifier_type
fiscal_identifier_country
fiscal_identifier_hash

Supported identifier classes:

fiscal_code
tax_identifier
national_identification_number
social_security_style_number
other_public_identifier

Display rule:

Only masked values may be shown in the interface.

Example:

CLT*********44R

Generated state:

fiscal_identifier_status = submitted

Failure conditions:

missing identifier type
missing identifier country
invalid hash reference
unsupported identifier class

Allowed next route:

/onboarding/photo-video

10. Step 7 — Photo and Video Verification

Route:

/onboarding/photo-video

Purpose:

Support subject-document coherence and liveness-style verification.

MVP states:

not_started
pending
submitted
manual_review
approved
rejected
expired

Generated state:

photo_verification_status = submitted
video_verification_status = submitted

Production boundary:

Real photo and video verification requires protected storage, lawful processing, access control and provider review.

Forbidden repository data:

real photo
real video
biometric template
liveness recording
face template

Allowed next route:

/onboarding/review

11. Step 8 — Review

Route:

/onboarding/review

Purpose:

Evaluate the onboarding case and decide whether the subject may receive IPR Verified status.

Review states:

not_started
in_progress
pending_review
approved
rejected
needs_more_information
expired
revoked

Review inputs:

email_status
identity_data_status
document_status
fiscal_identifier_status
photo_verification_status
video_verification_status
risk_flags
manual_review_notes

Decision outputs:

approved
rejected
needs_more_information
expired
revoked

Fail-closed rule:

Only approved review state may create IPR Verified status.

12. Step 9 — IPR Verified Status

Purpose:

Assign internal operational identity verification status inside the HBCE ecosystem.

Required conditions:

email_status = verified
identity_data_status = submitted
document_status = submitted
fiscal_identifier_status = submitted
photo_verification_status = approved
video_verification_status = approved
review_status = approved
revocation_state = clear

Generated state:

ipr_status = verified

Blocked states:

not_created
pending
rejected
expired
revoked
suspended

If any blocked state applies, JOKER-C2 access remains denied.

13. Step 10 — IPR Card Issuance

Route:

/ipr-card

Purpose:

Issue and display the internal operational identity card.

Required condition:

ipr_status = verified

IPR Card fields:

ipr_id
subject_reference
verification_status
issue_date
expiry_date
issuer
certificate_reference
access_scope
revocation_state

Generated state:

ipr_card_status = issued

Blocked states:

not_issued
pending
rejected
expired
revoked
suspended

Public display boundary:

The IPR Card must not expose raw documents, raw fiscal identifiers, raw photos, raw videos or biometric material.

14. Step 11 — Operational Certificate

Route:

/certificate

Purpose:

Create an internal operational certificate reference for governed access.

Required conditions:

ipr_status = verified
ipr_card_status = issued
revocation_state = clear

Certificate fields:

certificate_id
ipr_id
issuer
issued_at
expires_at
scope
status
hash_reference

Generated state:

certificate_status = active

Blocked states:

not_created
pending
expired
revoked
suspended

Legal boundary:

The operational certificate is not a qualified eIDAS certificate unless issued through a recognized and compliant trust service integration.

15. Step 12 — JOKER-C2 Access Gate

Route:

/access/joker-c2

Purpose:

Allow or deny governed access to JOKER-C2.

Required access conditions:

ipr_status = verified
ipr_card_status = issued
certificate_status = active
revocation_state = clear

Default decision:

deny

Allow decision:

allow_governed_access

Deny decision:

deny_access

The access gate must not trust:

browser state
local storage
query parameters
hidden form fields
unsigned frontend payloads
manual client-side status changes

Final access decision must be server-side.

16. Return Paths

If the user must provide more information, the system may return the user to a specific step.

Examples:

needs_identity_data → /onboarding/identity
needs_document → /onboarding/documents
needs_fiscal_identifier → /onboarding/fiscal
needs_photo_video → /onboarding/photo-video
needs_review → /onboarding/review

The system should clearly explain what is missing without exposing unnecessary sensitive data.

17. Status Model

The complete onboarding status model should include:

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

18. Access Decision Logic

Minimum decision logic:

if ipr_status != "verified":
    deny_access

if ipr_card_status != "issued":
    deny_access

if certificate_status != "active":
    deny_access

if revocation_state != "clear":
    deny_access

allow_governed_access

19. Event Continuity

Each major step should generate an event reference.

Suggested event types:

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

Each event should support future EVT and OPC integration.

20. MVP Mode

The first MVP may use simulated states.

Allowed MVP behavior:

mock onboarding record
mock document metadata
mock fiscal identifier hash
mock photo/video status
mock review status
mock IPR Card
mock certificate
mock access gate

Forbidden MVP behavior:

real documents in repo
real fiscal identifiers in repo
real photos in repo
real videos in repo
real biometric data in repo
production secrets in repo
automatic JOKER-C2 access without verified IPR state

21. Production Readiness Requirements

Before production use, the flow requires:

secure authentication
encrypted storage
protected document storage
server-side review state
server-side access gate
role-based reviewer access
audit logging
retention policy
deletion policy
revocation flow
incident response
privacy review
legal review
provider review
compliance assessment

22. Canonical Flow Formula

Register.
Verify identity.
Submit official documents.
Link fiscal or national identifier.
Complete photo/video verification.
Pass review.
Receive IPR Verified.
Receive IPR Card.
Activate operational certificate.
Access JOKER-C2 through governed authorization.

23. Organization

HERMETICUM B.C.E. S.r.l.

24. Canonical Trademark

HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA

HERMETICUM B.C.E. S.r.l.
