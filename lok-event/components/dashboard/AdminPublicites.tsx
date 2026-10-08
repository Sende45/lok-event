"use client";
// components/dashboard/AdminPublicites.tsx
// Onglet "Publicités" de l'admin : bannières des marques partenaires
// (Wave, MTN, Orange, Moov, SOLIBRA, FIF, Yango…) affichées sur l'app mobile.

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Megaphone, Plus, Edit2, Trash2, Power, Upload, Eye, MousePointerClick, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";

type Emplacement = "ACCUEIL_CARROUSEL" | "ACCUEIL_ENCART";

interface Publicite {
  id: string;
  marque: string;
  titre: string | null;
  sousTitre: string | null;
  imageUrl: string;
  lien: string | null;
  emplacement: Emplacement;
  ordre: number;
  actif: boolean;
  debutLe: string;
  finLe: string | null;
  affichages: number;
  clics: number;
}

interface Formulaire {
  marque: string;
  titre: string;
  sousTitre: string;
  imageUrl: string;
  lien: string;
  emplacement: Emplacement;
  ordre: string;
  debutLe: string;
  finLe: string;
}

const VIDE: Formulaire = {
  marque: "",
  titre: "",
  sousTitre: "",
  imageUrl: "",
  lien: "",
  emplacement: "ACCUEIL_CARROUSEL",
  ordre: "0",
  debutLe: "",
  finLe: "",
};

