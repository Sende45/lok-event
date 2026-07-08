"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Provider } from "../types/provider";
import ProviderCard from "./ProviderCard";
import ProvidersMapWrapper from "./map/ProvidersMapWrapper";

interface PrestataireAPI {
  id: string;
  nomEntreprise: string;
  photos: string[];
  notemoyenne: number;
  totalAvis: number;
  quartier: string;
  commune: string | null;
  ville: string;
  latitude: number | null;
  longitude: number | null;
  prixMin: number | null;
  prixMax: number | null;
  whatsapp: string | null;
  telephone: string | null;
  distance?: number; // renvoyé uniquement par /proximite
  categorie: { nom: string; couleur?: string | null };
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

interface ProximiteResponse {
  prestataires: PrestataireAPI[];
  total: number;
  rayon: number;
}

export interface ProviderFilters {
  categorieSlug?: string;
  tagSlug?: string;
  ville?: string;
  commune?: string;
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
  const [prestatairesRaw, setPrestatairesRaw] = useState<PrestataireAPI[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [vue, setVue] = useState<"liste" | "carte">("liste");
  const [modeProximite, setModeProximite] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    // Quand les filtres changent, on quitte le mode proximité
    setModeProximite(false);

    async function loadProviders() {
      setIsLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (filters.categorieSlug) params.set("categorie", filters.categorieSlug);
        if (filters.tagSlug) params.set("tag", filters.tagSlug);
        if (filters.ville) params.set("ville", filters.ville);
        if (filters.commune) params.set("commune", filters.commune);

        const query = params.toString();
        const data = await api.get<PrestatairesResponse>(
          `/prestataires${query ? `?${query}` : ""}`
        );
        setPrestatairesRaw(data.prestataires);
        setProviders(data.prestataires.map(mapToProvider));
        setTotal(data.pagination.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        setIsLoading(false);
      }
    }
    loadProviders();
  }, [filters.categorieSlug, filters.tagSlug, filters.ville, filters.commune]);

  const chercherAutourDeMoi = () => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée par ce navigateur");
      return;
    }
    setIsLocating(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const params = new URLSearchParams();
          params.set("lat", pos.coords.latitude.toString());
          params.set("lng", pos.coords.longitude.toString());
          params.set("rayon", "10");
          if (filters.categorieSlug) params.set("categorie", filters.categorieSlug);

          const data = await api.get<ProximiteResponse>(
            `/prestataires/proximite?${params.toString()}`
          );
          setPrestatairesRaw(data.prestataires);
          setProviders(data.prestataires.map(mapToProvider));
          setTotal(data.total);
          setModeProximite(true);
          setVue("carte"); // en mode proximité, la carte est la vue la plus parlante
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur de chargement");
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setError("Impossible d'obtenir votre position (autorisation refusée ?)");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <section className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-16">
      <div className="mb-8 md:mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-[var(--color-primary)] text-[11px] uppercase tracking-[0.3em] font-bold mb-3">
            Abidjan, Côte d'Ivoire
          </h2>
          <h3 className="text-2xl md:text-4xl font-bold tracking-tight text-white">
            {isLoading ? "..." : total} Prestataires d'élite
            {modeProximite && (
              <span className="block text-sm font-normal text-teal-400 mt-1">
                📍 À moins de 10 km de vous
              </span>
            )}
          </h3>
        </div>

        <div className="flex items-center gap-2 md:gap-3 w-full lg:w-auto">
          <button
            onClick={chercherAutourDeMoi}
            disabled={isLocating}
            className="flex-1 lg:flex-none px-3 md:px-4 py-2.5 md:py-2 rounded-lg bg-teal-400 text-black text-xs md:text-sm font-medium hover:bg-teal-300 active:bg-teal-500 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {isLocating ? "Localisation..." : "📍 Autour de moi"}
          </button>

          <div className="flex flex-1 lg:flex-none rounded-lg overflow-hidden border border-white/10">
            <button
              onClick={() => setVue("liste")}
              className={`flex-1 lg:flex-none px-3 md:px-4 py-2.5 md:py-2 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                vue === "liste"
                  ? "bg-white/10 text-white"
                  : "bg-transparent text-gray-400 hover:text-white"
              }`}
            >
              📋 Liste
            </button>
            <button
              onClick={() => setVue("carte")}
              className={`flex-1 lg:flex-none px-3 md:px-4 py-2.5 md:py-2 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                vue === "carte"
                  ? "bg-white/10 text-white"
                  : "bg-transparent text-gray-400 hover:text-white"
              }`}
            >
              🗺️ Carte
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

      {!isLoading && !error && providers.length === 0 && (
        <p className="text-gray-500 text-sm">
          {modeProximite
            ? "Aucun prestataire géolocalisé à moins de 10 km."
            : "Aucun prestataire trouvé pour ces filtres."}
        </p>
      )}

      {vue === "liste" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {providers.map((p) => (
            <div key={p.id} className="will-change-transform">
              <ProviderCard p={p} />
            </div>
          ))}
        </div>
      ) : (
        <ProvidersMapWrapper prestataires={prestatairesRaw} height="65vh" />
      )}
    </section>
  );
}