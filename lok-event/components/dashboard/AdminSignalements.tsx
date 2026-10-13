"use client";
// components/dashboard/AdminSignalements.tsx
// Onglet "Signalements" de l'admin : contenus et utilisateurs signalés
// depuis l'app (faux profil, arnaque, harcèlement…). L'admin rejette le
// signalement ou le traite (suppression du contenu, désactivation du compte).

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flag, Check, X, Trash2, UserX, RefreshCw, MessageSquare, Star, Briefcase, User } from "lucide-react";
import { api } from "@/lib/api";

type Statut = "EN_ATTENTE" | "TRAITE" | "REJETE";
type Cible = "UTILISATEUR" | "PRESTATAIRE" | "AVIS" | "MESSAGE";

interface Personne {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  actif?: boolean;
  role?: string;
}

interface Signalement {
  id: string;
  cibleType: Cible;
  cibleId: string;
  motif: string;
  details: string | null;
  apercu: string | null;
  statut: Statut;
  noteAdmin: string | null;
  createdAt: string;
  traiteLe: string | null;
  auteur: Personne;
  utilisateurSignale: Personne | null;
  totalSignalementsUtilisateur: number;
}

const MOTIFS: Record<string, string> = {
  FAUX_PROFIL: "Faux profil",
  ARNAQUE: "Arnaque",
  CONTENU_INAPPROPRIE: "Contenu inapproprié",
  HARCELEMENT: "Harcèlement",
  SPAM: "Spam",
  AUTRE: "Autre",
};

const CIBLES: Record<Cible, { label: string; icon: typeof User }> = {
  UTILISATEUR: { label: "Compte", icon: User },
  PRESTATAIRE: { label: "Fiche prestataire", icon: Briefcase },
  AVIS: { label: "Avis", icon: Star },
  MESSAGE: { label: "Message", icon: MessageSquare },
};

const FILTRES: { id: Statut | "TOUS"; label: string }[] = [
  { id: "EN_ATTENTE", label: "À traiter" },
  { id: "TRAITE", label: "Traités" },
  { id: "REJETE", label: "Rejetés" },
  { id: "TOUS", label: "Tous" },
];

const STATUTS: Record<Statut, { label: string; couleur: string }> = {
  EN_ATTENTE: { label: "À traiter", couleur: "bg-orange-500/20 text-orange-400" },
  TRAITE: { label: "Traité", couleur: "bg-green-500/20 text-green-400" },
  REJETE: { label: "Rejeté", couleur: "bg-gray-500/20 text-gray-400" },
};

const nomComplet = (p: Personne | null) => (p ? `${p.prenom} ${p.nom}`.trim() : "Compte supprimé");

