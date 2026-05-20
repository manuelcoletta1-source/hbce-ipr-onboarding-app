# HBCE IPR Onboarding App — Deployment Guide

## 1. Purpose

This document defines the deployment guide for HBCE IPR Onboarding App.

The first deployment must be treated as an MVP and public demonstrator for:

- operational identity onboarding;
- IPR Verified status;
- IPR Card preview;
- operational certificate preview;
- governed JOKER-C2 access gate;
- legal, privacy and security boundary pages.

The deployment must not process real identity documents, real fiscal identifiers, real photos, real videos or biometric material.

## 2. Core Deployment Rule

```txt
No verified IPR, no governed JOKER-C2 access.

The deployed MVP must preserve fail-closed access logic.

3. Runtime Requirements

Required runtime:

Node.js >= 20.9.0
Next.js
TypeScript
React

The runtime version must remain compatible with the engines field in package.json.

4. Local Development

Install dependencies:

npm install

Run development server:

npm run dev

Run typecheck:

npm run typecheck

Run lint:

npm run lint

Build production version:

npm run build

Start production server locally:

npm run start

5. Recommended Deployment Target

The first recommended deployment target is Vercel.

Recommended project name:

hbce-ipr-onboarding-app

Recommended production domain pattern:

hbce-ipr-onboarding-app.vercel.app

A custom domain may be added later only after legal, privacy and security boundary pages are stable.

6. Environment Variables

The MVP can run without production secrets.

Use .env.example as a template.

Required public variables for MVP:

NEXT_PUBLIC_APP_NAME="HBCE IPR Onboarding App"
NEXT_PUBLIC_ORG_NAME="HERMETICUM B.C.E. S.r.l."
NEXT_PUBLIC_JOKER_C2_GATEWAY_URL="https://hbce-ai-joker-c2.vercel.app/interface"
HBCE_MVP_MODE="true"

Future private variables must be added only through the deployment provider secret manager.

Do not commit real .env files.

7. Forbidden Deployment Data

The deployed app must not include:

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
production database dumps
production secrets
private keys
API credentials

8. MVP Deployment Boundary

The first deployment may include:

mock onboarding states
synthetic IPR records
synthetic IPR Card preview
synthetic certificate preview
synthetic access gate decision
legal boundary page
privacy boundary page
security boundary page

The first deployment must not claim:

official identity issuance
CIE issuance
SPID issuance
EUDI Wallet issuance
qualified eIDAS certificate issuance
bank account creation
regulated KYC production verification
regulated financial services

9. Pre-Deploy Checklist

Before deploy, verify:

README.md exists
ARCHITECTURE.md exists
SECURITY.md exists
PRIVACY.md exists
LEGAL.md exists
ONBOARDING_FLOW.md exists
DATA_MODEL.md exists
ROUTES.md exists
MVP_SCOPE.md exists
ROADMAP.md exists
PRODUCT_SPEC.md exists
TECHNICAL_SPEC.md exists
API_SPEC.md exists
UI_SPEC.md exists
IMPLEMENTATION_PLAN.md exists
package.json exists
tsconfig.json exists
next.config.ts exists
eslint.config.mjs exists
app/layout.tsx exists
app/page.tsx exists
all onboarding pages exist
IPR Card page exists
certificate page exists
JOKER-C2 access gate page exists
legal page exists
privacy page exists
security page exists
not-found page exists
.gitignore exists
.env.example exists

10. Technical Pre-Deploy Checks

Run:

npm run typecheck

Run:

npm run lint

Run:

npm run build

The app should not be deployed if typecheck, lint or build fails.

11. Security Pre-Deploy Checks

Confirm that the repository does not contain:

.env
.env.local
real document images
real document scans
real document numbers
real fiscal identifiers
real photos
real videos
biometric data
private keys
API keys
database credentials
storage credentials

Confirm that .gitignore excludes sensitive onboarding folders.

12. Vercel Deployment Settings

Recommended settings:

Framework Preset: Next.js
Build Command: npm run build
Install Command: npm install
Output Directory: .next
Node.js Version: 20.x or higher compatible version

Environment variables should be configured inside the Vercel dashboard, not committed to the repository.

13. Post-Deploy Verification

After deploy, check these routes:

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

Each route must load correctly.

The JOKER-C2 access gate must show denial for invalid states and allow only the valid approved mock state.

14. Public Communication Boundary

When presenting the deployed MVP, use this wording:

HBCE IPR Onboarding App is an MVP demonstrator for operational identity onboarding, IPR Card preview and governed JOKER-C2 access.

Do not use this wording:

HBCE issues official European identity.

Do not use this wording:

HBCE replaces CIE, SPID or EUDI Wallet.

Do not use this wording:

HBCE provides banking services.

15. First Deployment Goal

The first deployment goal is to demonstrate:

the onboarding path
the operational identity model
the IPR Card concept
the operational certificate concept
the fail-closed JOKER-C2 access gate
the legal boundary
the privacy boundary
the security boundary

The first deployment is not a production identity verification system.

16. Future Deployment Phases

Future deployment phases may add:

secure authentication
protected storage
operator review console
server-side API routes
database persistence
EVT event layer
OPC proof layer
revocation registry
JOKER-C2 bridge
identity verification provider integration
EUDI Wallet compatibility study
eIDAS trust service integration study

Each future phase requires legal, privacy, security and technical review.

17. Deployment Formula

Deploy the MVP.
Show the threshold.
Protect the boundary.
Deny by default.
Demonstrate IPR Card.
Demonstrate certificate.
Demonstrate access gate.
Open JOKER-C2 only after verified operational identity.

18. Organization

HERMETICUM B.C.E. S.r.l.

19. Canonical Trademark

HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA

HERMETICUM B.C.E. S.r.l.

