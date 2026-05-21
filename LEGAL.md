# Legal Boundary

**HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA**  
**HERMETICUM B.C.E. S.r.l.**

---

## 1. Purpose

HBCE IPR Onboarding App is an operational identity onboarding application for progressive HBCE-IPR certificate release, IPR Verified status, IPR Card issuance, operational certificate activation and governed JOKER-C2 access evaluation.

This repository defines a technical and operational framework for internal verifiable identity onboarding within the HBCE ecosystem.

It does not define, issue or replace official public identity credentials.

It does not provide banking services.

It does not issue IBANs.

It does not provide regulated financial services.

It does not issue qualified eIDAS certificates by itself.

The core legal rule is:

```txt
HBCE issues an internal operational identity certificate chain.
HBCE does not issue official state identity.
```

---

## 2. Legal Nature of IPR

IPR means Identity Primary Record.

Within this repository, IPR is an internal operational identity record used to connect:

```txt
a subject
an onboarding process
a certificate chain
an operational status
an IPR Card
an operational certificate
an access authorization decision
audit continuity
governed JOKER-C2 access
```

IPR is not:

```txt
a state identity document
a passport
a national identity card
a CIE
a SPID credential
an EUDI Wallet credential
a public digital identity scheme by itself
a qualified trust service by itself
a bank account
an IBAN
a regulated financial identity service
```

IPR is an internal HBCE operational identity layer.

It may be connected to official identity systems only through future lawful integrations, recognized providers, institutional agreements or compliant trust service frameworks where applicable.

---

## 3. Correct Claim

The correct claim is:

```txt
HBCE issues an internal verifiable operational identity record.
```

The correct extended claim is:

```txt
HBCE issues a verifiable operational identity that can be linked to official European identity systems in future lawful integrations.
```

The correct product claim is:

```txt
HBCE IPR Onboarding App provides operational identity onboarding for verified access to governed AI runtime services.
```

The correct JOKER-C2 claim is:

```txt
JOKER-C2 is accessible through verified IPR status and a valid HBCE operational certificate, not through a simple email subscription.
```

---

## 4. Incorrect Claim

The following claims must not be used:

```txt
HBCE issues an official European identity.
HBCE replaces national identity systems.
HBCE replaces CIE.
HBCE replaces SPID.
HBCE replaces EUDI Wallet.
HBCE issues qualified eIDAS certificates by itself.
HBCE is a qualified trust service provider by itself.
HBCE is a bank.
HBCE issues bank accounts.
HBCE issues IBANs.
HBCE provides regulated payment services.
HBCE provides regulated financial services.
JOKER-C2 access is granted by email and payment alone.
```

These claims are outside the legal and operational scope of this repository.

---

## 5. Non-Replacement Boundary

HBCE IPR Onboarding App does not replace:

```txt
national identity cards
passports
driving licences
residence permits
CIE
SPID
EUDI Wallet
qualified eIDAS certificates
bank accounts
IBANs
payment accounts
regulated financial onboarding
public authority identification systems
official state registries
recognized trust service providers
qualified trust service providers
```

The app may use a strict onboarding posture similar to digital banking workflows.

That comparison is procedural.

It does not imply that HBCE is a bank or a regulated financial institution.

---

## 6. HBCE-IPR Certificate Chain Boundary

The MVP releases progressive private portable HBCE-IPR certificates:

```txt
hbce-ipr-01-subject-created.hbce.json
hbce-ipr-02-fiscal-identity.hbce.json
hbce-ipr-03-official-document.hbce.json
hbce-ipr-04-liveness-submitted.hbce.json
hbce-ipr-05-privacy-compliance.hbce.json
hbce-ipr-06-review-pending.hbce.json
hbce-ipr-07-ipr-approved.hbce.json
hbce-ipr-08-ipr-card.hbce.json
hbce-ipr-09-operational-certificate.hbce.json
```

These files are internal HBCE operational certificates for MVP demonstration and controlled onboarding logic.

They are not:

```txt
official identity documents
public authority certificates
qualified eIDAS certificates
banking credentials
payment credentials
government-issued digital identity credentials
```

The certificate chain demonstrates continuity, auditability and access gating inside the HBCE ecosystem.

Production use requires backend enforcement, protected storage, server-side signing, operator authentication, audit logging, revocation control and legal review.

---

## 7. Phase Boundary

The legal boundary of each phase is:

| Step | Phase | Legal Meaning |
|---|---|---|
| 01 | `SUBJECT_CREATED` | Customer/subject intake only |
| 02 | `FISCAL_IDENTITY_COLLECTED` | Fiscal evidence collection only |
| 03 | `OFFICIAL_DOCUMENT_SUBMITTED` | Official document evidence submission only |
| 04 | `LIVENESS_SUBMITTED` | Photo/video/liveness evidence submission only |
| 05 | `COMPLIANCE_ACCEPTED` | Privacy and compliance acknowledgement only |
| 06 | `PENDING_REVIEW` | Review submission only |
| 07 | `IPR_APPROVED` | Internal HBCE approval for IPR Card issuance |
| 08 | `IPR_CARD_ISSUED` | Internal HBCE IPR Card issuance |
| 09 | `IPR_VERIFIED` | Internal operational certificate activation |
| Gate | `JOKER_C2_ACCESS` | Governed AI access decision |

