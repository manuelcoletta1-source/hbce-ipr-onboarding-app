# HBCE IPR Onboarding App — Data Model

## 1. Purpose

This document defines the minimum operational data model for HBCE IPR Onboarding App.

The app is designed to support:

- identity onboarding;
- document verification metadata;
- fiscal or national identifier linkage;
- photo and video verification state;
- review workflow;
- IPR Verified status;
- IPR Card issuance;
- operational certificate state;
- governed JOKER-C2 access;
- future EVT and OPC integration.

The core rule is:

```txt
No verified IPR, no governed JOKER-C2 access.

2. Data Model Principle

The data model must separate:

raw sensitive data
protected storage references
hash references
operational status values
public-safe display values
audit event references
access decision state

The repository must never contain real raw identity data.

3. Main Entities

The minimum entities are:

Subject
OnboardingRecord
IdentityProfile
DocumentRecord
FiscalIdentifierRecord
PhotoVideoVerification
ReviewRecord
IPRRecord
IPRCard
OperationalCertificate
AccessGateDecision
AuditEventReference
RevocationRecord

4. Subject

The Subject represents the person being onboarded.

Minimum fields:

subject_id
email_hash
first_name
last_name
country
preferred_language
created_at
updated_at

Notes:

email_hash should be used where possible for minimized references.
first_name and last_name may be needed for private operational views.
public views should avoid exposing full personal data.

5. OnboardingRecord

The OnboardingRecord tracks the full onboarding process.

Minimum fields:

onboarding_id
subject_id
onboarding_status
current_step
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
joker_c2_access_status
revocation_state
created_at
updated_at

Allowed onboarding_status values:

not_started
started
in_progress
pending_review
approved
rejected
needs_more_information
expired
revoked
suspended
completed

Allowed current_step values:

start
identity
documents
fiscal
photo_video
review
ipr_card
certificate
joker_c2_access
completed
blocked

6. IdentityProfile

The IdentityProfile stores identity data required for the operational identity record.

Minimum fields:

identity_profile_id
subject_id
first_name
last_name
date_of_birth
place_of_birth
country
nationality
residential_country
residential_region
residential_city
identity_data_status
created_at
updated_at

Allowed identity_data_status values:

not_started
submitted
in_review
approved
rejected
needs_more_information
expired

Privacy boundary:

Identity data must remain private.
Identity data must not be exposed in public routes.
Identity data must not be stored in mock examples using real persons.

7. DocumentRecord

The DocumentRecord stores document metadata and protected references.

Minimum fields:

document_record_id
subject_id
onboarding_id
document_type
document_country
document_expiry_date
document_number_hash
document_file_hash
document_storage_reference
document_status
created_at
updated_at

Allowed document_type values:

identity_card
passport
driving_license
residence_document
other_official_document

Allowed document_status values:

not_started
submitted
in_review
approved
rejected
expired
needs_more_information

Forbidden fields in public output:

raw_document_number
raw_document_image
raw_document_scan
unprotected_document_url

Repository boundary:

No real document image must be committed.
No real document number must be committed.
No real document scan must be committed.

8. FiscalIdentifierRecord

The FiscalIdentifierRecord links the subject to a fiscal code, tax identifier or national identification number.

Minimum fields:

fiscal_identifier_id
subject_id
onboarding_id
fiscal_identifier_type
fiscal_identifier_country
fiscal_identifier_hash
fiscal_identifier_masked
fiscal_identifier_status
created_at
updated_at

Allowed fiscal_identifier_type values:

fiscal_code
tax_identifier
national_identification_number
social_security_style_number
other_public_identifier

Allowed fiscal_identifier_status values:

not_started
submitted
in_review
approved
rejected
needs_more_information

Display rule:

Only masked values may be shown in the interface.

Example:

CLT*********44R

9. PhotoVideoVerification

The PhotoVideoVerification entity tracks photo and video verification state.

Minimum fields:

photo_video_verification_id
subject_id
onboarding_id
photo_reference
video_reference
photo_hash
video_hash
photo_verification_status
video_verification_status
liveness_status
created_at
updated_at

Allowed status values:

not_started
pending
submitted
manual_review
approved
rejected
expired
needs_more_information

MVP rule:

The MVP may use placeholder states only.
Real photos and videos must not be committed to the repository.

Production boundary:

Real photo and video verification requires protected storage, lawful processing, access control and provider review.

10. ReviewRecord

The ReviewRecord tracks the decision process before IPR Verified status.

Minimum fields:

review_id
subject_id
onboarding_id
review_status
risk_flags
review_decision
reviewer_reference
review_notes_private
decision_timestamp
created_at
updated_at

Allowed review_status values:

not_started
in_progress
pending_review
approved
rejected
needs_more_information
expired
revoked

Allowed review_decision values:

none
approve
reject
request_more_information
expire
revoke
suspend

Privacy boundary:

review_notes_private must never be exposed publicly.
reviewer_reference should be minimized where possible.

Fail-closed rule:

Only review_status = approved may generate IPR Verified status.

11. IPRRecord

The IPRRecord represents the internal operational identity record.

Minimum fields:

ipr_id
subject_id
onboarding_id
ipr_status
issuer
issued_at
expires_at
scope
hash_reference
previous_ipr_reference
created_at
updated_at

Allowed ipr_status values:

not_created
pending
verified
rejected
expired
revoked
suspended

Only this value enables downstream issuance:

verified

Canonical meaning:

IPR identifies the operational subject inside the HBCE ecosystem.
IPR connects identity, verification, access and audit continuity.
IPR is not an official public identity document.

12. IPRCard

The IPRCard represents the operational card issued after verified IPR status.

Minimum fields:

ipr_card_id
ipr_id
subject_id
card_status
issuer
issued_at
expires_at
access_scope
certificate_reference
revocation_state
card_hash_reference
created_at
updated_at

Allowed card_status values:

not_issued
pending
issued
expired
revoked
suspended

Public-safe display fields:

ipr_card_id
ipr_id
card_status
issuer
issued_at
expires_at
access_scope
revocation_state

Forbidden public display fields:

raw identity data
raw document data
raw fiscal identifier
raw photo
raw video
biometric material

13. OperationalCertificate

The OperationalCertificate links the verified IPR to governed access.

Minimum fields:

certificate_id
ipr_id
subject_id
certificate_status
issuer
issued_at
expires_at
scope
hash_reference
revocation_state
created_at
updated_at

Allowed certificate_status values:

not_created
pending
active
expired
revoked
suspended

Legal boundary:

The operational certificate is internal to HBCE.
It is not a qualified eIDAS certificate unless issued through a recognized and compliant trust service integration.

14. AccessGateDecision

The AccessGateDecision determines whether the subject may access JOKER-C2.

Minimum fields:

access_decision_id
subject_id
ipr_id
ipr_status
ipr_card_status
certificate_status
revocation_state
joker_c2_access_status
decision
decision_reason
decided_at
created_at

Allowed joker_c2_access_status values:

denied
pending
enabled
disabled
revoked
suspended

Allowed decision values:

deny_access
allow_governed_access

Default decision:

deny_access

Minimum allow conditions:

ipr_status = verified
ipr_card_status = issued
certificate_status = active
revocation_state = clear

15. AuditEventReference

The AuditEventReference prepares the system for EVT and OPC integration.

Minimum fields:

event_reference_id
event_type
subject_id
ipr_id
onboarding_id
previous_event_reference
event_hash
event_timestamp
decision_state
created_at

Suggested event_type values:

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

Boundary:

Audit events should store minimized operational references.
Audit events should not expose raw identity documents or raw biometric material.

16. RevocationRecord

The RevocationRecord tracks suspension, revocation and expiry.

Minimum fields:

revocation_id
subject_id
ipr_id
target_type
target_id
revocation_state
reason_code
issued_by
issued_at
created_at
updated_at

Allowed target_type values:

ipr
ipr_card
certificate
joker_c2_access
onboarding_record

Allowed revocation_state values:

clear
suspended
revoked
expired
under_review

Rule:

Any state other than clear must deny JOKER-C2 access.

17. Minimal JSON Example

This example uses synthetic data only.

{
  "subject_id": "sub_demo_001",
  "ipr_id": "IPR-HBCE-DEMO-001",
  "onboarding_status": "completed",
  "email_status": "verified",
  "identity_data_status": "approved",
  "document_status": "approved",
  "fiscal_identifier_status": "approved",
  "photo_verification_status": "approved",
  "video_verification_status": "approved",
  "review_status": "approved",
  "ipr_status": "verified",
  "ipr_card_status": "issued",
  "certificate_status": "active",
  "revocation_state": "clear",
  "joker_c2_access_status": "enabled"
}

18. Public-Safe IPR Card JSON Example

{
  "ipr_card_id": "CARD-HBCE-DEMO-001",
  "ipr_id": "IPR-HBCE-DEMO-001",
  "card_status": "issued",
  "issuer": "HERMETICUM B.C.E. S.r.l.",
  "issued_at": "2026-05-20T12:00:00+02:00",
  "expires_at": "2027-05-20T12:00:00+02:00",
  "access_scope": "JOKER-C2-GOVERNED-RUNTIME",
  "revocation_state": "clear"
}

19. Access Decision JSON Example

{
  "access_decision_id": "access_demo_001",
  "subject_id": "sub_demo_001",
  "ipr_id": "IPR-HBCE-DEMO-001",
  "ipr_status": "verified",
  "ipr_card_status": "issued",
  "certificate_status": "active",
  "revocation_state": "clear",
  "joker_c2_access_status": "enabled",
  "decision": "allow_governed_access",
  "decision_reason": "verified_ipr_card_and_active_certificate",
  "decided_at": "2026-05-20T12:00:00+02:00"
}

20. Fail-Closed Access Logic

if ipr_status != "verified":
    deny_access

if ipr_card_status != "issued":
    deny_access

if certificate_status != "active":
    deny_access

if revocation_state != "clear":
    deny_access

allow_governed_access

21. Forbidden Data in Repository

The repository must never include:

real identity documents
real fiscal identifiers
real document numbers
real photos
real videos
real biometric data
real review notes
real onboarding records
production secrets
private keys
database credentials
API credentials

22. Canonical Data Formula

IPR identifies.
Documents support verification.
Hashes minimize exposure.
Statuses control access.
IPR Card operationalizes identity.
Certificate authorizes scope.
Access gate protects JOKER-C2.
EVT traces.
OPC proves.
HBCE governs.

23. Organization

HERMETICUM B.C.E. S.r.l.

24. Canonical Trademark

HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA

HERMETICUM B.C.E. S.r.l.

