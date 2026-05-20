# HBCE IPR Onboarding App — API Specification

## 1. Purpose

This document defines the API specification for HBCE IPR Onboarding App.

The API layer supports:

- onboarding session creation;
- identity data submission;
- document metadata submission;
- fiscal or national identifier submission;
- photo/video verification state;
- review decision;
- IPR Verified status;
- IPR Card issuance;
- operational certificate activation;
- governed JOKER-C2 access decision;
- future EVT and OPC integration.

The core API rule is:

```txt
No verified IPR, no governed JOKER-C2 access.

2. API Security Principle

The API must never trust frontend-only state.

The API must not grant JOKER-C2 access because of:

browser state
local storage
query parameters
hidden form fields
unsigned frontend payloads
manual client-side status changes

All final access decisions must be evaluated server-side.

3. Default API Decision

The default decision must be:

deny_access

Access may be allowed only when:

ipr_status = verified
ipr_card_status = issued
certificate_status = active
revocation_state = clear

4. Suggested API Route Map

POST /api/onboarding/start
POST /api/onboarding/identity
POST /api/onboarding/documents
POST /api/onboarding/fiscal
POST /api/onboarding/photo-video
GET  /api/onboarding/status
POST /api/onboarding/review

POST /api/ipr/verify
POST /api/ipr-card/issue
GET  /api/ipr-card/status

POST /api/certificate/activate
GET  /api/certificate/status

POST /api/access/joker-c2
GET  /api/access/joker-c2/status

POST /api/events
GET  /api/events

POST /api/opc/proof
GET  /api/opc/proof

POST /api/revocation
GET  /api/revocation/status

5. Standard Response Format

All API responses should follow a consistent format.

{
  "ok": true,
  "status": "success",
  "message": "Operation completed",
  "data": {},
  "error": null
}

Failure format:

{
  "ok": false,
  "status": "error",
  "message": "Operation failed",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "details": "Required field is missing"
  }
}

6. POST /api/onboarding/start

Purpose:

Create the initial onboarding session.

Required request fields:

{
  "email": "demo@example.com",
  "first_name": "Demo",
  "last_name": "Subject",
  "country": "IT",
  "accept_terms": true,
  "accept_privacy": true
}

Successful response data:

{
  "subject_id": "sub_demo_001",
  "onboarding_id": "onb_demo_001",
  "onboarding_status": "started",
  "email_status": "pending",
  "ipr_status": "not_created",
  "joker_c2_access_status": "denied"
}

Failure conditions:

missing_email
invalid_email
terms_not_accepted
privacy_not_accepted
duplicate_active_onboarding

Generated event:

ONBOARDING_STARTED

7. POST /api/onboarding/identity

Purpose:

Submit identity data for the operational identity record.

Required request fields:

{
  "onboarding_id": "onb_demo_001",
  "first_name": "Demo",
  "last_name": "Subject",
  "date_of_birth": "1988-02-05",
  "place_of_birth": "Bologna",
  "country": "IT",
  "nationality": "IT",
  "residential_country": "IT"
}

Successful response data:

{
  "onboarding_id": "onb_demo_001",
  "identity_data_status": "submitted"
}

Failure conditions:

missing_required_field
invalid_date_format
invalid_country
unsupported_jurisdiction
onboarding_not_found

Generated event:

IDENTITY_DATA_SUBMITTED

8. POST /api/onboarding/documents

Purpose:

Submit official document metadata and protected document references.

Required request fields:

{
  "onboarding_id": "onb_demo_001",
  "document_type": "identity_card",
  "document_country": "IT",
  "document_expiry_date": "2035-02-05",
  "document_number_hash": "sha256_demo_document_number_hash",
  "document_file_hash": "sha256_demo_document_file_hash",
  "document_storage_reference": "protected_storage_reference_demo"
}

Successful response data:

{
  "onboarding_id": "onb_demo_001",
  "document_status": "submitted"
}

Forbidden request content:

raw_document_image
raw_document_scan
raw_document_number
unprotected_document_url

Failure conditions:

missing_document_type
unsupported_document_type
expired_document
missing_hash_reference
invalid_storage_reference
onboarding_not_found

Generated event:

DOCUMENT_SUBMITTED

9. POST /api/onboarding/fiscal

Purpose:

Submit fiscal code, tax identifier or national identification number metadata.

Required request fields:

{
  "onboarding_id": "onb_demo_001",
  "fiscal_identifier_type": "fiscal_code",
  "fiscal_identifier_country": "IT",
  "fiscal_identifier_hash": "sha256_demo_fiscal_identifier_hash",
  "fiscal_identifier_masked": "CLT*********44R"
}

Successful response data:

{
  "onboarding_id": "onb_demo_001",
  "fiscal_identifier_status": "submitted"
}

Forbidden request content:

raw_fiscal_identifier
raw_tax_identifier
raw_national_identifier

Failure conditions:

missing_identifier_type
missing_identifier_country
missing_identifier_hash
unsupported_identifier_type
onboarding_not_found

Generated event:

FISCAL_IDENTIFIER_SUBMITTED

10. POST /api/onboarding/photo-video

Purpose:

Submit or simulate photo/video verification state.

MVP request fields:

{
  "onboarding_id": "onb_demo_001",
  "photo_verification_status": "submitted",
  "video_verification_status": "submitted",
  "liveness_status": "manual_review"
}

Successful response data:

{
  "onboarding_id": "onb_demo_001",
  "photo_verification_status": "submitted",
  "video_verification_status": "submitted",
  "liveness_status": "manual_review"
}

Forbidden repository and API content in MVP:

real_photo
real_video
biometric_template
liveness_recording
face_template

Failure conditions:

invalid_photo_status
invalid_video_status
invalid_liveness_status
onboarding_not_found

Generated event:

PHOTO_VIDEO_SUBMITTED

11. GET /api/onboarding/status

Purpose:

Return the current onboarding status for the subject.

Query parameter:

onboarding_id

Successful response data:

{
  "onboarding_id": "onb_demo_001",
  "onboarding_status": "pending_review",
  "email_status": "verified",
  "identity_data_status": "submitted",
  "document_status": "submitted",
  "fiscal_identifier_status": "submitted",
  "photo_verification_status": "submitted",
  "video_verification_status": "submitted",
  "review_status": "pending_review",
  "ipr_status": "pending",
  "joker_c2_access_status": "denied"
}

Forbidden response content:

raw_identity_document
raw_document_number
raw_fiscal_identifier
raw_photo
raw_video
private_review_notes

12. POST /api/onboarding/review

Purpose:

Assign review decision to an onboarding case.

MVP request fields:

{
  "onboarding_id": "onb_demo_001",
  "review_decision": "approve",
  "reviewer_reference": "operator_demo"
}

Allowed decisions:

approve
reject
request_more_information
expire
suspend
revoke

Successful approval response data:

{
  "onboarding_id": "onb_demo_001",
  "review_status": "approved",
  "ipr_status": "verified"
}

Failure conditions:

invalid_review_decision
onboarding_not_found
missing_required_steps
operator_not_authorized

Generated events:

REVIEW_APPROVED
REVIEW_REJECTED
REVIEW_NEEDS_MORE_INFORMATION
IPR_VERIFIED

13. POST /api/ipr/verify

Purpose:

Create or confirm IPR Verified status after approved review.

Required request fields:

{
  "onboarding_id": "onb_demo_001",
  "subject_id": "sub_demo_001"
}

Required conditions:

review_status = approved
email_status = verified
identity_data_status = submitted
document_status = submitted
fiscal_identifier_status = submitted
photo_verification_status = approved
video_verification_status = approved
revocation_state = clear

Successful response data:

{
  "ipr_id": "IPR-HBCE-DEMO-001",
  "ipr_status": "verified",
  "issuer": "HERMETICUM B.C.E. S.r.l."
}

Failure conditions:

review_not_approved
identity_incomplete
document_incomplete
fiscal_identifier_incomplete
photo_video_incomplete
revoked_or_suspended

Generated event:

IPR_VERIFIED

14. POST /api/ipr-card/issue

Purpose:

Issue the internal IPR Card after verified IPR status.

Required request fields:

{
  "ipr_id": "IPR-HBCE-DEMO-001",
  "subject_id": "sub_demo_001"
}

Required conditions:

ipr_status = verified
revocation_state = clear

Successful response data:

{
  "ipr_card_id": "CARD-HBCE-DEMO-001",
  "ipr_id": "IPR-HBCE-DEMO-001",
  "card_status": "issued",
  "issuer": "HERMETICUM B.C.E. S.r.l.",
  "access_scope": "JOKER-C2-GOVERNED-RUNTIME",
  "revocation_state": "clear"
}

Failure conditions:

ipr_not_verified
ipr_revoked
ipr_suspended
card_already_revoked

Generated event:

IPR_CARD_ISSUED

15. GET /api/ipr-card/status

Purpose:

Return public-safe IPR Card status.

Allowed response fields:

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

Forbidden response fields:

raw_identity_data
raw_document_data
raw_fiscal_identifier
raw_photo
raw_video
biometric_material

16. POST /api/certificate/activate

Purpose:

Activate the internal operational certificate reference.

Required request fields:

{
  "ipr_id": "IPR-HBCE-DEMO-001",
  "ipr_card_id": "CARD-HBCE-DEMO-001"
}

Required conditions:

ipr_status = verified
ipr_card_status = issued
revocation_state = clear

Successful response data:

{
  "certificate_id": "CERT-HBCE-DEMO-001",
  "ipr_id": "IPR-HBCE-DEMO-001",
  "certificate_status": "active",
  "issuer": "HERMETICUM B.C.E. S.r.l.",
  "scope": "JOKER-C2-GOVERNED-RUNTIME",
  "hash_reference": "sha256_demo_certificate_hash",
  "revocation_state": "clear"
}

Legal boundary:

The operational certificate is internal to HBCE.
It is not a qualified eIDAS certificate unless issued through a recognized and compliant trust service integration.

Generated event:

CERTIFICATE_CREATED

17. GET /api/certificate/status

Purpose:

Return operational certificate status.

Allowed response fields:

{
  "certificate_id": "CERT-HBCE-DEMO-001",
  "ipr_id": "IPR-HBCE-DEMO-001",
  "certificate_status": "active",
  "issuer": "HERMETICUM B.C.E. S.r.l.",
  "scope": "JOKER-C2-GOVERNED-RUNTIME",
  "hash_reference": "sha256_demo_certificate_hash",
  "revocation_state": "clear"
}

18. POST /api/access/joker-c2

Purpose:

Evaluate governed access to JOKER-C2.

Required request fields:

{
  "subject_id": "sub_demo_001",
  "ipr_id": "IPR-HBCE-DEMO-001"
}

Required allow conditions:

ipr_status = verified
ipr_card_status = issued
certificate_status = active
revocation_state = clear

Default decision:

deny_access

Allowed response when access is denied:

{
  "decision": "deny_access",
  "decision_reason": "IPR status is not verified",
  "joker_c2_access_status": "denied"
}

Allowed response when access is enabled:

{
  "decision": "allow_governed_access",
  "decision_reason": "Verified IPR, issued IPR Card, active certificate and clear revocation state",
  "joker_c2_access_status": "enabled",
  "joker_c2_gateway_reference": "https://hbce-ai-joker-c2.vercel.app/interface"
}

Generated events:

JOKER_C2_ACCESS_ENABLED
JOKER_C2_ACCESS_DENIED

19. GET /api/access/joker-c2/status

Purpose:

Return current JOKER-C2 access status.

Allowed response fields:

{
  "ipr_id": "IPR-HBCE-DEMO-001",
  "ipr_status": "verified",
  "ipr_card_status": "issued",
  "certificate_status": "active",
  "revocation_state": "clear",
  "joker_c2_access_status": "enabled",
  "decision": "allow_governed_access"
}

Forbidden response fields:

raw_identity_data
raw_document_data
raw_fiscal_identifier
raw_photo
raw_video
private_review_notes

20. POST /api/events

Purpose:

Create a mock or real EVT-ready event reference.

Request fields:

{
  "event_type": "IPR_VERIFIED",
  "subject_id": "sub_demo_001",
  "ipr_id": "IPR-HBCE-DEMO-001",
  "onboarding_id": "onb_demo_001",
  "previous_event_reference": "evt_demo_previous",
  "decision_state": "approved"
}

Response fields:

{
  "event_reference_id": "evt_demo_001",
  "event_type": "IPR_VERIFIED",
  "event_hash": "sha256_demo_event_hash",
  "event_timestamp": "2026-05-20T12:00:00+02:00"
}

Boundary:

Events must contain minimized operational references.
Events must not expose raw identity documents, raw fiscal identifiers, photos, videos or biometric material.

21. POST /api/opc/proof

Purpose:

Create a mock or real OPC-ready proof reference.

Request fields:

{
  "linked_event_id": "evt_demo_001",
  "ipr_id": "IPR-HBCE-DEMO-001",
  "operation_scope": "IPR_CARD_ISSUANCE",
  "input_hash": "sha256_demo_input_hash",
  "output_hash": "sha256_demo_output_hash",
  "decision_hash": "sha256_demo_decision_hash",
  "policy_snapshot_hash": "sha256_demo_policy_hash"
}

Response fields:

{
  "proof_id": "opc_demo_001",
  "linked_event_id": "evt_demo_001",
  "ipr_id": "IPR-HBCE-DEMO-001",
  "proof_status": "created",
  "created_at": "2026-05-20T12:00:00+02:00",
  "issuer": "HERMETICUM B.C.E. S.r.l."
}

22. POST /api/revocation

Purpose:

Suspend, revoke or expire IPR, IPR Card, certificate or JOKER-C2 access.

Request fields:

{
  "target_type": "ipr",
  "target_id": "IPR-HBCE-DEMO-001",
  "revocation_state": "revoked",
  "reason_code": "manual_operator_revocation",
  "issued_by": "operator_demo"
}

Allowed target types:

ipr
ipr_card
certificate
joker_c2_access
onboarding_record

Allowed revocation states:

clear
suspended
revoked
expired
under_review

Rule:

Any revocation_state other than clear must deny JOKER-C2 access.

Generated events:

IPR_SUSPENDED
IPR_REVOKED
JOKER_C2_ACCESS_DENIED

23. Validation Rules

All API endpoints must validate:

required fields
allowed status values
allowed enum values
date formats
hash reference formats
onboarding existence
subject existence
IPR existence
revocation state
authorization level

Invalid input must not produce downstream operational state.

24. Sensitive Data Rules

API endpoints must not return:

raw identity documents
raw document numbers
raw fiscal identifiers
raw tax identifiers
raw national identification numbers
raw photos
raw videos
biometric templates
private review notes
private storage URLs
production secrets
private keys
access tokens

25. Logging Rules

API logs may include:

event_type
subject_reference
ipr_reference
decision_state
timestamp
status_code
error_code

API logs must not include:

raw identity document
raw document number
raw fiscal identifier
raw photo
raw video
biometric material
private review note
secret
token
private key

26. API Acceptance Criteria

The API layer is acceptable when:

all endpoints deny unsafe or incomplete requests
JOKER-C2 access is denied by default
JOKER-C2 access is allowed only with verified IPR, issued card, active certificate and clear revocation state
no endpoint exposes raw sensitive identity data
no endpoint relies only on frontend state
events can be generated for major operations
proof references can be generated for major decisions
revocation overrides previous approval

27. Canonical API Formula

API receives onboarding state.
API validates operational requirements.
API protects sensitive material.
API records event references.
API prepares proof references.
API denies by default.
API enables JOKER-C2 only after verified IPR.

28. Organization

HERMETICUM B.C.E. S.r.l.

29. Canonical Trademark

HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA

HERMETICUM B.C.E. S.r.l.

