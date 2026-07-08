"use client";

import { SlidersHorizontal, Sparkles, X, ChevronDown, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface Categorie {
  id: string;
  nom: string;
  slug: string;
  icone: string | null;
  _count: { prestataires: number };
}

interface Tag {
  id: string;
  nom: string;
  slug: string;
  groupe: string;
  icone: string | null;
}

type TagsGrouped = Record<string, Tag[]>;

interface FilterSelection {
  categorieSlug?: string;
  tagSlug?: string;
  ville?: string;
  commune?: string;
}

interface FiltersProps {
  onFilterChange?: (filters: FilterSelection) => void;
}

const groupLabels: Record<string, string> = {
  PERSONNEL: "Personnel",
  TECHNIQUE: "Technique",
  EVENEMENTIEL: "Événementiel",
};

const villes = ["Abidjan", "Bouaké", "Daloa", "Yamoussoukro", "San-Pédro", "Korhogo"];

const communesAbidjan = [
  "Cocody",
  "Yopougon",
  "Marcory",
  "Treichville",
  "Plateau",
  "Adjamé",
  "Abobo",
  "Koumassi",
  "Port-Bouët",
  "Attécoubé",
  "Bingerville",
  "Anyama",
];

export default function Filters({ onFilterChange }: FiltersProps) {
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [tagsGrouped, setTagsGrouped] = useState<TagsGrouped>({});
  const [isLoading, setIsLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState<string>("Tout");
  const [selection, setSelection] = useState<FilterSelection>({});
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadFilters() {
      try {
        const [categoriesData, tagsData] = await Promise.all([
          api.get<Categorie[]>("/categories"),
          api.get<TagsGrouped>("/tags"),
        ]);
        setCategories(categoriesData);
        setTagsGrouped(tagsData);
      } catch (err) {
        console.error("Erreur chargement filtres:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadFilters();
  }, []);

  const totalPrestataires = categories.reduce(
    (sum, cat) => sum + cat._count.prestataires,
    0
  );

  // Applique une sélection fusionnée (les filtres se cumulent au lieu de s'écraser)
  const applySelection = (next: FilterSelection) => {
    setSelection(next);
    onFilterChange?.(next);
  };

  const handleSelectCategory = (slug: string | null, label: string) => {
    setActiveFilter(label);
    // Choisir une catégorie remplace catégorie ET tag, mais garde la localisation
    applySelection({
      ...selection,
      categorieSlug: slug ?? undefined,
      tagSlug: undefined,
    });
  };

  const handleSelectTag = (slug: string, label: string) => {
    setActiveFilter(label);
    // Un tag remplace la catégorie, mais garde la localisation
    applySelection({ ...selection, tagSlug: slug, categorieSlug: undefined });
    setIsFilterModalOpen(false);
  };

  const handleSelectVille = (city: string) => {
    if (selection.ville === city) {
      // Re-cliquer désélectionne la ville (et la commune avec)
      applySelection({ ...selection, ville: undefined, commune: undefined });
    } else {
      // Changer de ville réinitialise la commune
      applySelection({ ...selection, ville: city, commune: undefined });
    }
  };

  const handleSelectCommune = (commune: string) => {
    if (selection.commune === commune) {
      applySelection({ ...selection, commune: undefined });
    } else {
      // Sélectionner une commune force ville = Abidjan
      applySelection({ ...selection, ville: "Abidjan", commune });
    }
  };

  const handleResetLocalisation = () => {
    applySelection({ ...selection, ville: undefined, commune: undefined });
  };

  const localisationLabel = selection.commune
    ? `${selection.commune}, Abidjan`
    : selection.ville || null;

  if (isLoading) {
    return (
      <section className="px-4 md:px-8 py-6 md:py-8 flex items-center gap-2">
        <div className="w-5 h-5 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
        <span className="text-xs text-gray-500">Chargement des filtres...</span>
      </section>
    );
  }

  return (
    <>
      <section className="px-3 sm:px-4 md:px-8 py-4 md:py-8 relative">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center gap-3 md:gap-4">
          <motion.span
            className="hidden xl:flex items-center gap-2 text-white/40 text-[10px] uppercase tracking-[0.3em] font-medium flex-shrink-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Sparkles className="w-3 h-3 text-teal-400" />
            Catégories
          </motion.span>

          {/* Puces catégories : défilement horizontal fluide sur mobile/tablette */}
          <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-2 lg:pb-0 lg:flex-wrap -mx-3 px-3 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0 scrollbar-hide snap-x">
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 20 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onHoverStart={() => setHoveredIndex(-1)}
              onHoverEnd={() => setHoveredIndex(null)}
              onClick={() => handleSelectCategory(null, "Tout")}
              className={`relative flex-shrink-0 snap-start px-4 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium transition-all duration-300 border whitespace-nowrap ${
                activeFilter === "Tout"
                  ? "bg-gradient-to-r from-teal-400 to-teal-500 text-black border-teal-400 shadow-[0_0_30px_rgba(20,184,166,0.3)]"
                  : "bg-white/5 border-white/10 text-gray-400 hover:border-teal-400/50 hover:text-white hover:bg-white/10 active:bg-white/15"
              }`}
            >
              <span className="relative z-10 flex items-center gap-2">
                <span className="text-sm">✨</span>
                Tout
              </span>
            </motion.button>

            {categories.map((cat, index) => (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.3,
                  delay: (index + 1) * 0.05,
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onHoverStart={() => setHoveredIndex(index)}
                onHoverEnd={() => setHoveredIndex(null)}
                onClick={() => handleSelectCategory(cat.slug, cat.nom)}
                className={`relative flex-shrink-0 snap-start px-4 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium transition-all duration-300 border whitespace-nowrap ${
                  activeFilter === cat.nom
                    ? "bg-gradient-to-r from-teal-400 to-teal-500 text-black border-teal-400 shadow-[0_0_30px_rgba(20,184,166,0.3)]"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-teal-400/50 hover:text-white hover:bg-white/10 active:bg-white/15"
                }`}
              >
                {activeFilter !== cat.nom && hoveredIndex === index && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-400/10 to-transparent"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <span className="text-sm">{cat.icone || "📌"}</span>
                  {cat.nom}
                  {activeFilter === cat.nom && (
                    <motion.span
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-teal-400"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Ligne du bas sur mobile : localisation active, filtres avancés, compteur */}
          <div className="flex items-center justify-between gap-2 md:gap-3 lg:ml-auto flex-shrink-0 flex-wrap">
            <div className="flex items-center gap-2">
              {localisationLabel && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleResetLocalisation}
                  className="flex items-center gap-1.5 px-3 py-2 bg-teal-400/10 border border-teal-400/30 rounded-full text-teal-400 text-xs font-medium hover:bg-teal-400/20 active:bg-teal-400/30 transition-all max-w-[180px]"
                  title="Cliquer pour retirer le filtre de localisation"
                >
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{localisationLabel}</span>
                  <X className="w-3 h-3 flex-shrink-0" />
                </motion.button>
              )}

              <motion.button
                className="relative flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-white/5 border border-white/10 rounded-full text-gray-400 hover:border-teal-400/50 hover:text-teal-400 active:bg-teal-400/10 transition-all duration-300"
                whileHover={{
                  scale: 1.05,
                  backgroundColor: "rgba(20, 184, 166, 0.1)",
                  borderColor: "rgba(20, 184, 166, 0.5)",
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsFilterModalOpen(true)}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="text-xs font-medium">Plus de filtres</span>
                <ChevronDown className="w-3 h-3 hidden md:block" />
              </motion.button>
            </div>

            <motion.span
              className="text-[10px] text-gray-500 tracking-wider whitespace-nowrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.span
                key={activeFilter}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {activeFilter === "Tout"
                  ? totalPrestataires
                  : categories.find((c) => c.nom === activeFilter)?._count.prestataires ?? 0}{" "}
                prestataires
              </motion.span>
            </motion.span>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {isFilterModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterModalOpen(false)}
            />

            {/* Bottom sheet sur mobile (colle en bas, coins arrondis en haut),
                modal centré classique dès sm */}
            <motion.div
              className="relative bg-[#0a0a0a] border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 md:p-8 w-full max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              {/* Poignée visuelle du bottom sheet, mobile uniquement */}
              <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

              <div className="flex justify-between items-center mb-5 md:mb-6">
                <motion.h3
                  className="text-lg md:text-xl font-bold text-white"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  Filtres Avancés
                </motion.h3>
                <motion.button
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsFilterModalOpen(false)}
                >
                  <X className="w-5 h-5 text-gray-400" />
                </motion.button>
              </div>

              <div className="space-y-5 md:space-y-6">
                {Object.entries(tagsGrouped).map(([groupe, tags]) => (
                  <div key={groupe}>
                    <label className="text-xs text-gray-400 uppercase tracking-wider block mb-3">
                      {groupLabels[groupe] || groupe}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <motion.button
                          key={tag.id}
                          className="px-3 md:px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs md:text-sm text-gray-400 hover:border-teal-400/50 hover:text-white active:bg-white/10 transition-all flex items-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectTag(tag.slug, tag.nom)}
                        >
                          <span>{tag.icone || "🏷️"}</span>
                          {tag.nom}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ))}

                <div>
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <label className="text-xs text-gray-400 uppercase tracking-wider">
                      Ville
                    </label>
                    {(selection.ville || selection.commune) && (
                      <button
                        onClick={handleResetLocalisation}
                        className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
                      >
                        Réinitialiser la localisation
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {villes.map((city) => (
                      <motion.button
                        key={city}
                        className={`px-3 md:px-4 py-2.5 border rounded-lg text-xs md:text-sm transition-all ${
                          selection.ville === city
                            ? "bg-teal-400/20 border-teal-400 text-teal-400 font-medium"
                            : "bg-white/5 border-white/10 text-gray-400 hover:border-teal-400/50 hover:text-white active:bg-white/10"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectVille(city)}
                      >
                        📍 {city}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <AnimatePresence>
                  {(!selection.ville || selection.ville === "Abidjan") && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <label className="text-xs text-gray-400 uppercase tracking-wider block mb-3">
                        Commune d'Abidjan
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {communesAbidjan.map((commune) => (
                          <motion.button
                            key={commune}
                            className={`px-3 md:px-4 py-2.5 border rounded-lg text-xs md:text-sm transition-all ${
                              selection.commune === commune
                                ? "bg-teal-400/20 border-teal-400 text-teal-400 font-medium"
                                : "bg-white/5 border-white/10 text-gray-400 hover:border-teal-400/50 hover:text-white active:bg-white/10"
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSelectCommune(commune)}
                          >
                            {commune}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  className="w-full py-3 bg-gradient-to-r from-teal-400 to-teal-500 text-black font-bold rounded-full mt-2 md:mt-4"
                  whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(20, 184, 166, 0.3)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsFilterModalOpen(false)}
                >
                  Appliquer
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}