# HBCE IPR Onboarding App — Testing Checklist

## 1. Purpose

This document defines the testing checklist for HBCE IPR Onboarding App.

The MVP must prove that the onboarding app is not a generic login interface.

It must prove:

```txt
No verified IPR, no governed JOKER-C2 access.

2. Test Scope

The first test cycle covers:

public pages
onboarding pages
IPR Card page
operational certificate page
JOKER-C2 access gate page
legal boundary page
privacy boundary page
security boundary page
mock API endpoints
fail-closed access logic
sensitive data exclusion
deployment readiness

3. Page Route Tests

The following routes must load without runtime errors:

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

Expected result:

Every route renders correctly.
No route exposes raw sensitive identity material.
No route claims official public identity issuance.

4. API Route Tests

The following API routes must return JSON responses:

/api/health
/api/manifest
/api/onboarding/status
/api/onboarding/start
/api/onboarding/identity
/api/onboarding/documents
/api/onboarding/fiscal
/api/onboarding/photo-video
/api/onboarding/review
/api/ipr/verify
/api/ipr-card/status
/api/ipr-card/issue
/api/certificate/status
/api/certificate/activate
/api/access/joker-c2
/api/events
/api/opc/proof
/api/revocation

Expected result:

Every API returns a structured JSON response with ok, status, message, data and error fields where applicable.

5. Health Check Test

Endpoint:

GET /api/health

Expected result:

status = healthy
mode = mvp
sensitive_data_exposed = false
production_identity_verification = false
joker_c2_access_default = deny_access

6. Manifest Test

Endpoint:

GET /api/manifest

Expected result:

mode = mvp
official_identity_issuance = false
banking_service = false
qualified_eidas_certificate_issuance = false
sensitive_data_exposed = false
joker_c2_access_default = deny_access

The manifest must list page routes and API routes.

7. Onboarding Status Tests

Endpoint:

GET /api/onboarding/status?mode=approved

Expected result:

ipr_status = verified
ipr_card_status = issued
certificate_status = active
revocation_state = clear
joker_c2_access_status = enabled

Endpoint:

GET /api/onboarding/status?mode=pending

Expected result:

joker_c2_access_status = denied

Endpoint:

GET /api/onboarding/status?mode=denied

Expected result:

ipr_status = rejected
joker_c2_access_status = denied

Endpoint:

GET /api/onboarding/status?mode=revoked

Expected result:

revocation_state = revoked
joker_c2_access_status = revoked

8. Access Gate Tests

Endpoint:

GET /api/access/joker-c2?mode=approved

Expected result:

decision = allow_governed_access
jokerC2AccessStatus = enabled

Endpoint:

GET /api/access/joker-c2?mode=pending

Expected result:

decision = deny_access
jokerC2AccessStatus = denied

Endpoint:

GET /api/access/joker-c2?mode=denied

Expected result:

decision = deny_access
jokerC2AccessStatus = denied

Endpoint:

GET /api/access/joker-c2?mode=revoked

Expected result:

decision = deny_access
jokerC2AccessStatus = denied

9. Fail-Closed Logic Test

The access gate must allow access only when all conditions are valid:

ipr_status = verified
ipr_card_status = issued
certificate_status = active
revocation_state = clear

If one condition is missing or invalid, expected result:

decision = deny_access

10. Onboarding Start API Test

Endpoint:

POST /api/onboarding/start

Valid demo request:

{
  "email": "demo@example.com",
  "first_name": "Demo",
  "last_name": "Subject",
  "country": "IT",
  "accept_terms": true,
  "accept_privacy": true
}

Expected result:

onboarding_status = started
email_status = pending
ipr_status = not_created
ipr_card_status = not_issued
certificate_status = not_created
joker_c2_access_status = denied
next_route = /onboarding/identity

Invalid request test:

{
  "email": "demo@example.com",
  "first_name": "Demo",
  "last_name": "Subject",
  "country": "IT",
  "accept_terms": false,
  "accept_privacy": true
}

Expected result:

ok = false
error.code = TERMS_NOT_ACCEPTED

11. Identity API Test

Endpoint:

POST /api/onboarding/identity

Valid demo request:

{
  "onboarding_id": "onb_demo_test",
  "first_name": "Demo",
  "last_name": "Subject",
  "date_of_birth": "1988-02-05",
  "place_of_birth": "Bologna",
  "country": "IT",
  "nationality": "IT",
  "residential_country": "IT"
}

Expected result:

identity_data_status = submitted
document_status = not_started
joker_c2_access_status = denied
next_route = /onboarding/documents

12. Documents API Test

Endpoint:

POST /api/onboarding/documents

Valid demo request:

{
  "onboarding_id": "onb_demo_test",
  "document_type": "identity_card",
  "document_country": "IT",
  "document_expiry_date": "2035-02-05",
  "document_number_hash": "sha256_demo_document_number_hash",
  "document_file_hash": "sha256_demo_document_file_hash",
  "document_storage_reference": "protected_storage_reference_demo"
}

Expected result:

document_status = submitted
joker_c2_access_status = denied
next_route = /onboarding/fiscal

Forbidden request test:

{
  "onboarding_id": "onb_demo_test",
  "document_type": "identity_card",
  "document_country": "IT",
  "document_expiry_date": "2035-02-05",
  "raw_document_number": "FORBIDDEN_RAW_VALUE",
  "document_number_hash": "sha256_demo_document_number_hash",
  "document_file_hash": "sha256_demo_document_file_hash",
  "document_storage_reference": "protected_storage_reference_demo"
}

Expected result:

ok = false
error.code = FORBIDDEN_DOCUMENT_MATERIAL

13. Fiscal Identifier API Test

Endpoint:

POST /api/onboarding/fiscal

Valid demo request:

{
  "onboarding_id": "onb_demo_test",
  "fiscal_identifier_type": "fiscal_code",
  "fiscal_identifier_country": "IT",
  "fiscal_identifier_hash": "sha256_demo_fiscal_identifier_hash",
  "fiscal_identifier_masked": "DEM*********VED"
}

Expected result:

fiscal_identifier_status = submitted
joker_c2_access_status = denied
next_route = /onboarding/photo-video

Forbidden request test:

{
  "onboarding_id": "onb_demo_test",
  "fiscal_identifier_type": "fiscal_code",
  "fiscal_identifier_country": "IT",
  "raw_fiscal_identifier": "FORBIDDEN_RAW_VALUE",
  "fiscal_identifier_hash": "sha256_demo_fiscal_identifier_hash",
  "fiscal_identifier_masked": "DEM*********VED"
}

Expected result:

ok = false
error.code = FORBIDDEN_FISCAL_IDENTIFIER_MATERIAL

14. Photo / Video API Test

Endpoint:

POST /api/onboarding/photo-video

Valid demo request:

{
  "onboarding_id": "onb_demo_test",
  "photo_reference": "protected_photo_reference_demo",
  "video_reference": "protected_video_reference_demo",
  "photo_hash": "sha256_demo_photo_hash",
  "video_hash": "sha256_demo_video_hash",
  "photo_verification_status": "submitted",
  "video_verification_status": "submitted",
  "liveness_status": "manual_review"
}

Expected result:

photo_verification_status = submitted
video_verification_status = submitted
review_status = pending_review
joker_c2_access_status = denied
next_route = /onboarding/review

Forbidden request test:

{
  "onboarding_id": "onb_demo_test",
  "raw_photo": "FORBIDDEN_RAW_VALUE",
  "photo_reference": "protected_photo_reference_demo",
  "video_reference": "protected_video_reference_demo",
  "photo_hash": "sha256_demo_photo_hash",
  "video_hash": "sha256_demo_video_hash",
  "photo_verification_status": "submitted",
  "video_verification_status": "submitted",
  "liveness_status": "manual_review"
}

Expected result:

ok = false
error.code = FORBIDDEN_PHOTO_VIDEO_MATERIAL

15. Review API Test

Endpoint:

POST /api/onboarding/review

Approved request:

{
  "onboarding_id": "onb_demo_test",
  "subject_id": "sub_demo_test",
  "review_decision": "approve"
}

Expected result:

review_status = approved
ipr_status = verified
ipr_card_status = pending
certificate_status = pending
joker_c2_access_status = denied
next_route = /ipr-card

Rejected request:

{
  "onboarding_id": "onb_demo_test",
  "subject_id": "sub_demo_test",
  "review_decision": "reject"
}

Expected result:

review_status = rejected
ipr_status = rejected
joker_c2_access_status = denied

Revoked request:

{
  "onboarding_id": "onb_demo_test",
  "subject_id": "sub_demo_test",
  "review_decision": "revoke"
}

Expected result:

review_status = revoked
ipr_status = revoked
revocation_state = revoked
joker_c2_access_status = revoked

16. IPR Verification API Test

Endpoint:

POST /api/ipr/verify

Valid request:

{
  "onboarding_id": "onb_demo_test",
  "subject_id": "sub_demo_test",
  "review_status": "approved",
  "revocation_state": "clear"
}

Expected result:

ipr_status = verified
ipr_card_status = pending
certificate_status = pending
joker_c2_access_status = denied
next_route = /ipr-card

Invalid request:

{
  "onboarding_id": "onb_demo_test",
  "subject_id": "sub_demo_test",
  "review_status": "pending",
  "revocation_state": "clear"
}

Expected result:

ok = false
error.code = REVIEW_NOT_APPROVED

17. IPR Card Issue API Test

Endpoint:

POST /api/ipr-card/issue

Valid request:

{
  "ipr_id": "IPR-HBCE-DEMO-TEST",
  "subject_id": "sub_demo_test",
  "ipr_status": "verified",
  "revocation_state": "clear"
}

Expected result:

card_status = issued
certificate_status = pending
joker_c2_access_status = denied
next_route = /certificate

Invalid request:

{
  "ipr_id": "IPR-HBCE-DEMO-TEST",
  "subject_id": "sub_demo_test",
  "ipr_status": "pending",
  "revocation_state": "clear"
}

Expected result:

ok = false
error.code = IPR_NOT_VERIFIED

18. Certificate Activation API Test

Endpoint:

POST /api/certificate/activate

Valid request:

{
  "ipr_id": "IPR-HBCE-DEMO-TEST",
  "ipr_card_id": "CARD-HBCE-DEMO-TEST",
  "subject_id": "sub_demo_test",
  "ipr_status": "verified",
  "ipr_card_status": "issued",
  "revocation_state": "clear"
}

Expected result:

certificate_status = active
joker_c2_access_status = pending
next_route = /access/joker-c2

Invalid request:

{
  "ipr_id": "IPR-HBCE-DEMO-TEST",
  "ipr_card_id": "CARD-HBCE-DEMO-TEST",
  "subject_id": "sub_demo_test",
  "ipr_status": "verified",
  "ipr_card_status": "pending",
  "revocation_state": "clear"
}

Expected result:

ok = false
error.code = IPR_CARD_NOT_ISSUED

19. Revocation API Test

Endpoint:

POST /api/revocation

Valid request:

{
  "subject_id": "sub_demo_test",
  "ipr_id": "IPR-HBCE-DEMO-TEST",
  "target_type": "ipr",
  "target_id": "IPR-HBCE-DEMO-TEST",
  "revocation_state": "revoked",
  "reason_code": "manual_operator_revocation"
}

Expected result:

revocation_state = revoked
joker_c2_access_blocked = true

20. EVT Endpoint Test

Endpoint:

GET /api/events

Expected result:

events array returned
event references contain no raw identity data
event references contain no raw document data

Endpoint:

POST /api/events

Valid request:

{
  "event_type": "IPR_VERIFIED",
  "subject_id": "sub_demo_test",
  "ipr_id": "IPR-HBCE-DEMO-TEST",
  "onboarding_id": "onb_demo_test",
  "decision_state": "approved"
}

Expected result:

eventReferenceId created
eventType = IPR_VERIFIED
eventHash created

21. OPC Endpoint Test

Endpoint:

GET /api/opc/proof

Expected result:

proof references returned
proof references contain no raw identity data

Endpoint:

POST /api/opc/proof

Valid request:

{
  "linked_event_id": "evt_demo_test",
  "ipr_id": "IPR-HBCE-DEMO-TEST",
  "operation_scope": "JOKER_C2_ACCESS_DECISION"
}

Expected result:

proofId created
proofStatus = created
issuer = HERMETICUM B.C.E. S.r.l.

22. Sensitive Data Scan

Before deploy, verify that the repository does not contain:

real identity documents
real fiscal identifiers
real document numbers
real photos
real videos
biometric templates
private keys
API keys
database credentials
storage credentials
.env
.env.local

23. Legal Claim Test

The UI and documentation must not claim:

HBCE issues official European identity.
HBCE replaces CIE.
HBCE replaces SPID.
HBCE replaces EUDI Wallet.
HBCE issues qualified eIDAS certificates by itself.
HBCE provides banking services.

Expected result:

All public claims remain within internal operational identity boundary.

24. Build Test

The app should pass:

npm run typecheck
npm run lint
npm run build

Expected result:

No TypeScript errors.
No lint errors.
Build succeeds.

25. MVP Acceptance

The MVP passes testing when:

all pages load
all API routes respond
access gate denies by default
access gate allows only approved valid state
revocation blocks access
legal boundary is visible
privacy boundary is visible
security boundary is visible
no sensitive data is committed
build succeeds

26. Testing Formula

Test the route.
Test the state.
Test the denial.
Test the approval.
Test the revocation.
Test the boundary.
Test the absence of sensitive data.
Deploy only if fail-closed behavior is intact.

27. Organization

HERMETICUM B.C.E. S.r.l.

28. Canonical Trademark

HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA

HERMETICUM B.C.E. S.r.l.

