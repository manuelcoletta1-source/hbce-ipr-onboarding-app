import type { MetadataRoute } from "next";

import { ROUTES } from "@/lib/constants";

const BASE_URL = "https://hbce-ipr-onboarding-app.vercel.app";

const sitemapRoutes = [
  ROUTES.home,
  ROUTES.onboarding,
  ROUTES.onboardingStart,
  ROUTES.onboardingIdentity,
  ROUTES.onboardingDocuments,
  ROUTES.onboardingFiscal,
  ROUTES.onboardingPhotoVideo,
  ROUTES.onboardingReview,
  ROUTES.iprCard,
  ROUTES.certificate,
  ROUTES.jokerC2Access,
  ROUTES.legal,
  ROUTES.privacy,
  ROUTES.security
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return sitemapRoutes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified,
    changeFrequency: route === ROUTES.home ? "weekly" : "monthly",
    priority: route === ROUTES.home ? 1 : 0.8
  }));
}
