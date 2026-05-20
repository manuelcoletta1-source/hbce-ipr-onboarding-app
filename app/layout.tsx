import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";

const appName = "HBCE IPR Onboarding App";
const organizationName = "HERMETICUM B.C.E. S.r.l.";
const canonicalTrademark = "HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA";
const appDescription =
  "IPR Onboarding Gateway for bank-grade operational identity verification, IPR Card issuance, operational certificate activation and governed JOKER-C2 access.";

export const metadata: Metadata = {
  metadataBase: new URL("https://hbce-ipr-onboarding-app.vercel.app"),
  title: {
    default: `${appName} | IPR Onboarding Gateway`,
    template: `%s | ${appName}`
  },
  description: appDescription,
  applicationName: appName,
  authors: [{ name: organizationName }],
  creator: organizationName,
  publisher: organizationName,
  category: "operational identity onboarding",
  keywords: [
    "HBCE",
    "HERMETICUM B.C.E.",
    "IPR",
    "Identity Primary Record",
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
    title: `${appName} | IPR Onboarding Gateway`,
    description: appDescription,
    siteName: appName,
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
  { href: "/onboarding", label: "Onboarding" },
  { href: "/ipr-card", label: "IPR Card" },
  { href: "/certificate", label: "Certificate" },
  { href: "/access/joker-c2", label: "JOKER-C2 Access" },
  { href: "/legal", label: "Legal" },
  { href: "/privacy", label: "Privacy" },
  { href: "/security", label: "Security" }
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
                href="/"
                aria-label="HBCE IPR Onboarding App home"
              >
                <span className="hbce-brand__title">
                  HBCE IPR Onboarding App
                </span>
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

          <main className="hbce-main">{children}</main>

          <footer className="hbce-footer">
            <div className="hbce-container hbce-footer__row">
              <div>
                <strong>{organizationName}</strong>
                <div className="hbce-small">{canonicalTrademark}</div>
                <div className="hbce-small">
                  IPR Onboarding Gateway · IPR Card · Operational Certificate ·
                  JOKER-C2 Access Gate
                </div>
              </div>

              <div className="hbce-footer__links">
                <Link href="/legal">Legal Boundary</Link>
                <Link href="/privacy">Privacy</Link>
                <Link href="/security">Security</Link>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
