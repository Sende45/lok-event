import { MetadataRoute } from "next";

// ⚠️ Mets ici ton domaine final. Le og:url du site pointe déjà vers
// https://lokevent.com — si ce domaine est actif, utilise-le,
// sinon garde l'URL Vercel.
const BASE_URL = "https://lok-event.vercel.app";

// URL de ton backend Render (même valeur que dans tes appels API)
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // --- Pages statiques publiques ---
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/premium`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  // --- Pages dynamiques : profils publics des prestataires ---
  // Adapte l'endpoint et le pattern d'URL à tes routes réelles.
  let providerRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_URL}/api/prestataires`, {
      // Regénéré au plus toutes les 24h
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const prestataires: { id: string; updatedAt?: string }[] =
        await res.json();
      providerRoutes = prestataires.map((p) => ({
        url: `${BASE_URL}/prestataire/${p.id}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    }
  } catch {
    // Si le backend est indisponible au build, on garde au moins le statique
  }

  return [...staticRoutes, ...providerRoutes];
}