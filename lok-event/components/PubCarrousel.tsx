"use client";
// components/PubCarrousel.tsx — publicités des marques partenaires sur le site
// Mêmes pubs et mêmes compteurs que l'app mobile (onglet admin « Publicités ») :
// - 1 bannière visible sur téléphone, 2 sur tablette, 3 sur grand écran
// - défilement automatique toutes les 5 s (mis en pause au survol)
// - chaque pub vue est comptée une fois par visite, chaque clic aussi

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";

interface Publicite {
  id: string;
  marque: string;
  titre: string | null;
  sousTitre: string | null;
  imageUrl: string;
  lien: string | null;
}

const DELAI_DEFILEMENT = 5000;
const CLE_VUES = "lokevent_pubs_vues";

/** Compte un affichage une seule fois par visite (sessionStorage) */
function compterAffichage(id: string) {
  try {
    const vues: string[] = JSON.parse(sessionStorage.getItem(CLE_VUES) || "[]");
    if (vues.includes(id)) return;
    sessionStorage.setItem(CLE_VUES, JSON.stringify([...vues, id]));
  } catch {
    /* stockage indisponible : on compte quand même */
  }
  api.post(`/publicites/${id}/affichage`, {}).catch(() => {});
}

export default function PubCarrousel({ emplacement = "ACCUEIL_CARROUSEL" }: { emplacement?: string }) {
  const [pubs, setPubs] = useState<Publicite[]>([]);
  const [index, setIndex] = useState(0);
  const [pause, setPause] = useState(false);
  const piste = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<Publicite[]>(`/publicites?emplacement=${emplacement}`)
      .then(setPubs)
      .catch(() => setPubs([])); // pas de pub = pas de bloc, jamais d'erreur visible
  }, [emplacement]);

  // Nombre de bannières visibles à l'écran (selon la largeur)
  const parEcran = useCallback(() => {
    const el = piste.current;
    const carte = el?.firstElementChild as HTMLElement | null;
    if (!el || !carte) return 1;
    return Math.max(1, Math.round(el.clientWidth / carte.offsetWidth));
  }, []);

  // Compte les pubs réellement visibles
  useEffect(() => {
    if (pubs.length === 0) return;
    const n = parEcran();
    for (let i = index; i < Math.min(index + n, pubs.length); i++) compterAffichage(pubs[i].id);
  }, [pubs, index, parEcran]);

  const allerA = useCallback((i: number) => {
    const el = piste.current;
    const carte = el?.children[i] as HTMLElement | undefined;
    if (!el || !carte) return;
    el.scrollTo({ left: carte.offsetLeft - el.offsetLeft, behavior: "smooth" });
  }, []);

  // Défilement automatique
  useEffect(() => {
    if (pause || pubs.length < 2) return;
    const minuteur = setInterval(() => {
      const dernier = Math.max(0, pubs.length - parEcran());
      allerA(index >= dernier ? 0 : index + 1);
    }, DELAI_DEFILEMENT);
    return () => clearInterval(minuteur);
  }, [pause, pubs.length, index, allerA, parEcran]);

  // Index courant d'après la position de défilement (glissé au doigt compris)
  const surDefilement = () => {
    const el = piste.current;
    const carte = el?.firstElementChild as HTMLElement | null;
    if (!el || !carte) return;
    const pas = carte.offsetWidth + 16; // largeur + espacement (gap-4)
    setIndex(Math.round(el.scrollLeft / pas));
  };

  const ouvrir = (pub: Publicite) => {
    api.post(`/publicites/${pub.id}/clic`, {}).catch(() => {});
    if (!pub.lien) return;
    // Lien vers LOKEVENT : même onglet ; lien externe (WhatsApp, marque) : nouvel onglet
    if (pub.lien.startsWith(window.location.origin)) window.location.assign(pub.lien);
    else window.open(pub.lien, "_blank", "noopener,noreferrer");
  };

  if (pubs.length === 0) return null;

  return (
    <section
      className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-8 pt-4 md:pt-6"
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
      aria-label="Publicités"
    >
      <div className="relative group">
        <div
          ref={piste}
          onScroll={surDefilement}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {pubs.map((pub) => (
            <button
              key={pub.id}
              type="button"
              onClick={() => ouvrir(pub)}
              aria-label={`Publicité ${pub.marque}${pub.titre ? ` : ${pub.titre}` : ""}`}
              className="relative shrink-0 snap-start w-full md:w-[calc((100%-1rem)/2)] xl:w-[calc((100%-2rem)/3)] aspect-video rounded-2xl overflow-hidden border border-white/10 bg-white/5 text-left hover:border-teal-400/40 transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pub.imageUrl} alt={pub.marque} className="absolute inset-0 w-full h-full object-cover" />

              {(pub.titre || pub.sousTitre) && (
                <div className="absolute inset-x-0 bottom-0 p-4 pt-10 bg-gradient-to-t from-black/85 to-transparent">
                  {pub.titre && <p className="text-white font-extrabold truncate">{pub.titre}</p>}
                  {pub.sousTitre && <p className="text-gray-200 text-sm line-clamp-2">{pub.sousTitre}</p>}
                </div>
              )}

              <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                Sponsorisé · {pub.marque}
              </span>
            </button>
          ))}
        </div>

        {/* Flèches (ordinateur) */}
        {pubs.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => allerA(Math.max(0, index - 1))}
              aria-label="Publicité précédente"
              className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => allerA(Math.min(pubs.length - 1, index + 1))}
              aria-label="Publicité suivante"
              className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Points */}
      {pubs.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {pubs.map((pub, i) => (
            <button
              key={pub.id}
              type="button"
              onClick={() => allerA(i)}
              aria-label={`Aller à la publicité ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-teal-400" : "w-1.5 bg-white/20"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}