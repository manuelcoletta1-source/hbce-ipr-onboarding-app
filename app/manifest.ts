import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HBCE IPR Onboarding App",
    short_name: "HBCE IPR",
    description:
      "IPR Onboarding Gateway for operational identity verification, IPR Card issuance, operational certificate activation and governed JOKER-C2 access.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#05070b",
    theme_color: "#05070b",
    categories: ["business", "productivity", "security"],
    lang: "en",
    orientation: "portrait-primary"
  };
}
