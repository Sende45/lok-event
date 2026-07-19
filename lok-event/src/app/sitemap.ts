import { MetadataRoute } from "next";

// ⚠️ Quand tu auras ton vrai domaine (lokevent.ci / lokevent.com),
// remplace BASE_URL ici ET resoumets le sitemap dans Search Console.
const BASE_URL = "https://lok-event.vercel.app";

// NEXT_PUBLIC_API_URL contient déjà le /api final
// (ex: https://lok-event.onrender.com/api)
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

  // --- Pages dynamiques : fiches publiques des prestataires ---
  let providerRoutes: MetadataRoute.Sitemap = [];
  try {
    // API_URL contient déjà /api — on n'ajoute PAS /api une deuxième fois.
    // limit élevé pour couvrir tous les prestataires (ajuste si tu dépasses 500).
    const res = await fetch(`${API_URL}/prestataires?limit=500`, {
      // Regénéré au plus toutes les 24h
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      // L'API renvoie { prestataires: [...] }, pas un tableau nu
      const data: { prestataires: { id: string; updatedAt?: string }[] } =
        await res.json();
      providerRoutes = (data.prestataires || []).map((p) => ({
        // Route réelle du frontend : /prestataires/[id] (au pluriel)
        url: `${BASE_URL}/prestataires/${p.id}`,
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