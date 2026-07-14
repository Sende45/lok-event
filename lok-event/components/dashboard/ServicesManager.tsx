// components/dashboard/ServicesManager.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Tag, AlertCircle, EyeOff } from "lucide-react";
import { api } from "@/lib/api";

interface Service {
  id: string;
  nom: string;
  description: string | null;
  prix: number;
  unite: string | null;
  actif: boolean;
}

const UNITES = ["forfait", "par personne", "par heure", "par jour"];

const formVide = { nom: "", description: "", prix: "", unite: "forfait" };

export default function ServicesManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(formVide);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Service[]>("/services/me");
        setServices(data);
      } catch (err) {
        console.error("Erreur chargement services:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(formVide);
    setError("");
    setIsFormOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditingId(s.id);
    setForm({
      nom: s.nom,
      description: s.description || "",
      prix: s.prix.toString(),
      unite: s.unite || "forfait",
    });
    setError("");
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      if (editingId) {
        const updated = await api.put<Service>(`/services/${editingId}`, form);
        setServices((prev) =>
          prev
            .map((s) => (s.id === editingId ? updated : s))
            .sort((a, b) => a.prix - b.prix)
        );
      } else {
        const created = await api.post<Service>("/services", form);
        setServices((prev) => [...prev, created].sort((a, b) => a.prix - b.prix));
      }
      setIsFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer cette prestation ?")) return;
    try {
      await api.delete(`/services/${id}`);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  const handleToggleActif = async (s: Service) => {
    try {
      const updated = await api.put<Service>(`/services/${s.id}`, { actif: !s.actif });
      setServices((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 md:p-6">
      {/* flex-wrap : sur très petit écran, le bouton passe sous le titre
          au lieu de l'écraser */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 min-w-0">
          <Tag className="w-5 h-5 text-teal-400 shrink-0" />
          <span className="truncate">Mes prestations & tarifs</span>
        </h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-teal-400 text-black text-xs font-medium rounded-lg hover:bg-teal-300 active:bg-teal-500 transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Un catalogue chiffré rassure les clients et augmente vos demandes. Ces
        prestations apparaissent sur votre fiche publique.
      </p>

      {isLoading ? (
        <div className="h-24 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
        </div>
      ) : services.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">
          Aucune prestation pour le moment. Ajoutez votre première offre !
        </p>
      ) : (
        <div className="space-y-2">
          {services.map((s) => (
            <div
              key={s.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white/5 rounded-xl ${
                !s.actif ? "opacity-50" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="font-medium text-sm flex items-center gap-2 min-w-0">
                  <span className="truncate">{s.nom}</span>
                  {!s.actif && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-500/20 text-gray-400 rounded-full shrink-0">
                      Masquée
                    </span>
                  )}
                </p>
                {s.description && (
                  <p className="text-xs text-gray-500 truncate">{s.description}</p>
                )}
              </div>
              {/* Sur mobile : prix à gauche, actions à droite sur la même
                  ligne ; flex-wrap au cas où le prix est très long */}
              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-x-3 gap-y-1 flex-shrink-0">
                <p className="font-mono font-semibold text-teal-400 text-sm whitespace-nowrap">
                  {s.prix.toLocaleString("fr-FR")} FCFA
                  {s.unite && s.unite !== "forfait" && (
                    <span className="text-gray-500 font-sans font-normal text-xs"> {s.unite}</span>
                  )}
                </p>
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <button
                    onClick={() => handleToggleActif(s)}
                    title={s.actif ? "Masquer de la fiche publique" : "Réafficher"}
                    className="p-2.5 sm:p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors"
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEdit(s)}
                    title="Modifier"
                    className="p-2.5 sm:p-2 rounded-lg text-gray-400 hover:text-teal-400 hover:bg-teal-400/10 active:bg-teal-400/15 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    title="Supprimer"
                    className="p-2.5 sm:p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/15 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire ajout / édition — bottom sheet sur mobile, modal centrée
          sur desktop */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsFormOpen(false)}
          />
          {/* dvh : tient compte de la barre d'adresse mobile ;
              pb-8 : le bouton n'est pas collé au bord bas de l'écran */}
          <div className="relative bg-[#0a0a0a] border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-6 md:p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto overscroll-contain">
            <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">
                {editingId ? "Modifier la prestation" : "Nouvelle prestation"}
              </h3>
              <button
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                onClick={() => setIsFormOpen(false)}
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Nom de la prestation</label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Buffet mariage 50 personnes"
                  maxLength={100}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-sm placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Description <span className="text-gray-600">— optionnel</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Entrées, plats, desserts, service inclus..."
                  rows={2}
                  maxLength={300}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-sm placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* 1 colonne sur très petit écran (le select "par personne"
                  a besoin de largeur), 2 colonnes dès 400px+ */}
              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Prix (FCFA)</label>
                  <input
                    type="number"
                    value={form.prix}
                    onChange={(e) => setForm({ ...form, prix: e.target.value })}
                    placeholder="250000"
                    min="1"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-sm placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Unité</label>
                  <select
                    value={form.unite}
                    onChange={(e) => setForm({ ...form, unite: e.target.value })}
                    style={{ colorScheme: "dark" }}
                    className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-sm focus:border-teal-400/50 focus:outline-none transition-colors"
                  >
                    {UNITES.map((u) => (
                      <option key={u} value={u} style={{ backgroundColor: "#0a0a0a" }}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 bg-gradient-to-r from-teal-400 to-teal-500 text-black font-bold rounded-lg hover:shadow-[0_0_30px_rgba(20,184,166,0.3)] transition-all disabled:opacity-50"
              >
                {isSaving
                  ? "Enregistrement..."
                  : editingId
                  ? "Enregistrer les modifications"
                  : "Ajouter la prestation"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}