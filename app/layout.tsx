import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "HBCE IPR Onboarding App",
  description:
    "Bank-grade operational identity onboarding for IPR Verified, IPR Card issuance and governed JOKER-C2 access.",
  applicationName: "HBCE IPR Onboarding App",
  authors: [{ name: "HERMETICUM B.C.E. S.r.l." }],
  creator: "HERMETICUM B.C.E. S.r.l.",
  publisher: "HERMETICUM B.C.E. S.r.l.",
  robots: {
    index: true,
    follow: true
  }
};

const navItems = [
  { href: "/onboarding", label: "Onboarding" },
  { href: "/ipr-card", label: "IPR Card" },
  { href: "/certificate", label: "Certificate" },
  { href: "/access/joker-c2", label: "JOKER-C2 Access" },
  { href: "/legal", label: "Legal" },
  { href: "/privacy", label: "Privacy" },
  { href: "/security", label: "Security" }
];

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
              <Link className="hbce-brand" href="/">
                <span className="hbce-brand__title">
                  HBCE IPR Onboarding App
                </span>
                <span className="hbce-brand__subtitle">
                  Operational identity onboarding for governed AI access
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
                <strong>HERMETICUM B.C.E. S.r.l.</strong>
                <div className="hbce-small">
                  HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA
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