No single intermediate phase grants JOKER-C2 access.

Only the final access gate can show `ACCESS_GRANTED`, and only after validating the final operational certificate fail-closed.

---

## 8. Operational Identity Boundary

The app may support operational identity verification inside the HBCE ecosystem.

The app may collect identity-related information for the purpose of internal operational verification, subject to applicable law, privacy rules and security controls.

The app may assign internal operational states such as:

```txt
not_started
in_progress
pending_review
approved
verified
rejected
suspended
revoked
expired
```

These states are internal HBCE operational states.

They are not equivalent to public authority recognition.

They do not replace official identity status.

They do not create official legal identity by themselves.

---

## 9. IPR Card Boundary

The IPR Card is an internal operational card issued inside the HBCE ecosystem.

It may display or contain:

```txt
IPR identifier
subject identifier
card serial
card status
issuer
issue date
expiry date
certificate reference
access scope
revocation state
hash reference
previous payload hash
payload hash
```

The IPR Card does not replace an official identity document.

The IPR Card does not grant public legal status by itself.

The IPR Card is not:

```txt
a passport
a CIE
a SPID credential
an EUDI Wallet credential
a qualified eIDAS certificate
a bank card
a payment card
a bank account
an IBAN
a public authority credential
```

The IPR Card enables controlled access inside the HBCE ecosystem according to internal verification and certificate-chain rules.

---

## 10. Operational Certificate Boundary

The operational certificate is an internal HBCE certificate reference.

It may link:

```txt
certificate identifier
IPR identifier
subject identifier
card serial
issuer
issue date
expiry date
scope
status
hash reference
previous payload hash
payload hash
revocation state where applicable
```

The operational certificate is not a qualified eIDAS certificate unless issued through a recognized and legally compliant trust service integration.

The operational certificate enables JOKER-C2 access evaluation.

It does not automatically grant JOKER-C2 access.

The gate must still validate:

```txt
protocol
issuer
certificate kind
phase
certificate status
certificate scope
previous payload hash
payload hash
revocation state where applicable
```

---

## 11. JOKER-C2 Access Boundary

JOKER-C2 access must depend on verified IPR status and a valid final HBCE operational certificate.

The following access model is not valid for HBCE:

```txt
email + password + payment = governed AI access
```

The correct access model is:

```txt
subject onboarding
→ fiscal identity evidence
→ official document evidence
→ photo/video liveness evidence
→ privacy and compliance acceptance
→ review submission
→ HBCE approval
→ IPR Card issuance
→ operational certificate activation
→ JOKER-C2 access gate
→ governed JOKER-C2 access
```

JOKER-C2 access is an internal operational authorization.

It is not public authority validation.

It does not imply state recognition of identity.

It does not bypass governance, revocation, suspension, expiry, runtime policy or future server-side enforcement.

---

## 12. Banking Boundary

HBCE IPR Onboarding App may use a bank-grade onboarding posture.

This means that the app may adopt strict identity verification practices similar to digital banking onboarding workflows.

However, the app does not provide:

```txt
bank accounts
IBANs
payment accounts
deposits
lending
investment services
custody services
payment services
regulated financial services
regulated banking services
regulated financial onboarding by itself
```

The comparison with digital banking onboarding is functional and procedural.

It does not imply that HBCE is a bank.

It does not imply that HBCE is a regulated financial institution.

It does not imply that the MVP may be used as a real financial onboarding service.

---

## 13. Trust Service Boundary

HBCE IPR Onboarding App does not issue qualified eIDAS certificates by itself.

HBCE IPR Onboarding App does not act as a recognized trust service provider by itself.

The operational certificate generated by the MVP is internal to HBCE.

Future trust-service integration may require:

```txt
recognized trust service provider
qualified trust service provider where applicable
formal legal integration
contractual framework
technical interoperability
identity assurance assessment
security assessment
privacy review
compliance review
```

Until such integration exists, the correct claim remains:

```txt
The HBCE operational certificate is internal to HBCE.
```

---

## 14. Research and MVP Boundary

The first implementation operates as:

```txt
research prototype
MVP
internal demo
self-pilot
onboarding workflow demonstration
identity verification workflow demonstration
certificate chain demonstration
access gate demonstration
controlled R&D surface
```

In MVP mode, the app may use:

```txt
synthetic data
mock data
local browser session continuity
private portable certificates
manual certificate upload fallback
client-side certificate generation
client-side access gate demonstration
```

In MVP mode, the app must not claim:

