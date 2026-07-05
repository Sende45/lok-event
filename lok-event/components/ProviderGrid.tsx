"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Provider } from "../types/provider";
import ProviderCard from "./ProviderCard";

interface PrestataireAPI {
  id: string;
  nomEntreprise: string;
  photos: string[];
  notemoyenne: number;
  quartier: string;
  ville: string;
  prixMin: number | null;
  prixMax: number | null;
  whatsapp: string | null;
  telephone: string | null;
  categorie: { nom: string };
}

interface PrestatairesResponse {
  prestataires: PrestataireAPI[];
  pagination: {
    total: number;
    pages: number;
    currentPage: number;
    limit: number;
  };
}

export interface ProviderFilters {
  categorieSlug?: string;
  tagSlug?: string;
  ville?: string;
}

function mapToProvider(pr: PrestataireAPI): Provider {
  return {
    id: pr.id,
    name: pr.nomEntreprise,
    image: pr.photos?.[0],
    rating: pr.notemoyenne,
    location: `${pr.quartier}, ${pr.ville}`,
    price: pr.prixMin ?? 0,
    whatsapp: pr.whatsapp ?? undefined,
    telephone: pr.telephone ?? undefined,
  };
}

export default function ProviderGrid({ filters }: { filters: ProviderFilters }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProviders() {
      setIsLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (filters.categorieSlug) params.set("categorie", filters.categorieSlug);
        if (filters.tagSlug) params.set("tag", filters.tagSlug);
        if (filters.ville) params.set("ville", filters.ville);

        const query = params.toString();
        const data = await api.get<PrestatairesResponse>(
          `/prestataires${query ? `?${query}` : ""}`
        );
        setProviders(data.prestataires.map(mapToProvider));
        setTotal(data.pagination.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        setIsLoading(false);
      }
    }
    loadProviders();
  }, [filters.categorieSlug, filters.tagSlug, filters.ville]);

  return (
    <section className="max-w-[1600px] mx-auto px-8 py-16">
      <div className="mb-12">
        <h2 className="text-[var(--color-primary)] text-[11px] uppercase tracking-[0.3em] font-bold mb-3">
          Abidjan, Côte d'Ivoire
        </h2>
        <h3 className="text-4xl font-bold tracking-tight text-white">
          {isLoading ? "..." : total} Prestataires d'élite
        </h3>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!isLoading && !error && providers.length === 0 && (
        <p className="text-gray-500 text-sm">Aucun prestataire trouvé pour ces filtres.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {providers.map((p) => (
          <div key={p.id} className="will-change-transform">
            <ProviderCard p={p} />
          </div>
        ))}
      </div>
    </section>
  );
}