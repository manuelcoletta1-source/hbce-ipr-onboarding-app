# HBCE IPR Onboarding App — Project Status

## 1. Current Status

HBCE IPR Onboarding App is now initialized as a complete MVP repository for operational identity onboarding.

The repository includes:

```txt
canonical documentation
Next.js application structure
TypeScript operational state model
mock onboarding records
fail-closed JOKER-C2 access decision engine
reusable UI components
public onboarding pages
IPR Card preview
operational certificate preview
JOKER-C2 access gate
legal boundary page
privacy boundary page
security boundary page
mock API endpoints
EVT-ready event endpoint
OPC-ready proof endpoint
revocation endpoint
deployment guide
testing checklist

The project is ready for first local validation and controlled MVP deployment.

2. Core Operational Rule

No verified IPR, no governed JOKER-C2 access.

This rule is implemented in:

lib/access-decision.ts
components/AccessGatePanel.tsx
app/access/joker-c2/page.tsx
app/api/access/joker-c2/route.ts

3. Repository Nature

This repository is:

MVP
R&D demonstrator
operational identity onboarding prototype
IPR Card preview system
governed JOKER-C2 access gate prototype
EVT/OPC-ready mock architecture

This repository is not:

production KYC system
regulated identity provider
official public identity issuer
banking service
qualified eIDAS trust service
CIE issuer
SPID issuer
EUDI Wallet issuer
production biometric verification system

4. Documentation Completed

The following documentation files are present:

README.md
ARCHITECTURE.md
SECURITY.md
PRIVACY.md
LEGAL.md
ONBOARDING_FLOW.md
DATA_MODEL.md
ROUTES.md
MVP_SCOPE.md
ROADMAP.md
PRODUCT_SPEC.md
TECHNICAL_SPEC.md
API_SPEC.md
UI_SPEC.md
IMPLEMENTATION_PLAN.md
DEPLOYMENT.md
TESTING.md
PROJECT_STATUS.md

Documentation status:

complete for MVP
ready for technical review
ready for deploy preparation
ready for institutional explanation

5. Technical Foundation Completed

The following technical foundation files are present:

package.json
tsconfig.json
next.config.ts
eslint.config.mjs
.gitignore
.env.example

Technical status:

Next.js app initialized
TypeScript strict configuration enabled
ESLint configured
security headers configured
sensitive onboarding folders ignored
environment variable template present

6. Application Structure Completed

The following app structure is present:

app/
  layout.tsx
  globals.css
  page.tsx
  not-found.tsx
  onboarding/
  ipr-card/
  certificate/
  access/joker-c2/
  legal/
  privacy/
  security/
  api/
components/
lib/

Application status:

public route map implemented
onboarding route map implemented
operational identity pages implemented
boundary pages implemented
API routes implemented

7. Public Pages Completed

The following public pages are implemented:

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

Page status:

complete for MVP
static/form-based mock interface
no real sensitive data required
no real identity verification performed

8. Components Completed

The following components are implemented:

components/StatusBadge.tsx
components/BoundaryNotice.tsx
components/OnboardingStepper.tsx
components/IPRCardPreview.tsx
components/CertificatePreview.tsx
components/AccessGatePanel.tsx

Component status:

usable across MVP pages
status display centralized
boundary notices centralized
IPR Card preview implemented
certificate preview implemented
access gate panel implemented

9. Library Layer Completed

The following library files are implemented:

lib/types.ts
lib/constants.ts
lib/mock-onboarding.ts
lib/access-decision.ts
lib/format.ts

Library status:

operational state model defined
canonical constants centralized
mock records available
fail-closed access decision implemented
safe formatting helpers available

10. API Endpoints Completed

The following API endpoints are implemented:

GET  /api/health
GET  /api/manifest

GET  /api/onboarding/status
POST /api/onboarding/status

GET  /api/onboarding/start
POST /api/onboarding/start

GET  /api/onboarding/identity
POST /api/onboarding/identity

GET  /api/onboarding/documents
POST /api/onboarding/documents

GET  /api/onboarding/fiscal
POST /api/onboarding/fiscal

GET  /api/onboarding/photo-video
POST /api/onboarding/photo-video

GET  /api/onboarding/review
POST /api/onboarding/review

GET  /api/ipr/verify
POST /api/ipr/verify

GET  /api/ipr-card/status
POST /api/ipr-card/status

GET  /api/ipr-card/issue
POST /api/ipr-card/issue

GET  /api/certificate/status
POST /api/certificate/status

GET  /api/certificate/activate
POST /api/certificate/activate

GET  /api/access/joker-c2
POST /api/access/joker-c2

GET  /api/events
POST /api/events

GET  /api/opc/proof
POST /api/opc/proof

GET  /api/revocation
POST /api/revocation

API status:

mock-only
MVP-safe
no real persistence
no real identity verification
no real document processing
no production secrets

11. Demo Modes Implemented

The app supports the following demo modes:

approved
pending
denied
revoked

Meaning:

approved = valid operational identity path
pending = onboarding still under review
denied = onboarding rejected
revoked = previous authorization overridden by revocation

Only the approved mode may produce:

allow_governed_access

All other modes must produce:

deny_access

12. Access Gate Logic Implemented

The access gate allows governed JOKER-C2 access only when:

ipr_status = verified
ipr_card_status = issued
certificate_status = active
revocation_state = clear

Any missing, invalid, rejected, expired, suspended or revoked state results in:

deny_access

Revocation overrides previous approval.

13. Sensitive Data Boundary Implemented

The repository excludes and forbids:

real identity documents
real passports
real identity cards
real driving licenses
real fiscal codes
real tax identifiers
real national identification numbers
real photos
real videos
biometric templates
liveness recordings
private review notes
production secrets
private keys
API credentials
database credentials
storage credentials

The .gitignore includes dedicated exclusions for sensitive onboarding folders.

14. Legal Boundary Implemented

The app states that HBCE IPR Onboarding App does not issue:

official state identity documents
passports
national identity cards
CIE
SPID
EUDI Wallet credentials
qualified eIDAS certificates
bank accounts
regulated financial services

Correct claim:

HBCE issues an internal verifiable operational identity record.

Incorrect claim:

HBCE issues an official European identity.

15. Privacy Boundary Implemented

The privacy posture is:

data minimization
masked values
hash references
protected storage references
public-safe operational states
no raw sensitive data in public views
no real sensitive data in repository

The app uses mock values only.

16. Security Boundary Implemented

The security posture is:

fail-closed by default
server-side API decision preparation
no frontend-only trust
no raw sensitive material
no production secrets
revocation blocks access
JOKER-C2 access requires verified operational state

17. EVT and OPC Preparation Implemented

EVT-ready endpoint:

/api/events

OPC-ready endpoint:

/api/opc/proof

Current status:

mock-only
proof-ready
audit-ready demonstration
no regulated certification
no production ledger

18. Revocation Preparation Implemented

Revocation endpoint:

/api/revocation

Supported targets:

ipr
ipr_card
certificate
joker_c2_access
onboarding_record

Supported revocation states:

clear
suspended
revoked
expired
under_review

Rule:

Any revocation_state other than clear blocks JOKER-C2 access.

19. Remaining Local Validation

Before deployment, run:

npm install
npm run typecheck
npm run lint
npm run build

Expected result:

no TypeScript errors
no lint errors
build succeeds

If errors appear, fix the full affected file, not partial patches.

20. Remaining Deployment Steps

Deployment preparation:

connect GitHub repo to Vercel
set Node.js version compatible with package.json
set public environment variables if needed
run build
verify all public routes
verify all API routes
verify access gate behavior
verify legal/privacy/security boundary pages

The first deployment should remain MVP-only.

21. First MVP Acceptance Criteria

The MVP is acceptable when:

all pages load
all API routes return JSON
approved mode allows governed access
pending mode denies access
denied mode denies access
revoked mode denies access
revocation blocks access
IPR Card preview displays correctly
certificate preview displays correctly
legal boundary is visible
privacy boundary is visible
security boundary is visible
no sensitive data is committed
build succeeds

22. Future Work

Future phases may include:

secure authentication
database persistence
protected document storage
operator review console
real document verification provider study
liveness verification provider study
server-side session management
EVT registry integration
OPC proof integration
revocation registry integration
JOKER-C2 runtime bridge
EUDI Wallet compatibility study
eIDAS trust service integration study
controlled institutional pilot

Each future phase requires legal, privacy, security and technical review.

23. Current Strategic Position

The project now demonstrates the core HBCE distinction:

Classic AI:
email + password + subscription + direct model access

HBCE:
identity onboarding + verification + IPR Card + certificate + access gate + governed JOKER-C2 runtime

This repository is the operational onboarding layer of that distinction.

24. Project Status Formula

Documentation complete.
MVP structure complete.
UI pages complete.
Mock APIs complete.
Access gate complete.
Boundary pages complete.
Testing checklist complete.
Deployment guide complete.
Ready for local validation.
Ready for controlled MVP deployment after build verification.

25. Organization

HERMETICUM B.C.E. S.r.l.

26. Canonical Trademark

HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA

HERMETICUM B.C.E. S.r.l.