```txt
production KYC
production identity verification
production biometric verification
production trust service issuance
production financial onboarding
official identity issuance
regulated certification
```

No real identity document, real fiscal identifier, real biometric material or real user file should be committed to this repository.

---

## 15. Privacy Boundary

The app may process sensitive identity-related data in future real implementations.

Such processing requires appropriate privacy controls, including:

```txt
data minimization
purpose limitation
lawful basis
access control
secure storage
encryption where required
retention rules
deletion rules
incident response
legal review
privacy review
data protection assessment where applicable
compliance assessment where applicable
```

Public layers should expose minimized metadata and hash references where possible.

Portable private certificates may contain private phase data for the subject’s local copy.

Public verification must remain hash-only where possible.

---

## 16. Security Boundary

The app must follow a fail-closed posture.

Access must be denied when identity state or certificate state is:

```txt
incomplete
missing
unclear
malformed
wrong phase
wrong scope
hash invalid
rejected
expired
suspended
revoked
under review
unverifiable
```

The default decision must be:

```txt
ACCESS_DENIED
```

The app must not rely on:

```txt
browser state
session storage
local storage
query parameters
hidden form fields
manual frontend status
unsigned client payloads
uploaded file name only
```

Production access decisions require backend enforcement.

---

## 17. Revocation Boundary

The production architecture must support revocation.

Revocation may apply to:

```txt
IPR
IPR Card
phase certificate
operational certificate
JOKER-C2 access
onboarding record
```

If an IPR, IPR Card, phase certificate or operational certificate is revoked, suspended, expired or under review, JOKER-C2 access must be disabled.

Revocation must override previous approval.

Allowed access condition:

```txt
revocation_state = clear
```

All other revocation states must deny access.

Production revocation must be enforced server-side.

---

## 18. Future Integration Boundary

Future integrations may include:

```txt
official digital identity systems
European identity frameworks
recognized trust service providers
qualified trust service providers
document verification providers
liveness verification providers
enterprise identity systems
institutional registries
compliance providers
secure storage providers
EVT registry
OPC proof layer
revocation registry
JOKER-C2 runtime authorization bridge
```

Any such integration must be evaluated under applicable law, contractual requirements, privacy requirements and technical security standards.

This repository does not itself create those legal integrations.

This repository does not itself transform HBCE into a public authority, bank, payment institution or qualified trust service provider.

---

## 19. No Legal Advice

This repository is technical and operational documentation.

It is not legal advice.

Before production deployment, regulated use, institutional use, identity verification use, trust service integration, financial service integration or cross-border identity processing, the project requires qualified legal, privacy and security review.

Nothing in this repository should be interpreted as a legal authorization to provide regulated identity, financial, banking or qualified trust services.

---

## 20. Public Communication Rule

Public communication must remain precise.

Allowed formulation:

```txt
HBCE IPR Onboarding App provides operational identity onboarding for verified access to governed AI runtime services.
```

Allowed formulation:

```txt
IPR Card is an internal operational identity credential issued within the HBCE ecosystem.
```

Allowed formulation:

```txt
JOKER-C2 is accessible through verified IPR status and a valid HBCE operational certificate, not through a simple email subscription.
```

Allowed formulation:

```txt
HBCE issues a verifiable operational identity that can be linked to official European identity systems in future lawful integrations.
```

Forbidden formulation:

```txt
HBCE issues official European identity.
```

Forbidden formulation:

```txt
HBCE replaces CIE, SPID or EUDI Wallet.
```

Forbidden formulation:

```txt
HBCE issues qualified eIDAS certificates by itself.
```

Forbidden formulation:

```txt
HBCE is a bank.
```

Forbidden formulation:

```txt
HBCE issues IBANs.
```

Forbidden formulation:

```txt
HBCE provides regulated financial services through this MVP.
```

---

## 21. Production Requirements

Before production use, the app requires:

```txt
backend API
database persistence
protected evidence storage
server-side certificate signing
server-side session management
admin authentication
operator authorization
audit logging
revocation registry
secure document verification provider
secure liveness verification provider
KYC / eID / eIDAS integration study
EUDI Wallet compatibility study
EVT continuity integration
OPC proof integration
JOKER-C2 runtime bridge
monitoring
incident response
legal review
privacy review
security review
provider review
compliance assessment
```

Client-side certificate generation and browser session continuity are not sufficient as production trust sources.

Production trust requires backend enforcement.

---

## 22. Canonical Legal Formula

```txt
HBCE does not replace official identity.
HBCE creates operational identity.
IPR does not replace state documents.
IPR connects subject, verification, access and audit continuity.
IPR Card is the operational key.
Operational certificate enables access evaluation.
JOKER-C2 access requires verified IPR.
The gate decides fail-closed.
```

---

## 23. Organization

```txt
HERMETICUM B.C.E. S.r.l.
```

---

## 24. Canonical Trademark

```txt
HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA
HERMETICUM B.C.E. S.r.l.
```
