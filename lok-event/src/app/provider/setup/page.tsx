"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Sparkles, Building2, MapPin, Phone, FileText, DollarSign, AlertCircle, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

// ⚠️ Leaflet ne fonctionne pas en SSR : import dynamique obligatoire
// Adapte le chemin selon l'emplacement de ce fichier par rapport à components/map/
const LocationPicker = dynamic(() => import("@/components/map/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] rounded-xl bg-white/5 animate-pulse" />
  ),
});

interface Categorie {
  id: string;
  nom: string;
  slug: string;
}

export default function ProviderSetup() {
  const router = useRouter();
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    categorieId: "",
    nomEntreprise: "",
    description: "",
    quartier: "",
    commune: "",
    ville: "Abidjan",
    telephone: "",
    whatsapp: "",
    prixMin: "",
    prixMax: "",
  });
  const [position, setPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await api.get<Categorie[]>("/categories");
        setCategories(data);
      } catch (err) {
        setError("Impossible de charger les catégories");
      } finally {
        setIsLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await api.post("/prestataires/profile", {
        ...formData,
        latitude: position?.latitude,
        longitude: position?.longitude,
      });
      router.push("/provider");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setIsSubmitting(false);
    }
  };

  if (isLoadingCategories) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-400/5 via-transparent to-teal-400/5" />

      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full bg-teal-400/10 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="relative w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-8 shadow-2xl">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="inline-flex items-center gap-2 mb-2"
            >
              <Sparkles className="w-8 h-8 text-teal-400" />
              <span className="text-3xl font-bold tracking-tight text-white">
                LOK<span className="text-teal-400">EVENT</span>
              </span>
            </motion.div>
            <h1 className="text-xl font-bold text-white mt-4">Complétez votre profil prestataire</h1>
            <p className="text-gray-400 text-sm mt-2">
              Ces informations seront visibles par les clients qui recherchent vos services
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Nom de l'entreprise</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  name="nomEntreprise"
                  value={formData.nomEntreprise}
                  onChange={handleChange}
                  placeholder="Saveurs d'Abidjan"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Catégorie</label>
              <select
                name="categorieId"
                value={formData.categorieId}
                onChange={handleChange}
                style={{ colorScheme: "dark" }}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-teal-400/50 focus:outline-none transition-colors"
                required
              >
                <option value="" style={{ backgroundColor: "#0a0a0a", color: "#ffffff" }}>
                  Sélectionnez une catégorie
                </option>
                {categories.map((cat) => (
                  <option
                    key={cat.id}
                    value={cat.id}
                    style={{ backgroundColor: "#0a0a0a", color: "#ffffff" }}
                  >
                    {cat.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Description</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Décrivez vos services..."
                  rows={3}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Quartier</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    name="quartier"
                    value={formData.quartier}
                    onChange={handleChange}
                    placeholder="Riviera"
                    className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Commune</label>
                <input
                  type="text"
                  name="commune"
                  value={formData.commune}
                  onChange={handleChange}
                  placeholder="Cocody"
                  className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Ville</label>
                <input
                  type="text"
                  name="ville"
                  value={formData.ville}
                  onChange={handleChange}
                  className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Position sur la carte <span className="text-gray-600">— recommandé</span>
              </label>
              <p className="text-xs text-gray-600 mb-2">
                Placez votre position exacte pour apparaître sur la carte LOKEVENT et dans les recherches "autour de moi".
              </p>
              <LocationPicker
                initialPosition={null}
                onChange={setPosition}
                height="300px"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="tel"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleChange}
                    placeholder="+225 07 68 75 61 51"
                    className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">WhatsApp</label>
                <input
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="+225 07 68 75 61 51"
                  className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Prix minimum (FCFA)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="number"
                    name="prixMin"
                    value={formData.prixMin}
                    onChange={handleChange}
                    placeholder="25000"
                    className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Prix maximum (FCFA)</label>
                <input
                  type="number"
                  name="prixMax"
                  value={formData.prixMax}
                  onChange={handleChange}
                  placeholder="150000"
                  className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-teal-400 to-teal-500 text-black font-bold rounded-lg hover:shadow-[0_0_30px_rgba(20,184,166,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Création en cours...
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Accéder à mon tableau de bord
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}