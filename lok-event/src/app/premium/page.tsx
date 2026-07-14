"use client";

// frontend/src/app/premium/page.tsx
// Page de souscription LOKEVENT Premium.
// Les numéros mobile money et le nom de compte sont configurés depuis le
// dashboard admin (onglet Premium → Numéros de paiement) et chargés via l'API.

import {
  Crown,
  Check,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Sparkles,
  Zap,
  BadgeCheck,
  Megaphone,
  Headphones,
  ArrowLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

// Valeurs par défaut, remplacées au chargement par les numéros configurés
// dans le dashboard admin (onglet Premium → Paramètres de paiement)
const NUMEROS_DEFAUT: Record<string, string> = {
  WAVE: "+225 07 00 00 00 00",
  ORANGE_MONEY: "+225 07 00 00 00 00",
  MTN: "+225 05 00 00 00 00",
};

const MOYENS: { code: string; label: string }[] = [
  { code: "WAVE", label: "Wave" },
  { code: "ORANGE_MONEY", label: "Orange Money" },
  { code: "MTN", label: "MTN MoMo" },
];

// Secours si GET /premium/packs échoue : la page reste utilisable
// (doit rester aligné avec PACKS dans premium.controller.ts)
const PACKS_DEFAUT: Pack[] = [
  { code: "MENSUEL", label: "Pack Mensuel", montant: 25000, dureeMois: 1 },
  { code: "TRIMESTRIEL", label: "Pack Trimestriel", montant: 60000, dureeMois: 3 },
  { code: "ANNUEL", label: "Pack Annuel", montant: 240000, dureeMois: 12 },
];

const AVANTAGES = [
  {
    icon: Zap,
    titre: "Réservations prioritaires",
    desc: "Vos demandes remontent en tête de liste chez les prestataires.",
  },
  {
    icon: Sparkles,
    titre: "Accès en avant-première",
    desc: "Découvrez les nouveaux prestataires vérifiés avant tout le monde.",
  },
  {
    icon: BadgeCheck,
    titre: "Badge Premium 💎",
    desc: "Visible des prestataires : un profil sérieux obtient des réponses plus rapides.",
  },
  {
    icon: Megaphone,
    titre: "Offres exclusives",
    desc: "Promotions et annonces réservées aux membres, en temps réel.",
  },
  {
    icon: Headphones,
    titre: "Support prioritaire",
    desc: "Vos questions traitées en premier par l'équipe LOKEVENT.",
  },
];

interface Pack {
  code: string;
  label: string;
  montant: number;
  dureeMois: number;
}

interface StatutPremium {
  estPremium: boolean;
  premiumJusquau: string | null;
  demandeEnAttente?: {
    id: string;
    pack: string;
    montant: number;
    createdAt: string;
  } | null;
}

export default function PremiumPage() {
  const router = useRouter();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [statut, setStatut] = useState<StatutPremium | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nonConnecte, setNonConnecte] = useState(false);

  // Numéros de paiement configurés par l'admin
  const [numerosPaiement, setNumerosPaiement] =
    useState<Record<string, string>>(NUMEROS_DEFAUT);
  const [nomCompte, setNomCompte] = useState("LOKEVENT");

  // Formulaire
  const [packChoisi, setPackChoisi] = useState<string>("TRIMESTRIEL");
  const [moyenPaiement, setMoyenPaiement] = useState<string>("WAVE");
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const packsData = await api.get<Pack[]>("/premium/packs");
        setPacks(packsData && packsData.length > 0 ? packsData : PACKS_DEFAUT);
      } catch (err) {
        console.error("Erreur chargement packs:", err);
        setPacks(PACKS_DEFAUT);
      }
      try {
        const params = await api.get<{ numeros?: Record<string, string>; nomCompte?: string }>(
          "/parametres/paiement"
        );
        if (params?.numeros) setNumerosPaiement((prev) => ({ ...prev, ...params.numeros }));
        if (params?.nomCompte) setNomCompte(params.nomCompte);
      } catch {
        // Route pas encore déployée : on garde les valeurs par défaut
      }
      try {
        const statutData = await api.get<StatutPremium>("/premium/statut");
        setStatut(statutData);
      } catch {
        // 401 : l'utilisateur n'est pas connecté — on affiche quand même la page
        setNonConnecte(true);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (nonConnecte) {
      router.push("/login");
      return;
    }
    if (!reference.trim()) {
      setFormError(
        "Indiquez la référence de votre transaction mobile money (l'ID reçu par SMS après le paiement)."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/premium/souscrire", {
        pack: packChoisi,
        moyenPaiement,
        referencePaiement: reference.trim(),
      });
      setSuccess(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const packActif = packs.find((p) => p.code === packChoisi);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-3 sm:py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <span className="text-xl sm:text-2xl font-bold tracking-tight whitespace-nowrap">
              LOK<span className="text-teal-400">EVENT</span>
            </span>
            <span className="flex items-center gap-1 text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full shrink-0">
              <Crown className="w-3 h-3" />
              Premium
            </span>
          </Link>
          {/* Sur mobile : flèche seule (le texte prendrait toute la largeur) */}
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-teal-400 transition-colors shrink-0 p-2 -m-2 sm:p-0 sm:m-0"
            aria-label="Retour à l'accueil"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Retour à l'accueil</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8 sm:py-10 md:py-14">
        {/* ── Cas 1 : déjà Premium ── */}
        {statut?.estPremium ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto text-center bg-white/5 border border-yellow-500/20 rounded-2xl p-6 sm:p-10"
          >
            <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-xl sm:text-2xl font-bold mb-2">Vous êtes membre Premium 💎</h1>
            <p className="text-gray-400 text-sm">
              {statut.premiumJusquau
                ? `Votre abonnement est actif jusqu'au ${new Date(statut.premiumJusquau).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.`
                : "Votre abonnement est actif."}
            </p>
            <p className="text-gray-500 text-xs mt-4">
              Profitez de vos avantages : réservations prioritaires, offres exclusives et badge visible des prestataires.
            </p>
          </motion.div>
        ) : statut?.demandeEnAttente || success ? (
          /* ── Cas 2 : demande en cours de validation ── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto text-center bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-10"
          >
            {success ? (
              <CheckCircle className="w-16 h-16 text-teal-400 mx-auto mb-4" />
            ) : (
              <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            )}
            <h1 className="text-xl sm:text-2xl font-bold mb-2">
              {success ? "Demande envoyée !" : "Validation en cours"}
            </h1>
            <p className="text-gray-400 text-sm">
              Notre équipe vérifie votre paiement. Votre Premium sera activé très vite —
              vous recevrez une notification dès que c'est fait 💎
            </p>
            {statut?.demandeEnAttente && !success && (
              <p className="text-gray-500 text-xs mt-4">
                Demande du{" "}
                {new Date(statut.demandeEnAttente.createdAt).toLocaleDateString("fr-FR")} —{" "}
                {statut.demandeEnAttente.pack} (
                {statut.demandeEnAttente.montant.toLocaleString("fr-FR")} FCFA)
              </p>
            )}
          </motion.div>
        ) : (
          /* ── Cas 3 : page de souscription ── */
          <>
            {/* Hero */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8 sm:mb-12"
            >
              <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs px-3 py-1.5 rounded-full mb-4">
                <Crown className="w-3.5 h-3.5" />
                LOKEVENT Premium
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
                Passez au niveau <span className="text-teal-400">supérieur</span>
              </h1>
              <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto">
                Organisez vos événements avec une longueur d'avance : priorité, exclusivités
                et visibilité auprès des meilleurs prestataires d'Abidjan.
              </p>
            </motion.div>

            {/* Avantages : 1 colonne mobile, 2 dès 640px, 3 en desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-12">
              {AVANTAGES.map((a, i) => (
                <motion.div
                  key={a.titre}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5"
                >
                  <a.icon className="w-6 h-6 text-teal-400 mb-3" />
                  <h3 className="font-semibold text-sm mb-1">{a.titre}</h3>
                  <p className="text-xs text-gray-400">{a.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Packs : empilés sur mobile, 3 colonnes dès 640px */}
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-center">Choisissez votre pack</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-12 max-w-3xl mx-auto">
              {packs.map((pack) => {
                const selectionne = packChoisi === pack.code;
                const populaire = pack.code === "TRIMESTRIEL";
                return (
                  <button
                    key={pack.code}
                    type="button"
                    onClick={() => setPackChoisi(pack.code)}
                    className={`relative text-left rounded-2xl p-5 sm:p-6 border transition-all ${
                      selectionne
                        ? "bg-teal-400/10 border-teal-400/50 ring-2 ring-teal-400/30"
                        : "bg-white/5 border-white/10 hover:border-white/25"
                    }`}
                  >
                    {populaire && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] bg-yellow-500 text-black font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                        POPULAIRE
                      </span>
                    )}
                    <p className="text-sm text-gray-400">{pack.label}</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">
                      {pack.montant.toLocaleString("fr-FR")}{" "}
                      <span className="text-sm font-normal text-gray-400">FCFA</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {pack.dureeMois} mois —{" "}
                      {Math.round(pack.montant / pack.dureeMois).toLocaleString("fr-FR")} FCFA/mois
                    </p>
                    {selectionne && (
                      <span className="absolute top-4 right-4 w-5 h-5 bg-teal-400 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-black" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Paiement + formulaire */}
            <div className="max-w-lg mx-auto bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 md:p-8">
              <h2 className="text-lg font-bold mb-4">Finalisez en 2 étapes</h2>

              {/* Étape 1 : payer */}
              <div className="mb-6">
                <p className="text-sm font-medium text-teal-400 mb-2">
                  1. Envoyez le paiement par mobile money
                </p>
                {/* grid au lieu de flex : 3 boutons de largeur égale,
                    "Orange Money" peut passer sur 2 lignes sans tout casser */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {MOYENS.map((m) => (
                    <button
                      key={m.code}
                      type="button"
                      onClick={() => setMoyenPaiement(m.code)}
                      className={`px-2 py-2.5 text-xs leading-tight rounded-lg border transition-colors ${
                        moyenPaiement === m.code
                          ? "bg-teal-400/10 border-teal-400/50 text-teal-300"
                          : "bg-white/5 border-white/10 text-gray-400 hover:border-white/25"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <div className="bg-black/40 border border-white/10 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">
                    Envoyez{" "}
                    <span className="text-white font-semibold">
                      {packActif?.montant.toLocaleString("fr-FR")} FCFA
                    </span>{" "}
                    au numéro {MOYENS.find((m) => m.code === moyenPaiement)?.label} :
                  </p>
                  {/* break-all + taille adaptative : le numéro ne déborde
                      jamais, même sur un écran de 320px */}
                  <p className="text-base sm:text-lg font-bold text-teal-400 tracking-wide break-all">
                    {numerosPaiement[moyenPaiement]}
                  </p>
                  <p className="text-[11px] text-gray-600 mt-1">Compte : {nomCompte}</p>
                </div>
              </div>

              {/* Étape 2 : référence */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-teal-400 mb-2">
                    2. Collez la référence de la transaction
                  </p>
                  {/* text-base sur mobile : évite le zoom automatique d'iOS
                      sur les champs < 16px */}
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Ex : TXN-20260712-123456 (reçu par SMS)"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-sm placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                    maxLength={100}
                  />
                  <p className="text-[11px] text-gray-600 mt-1.5">
                    C'est l'identifiant qui figure dans le SMS de confirmation de votre opérateur.
                    Il nous permet de retrouver votre paiement.
                  </p>
                </div>

                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {formError}
                  </div>
                )}

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-gradient-to-r from-teal-400 to-teal-500 text-black font-bold text-sm sm:text-base rounded-lg hover:shadow-[0_0_30px_rgba(20,184,166,0.3)] transition-all disabled:opacity-50"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {isSubmitting
                    ? "Envoi..."
                    : nonConnecte
                    ? "Se connecter pour souscrire"
                    : `Activer mon Premium — ${packActif?.montant.toLocaleString("fr-FR")} FCFA`}
                </motion.button>

                <p className="text-[11px] text-gray-600 text-center">
                  Activation sous quelques heures après vérification du paiement par notre équipe.
                </p>
              </form>
            </div>
          </>
        )}
      </main>
    </div>
  );
}