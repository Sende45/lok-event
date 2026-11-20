"use client";

import { MapPin, Star, Heart, MessageCircle, Info, Lock, Gem } from "lucide-react";
import { Provider } from "../types/provider";
import Image from "next/image";
import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { estConnecte } from "@/lib/session";

const IMAGE_PAR_DEFAUT =
  "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800";

export default function ProviderCard({
  p,
  initialFavorite = false,
}: {
  p: Provider;
  initialFavorite?: boolean;
}) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isToggling, setIsToggling] = useState(false);

  const nom = p.name?.trim() || "Prestataire LOKEVENT";
  const hasContact = Boolean(p.whatsapp || p.telephone);
  const aDesAvis = (p.totalAvis ?? 0) > 0;

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // La session est dans un cookie httpOnly : on vérifie juste le profil mémorisé
    if (!estConnecte()) {
      window.location.href = "/login";
      return;
    }

    setIsToggling(true);
    try {
      if (isFavorite) {
        await api.delete(`/favoris/${p.id}`);
        setIsFavorite(false);
      } else {
        await api.post("/favoris", { prestataireId: p.id });
        setIsFavorite(true);
      }
    } catch (err: any) {
      console.error("Erreur favori:", err);
      if (err.message?.includes("Déjà dans vos favoris")) {
        setIsFavorite(true);
      }
    } finally {
      setIsToggling(false);
    }
  };

  const handleContact = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const number = p.whatsapp || p.telephone;
    if (!number) return;

    const cleaned = number.replace(/[^0-9]/g, "");
    const message = encodeURIComponent(
      `Bonjour, je vous contacte via LOKEVENT concernant vos services de ${nom}.`
    );
    window.open(`https://wa.me/${cleaned}?text=${message}`, "_blank");
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/prestataires/${p.id}`);
  };

  // Prestataire non Premium : carte floutée, sans nom ni contact
  if (p.masque) return <CarteMasquee p={p} />;

  // Les effets de survol sont en CSS (Tailwind) et non plus en framer-motion :
  // framer animait la couleur de fond depuis une valeur qu'il lisait mal
  // (couleurs Tailwind v4), ce qui laissait parfois une carte bloquée en blanc.
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="group relative h-full cursor-pointer transition-transform duration-300 ease-out hover:-translate-y-3"
      onClick={handleViewDetails}
    >
      {/* Halo turquoise au survol */}
      <div className="pointer-events-none absolute -inset-0.5 rounded-[2rem] bg-gradient-to-tr from-teal-400 to-teal-600 opacity-0 transition-opacity duration-500 group-hover:opacity-30" />

      <div className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0a] shadow-lg transition-[border-color,background-color,box-shadow] duration-300 group-hover:border-teal-500/60 group-hover:bg-[#0a1a18] group-hover:shadow-[0_20px_60px_rgba(20,184,166,0.2)]">
        <div className="relative h-64 overflow-hidden bg-[#111111]">
          <Image
            src={p.image || IMAGE_PAR_DEFAUT}
            alt={nom}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />

          {p.premium && (
            <span className="absolute left-4 top-4 z-20 flex items-center gap-1 rounded-full bg-yellow-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
              <Gem className="h-3 w-3" />
              Premium
            </span>
          )}

          <button
            type="button"
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            className="absolute right-4 top-4 z-20 rounded-full border border-white/10 bg-black/50 p-2.5 backdrop-blur-xl transition-all duration-200 hover:scale-110 hover:border-teal-400 hover:bg-teal-400 active:scale-90 disabled:opacity-50"
            onClick={handleToggleFavorite}
            disabled={isToggling}
          >
            <Heart
              className={`h-4 w-4 transition-colors duration-300 ${
                isFavorite ? "fill-red-500 text-red-500" : "text-white"
              }`}
            />
          </button>
        </div>

        <div className="flex flex-1 flex-col p-7">
          <div className="mb-1 flex items-start justify-between gap-3">
            <h4 className="line-clamp-1 text-lg font-bold text-white transition-colors duration-300 group-hover:text-teal-400">
              {nom}
            </h4>
            <div className="flex shrink-0 items-center gap-1 rounded-md border border-teal-400/20 bg-teal-400/10 px-2 py-0.5 text-[11px]">
              <Star className="h-3 w-3 fill-teal-400 text-teal-400" />
              <span className="font-bold text-teal-400">
                {aDesAvis ? p.rating.toFixed(1) : "Nouveau"}
              </span>
            </div>
          </div>

          {p.categorie && (
            <p className="mb-2 text-sm font-semibold text-teal-400">{p.categorie}</p>
          )}

          <div className="mb-6 flex items-center gap-2 text-xs font-medium text-gray-400">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-teal-400" />
            <span className="line-clamp-1">{p.location}</span>
          </div>

          <div className="mt-auto border-t border-white/10 pt-5">
            <p className="mb-3 font-mono text-sm font-semibold tracking-wider text-white">
              {p.price > 0 ? `dès ${p.price.toLocaleString("fr-FR")} FCFA` : "Prix sur devis"}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white transition-all duration-200 hover:border-teal-400 hover:bg-teal-400 hover:text-black active:scale-95"
                onClick={handleViewDetails}
              >
                <Info className="h-3.5 w-3.5" />
                Détails
              </button>

              {hasContact ? (
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white transition-all duration-200 hover:border-[#25D366] hover:bg-[#25D366] hover:text-black hover:shadow-[0_4px_20px_rgba(37,211,102,0.4)] active:scale-95"
                  onClick={handleContact}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Contacter
                </button>
              ) : (
                <span className="flex flex-1 items-center justify-center text-center text-[10px] uppercase tracking-wider text-gray-500">
                  Contact indisponible
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/** Carte d'un prestataire non Premium : on montre qu'il existe, sans le dévoiler */
function CarteMasquee({ p }: { p: Provider }) {
  return (
    <article
      className="relative h-full select-none overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0a]"
      title="Ce prestataire sera bientôt visible sur LOKEVENT"
    >
      <div className="relative h-64 overflow-hidden bg-white/5">
        {p.photoFloue && (
          <Image
            src={p.photoFloue}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="scale-125 object-cover opacity-70 blur-2xl"
          />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-white/10">
            <Lock className="h-6 w-6 text-white" />
          </span>
          <span className="text-sm font-semibold text-white">Bientôt visible</span>
        </div>
      </div>

      <div className="p-7">
        {/* Nom remplacé par une barre grise */}
        <div className="mb-3 h-4 w-1/2 rounded-full bg-white/10" />
        {p.categorie && <p className="mb-2 text-sm font-semibold text-teal-400">{p.categorie}</p>}
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
          <MapPin className="h-3.5 w-3.5 text-teal-400" />
          {p.location}
        </div>
        <p className="mt-6 border-t border-white/10 pt-5 text-xs text-gray-500">
          Ce prestataire est inscrit sur LOKEVENT. Sa fiche sera bientôt publique.
        </p>
      </div>
    </article>
  );
}