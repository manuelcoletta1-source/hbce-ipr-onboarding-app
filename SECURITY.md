# Security Policy

## 1. Purpose

HBCE IPR Onboarding App is designed to support bank-grade operational identity onboarding for IPR Verified status, IPR Card issuance and governed JOKER-C2 access.

Because the application may process identity data, official document metadata, fiscal identifiers, photo verification and video verification, the security posture must be strict from the first implementation.

The core rule is:

**No verified IPR, no governed JOKER-C2 access.**

The second rule is:

**No raw sensitive identity material must ever be committed to this repository.**

## 2. Security Scope

This security policy applies to:

- source code;
- configuration files;
- documentation;
- onboarding forms;
- mock data;
- test fixtures;
- public routes;
- API routes;
- deployment settings;
- storage references;
- verification logic;
- access gate logic;
- IPR Card preview logic;
- operational certificate preview logic;
- JOKER-C2 access authorization logic.

## 3. Sensitive Data Boundary

The following data must never be committed to this repository:

- raw identity documents;
- raw passports;
- raw identity cards;
- raw driving licenses;
- raw fiscal codes;
- raw national tax identifiers;
- raw national identification numbers;
- raw photos;
- raw videos;
- biometric templates;
- liveness verification files;
- private keys;
- production secrets;
- database credentials;
- API credentials;
- access tokens;
- session secrets;
- signed production certificates;
- real onboarding records;
- real user datasets.

Only synthetic, anonymized or mock data may be used inside this repository.

## 4. Data Minimization Principle

The app must collect and expose only the minimum data required for operational identity onboarding.

Public or semi-public layers should use:

- hash references;
- status values;
- minimized metadata;
- internal identifiers;
- non-sensitive operational references.

The app should avoid exposing:

- document numbers in clear text;
- fiscal identifiers in clear text;
- full birth data in public views;
- raw document images;
- raw photo or video material;
- private review notes;
- storage URLs that expose sensitive files.

## 5. Fail-Closed Access Rule

The default access decision must always be denial.

JOKER-C2 access must be denied if any required condition is missing, incomplete, expired, rejected, suspended, revoked or unverifiable.

Minimum access conditions:

