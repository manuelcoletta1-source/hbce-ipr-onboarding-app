import type { MetadataRoute } from "next";

const BASE_URL = "https://hbce-ipr-onboarding-app.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/onboarding",
          "/onboarding/start",
          "/onboarding/identity",
          "/onboarding/documents",
          "/onboarding/fiscal",
          "/onboarding/photo-video",
          "/onboarding/review",
          "/ipr-card",
          "/certificate",
          "/access/joker-c2",
          "/legal",
          "/privacy",
          "/security"
        ],
        disallow: [
          "/api/",
          "/uploads/",
          "/documents/",
          "/identity-documents/",
          "/official-documents/",
          "/fiscal-identifiers/",
          "/tax-identifiers/",
          "/national-identifiers/",
          "/photos/",
          "/videos/",
          "/media/",
          "/biometric/",
          "/biometrics/",
          "/liveness/",
          "/face-templates/",
          "/private-storage/",
          "/secure-storage/",
          "/review-notes/",
          "/production-records/",
          "/onboarding-records/",
          "/identity-records/"
        ]
      }
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL
  };
}
