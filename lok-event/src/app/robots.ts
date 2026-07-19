import { MetadataRoute } from "next";

// Doit rester identique au BASE_URL de sitemap.ts
const BASE_URL = "https://lokevent.eden-group.co";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Les dashboards et pages authentifiées ne doivent pas être indexés
      disallow: ["/dashboard", "/admin", "/api/", "/splash"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}