const EMPLACEMENTS: Record<Emplacement, string> = {
  ACCUEIL_CARROUSEL: "Carrousel d'accueil (grand format)",
  ACCUEIL_ENCART: "Encart au milieu de l'accueil",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const champ =
  "px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none";

function enCours(p: Publicite): "active" | "programmee" | "terminee" | "inactive" {
  if (!p.actif) return "inactive";
  const maintenant = Date.now();
  if (new Date(p.debutLe).getTime() > maintenant) return "programmee";
  if (p.finLe && new Date(p.finLe).getTime() <= maintenant) return "terminee";
  return "active";
}

const STATUTS = {
  active: { label: "En diffusion", couleur: "bg-green-500/20 text-green-400" },
  programmee: { label: "Programmée", couleur: "bg-blue-500/20 text-blue-400" },
  terminee: { label: "Terminée", couleur: "bg-gray-500/20 text-gray-400" },
  inactive: { label: "Désactivée", couleur: "bg-red-500/20 text-red-400" },
};

/** "2026-10-08T00:00:00.000Z" -> "2026-10-08" pour les champs date */
const versChampDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export default function AdminPublicites() {
  const [pubs, setPubs] = useState<Publicite[]>([]);
  const [chargement, setChargement] = useState(true);
  const [form, setForm] = useState<Formulaire>(VIDE);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [upload, setUpload] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);

  const charger = useCallback(async () => {
    try {
      setPubs(await api.get<Publicite[]>("/publicites/admin/toutes"));
    } catch (err) {
      setMessage({ type: "erreur", texte: err instanceof Error ? err.message : "Erreur de chargement" });
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const reinitialiser = () => {
    setForm(VIDE);
    setEditionId(null);
  };

  const envoyerImage = async (fichier: File) => {
    setUpload(true);
    setMessage(null);
    try {
      const data = new FormData();
      data.append("image", fichier);
      const token = localStorage.getItem("lokevent_token");
      const res = await fetch(`${API_URL}/publicites/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: data,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Échec de l'envoi de l'image");
      setForm((f) => ({ ...f, imageUrl: json.url }));
    } catch (err) {
      setMessage({ type: "erreur", texte: err instanceof Error ? err.message : "Échec de l'envoi" });
    } finally {
      setUpload(false);
    }
  };

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.imageUrl) {
      setMessage({ type: "erreur", texte: "Ajoutez d'abord la bannière (image)." });
      return;
    }
    setEnvoi(true);
    setMessage(null);
    const corps = {
      marque: form.marque,
      titre: form.titre || null,
      sousTitre: form.sousTitre || null,
      imageUrl: form.imageUrl,
      lien: form.lien || null,
      emplacement: form.emplacement,
      ordre: Number(form.ordre) || 0,
      debutLe: form.debutLe || undefined,
      finLe: form.finLe || null,
    };
    try {
      if (editionId) await api.put(`/publicites/${editionId}`, corps);
      else await api.post("/publicites", corps);
      setMessage({ type: "ok", texte: editionId ? "Publicité mise à jour" : "Publicité ajoutée" });
      reinitialiser();
      await charger();
    } catch (err) {
      setMessage({ type: "erreur", texte: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setEnvoi(false);
    }
  };

  const editer = (p: Publicite) => {
    setEditionId(p.id);
    setForm({
      marque: p.marque,
      titre: p.titre || "",
      sousTitre: p.sousTitre || "",
      imageUrl: p.imageUrl,
      lien: p.lien || "",
      emplacement: p.emplacement,
      ordre: String(p.ordre),
      debutLe: versChampDate(p.debutLe),
      finLe: versChampDate(p.finLe),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const basculer = async (p: Publicite) => {
    try {
      await api.put(`/publicites/${p.id}`, { actif: !p.actif });
      await charger();
    } catch (err) {
      setMessage({ type: "erreur", texte: err instanceof Error ? err.message : "Erreur" });
    }
  };

  const supprimer = async (p: Publicite) => {
    if (!confirm(`Supprimer la publicité ${p.marque} ? Ses statistiques seront perdues.`)) return;
    try {
      await api.delete(`/publicites/${p.id}`);
      await charger();
    } catch (err) {
      setMessage({ type: "erreur", texte: err instanceof Error ? err.message : "Erreur" });
    }
  };

  const totalAffichages = pubs.reduce((s, p) => s + p.affichages, 0);
  const totalClics = pubs.reduce((s, p) => s + p.clics, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-teal-400" />
          Publicités des marques
        </h2>
        <div className="flex gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" /> {totalAffichages.toLocaleString("fr-FR")} affichages
          </span>
          <span className="flex items-center gap-1.5">
            <MousePointerClick className="w-4 h-4" /> {totalClics.toLocaleString("fr-FR")} clics
          </span>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            message.type === "ok" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          }`}
        >
          {message.texte}
        </div>
      )}

      {/* ---------- Formulaire ---------- */}
      <form
        onSubmit={enregistrer}
        className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        <h3 className="md:col-span-2 font-semibold">
          {editionId ? "Modifier la publicité" : "Nouvelle publicité"}
        </h3>

        <input
          placeholder="Marque * (ex : Wave)"
          value={form.marque}
          onChange={(e) => setForm({ ...form, marque: e.target.value })}
          className={champ}
          required
          maxLength={60}
        />
        <select
          value={form.emplacement}
          onChange={(e) => setForm({ ...form, emplacement: e.target.value as Emplacement })}
          className={champ}
        >
          {Object.entries(EMPLACEMENTS).map(([valeur, label]) => (
            <option key={valeur} value={valeur} className="bg-neutral-900">
              {label}
            </option>
          ))}
        </select>
        <input
          placeholder="Titre (facultatif)"
          value={form.titre}
          onChange={(e) => setForm({ ...form, titre: e.target.value })}
          className={champ}
          maxLength={120}
        />
        <input
          placeholder="Sous-titre (facultatif)"
          value={form.sousTitre}
          onChange={(e) => setForm({ ...form, sousTitre: e.target.value })}
          className={champ}
          maxLength={120}
        />
        <input
          placeholder="Lien au clic (https://…)"
          value={form.lien}
          onChange={(e) => setForm({ ...form, lien: e.target.value })}
          className={`${champ} md:col-span-2`}
          type="url"
        />

        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Début de diffusion
          <input
            type="date"
            value={form.debutLe}
            onChange={(e) => setForm({ ...form, debutLe: e.target.value })}
            className={champ}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Fin de diffusion (vide = sans fin)
          <input
            type="date"
            value={form.finLe}
            onChange={(e) => setForm({ ...form, finLe: e.target.value })}
            className={champ}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Ordre d'affichage (0 = en premier)
          <input
            type="number"
            value={form.ordre}
            onChange={(e) => setForm({ ...form, ordre: e.target.value })}
            className={champ}
          />
        </label>

        <div className="flex flex-col gap-1 text-xs text-gray-400">
          Bannière * (format paysage 16:9, ex : 1200 × 675)
          <label className={`${champ} flex items-center gap-2 cursor-pointer hover:border-teal-400/50`}>
            <Upload className="w-4 h-4" />
            {upload ? "Envoi en cours…" : form.imageUrl ? "Changer l'image" : "Choisir une image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={upload}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) envoyerImage(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {form.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.imageUrl}
            alt="Aperçu de la bannière"
            className="md:col-span-2 w-full max-w-xl aspect-video object-cover rounded-xl border border-white/10"
          />
        )}

        <div className="md:col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={envoi || upload}
            className="flex items-center gap-2 px-4 py-2 bg-teal-400 text-black rounded-lg font-medium hover:bg-teal-300 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {envoi ? "Enregistrement…" : editionId ? "Mettre à jour" : "Ajouter"}
          </button>
          {editionId && (
            <button
              type="button"
              onClick={reinitialiser}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      {/* ---------- Liste ---------- */}
      {chargement ? (
        <p className="text-gray-400">Chargement…</p>
      ) : pubs.length === 0 ? (
        <p className="text-gray-400">Aucune publicité pour l'instant.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pubs.map((p) => {
            const statut = STATUTS[enCours(p)];
            const ctr = p.affichages > 0 ? ((p.clics / p.affichages) * 100).toFixed(1) : "0";
            return (
              <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imageUrl} alt={p.marque} className="w-full aspect-video object-cover" />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold">{p.marque}</p>
                      {p.titre && <p className="text-sm text-gray-400">{p.titre}</p>}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statut.couleur}`}>
                      {statut.label}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    {EMPLACEMENTS[p.emplacement]} · ordre {p.ordre}
                  </p>
                  <p className="text-xs text-gray-500">
                    Du {new Date(p.debutLe).toLocaleDateString("fr-FR")}
                    {p.finLe ? ` au ${new Date(p.finLe).toLocaleDateString("fr-FR")}` : " · sans fin"}
                  </p>

                  <div className="flex gap-4 mt-3 text-sm">
                    <span className="flex items-center gap-1 text-gray-300">
                      <Eye className="w-4 h-4" /> {p.affichages.toLocaleString("fr-FR")}
                    </span>
                    <span className="flex items-center gap-1 text-gray-300">
                      <MousePointerClick className="w-4 h-4" /> {p.clics.toLocaleString("fr-FR")}
                    </span>
                    <span className="text-teal-400">{ctr} % de clics</span>
                  </div>

                  <div className="flex items-center gap-1 mt-3">
                    {p.lien && (
                      <a
                        href={p.lien}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-white/10 rounded"
                        title="Ouvrir le lien"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </a>
                    )}
                    <button onClick={() => editer(p)} className="p-2 hover:bg-white/10 rounded" title="Modifier">
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => basculer(p)}
                      className="p-2 hover:bg-white/10 rounded"
                      title={p.actif ? "Désactiver" : "Activer"}
                    >
                      <Power className={`w-4 h-4 ${p.actif ? "text-green-400" : "text-gray-500"}`} />
                    </button>
                    <button onClick={() => supprimer(p)} className="p-2 hover:bg-red-500/20 rounded" title="Supprimer">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}