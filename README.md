# HBCE IPR Onboarding App

Bank-grade operational identity onboarding for IPR Verified status, IPR Card issuance, operational certificate activation and governed JOKER-C2 access.

**HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA**  
**HERMETICUM B.C.E. S.r.l.**

---

## Purpose

HBCE IPR Onboarding App is the operational identity onboarding application of **HERMETICUM B.C.E. S.r.l.**

The application is designed to register, verify and activate a subject before access to governed AI runtime services.

The core principle is:

```txt
First, verify who you are.
Then access operational artificial intelligence.

This repository defines the onboarding gateway for IPR Verified users, IPR Card issuance, operational certificate preparation and controlled access to JOKER-C2.

HBCE IPR Onboarding App is not a simple login form.

It is an operational identity gateway.


---

Strategic Positioning

Classic AI access normally follows a minimal pattern:

1. email registration;


2. password or OAuth login;


3. subscription or payment;


4. direct model access.



HBCE follows a different operational model:

1. identity onboarding;


2. official document collection;


3. fiscal code, national tax identifier or national identification number linkage;


4. photo and video verification;


5. compliance-oriented review;


6. IPR Verified status assignment;


7. IPR Card issuance;


8. operational certificate preparation;


9. governed access to JOKER-C2.



This makes the system closer to a digital banking onboarding workflow than to a generic AI login page.

The market distinction is structural:

Classic AI
→ email
→ password
→ subscription
→ model access

HBCE / JOKER-C2
→ identity onboarding
→ document verification
→ IPR Verified status
→ IPR Card
→ operational certificate
→ governed AI access


---

Canonical Flow

The canonical onboarding flow is:

1. user registration;


2. email verification;


3. personal data submission;


4. official identity document submission;


5. fiscal code, national tax identifier or national identification number linkage;


6. photo and video verification;


7. human or automated compliance-oriented review;


8. IPR Verified status assignment;


9. IPR Card issuance;


10. operational digital certificate preparation;


11. access enablement for JOKER-C2.



The operational formula is:

HERMETICUM B.C.E. Platform is the access threshold.
IPR Card is the operational key.
JOKER-C2 is the governed artificial intelligence runtime.


---

Core Components

IPR Onboarding Gateway

The onboarding gateway collects and validates the minimum information required to create an operational identity record.

It is the access threshold of the HBCE ecosystem.

IPR Verified

IPR Verified is the internal operational status assigned after successful onboarding and verification.

It confirms that the subject has completed the required identity verification process inside the HBCE operational framework.

IPR Card

The IPR Card is the operational identity credential issued inside the HBCE ecosystem.

It connects the verified subject to:

IPR identifier;

identity verification state;

operational status;

certificate reference;

access rights;

audit continuity.


The IPR Card does not replace official identity documents.

Operational Certificate

The operational certificate is the internal digital certificate that links the verified subject to the HBCE operational environment.

It can be used to authorize access, generate audit references and connect the user to governed runtime systems.

JOKER-C2 Access

JOKER-C2 is not an AI service accessible through a simple email account.

JOKER-C2 is a governed AI operational runtime accessible through verified IPR status.

The canonical access rule is:

Access JOKER-C2 only through verified IPR.

An email is not enough.
A subscription is not enough.

An operational identity is required:
documented, traceable and verifiable.


---

Legal and Operational Boundary

HBCE IPR Onboarding App does not issue:

official state identity documents;

passports;

national identity cards;

CIE;

SPID;

EUDI Wallet credentials;

qualified eIDAS certificates;

bank accounts;

regulated financial services.


HBCE issues an internal operational identity record that may be connected to official European identity systems in future integrations, subject to applicable law, recognized trust service providers and institutional partnerships.

Correct claim:

HBCE issues a verifiable operational identity that can be linked to official European identity systems.

Incorrect claim:

HBCE issues an official European identity.

This repository is intended as an R&D and MVP surface, not as a regulated identity issuance service, financial service, banking service or qualified trust service.


---

Architecture Role

This repository is part of the HBCE operational architecture:

Layer	Role

HBCE Platform	Public and institutional gateway
HBCE IPR Onboarding App	Identity onboarding and verification application
IPR Card	Operational identity credential
Operational Certificate	Internal certificate reference for governed access
JOKER-C2	Governed AI operational runtime
EVT	Event continuity layer
OPC	Operational proof and compliance layer
MATRIX	Coordination framework
HBCE	Governance ecosystem



---

Initial MVP Scope

The first MVP should include:

landing page;

registration page;

onboarding form;

document upload interface;

fiscal identifier field;

photo and video verification placeholder;

review status page;

IPR Card preview;

certificate preview;

access gate for JOKER-C2;

audit event generation placeholder;

privacy page;

legal boundary page;

security posture page.


The MVP must simulate the onboarding and verification logic without exposing real identity documents, real user photos, real videos or production identity records.


---

Suggested Routes

Route	Function

/	Landing page for the onboarding app
/onboarding	Main onboarding flow
/onboarding/start	Initial account and subject registration
/onboarding/identity	Personal identity data submission
/onboarding/documents	Official document upload and document metadata submission
/onboarding/fiscal	Fiscal code, tax identifier or national identification number linkage
/onboarding/photo-video	Photo and video verification step
/onboarding/review	Review state, pending validation and compliance status
/ipr-card	IPR Card preview and issuance status
/certificate	Operational certificate preview and certificate reference
/access/joker-c2	Access gate to JOKER-C2 after verified IPR status
/legal	Legal and operational boundary page
/privacy	Privacy and data minimization page
/security	Security posture and fail-closed access page



---

Suggested Data Model

A minimal onboarding record should include:

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
document_file_hash
fiscal_identifier_hash
photo_verification_status
video_verification_status
review_status
ipr_status
ipr_card_status
certificate_status
revocation_state
joker_c2_access_status
created_at
updated_at

Sensitive raw documents should not be stored publicly and should never be committed to this repository.


---

Security Posture

The application must be designed with a fail-closed approach.

If identity status is incomplete, unclear, expired, revoked or unverifiable, access to JOKER-C2 must remain blocked.

Security principles:

no sensitive document should be publicly exposed;

no raw identity document should be committed to this repository;

no production secret should be stored in source code;

no access to JOKER-C2 should be granted without verified IPR status;

document files, images and videos must remain in protected storage;

public proof layers should expose minimized metadata and hash-only references where possible;

revocation state must override access state;

incomplete verification must produce blocked access by default.



---

Privacy Posture

The application should follow a data minimization principle.

Only data necessary for operational identity verification should be collected.

Private identity data, documents, images and videos must remain protected inside controlled storage and processing environments.

Public or demonstrative layers should use:

synthetic data;

masked identifiers;

hash references;

minimized metadata;

no raw personal documents;

no production identity records.



---

Repository Scope

This repository should contain:

frontend onboarding interface;

public legal and security boundary pages;

mock onboarding records;

IPR Card preview;

certificate preview;

JOKER-C2 access gate;

audit event placeholders;

controlled MVP logic for fail-closed access simulation.


This repository should not contain:

real identity documents;

real user photos or videos;

production secrets;

unencrypted private records;

regulated identity credentials;

banking or financial account logic.



---

Development Status

Current status: early MVP repository.

Primary objective: build the HBCE IPR Onboarding App as the bank-grade onboarding layer for operational identity verification and governed AI access.

The current implementation is intended as an R&D and MVP surface.


---

Development Commands

npm run dev
npm run build
npm run lint
npm run typecheck
npm run check


---

Organization

HERMETICUM B.C.E. S.r.l.


---

Canonical Trademark

HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA
HERMETICUM B.C.E. S.r.l.



