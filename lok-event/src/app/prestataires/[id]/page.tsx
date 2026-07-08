"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Star, MessageCircle, ArrowLeft, Heart, CheckCircle, Calendar, X, AlertCircle } from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";
import dynamic from "next/dynamic";

// ⚠️ Leaflet ne fonctionne pas en SSR : import dynamique obligatoire
const ProviderMiniMap = dynamic(() => import("@/components/map/ProviderMiniMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] rounded-2xl bg-white/5 animate-pulse" />
  ),
});

interface Avis {
  id: string;
  note: number;
  commentaire: string | null;
  createdAt: string;
  auteur: { nom: string; prenom: string };
}

interface PrestataireDetail {
  id: string;
  nomEntreprise: string;
  description: string | null;
  quartier: string;
  commune: string | null;
  ville: string;
  latitude: number | null;
  longitude: number | null;
  telephone: string | null;
  whatsapp: string | null;
  photos: string[];
  prixMin: number | null;
  prixMax: number | null;
  notemoyenne: number;
  totalAvis: number;
  verifie: boolean;
  categorie: { nom: string; couleur?: string | null };
  avis: Avis[];
  _count: { avis: number; reservations: number };
}

export default function PrestataireDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [prestataire, setPrestataire] = useState<PrestataireDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePhoto, setActivePhoto] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavori, setIsTogglingFavori] = useState(false);

  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [reservationForm, setReservationForm] = useState({
    dateEvenement: "",
    lieuEvenement: "",
    typeEvenement: "",
    nombrePersonnes: "",
    message: "",
    budget: "",
  });
  const [isSubmittingReservation, setIsSubmittingReservation] = useState(false);
  const [reservationError, setReservationError] = useState("");
  const [reservationSuccess, setReservationSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<PrestataireDetail>(`/prestataires/${id}`);
        setPrestataire(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Prestataire non trouvé");
      } finally {
        setIsLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  const handleContact = () => {
    if (!prestataire) return;
    const number = prestataire.whatsapp || prestataire.telephone;
    if (!number) return;

    const cleaned = number.replace(/[^0-9+]/g, "");
    const message = encodeURIComponent(
      `Bonjour, je vous contacte via LOKEVENT concernant vos services de ${prestataire.nomEntreprise}.`
    );
    window.open(`https://wa.me/${cleaned.replace("+", "")}?text=${message}`, "_blank");
  };

  const handleToggleFavorite = async () => {
    const token = localStorage.getItem("lokevent_token");
    if (!token) {
      router.push("/login");
      return;
    }

    setIsTogglingFavori(true);
    try {
      if (isFavorite) {
        await api.delete(`/favoris/${id}`);
        setIsFavorite(false);
      } else {
        await api.post("/favoris", { prestataireId: id });
        setIsFavorite(true);
      }
    } catch (err) {
      console.error("Erreur favori:", err);
    } finally {
      setIsTogglingFavori(false);
    }
  };

  const handleOpenReservation = () => {
    const token = localStorage.getItem("lokevent_token");
    if (!token) {
      router.push("/login");
      return;
    }
    setIsReservationModalOpen(true);
  };

  const handleOpenMessage = async () => {
    const token = localStorage.getItem("lokevent_token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const conversation = await api.post<{ id: string }>("/conversations", {
        prestataireId: id,
      });
      router.push(`/messages?c=${conversation.id}`);
    } catch (err) {
      console.error("Erreur ouverture conversation:", err);
      alert(err instanceof Error ? err.message : "Impossible d'ouvrir la conversation");
    }
  };

  const handleReservationChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setReservationForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReservation(true);
    setReservationError("");

    try {
      await api.post("/reservations", {
        prestataireId: id,
        dateEvenement: reservationForm.dateEvenement,
        lieuEvenement: reservationForm.lieuEvenement,
        typeEvenement: reservationForm.typeEvenement,
        nombrePersonnes: reservationForm.nombrePersonnes
          ? parseInt(reservationForm.nombrePersonnes)
          : undefined,
        message: reservationForm.message || undefined,
        budget: reservationForm.budget ? parseFloat(reservationForm.budget) : undefined,
      });
      setReservationSuccess(true);
      setTimeout(() => {
        setIsReservationModalOpen(false);
        setReservationSuccess(false);
        setReservationForm({
          dateEvenement: "",
          lieuEvenement: "",
          typeEvenement: "",
          nombrePersonnes: "",
          message: "",
          budget: "",
        });
      }, 2000);
    } catch (err) {
      setReservationError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmittingReservation(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !prestataire) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-center px-4 gap-4">
        <p className="text-red-400">{error || "Prestataire non trouvé"}</p>
        <button
          onClick={() => router.push("/")}
          className="text-teal-400 hover:text-teal-300 transition-colors text-sm"
        >
          ← Retour à l'accueil
        </button>
      </div>
    );
  }

  const hasContact = Boolean(prestataire.whatsapp || prestataire.telephone);
  const mainPhoto = prestataire.photos[activePhoto] || null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4 md:mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Photo principale : hauteur progressive selon l'écran */}
          <div className="relative h-56 sm:h-72 md:h-96 rounded-2xl overflow-hidden border border-white/10 mb-4">
            {mainPhoto ? (
              <Image src={mainPhoto} alt={prestataire.nomEntreprise} fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-teal-400/20 to-teal-600/10 flex items-center justify-center text-5xl md:text-6xl font-bold text-teal-400/40">
                {prestataire.nomEntreprise.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
          </div>

          {prestataire.photos.length > 1 && (
            <div className="flex gap-2 mb-6 md:mb-8 overflow-x-auto pb-2">
              {prestataire.photos.map((url, i) => (
                <button
                  key={url}
                  onClick={() => setActivePhoto(i)}
                  className={`relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                    activePhoto === i ? "border-teal-400" : "border-transparent"
                  }`}
                >
                  <Image src={url} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold">{prestataire.nomEntreprise}</h1>
                {prestataire.verifie && (
                  <span className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Vérifié
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400 mt-2">
                <span>{prestataire.categorie.nom}</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-400" />
                  {prestataire.quartier}
                  {prestataire.commune ? `, ${prestataire.commune}` : ""}, {prestataire.ville}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  {prestataire.notemoyenne.toFixed(1)} ({prestataire.totalAvis} avis)
                </span>
              </div>
            </div>

            {/* Actions : pleine largeur empilée sur mobile, en ligne sur desktop */}
            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
              <button
                onClick={handleToggleFavorite}
                disabled={isTogglingFavori}
                className="p-3 bg-white/5 border border-white/10 rounded-full hover:border-teal-400/50 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? "text-red-500 fill-red-500" : "text-gray-400"}`} />
              </button>

              <button
                onClick={handleOpenReservation}
                className="flex-1 lg:flex-none justify-center flex items-center gap-2 px-4 md:px-5 py-3 bg-white/5 border border-white/10 rounded-full font-medium text-sm md:text-base hover:border-teal-400/50 hover:text-teal-400 transition-colors whitespace-nowrap"
              >
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Demander une réservation</span>
                <span className="sm:hidden">Réserver</span>
              </button>

              <button
                onClick={handleOpenMessage}
                className="flex-1 lg:flex-none justify-center flex items-center gap-2 px-4 md:px-5 py-3 bg-teal-400/10 border border-teal-400/30 text-teal-400 rounded-full font-medium text-sm md:text-base hover:bg-teal-400/20 transition-colors whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 flex-shrink-0" />
                Message
              </button>

              {hasContact ? (
                <button
                  onClick={handleContact}
                  className="flex-1 lg:flex-none justify-center flex items-center gap-2 px-4 md:px-6 py-3 bg-[#25D366] text-black font-bold rounded-full text-sm md:text-base hover:shadow-[0_0_30px_rgba(37,211,102,0.4)] transition-all whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4 flex-shrink-0" />
                  Contacter
                </button>
              ) : (
                <span className="text-sm text-gray-600">Contact indisponible</span>
              )}
            </div>
          </div>

          {(prestataire.prixMin || prestataire.prixMax) && (
            <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl inline-block max-w-full">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Fourchette de prix</p>
              <p className="font-mono text-base md:text-lg font-semibold break-words">
                {prestataire.prixMin?.toLocaleString() ?? "—"} à {prestataire.prixMax?.toLocaleString() ?? "—"} FCFA
              </p>
            </div>
          )}

          {prestataire.description && (
            <div className="mb-6 md:mb-8">
              <h2 className="text-lg font-bold mb-2">À propos</h2>
              <p className="text-gray-400 leading-relaxed text-sm md:text-base">{prestataire.description}</p>
            </div>
          )}

          <div className="mb-6 md:mb-8">
            <ProviderMiniMap
              latitude={prestataire.latitude}
              longitude={prestataire.longitude}
              nomEntreprise={prestataire.nomEntreprise}
              quartier={prestataire.quartier}
              commune={prestataire.commune}
              ville={prestataire.ville}
              couleur={prestataire.categorie?.couleur}
            />
          </div>

          <div>
            <h2 className="text-lg font-bold mb-4">
              Avis ({prestataire._count.avis})
            </h2>
            <div className="space-y-3">
              {prestataire.avis.length === 0 && (
                <p className="text-sm text-gray-500">Aucun avis pour le moment.</p>
              )}
              {prestataire.avis.map((avis) => (
                <div key={avis.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <p className="font-medium text-sm truncate">
                      {avis.auteur.prenom} {avis.auteur.nom}
                    </p>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {new Date(avis.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < avis.note ? "fill-yellow-500" : "fill-gray-700 text-gray-700"}`}
                      />
                    ))}
                  </div>
                  {avis.commentaire && <p className="text-sm text-gray-400">{avis.commentaire}</p>}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isReservationModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-3 md:px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReservationModalOpen(false)}
            />

            <motion.div
              className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 md:p-8 max-w-lg w-full max-h-[90vh] md:max-h-[85vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              {reservationSuccess ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-teal-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Demande envoyée !</h3>
                  <p className="text-gray-400 text-sm">
                    {prestataire.nomEntreprise} recevra votre demande et pourra vous répondre.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg md:text-xl font-bold text-white">Demande de réservation</h3>
                    <button
                      className="p-2 rounded-full hover:bg-white/10 transition-colors"
                      onClick={() => setIsReservationModalOpen(false)}
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmitReservation} className="space-y-4">
                    {reservationError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {reservationError}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Date de l'événement</label>
                      <input
                        type="date"
                        name="dateEvenement"
                        value={reservationForm.dateEvenement}
                        onChange={handleReservationChange}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-sm focus:border-teal-400/50 focus:outline-none transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Lieu de l'événement</label>
                      <input
                        type="text"
                        name="lieuEvenement"
                        value={reservationForm.lieuEvenement}
                        onChange={handleReservationChange}
                        placeholder="Hôtel Ivoire, Cocody"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-sm placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Type d'événement</label>
                      <input
                        type="text"
                        name="typeEvenement"
                        value={reservationForm.typeEvenement}
                        onChange={handleReservationChange}
                        placeholder="Mariage, anniversaire, gala..."
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-sm placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                        required
                      />
                    </div>

                    {/* 1 colonne sur très petit écran, 2 colonnes dès sm */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Nombre de personnes</label>
                        <input
                          type="number"
                          name="nombrePersonnes"
                          value={reservationForm.nombrePersonnes}
                          onChange={handleReservationChange}
                          placeholder="80"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-sm placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Budget estimé (FCFA)</label>
                        <input
                          type="number"
                          name="budget"
                          value={reservationForm.budget}
                          onChange={handleReservationChange}
                          placeholder="500000"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-sm placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Message (optionnel)</label>
                      <textarea
                        name="message"
                        value={reservationForm.message}
                        onChange={handleReservationChange}
                        placeholder="Précisez vos besoins..."
                        rows={3}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-base sm:text-sm placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors resize-none"
                      />
                    </div>

                    <motion.button
                      type="submit"
                      disabled={isSubmittingReservation}
                      className="w-full py-3 bg-gradient-to-r from-teal-400 to-teal-500 text-black font-bold rounded-lg hover:shadow-[0_0_30px_rgba(20,184,166,0.3)] transition-all disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isSubmittingReservation ? "Envoi en cours..." : "Envoyer la demande"}
                    </motion.button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}