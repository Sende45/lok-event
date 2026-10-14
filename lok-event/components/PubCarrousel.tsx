"use client";
// components/PubCarrousel.tsx — publicités des marques partenaires sur le site
// Mêmes pubs et mêmes compteurs que l'app mobile (onglet admin « Publicités ») :
// - une seule bannière à la fois, qui laisse place à la suivante en fondu
//   toutes les 3 secondes (pause au survol de la souris)
// - glisser du doigt sur téléphone, flèches et points sur ordinateur
// - le texte est dans l'image : rien n'est écrit par-dessus
// - chaque pub vue est comptée une fois par visite, chaque clic aussi

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";

interface Publicite {
  id: string;
  marque: string;
  titre: string | null;
  imageUrl: string;
  lien: string | null;
}

const DELAI_DEFILEMENT = 3000; // 3 s par bannière
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
  const debutGlisse = useRef<number | null>(null);

  useEffect(() => {
    api
      .get<Publicite[]>(`/publicites?emplacement=${emplacement}`)
      .then(setPubs)
      .catch(() => setPubs([])); // pas de pub = pas de bloc, jamais d'erreur visible
  }, [emplacement]);

  // Compte la bannière affichée
  useEffect(() => {
    const pub = pubs[index];
    if (pub) compterAffichage(pub.id);
  }, [pubs, index]);

  // Bannière suivante toutes les 3 s
  useEffect(() => {
    if (pause || pubs.length < 2) return;
    const minuteur = setTimeout(() => setIndex((i) => (i + 1) % pubs.length), DELAI_DEFILEMENT);
    return () => clearTimeout(minuteur);
  }, [pause, pubs.length, index]);

  if (pubs.length === 0) return null;

  const total = pubs.length;
  const precedente = () => setIndex((i) => (i - 1 + total) % total);
  const suivante = () => setIndex((i) => (i + 1) % total);

  const ouvrir = (pub: Publicite) => {
    api.post(`/publicites/${pub.id}/clic`, {}).catch(() => {});
    if (!pub.lien) return;
    // Lien vers LOKEVENT : même onglet ; lien externe (WhatsApp, marque) : nouvel onglet
    if (pub.lien.startsWith(window.location.origin)) window.location.assign(pub.lien);
    else window.open(pub.lien, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-8 pt-4 md:pt-6" aria-label="Publicités">
      <div
        className="relative group mx-auto w-full max-w-4xl aspect-video rounded-2xl overflow-hidden border border-white/10 bg-white/5"
        onMouseEnter={() => setPause(true)}
        onMouseLeave={() => setPause(false)}
        onTouchStart={(e) => {
          debutGlisse.current = e.touches[0].clientX;
          setPause(true);
        }}
        onTouchEnd={(e) => {
          const depart = debutGlisse.current;
          debutGlisse.current = null;
          setPause(false);
          if (depart === null) return;
          const ecart = e.changedTouches[0].clientX - depart;
          if (ecart > 50) precedente();
          else if (ecart < -50) suivante();
        }}
      >
        {/* Toutes les bannières sont empilées ; seule la bannière active est visible (fondu) */}
        {pubs.map((pub, i) => (
          <button
            key={pub.id}
            type="button"
            onClick={() => ouvrir(pub)}
            tabIndex={i === index ? 0 : -1}
            aria-hidden={i !== index}
            aria-label={`Publicité ${pub.marque}${pub.titre ? ` : ${pub.titre}` : ""}`}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              i === index ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pub.imageUrl} alt={pub.titre || pub.marque} className="w-full h-full object-cover" />
          </button>
        ))}

        <span className="absolute top-2 left-2 md:top-3 md:left-3 z-20 rounded-full bg-black/60 px-2 py-0.5 md:px-2.5 md:py-1 text-[9px] md:text-[10px] font-bold text-white pointer-events-none">
          Sponsorisé · {pubs[index].marque}
        </span>

        {/* Flèches (ordinateur) */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={precedente}
              aria-label="Publicité précédente"
              className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={suivante}
              aria-label="Publicité suivante"
              className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Points */}
      {total > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {pubs.map((pub, i) => (
            <button
              key={pub.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Aller à la publicité ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-teal-400" : "w-1.5 bg-white/25"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}