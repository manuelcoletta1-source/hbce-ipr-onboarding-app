import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  APP_DESCRIPTION,
  APP_NAME,
  CANONICAL_TRADEMARK,
  JOKER_C2_GATEWAY_URL,
  ORG_NAME,
  ROUTES
} from "@/lib/constants";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hbce-ipr-onboarding-app.vercel.app"),
  title: {
    default: `${APP_NAME} | IPR Onboarding Gateway`,
    template: `%s | ${APP_NAME}`
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  authors: [{ name: ORG_NAME }],
  creator: ORG_NAME,
  publisher: ORG_NAME,
  category: "operational identity onboarding",
  keywords: [
    "HBCE",
    "HERMETICUM B.C.E.",
    "IPR",
    "Identity Primary Record",
    "HBCE IPR certificate chain",
    "IPR Onboarding Gateway",
    "IPR Verified",
    "IPR Card",
    "operational certificate",
    "JOKER-C2",
    "governed AI",
    "AI Operational Runtime",
    "operational identity",
    "identity verification",
    "document verification",
    "AI governance",
    "fail-closed access",
    "EVT",
    "OPC",
    "MATRIX"
  ],
  robots: {
    index: true,
    follow: true
  },
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: `${APP_NAME} | IPR Onboarding Gateway`,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    type: "website",
    locale: "en_US",
    url: "/"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

const navItems = [
  { href: ROUTES.onboardingPhase1, label: "Start IPR" },
  { href: ROUTES.onboarding, label: "Continue" },
  { href: ROUTES.iprCard, label: "IPR Card" },
  { href: ROUTES.certificate, label: "Certificate" },
  { href: ROUTES.jokerC2Access, label: "JOKER-C2" },
  { href: ROUTES.legal, label: "Legal" },
  { href: ROUTES.privacy, label: "Privacy" },
  { href: ROUTES.security, label: "Security" }
] as const;

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="hbce-page">
          <header className="hbce-header">
            <div className="hbce-container hbce-header__row">
              <Link
                className="hbce-brand"
                href={ROUTES.home}
                aria-label="HBCE IPR Onboarding App home"
              >
                <span className="hbce-brand__title">{APP_NAME}</span>
                <span className="hbce-brand__subtitle">
                  Identity verified first. Governed AI access after.
                </span>
              </Link>

              <nav className="hbce-nav" aria-label="Main navigation">
                {navItems.map((item) => (
                  <Link href={item.href} key={item.href}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>

          {children}

          <footer className="hbce-footer">
            <div className="hbce-container hbce-footer__row">
              <div>
                <strong>{ORG_NAME}</strong>
                <div className="hbce-small">{CANONICAL_TRADEMARK}</div>
                <div className="hbce-small">
                  HBCE-IPR Certificate Chain · IPR Card · Operational
                  Certificate · JOKER-C2 Access Gate
                </div>
              </div>

              <div className="hbce-footer__links">
                <Link href={ROUTES.legal}>Legal Boundary</Link>
                <Link href={ROUTES.privacy}>Privacy</Link>
                <Link href={ROUTES.security}>Security</Link>
                <a
                  href={JOKER_C2_GATEWAY_URL}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  JOKER-C2 Runtime
                </a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
