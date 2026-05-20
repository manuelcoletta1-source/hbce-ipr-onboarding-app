# HBCE IPR Onboarding App — Routes

## 1. Purpose

This document defines the route map for HBCE IPR Onboarding App.

The application is not a generic registration website.

It is an operational identity onboarding gateway for:

- IPR Verified status;
- IPR Card issuance;
- operational certificate activation;
- governed JOKER-C2 access.

The core route rule is:

```txt
No verified IPR, no governed JOKER-C2 access.

2. Route Categories

The app routes are organized into six categories:

Public routes
Onboarding routes
Verification routes
Operational identity routes
Access gate routes
Legal and boundary routes

3. Public Routes

/

Purpose:

Landing page for the HBCE IPR Onboarding App.

Main content:

Explain the app.
Explain IPR Verified.
Explain IPR Card.
Explain governed JOKER-C2 access.
Explain that email and subscription are not enough.
Start onboarding.

Primary action:

Start IPR onboarding

Next route:

/onboarding/start

Access level:

public

Sensitive data:

none

4. Onboarding Routes

/onboarding

Purpose:

General onboarding entry point.

Main content:

Show onboarding steps.
Show required documents.
Show privacy and legal notice.
Redirect user to the current onboarding step.

Access level:

public_or_session

Sensitive data:

minimal status only

/onboarding/start

Purpose:

Create the initial onboarding session.

Required fields:

email
first_name
last_name
country
accept_terms
accept_privacy

Generated states:

onboarding_status = started
email_status = pending
ipr_status = not_created
joker_c2_access_status = denied

Next route:

/onboarding/identity

Failure route:

/onboarding/start

Access level:

public

/onboarding/identity

Purpose:

Collect identity data for the operational identity record.

Required fields:

first_name
last_name
date_of_birth
place_of_birth
country
nationality
residential_country

Generated state:

identity_data_status = submitted

Next route:

/onboarding/documents

Failure route:

/onboarding/identity

Access level:

session_required

Sensitive data:

private_identity_data

/onboarding/documents

Purpose:

Collect official document metadata and protected document references.

Supported document types:

identity_card
passport
driving_license
residence_document
other_official_document

Generated state:

document_status = submitted

Next route:

/onboarding/fiscal

Failure route:

/onboarding/documents

Access level:

session_required

Sensitive data:

document_metadata
protected_document_reference
document_hash_reference

Forbidden public exposure:

raw_document_image
raw_document_scan
raw_document_number
unprotected_storage_url

/onboarding/fiscal

Purpose:

Link the subject to a fiscal code, tax identifier or national identification number.

Required fields:

fiscal_identifier_type
fiscal_identifier_country
fiscal_identifier_hash
fiscal_identifier_masked

Generated state:

fiscal_identifier_status = submitted

Next route:

/onboarding/photo-video

Failure route:

/onboarding/fiscal

Access level:

session_required

Sensitive data:

fiscal_identifier_metadata
fiscal_identifier_hash
masked_identifier

Forbidden public exposure:

raw_fiscal_identifier
raw_tax_identifier
raw_national_identifier

/onboarding/photo-video

Purpose:

Support subject-document coherence and liveness-style verification.

MVP behavior:

Display placeholder verification state.
Allow simulated submission.
Mark photo and video status for review.

Generated states:

photo_verification_status = submitted
video_verification_status = submitted

Next route:

/onboarding/review

Failure route:

/onboarding/photo-video

Access level:

session_required

Sensitive data:

photo_reference
video_reference
photo_hash
video_hash
verification_status

Forbidden repository data:

real_photo
real_video
biometric_template
liveness_recording
face_template

/onboarding/review

Purpose:

Show review status and determine whether the case can become IPR Verified.

Review states:

not_started
in_progress
pending_review
approved
rejected
needs_more_information
expired
revoked

Allowed next routes:

/ipr-card
/onboarding/identity
/onboarding/documents
/onboarding/fiscal
/onboarding/photo-video

Decision logic:

if review_status = approved:
    continue to IPR Card

if review_status = needs_more_information:
    return to required step

if review_status = rejected:
    deny access

if review_status = expired:
    restart onboarding

if review_status = revoked:
    deny access

Access level:

session_required

Sensitive data:

status_only_for_user
private_review_notes_hidden

5. Operational Identity Routes

/ipr-card

Purpose:

Display the IPR Card preview and issuance status.

Required condition:

ipr_status = verified

Displayed fields:

ipr_card_id
ipr_id
card_status
issuer
issued_at
expires_at
access_scope
revocation_state

Generated state:

ipr_card_status = issued

Next route:

/certificate

Failure route:

/onboarding/review

Access level:

verified_ipr_required

Forbidden public exposure:

raw_identity_data
raw_document_data
raw_fiscal_identifier
raw_photo
raw_video
biometric_material

/certificate

Purpose:

Display the internal operational certificate reference.

Required conditions:

ipr_status = verified
ipr_card_status = issued
revocation_state = clear

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

Generated state:

certificate_status = active

Next route:

/access/joker-c2

Failure route:

/ipr-card

Access level:

verified_ipr_card_required

Legal boundary:

The operational certificate is internal to HBCE.
It is not a qualified eIDAS certificate unless issued through a recognized and compliant trust service integration.

6. Access Gate Routes

/access/joker-c2

Purpose:

Allow or deny governed access to JOKER-C2.

Required conditions:

ipr_status = verified
ipr_card_status = issued
certificate_status = active
revocation_state = clear

Default decision:

deny_access

Allow decision:

allow_governed_access

Deny conditions:

ipr_status != verified
ipr_card_status != issued
certificate_status != active
revocation_state != clear

Access level:

verified_ipr_card_certificate_required

Allowed output:

access_status
decision
decision_reason
joker_c2_gateway_reference

Forbidden output:

raw_identity_data
raw_document_data
raw_fiscal_identifier
raw_photo
raw_video
private_review_notes

7. Legal and Boundary Routes

/legal

Purpose:

Explain the legal and operational boundary of the app.

Main content:

IPR is an internal operational identity record.
IPR Card does not replace official identity documents.
HBCE does not issue passports, CIE, SPID, EUDI Wallet credentials or qualified eIDAS certificates.
JOKER-C2 access requires verified IPR.

Access level:

public

Sensitive data:

none

/privacy

Purpose:

Explain privacy posture, data minimization and sensitive data boundaries.

Access level:

public

Sensitive data:

none

/security

Purpose:

Explain security posture, fail-closed access and no raw sensitive material in repository.

Access level:

public

Sensitive data:

none

8. Optional Operator Routes

These routes are not required for the first public MVP, but may be added later.

/operator/review

Purpose:

Review onboarding cases.

Access level:

operator_required

Sensitive data:

private_review_data

/operator/review/[onboarding_id]

Purpose:

Inspect a specific onboarding case and assign review decision.

Access level:

operator_required

Allowed decisions:

approve
reject
request_more_information
expire
suspend
revoke

/operator/revocations

Purpose:

Manage revoked, suspended or expired operational identities.

Access level:

operator_required

9. Optional API Routes

Suggested future API route map:

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

All API routes must enforce server-side validation.

The frontend must never be the source of final trust.

10. Route Access Matrix

/                         public
/onboarding               public_or_session
/onboarding/start         public
/onboarding/identity      session_required
/onboarding/documents     session_required
/onboarding/fiscal        session_required
/onboarding/photo-video   session_required
/onboarding/review        session_required
/ipr-card                 verified_ipr_required
/certificate              verified_ipr_card_required
/access/joker-c2          verified_ipr_card_certificate_required
/legal                    public
/privacy                  public
/security                 public

11. Fail-Closed Route Logic

if route requires session and session is missing:
    redirect to /onboarding/start

if route requires verified IPR and ipr_status is not verified:
    redirect to /onboarding/review

if route requires issued IPR Card and ipr_card_status is not issued:
    redirect to /ipr-card

if route requires active certificate and certificate_status is not active:
    redirect to /certificate

if revocation_state is not clear:
    redirect to /access/joker-c2 with deny decision

otherwise:
    allow route access

12. Public Communication Formula

Access JOKER-C2 only through verified IPR.
An email is not enough.
A subscription is not enough.
An operational identity is required: documented, traceable and verifiable.

13. Canonical Route Formula

Landing explains.
Onboarding collects.
Documents support verification.
Fiscal identifier anchors the subject.
Photo and video support coherence.
Review decides.
IPR identifies.
IPR Card operationalizes.
Certificate authorizes.
Access gate protects JOKER-C2.

14. Organization

HERMETICUM B.C.E. S.r.l.

15. Canonical Trademark

HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA

HERMETICUM B.C.E. S.r.l.
