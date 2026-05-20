# Privacy Policy

## 1. Purpose

HBCE IPR Onboarding App is designed to support operational identity onboarding for IPR Verified status, IPR Card issuance and governed JOKER-C2 access.

The application may process identity data, official document metadata, fiscal or national identifiers, photo verification and video verification information.

For this reason, privacy protection must be part of the architecture from the first implementation.

The core privacy rule is:

**Collect only what is necessary. Expose only what is minimized. Protect everything sensitive.**

## 2. Privacy Scope

This privacy policy applies to:

- onboarding forms;
- identity data;
- document metadata;
- fiscal or national identifier metadata;
- photo verification state;
- video verification state;
- review status;
- IPR status;
- IPR Card status;
- operational certificate status;
- JOKER-C2 access status;
- audit-ready event references;
- future EVT and OPC integrations.

## 3. Repository Boundary

This repository must not contain real personal data.

The following materials must never be committed:

- real identity documents;
- real passports;
- real identity cards;
- real driving licenses;
- real fiscal codes;
- real tax identifiers;
- real national identification numbers;
- real photos;
- real videos;
- biometric templates;
- real onboarding records;
- real user files;
- private review notes;
- production credentials;
- private keys;
- access tokens.

Only synthetic, anonymized or mock data may be used for development and demonstration.

## 4. Data Minimization

The app must collect only data required for operational identity verification.

The minimal onboarding record may include:

```txt
subject_id
ipr_id
email_hash
first_name
last_name
date_of_birth
country
nationality
document_type
document_country
document_number_hash
document_reference
fiscal_identifier_type
fiscal_identifier_country
fiscal_identifier_hash
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

Where possible, the app should use:

hash references;

masked values;

verification states;

internal identifiers;

minimized metadata;

protected storage references.


5. Personal Data Categories

The app may process the following categories of personal data in a real implementation:

account registration data;

identity data;

official document metadata;

fiscal or national identifier metadata;

verification status data;

review status data;

operational identity status data;

access authorization data;

audit and event continuity data.


The app should not expose raw sensitive data in public views.

6. Sensitive Identity Material

Sensitive identity material includes:

document images;

document scans;

document numbers;

fiscal identifiers;

national identification numbers;

photos;

videos;

biometric or liveness material;

internal review notes;

protected storage links.


Sensitive identity material must remain private and protected.

It must not be exposed in:

public routes;

public repositories;

public screenshots;

public logs;

frontend-only state;

client-side query parameters;

demo datasets.


7. Public Data Boundary

Public or semi-public views should expose only minimized operational information.

Allowed examples:

IPR status: verified
IPR Card status: issued
Certificate status: active
JOKER-C2 access: enabled
Revocation state: clear

Forbidden examples:

full document number
full fiscal code
raw identity document
raw photo
raw video
private review note
unprotected storage URL

8. Masking Principle

Where display is required, sensitive values should be masked.

Example:

Fiscal identifier: CLT*********44R
Document number: CA******XQ
Certificate: CERT-HBCE-2026-****

The full value should not be displayed unless there is a strict operational need and the view is protected.

9. Hash Reference Principle

The app should use hash references to support verification without unnecessary exposure.

Examples:

document_number_hash
fiscal_identifier_hash
document_file_hash
certificate_hash_reference
event_hash_reference

Hash references do not remove all privacy obligations, but they reduce unnecessary exposure.

10. Photo and Video Verification

Photo and video verification must be handled as sensitive identity processing.

The MVP may use placeholder verification states.

Allowed MVP states:

not_started
pending
submitted
manual_review
approved
rejected
expired

The repository must not contain real photos or videos.

Future production versions must use protected storage, access control, retention rules and lawful verification providers where applicable.

11. Access Control

Access to private onboarding data must be restricted.

The user may view only their own onboarding status.

Reviewers or operators may view only the data required for verification.

JOKER-C2 access must not reveal unnecessary identity data.

The access gate should receive only the minimum authorization state required to decide access.

Minimum access state:

ipr_status
ipr_card_status
certificate_status
revocation_state
joker_c2_access_status

12. Fail-Closed Privacy Rule

If identity state is incomplete, unclear, expired, rejected, suspended, revoked or unverifiable, access must remain denied.

The default state must be:

deny

Privacy and security must not rely on user-declared frontend values.

Access decisions must be enforced server-side.

13. Retention Principle

A real implementation must define retention rules for:

account data;

onboarding records;

document metadata;

document files;

photo and video material;

audit events;

review notes;

IPR Card records;

certificate records;

revocation records.


The MVP should not store real sensitive identity material.

14. Deletion and Revocation

The architecture should support:

deletion requests;

correction requests;

revocation of IPR status;

revocation of IPR Card;

revocation of operational certificate;

disabling JOKER-C2 access;

audit preservation where legally required.


Revocation must override previous approval.

15. Logs

Logs must not contain:

raw document numbers;

raw fiscal identifiers;

raw photos;

raw videos;

private document URLs;

biometric data;

full onboarding payloads;

production secrets;

access tokens.


Logs may contain minimized operational events, such as:

ONBOARDING_STARTED
DOCUMENT_SUBMITTED
REVIEW_APPROVED
IPR_VERIFIED
IPR_CARD_ISSUED
JOKER_C2_ACCESS_ENABLED
JOKER_C2_ACCESS_DENIED
IPR_REVOKED

16. EVT and OPC Privacy Boundary

Future EVT and OPC integration should preserve data minimization.

EVT should record event continuity.

OPC should record operational proof references.

Neither layer should expose unnecessary raw identity material.

The preferred approach is:

private sensitive data
→ protected storage
→ hash reference
→ minimized event reference
→ audit-ready proof state

17. Legal Boundary

HBCE IPR Onboarding App does not issue official public identity credentials.

It does not replace:

national identity cards;

passports;

driving licenses;

CIE;

SPID;

EUDI Wallet;

qualified eIDAS certificates;

bank accounts;

regulated financial identity services.


The app supports an internal verifiable operational identity record.

Future connection with official European identity systems may require recognized trust service providers, lawful integrations, institutional agreements and specific compliance review.

18. User Transparency

The user should be informed about:

what data is collected;

why the data is collected;

what verification steps are required;

what status has been assigned;

whether access is granted or denied;

whether the IPR Card has been issued;

whether the certificate is active;

whether the identity state is suspended or revoked.


The system should not create hidden access states that the user cannot understand.

19. MVP Privacy Status

The first MVP may use mock data and simulated states.

Even in MVP mode, the app must preserve the correct privacy posture:

no real documents;

no real fiscal identifiers;

no real photos;

no real videos;

no real biometric data;

no production secrets;

no public exposure of sensitive identity data;

no JOKER-C2 access without verified IPR state.


20. Future Production Requirements

Before production use, the app will require:

legal privacy review;

data protection impact assessment where applicable;

secure storage;

encryption at rest;

encryption in transit;

role-based access control;

retention policy;

deletion policy;

incident response process;

audit logging;

provider review;

data processing agreements where required;

compliance assessment for applicable jurisdictions.


21. Canonical Privacy Formula

Identity data must be protected.
Documents must remain private.
Fiscal identifiers must be minimized.
Photo and video verification must be controlled.
Public proof must be hash-based where possible.
JOKER-C2 access must depend on verified IPR status.

22. Organization

HERMETICUM B.C.E. S.r.l.

23. Canonical Trademark

HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA

HERMETICUM B.C.E. S.r.l.
