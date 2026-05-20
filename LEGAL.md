# Legal Boundary

## 1. Purpose

HBCE IPR Onboarding App is an operational identity onboarding application for IPR Verified status, IPR Card issuance and governed JOKER-C2 access.

This repository defines a technical and operational framework for internal verifiable identity onboarding within the HBCE ecosystem.

It does not define, issue or replace official public identity credentials.

## 2. Legal Nature of IPR

IPR means Identity Primary Record.

Within this repository, IPR is an internal operational identity record used to connect:

- a verified subject;
- an onboarding process;
- an operational status;
- an IPR Card;
- an operational certificate reference;
- access authorization;
- audit continuity;
- governed JOKER-C2 access.

IPR is not a state identity document.

IPR is not a passport.

IPR is not a national identity card.

IPR is not a public digital identity scheme by itself.

IPR is not a qualified trust service by itself.

## 3. Correct Claim

The correct claim is:

```txt
HBCE issues an internal verifiable operational identity record.

The correct extended claim is:

HBCE issues a verifiable operational identity that can be linked to official European identity systems in future lawful integrations.

4. Incorrect Claim

The following claim must not be used:

HBCE issues an official European identity.

The following claim must not be used:

HBCE replaces national identity systems.

The following claim must not be used:

HBCE replaces regulated digital identity providers.

5. Non-Replacement Boundary

HBCE IPR Onboarding App does not replace:

national identity cards;

passports;

driving licenses;

residence permits;

CIE;

SPID;

EUDI Wallet;

qualified eIDAS certificates;

bank accounts;

regulated financial onboarding;

public authority identification systems;

official state registries;

recognized trust service providers.


6. Operational Identity Boundary

The app may support operational identity verification inside the HBCE ecosystem.

The app may collect identity-related information for the purpose of internal operational verification, subject to applicable law, privacy rules and security controls.

The app may assign internal states such as:

not_started
in_progress
pending_review
verified
rejected
suspended
revoked
expired

These states are internal operational states.

They are not equivalent to public authority recognition.

7. IPR Card Boundary

The IPR Card is an internal operational card.

It may display:

IPR identifier;

subject reference;

verification status;

issue date;

expiry date;

issuer;

certificate reference;

access scope;

revocation state.


The IPR Card does not replace an official identity document.

The IPR Card does not grant public legal status by itself.

The IPR Card enables controlled access inside the HBCE ecosystem according to internal verification rules.

8. Operational Certificate Boundary

The operational certificate is an internal HBCE certificate reference.

It may link:

IPR identifier;

subject reference;

issuer;

issue date;

expiry date;

scope;

hash reference;

status;

revocation state.


The operational certificate is not a qualified certificate unless issued through a recognized and legally compliant trust service integration.

9. JOKER-C2 Access Boundary

JOKER-C2 access must depend on verified IPR status.

The following access model is not valid for HBCE:

email + password + payment = governed AI access

The correct access model is:

identity onboarding
→ document verification
→ fiscal or national identifier linkage
→ photo/video verification
→ review
→ IPR Verified
→ IPR Card issued
→ operational certificate active
→ governed JOKER-C2 access

JOKER-C2 access is an internal operational authorization.

It is not public authority validation.

10. Banking Boundary

HBCE IPR Onboarding App may use a bank-grade onboarding posture.

This means that the app may adopt strict identity verification practices similar to digital banking onboarding workflows.

However, the app does not provide:

bank accounts;

payment accounts;

deposits;

lending;

investment services;

custody services;

payment services;

regulated financial services.


The comparison with digital banking onboarding is functional and procedural.

It does not imply that HBCE is a bank.

11. Research and MVP Boundary

The first implementation may operate as:

research prototype;

MVP;

internal demo;

self-pilot;

onboarding simulation;

identity verification workflow demonstration;

access gate demonstration.


In MVP mode, the app must use synthetic, mock or test data only.

No real identity document, real fiscal identifier, real biometric material or real user file should be committed to this repository.

12. Privacy Boundary

The app may process sensitive identity-related data in future real implementations.

Such processing requires appropriate privacy controls, including:

data minimization;

purpose limitation;

access control;

secure storage;

retention rules;

deletion rules;

incident response;

legal review;

privacy review;

compliance assessment where applicable.


Public layers should expose minimized metadata and hash references where possible.

13. Security Boundary

The app must follow a fail-closed posture.

Access must be denied when identity status is:

incomplete;

missing;

unclear;

rejected;

expired;

suspended;

revoked;

unverifiable.


The default decision must be:

deny

14. Future Integration Boundary

Future integrations may include:

official digital identity systems;

European identity frameworks;

recognized trust service providers;

document verification providers;

liveness verification providers;

enterprise identity systems;

institutional registries;

compliance providers;

secure storage providers.


Any such integration must be evaluated under applicable law, contractual requirements, privacy requirements and technical security standards.

This repository does not itself create those legal integrations.

15. No Legal Advice

This repository is technical and operational documentation.

It is not legal advice.

Before production deployment, regulated use, institutional use, identity verification use, trust service integration or cross-border identity processing, the project requires qualified legal, privacy and security review.

16. Public Communication Rule

Public communication must remain precise.

Allowed formulation:

HBCE IPR Onboarding App provides operational identity onboarding for verified access to governed AI runtime services.

Allowed formulation:

IPR Card is an internal operational identity credential issued within the HBCE ecosystem.

Allowed formulation:

JOKER-C2 is accessible through verified IPR status, not through a simple email subscription.

Forbidden formulation:

HBCE issues official European identity.

Forbidden formulation:

HBCE replaces CIE, SPID or EUDI Wallet.

Forbidden formulation:

HBCE issues qualified eIDAS certificates by itself.

Forbidden formulation:

HBCE is a bank.

17. Canonical Legal Formula

HBCE does not replace official identity.
HBCE creates operational identity.
IPR does not replace state documents.
IPR connects subject, verification, access and audit continuity.
IPR Card is the operational key.
JOKER-C2 access requires verified IPR.

18. Organization

HERMETICUM B.C.E. S.r.l.

19. Canonical Trademark

HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA

HERMETICUM B.C.E. S.r.l.

