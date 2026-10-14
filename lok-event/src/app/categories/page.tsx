"use client";

// src/app/categories/page.tsx — toutes les catégories de prestataires
// Ouverte par le bouton « Tout voir » de l'accueil. Un clic sur une catégorie
// ramène à l'accueil avec cette catégorie déjà sélectionnée (/?categorie=slug).

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import NavbarMain from "../../../components/NavbarMain";
import { api } from "@/lib/api";

interface Categorie {
  id: string;
  nom: string;
  slug: string;
  icone: string | null;
  description?: string | null;
  _count: { prestataires: number };
}

/** Minuscules sans accents, pour une recherche tolérante ("patisserie" = "Pâtisserie") */
const normaliser = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    api
      .get<Categorie[]>("/categories")
      .then((data) => setCategories([...data].sort((a, b) => a.nom.localeCompare(b.nom, "fr"))))
      .catch((err) => setErreur(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setChargement(false));
  }, []);

  const terme = normaliser(recherche.trim());
  const visibles = terme
    ? categories.filter((c) => normaliser(`${c.nom} ${c.description ?? ""}`).includes(terme))
    : categories;

  return (
    <main className="min-h-screen bg-[#050505]">
      <NavbarMain />

      <section className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-8 py-6 md:py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-teal-400 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil
        </Link>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-white">Toutes les catégories</h1>
            <p className="text-sm text-gray-400 mt-1">
              {categories.length} catégories de prestataires pour vos événements
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Chercher une catégorie…"
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-full text-sm text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none"
            />
          </div>
        </div>

        {chargement ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
          </div>
        ) : erreur ? (
          <p className="text-center py-16 text-red-400">{erreur}</p>
        ) : visibles.length === 0 ? (
          <p className="text-center py-16 text-gray-500">Aucune catégorie ne correspond à « {recherche} ».</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {visibles.map((cat) => (
              <Link
                key={cat.id}
                href={`/?categorie=${encodeURIComponent(cat.slug)}`}
                className="group flex flex-col items-start gap-3 p-4 md:p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-teal-400/50 hover:bg-teal-400/5 transition-all"
              >
                <span className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-xl bg-white/5 text-2xl md:text-3xl group-hover:scale-110 transition-transform">
                  {cat.icone || "📌"}
                </span>
                <span className="font-semibold text-white text-sm md:text-base leading-tight">{cat.nom}</span>
                <span className="text-xs text-gray-500">
                  {cat._count.prestataires === 0
                    ? "Bientôt disponible"
                    : `${cat._count.prestataires} prestataire${cat._count.prestataires > 1 ? "s" : ""}`}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}