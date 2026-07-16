import { MetadataRoute } from "next";

const BASE_URL = "https://lok-event.vercel.app";

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