export default function AdminSignalements() {
  const [filtre, setFiltre] = useState<Statut | "TOUS">("EN_ATTENTE");
  const [liste, setListe] = useState<Signalement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);

  // Le spinner est activé par les boutons (filtre, actualiser), pas ici :
  // un setState synchrone dans un effet provoque des rendus en cascade
  const charger = useCallback(async () => {
    try {
      const requete = filtre === "TOUS" ? "" : `?statut=${filtre}`;
      setListe(await api.get<Signalement[]>(`/moderation/admin/signalements${requete}`));
    } catch (err) {
      setMessage({ type: "erreur", texte: err instanceof Error ? err.message : "Erreur de chargement" });
    } finally {
      setChargement(false);
    }
  }, [filtre]);

  useEffect(() => {
    charger();
  }, [charger]);

  const traiter = async (
    s: Signalement,
    statut: "TRAITE" | "REJETE",
    options: { supprimerContenu?: boolean; desactiverCompte?: boolean } = {}
  ) => {
    if (options.desactiverCompte) {
      const ok = confirm(
        `Désactiver le compte de ${nomComplet(s.utilisateurSignale)} ? Il sera déconnecté immédiatement et sa fiche sera masquée.`
      );
      if (!ok) return;
    }
    if (options.supprimerContenu && !confirm("Supprimer définitivement ce contenu ?")) return;

    setEnCours(s.id);
    setMessage(null);
    try {
      const reponse = await api.patch<{ actions: string[] }>(`/moderation/admin/signalements/${s.id}`, {
        statut,
        noteAdmin: notes[s.id] || undefined,
        ...options,
      });
      setMessage({
        type: "ok",
        texte:
          statut === "REJETE"
            ? "Signalement rejeté"
            : `Signalement traité${reponse.actions.length ? ` : ${reponse.actions.join(", ")}` : ""}`,
      });
      await charger();
    } catch (err) {
      setMessage({ type: "erreur", texte: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setEnCours(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Flag className="w-5 h-5 text-teal-400" />
          Signalements
        </h2>
        <button
          onClick={() => {
            setChargement(true);
            charger();
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTRES.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              if (f.id === filtre) return;
              setChargement(true);
              setFiltre(f.id);
            }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filtre === f.id
                ? "bg-teal-400/10 text-teal-400 border border-teal-400/20"
                : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            {f.label}
          </button>
        ))}
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

      {chargement ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
        </div>
      ) : liste.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white/[0.02] border border-white/5 rounded-xl">
          {filtre === "EN_ATTENTE" ? "Aucun signalement à traiter 🎉" : "Aucun signalement"}
        </div>
      ) : (
        <div className="space-y-4">
          {liste.map((s) => {
            const cible = CIBLES[s.cibleType];
            const Icone = cible.icon;
            const peutSupprimer = s.cibleType !== "UTILISATEUR";
            const compteVise = s.utilisateurSignale;
            const peutDesactiver = compteVise && compteVise.actif !== false && compteVise.role !== "ADMIN";

            return (
              <div key={s.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <Icone className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {MOTIFS[s.motif] ?? s.motif} <span className="text-gray-500 font-normal">· {cible.label}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(s.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUTS[s.statut].couleur}`}>
                    {STATUTS[s.statut].label}
                  </span>
                </div>

                {s.apercu && (
                  <div className="mb-3 px-4 py-3 bg-black/40 border border-white/5 rounded-lg text-sm text-gray-200 whitespace-pre-wrap break-words">
                    {s.apercu}
                  </div>
                )}
                {s.details && (
                  <p className="mb-3 text-sm text-gray-400">
                    <span className="text-gray-500">Précisions : </span>
                    {s.details}
                  </p>
                )}

                <div className="grid sm:grid-cols-2 gap-2 text-sm mb-4">
                  <p className="text-gray-400">
                    <span className="text-gray-500">Signalé par : </span>
                    {nomComplet(s.auteur)} <span className="text-gray-600">({s.auteur.email})</span>
                  </p>
                  <p className="text-gray-400">
                    <span className="text-gray-500">Compte visé : </span>
                    {nomComplet(compteVise)}
                    {compteVise && <span className="text-gray-600"> ({compteVise.email})</span>}
                    {compteVise?.actif === false && <span className="ml-2 text-red-400 text-xs">désactivé</span>}
                    {s.totalSignalementsUtilisateur > 1 && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                        {s.totalSignalementsUtilisateur} signalements
                      </span>
                    )}
                  </p>
                </div>

                {s.statut === "EN_ATTENTE" ? (
                  <>
                    <input
                      value={notes[s.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))}
                      placeholder="Note interne (facultatif)"
                      className="w-full mb-3 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={enCours === s.id}
                        onClick={() => traiter(s, "REJETE")}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        Rejeter
                      </button>
                      <button
                        disabled={enCours === s.id}
                        onClick={() => traiter(s, "TRAITE")}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-teal-400/10 text-teal-400 hover:bg-teal-400/20 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        Traité (avertissement)
                      </button>
                      {peutSupprimer && (
                        <button
                          disabled={enCours === s.id}
                          onClick={() => traiter(s, "TRAITE", { supprimerContenu: true })}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          {s.cibleType === "PRESTATAIRE" ? "Masquer la fiche" : "Supprimer le contenu"}
                        </button>
                      )}
                      {peutDesactiver && (
                        <button
                          disabled={enCours === s.id}
                          onClick={() =>
                            traiter(s, "TRAITE", { supprimerContenu: peutSupprimer, desactiverCompte: true })
                          }
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          <UserX className="w-4 h-4" />
                          Désactiver le compte
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">
                    {s.traiteLe && `Traité le ${new Date(s.traiteLe).toLocaleDateString("fr-FR")}`}
                    {s.noteAdmin && ` — ${s.noteAdmin}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}