```txt
ipr_status = verified
ipr_card_status = issued
certificate_status = active
revocation_state = clear

If one of these conditions is not satisfied, access must remain blocked.

6. Forbidden Access Pattern

The following access pattern is not allowed:

email + password + payment = JOKER-C2 access

The correct HBCE access pattern is:

registration
→ identity verification
→ document verification
→ fiscal or national identifier linkage
→ photo/video verification
→ review
→ IPR Verified
→ IPR Card issued
→ operational certificate active
→ JOKER-C2 governed access

7. Identity Verification Boundary

HBCE IPR Onboarding App may support internal operational identity verification.

It does not issue:

official public identity documents;

passports;

national identity cards;

CIE;

SPID;

EUDI Wallet credentials;

qualified eIDAS certificates;

bank accounts;

regulated financial services.


The app may become compatible with official identity systems or trust service providers only through future lawful integrations.

The correct claim is:

HBCE issues an internal verifiable operational identity record.

The future integration claim is:

HBCE operational identity may be connected to official European identity systems, subject to applicable law, recognized trust service providers and institutional partnerships.

8. Document Handling Rules

Official identity document handling must follow these rules:

do not store raw documents in the repository;

do not expose raw documents through public URLs;

do not log document images;

do not log document numbers in clear text;

do not use real documents in tests;

do not use real documents in screenshots;

do not include document samples in documentation;

use protected storage for real implementation;

use hash references and storage references in operational records;

restrict document access to authorized review processes only.


9. Fiscal Identifier Handling Rules

Fiscal identifiers must be handled as sensitive data.

The app should store only protected or hashed references where possible.

The following values must not appear in public output:

full fiscal code;

full national tax identifier;

full national identification number;

full social security style number;

full personal fiscal identifier.


Where display is required, use masking.

Example:

CLT*********44R

10. Photo and Video Verification Rules

Photo and video verification material must be treated as sensitive identity material.

The repository must not contain:

real user photos;

real onboarding videos;

biometric samples;

liveness check recordings;

face templates;

third-party verification payloads containing personal data.


The MVP may use placeholder states such as:

not_started
pending
submitted
manual_review
approved
rejected
expired

11. Review Status Security

Review status must never be bypassed from the client side.

The frontend may display review status, but the final access decision must be enforced by server-side logic.

Client-side approval is not valid.

The access gate must not trust:

browser state;

local storage;

query parameters;

hidden form fields;

unsigned client payloads;

manually edited frontend status values.


12. API Security Principles

API routes should follow these principles:

validate all input;

reject unknown states;

reject malformed payloads;

deny by default;

avoid returning raw sensitive data;

use server-side access checks;

separate user display data from verification data;

log only minimized operational events;

avoid storing secrets in code;

use environment variables for secrets;

avoid verbose production error messages.


13. Audit and Event Continuity

Relevant onboarding actions should generate audit-ready event references.

Suggested event classes:

ONBOARDING_STARTED
EMAIL_REGISTERED
IDENTITY_DATA_SUBMITTED
DOCUMENT_SUBMITTED
FISCAL_IDENTIFIER_SUBMITTED
PHOTO_VIDEO_SUBMITTED
REVIEW_STARTED
REVIEW_APPROVED
REVIEW_REJECTED
IPR_VERIFIED
IPR_CARD_ISSUED
CERTIFICATE_CREATED
JOKER_C2_ACCESS_ENABLED
JOKER_C2_ACCESS_DENIED
IPR_SUSPENDED
IPR_REVOKED

Events should support future EVT and OPC integration.

The event layer should record:

event type;

subject reference;

IPR reference;

timestamp;

previous event reference where applicable;

status change;

decision state;

hash reference;

issuer or reviewer reference where applicable.


14. Secret Management

Production secrets must never be committed.

Forbidden in source code:

API keys;

database URLs;

private keys;

JWT secrets;

webhook secrets;

cloud storage keys;

provider credentials;

encryption keys.


Use environment variables and deployment secret managers.

Example placeholder:

IDENTITY_PROVIDER_API_KEY=
DATABASE_URL=
JWT_SECRET=
STORAGE_BUCKET=
JOKER_C2_GATEWAY_URL=

These placeholders must not contain real production values in the repository.

15. Mock Data Policy

Mock data must be clearly synthetic.

Allowed:

fake names;

fake document types;

fake identifiers;

fake hashes;

fake status values;

fake certificate IDs;

fake IPR IDs for demonstration.


Not allowed:

real identity records;

real document numbers;

real fiscal identifiers;

real onboarding screenshots containing personal data;

real user files.


16. MVP Security Status

The first MVP may use simulated verification states.

However, even the MVP must preserve the correct security posture:

access denied by default;

no direct JOKER-C2 access without verified IPR state;

no sensitive data committed;

no raw document exposure;

no fake legal claim of official identity issuance;

no uncontrolled public user data;

no production secrets in source code.


17. Future Production Requirements

Before production use, the app will require:

secure authentication;

encrypted storage;

server-side verification state management;

protected document storage;

access control for reviewers;

audit logging;

rate limiting;

abuse protection;

retention policy;

deletion policy;

revocation flow;

incident response process;

privacy review;

legal review;

data processing register;

provider security review;

compliance assessment for applicable jurisdictions.


18. Incident Response

A security incident may include:

exposed secret;

exposed identity document;

exposed fiscal identifier;

unauthorized status change;

unauthorized JOKER-C2 access;

public exposure of onboarding data;

broken access gate;

compromised storage;

incorrect verification approval;

unauthorized certificate issuance;

unauthorized IPR Card issuance.


Minimum response:

identify
contain
revoke
rotate secrets
disable affected access
preserve audit evidence
review logs
notify responsible operators
correct the vulnerability
document the incident

19. Revocation Principle

The system must support revocation.

If an IPR status, IPR Card or certificate is revoked, suspended or expired, JOKER-C2 access must be disabled.

Revocation must override previous approval.

Allowed access condition:

revocation_state = clear

All other revocation states must deny access.

20. Responsible Disclosure

Security issues should be reported privately to the project maintainer.

Do not open a public issue containing:

secrets;

personal data;

identity documents;

exploit payloads;

production credentials;

private security details.


21. Canonical Security Formula

Email is not enough.
Payment is not enough.
Subscription is not enough.
Operational identity is required.
Verified IPR is required.
IPR Card is required.
Active certificate is required.
Governed access is required.

22. Organization

HERMETICUM B.C.E. S.r.l.

23. Canonical Trademark

HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA

HERMETICUM B.C.E. S.r.l.

