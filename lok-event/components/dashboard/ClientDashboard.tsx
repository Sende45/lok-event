"use client";

import {
  MapPin,
  Calendar,
  Check,
  LogOut,
  Menu,
  X,
  Mail,
  Phone,
  Clock,
  Star,
  AlertCircle,
  CheckCircle,
  Home,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Crown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

interface UserData {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  createdAt: string;
}

interface Reservation {
  id: string;
  prestataireId: string;
  dateEvenement: string;
  lieuEvenement: string;
  typeEvenement: string;
  statut: string;
  avis: { id: string } | null;
  prestataire: {
    nomEntreprise: string;
    photos: string[];
    quartier: string;
  };
}

const statutLabels: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: "En attente", color: "bg-yellow-500/20 text-yellow-500 border border-yellow-500/20" },
  CONFIRMEE: { label: "Confirmé", color: "bg-green-500/20 text-green-500 border border-green-500/20" },
  TERMINEE: { label: "Terminé", color: "bg-blue-500/20 text-blue-500 border border-blue-500/20" },
  ANNULEE: { label: "Annulé", color: "bg-red-500/20 text-red-500 border border-red-500/20" },
};

// Le backend ne renvoie que les EXCEPTIONS (modèle Indisponibilite + réservations
// confirmées). Une date sans entrée est donc DISPONIBLE par défaut.
const dispoStyles: Record<string, string> = {
  INDISPONIBLE: "bg-red-500/15 text-red-400 border border-red-500/25",
  RESERVE: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25",
};
const dispoDefaut = "bg-teal-400/10 text-teal-300/80 border border-teal-400/15";

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Clé locale YYYY-MM-DD sans décalage de fuseau horaire */
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ClientDashboard() {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Annulation
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Modal d'avis
  const [avisReservation, setAvisReservation] = useState<Reservation | null>(null);
  const [avisNote, setAvisNote] = useState(0);
  const [avisHover, setAvisHover] = useState(0);
  const [avisCommentaire, setAvisCommentaire] = useState("");
  const [isSubmittingAvis, setIsSubmittingAvis] = useState(false);
  const [avisError, setAvisError] = useState("");
  const [avisSuccess, setAvisSuccess] = useState(false);

  // Modal de disponibilités
  const [dispoReservation, setDispoReservation] = useState<Reservation | null>(null);
  const [disponibilites, setDisponibilites] = useState<Record<string, string>>({});
  const [isLoadingDispo, setIsLoadingDispo] = useState(false);
  const [dispoError, setDispoError] = useState("");
  const [dispoMonth, setDispoMonth] = useState<Date>(new Date());

  // Statut Premium (badge)
  const [estPremium, setEstPremium] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [userData, reservationsData] = await Promise.all([
          api.get<UserData>("/auth/me"),
          api.get<Reservation[]>("/reservations/mes-reservations"),
        ]);
        setUser(userData);
        setReservations(reservationsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        setIsLoading(false);
      }
      // Statut Premium — non bloquant : en cas d'erreur on ignore simplement
      try {
        const statut = await api.get<{ estPremium: boolean }>("/premium/statut");
        setEstPremium(Boolean(statut?.estPremium));
      } catch {
        /* silencieux */
      }
    }
    loadDashboard();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("lokevent_token");
    localStorage.removeItem("lokevent_user");
    router.push("/login");
  };

  const handleAnnuler = async (reservationId: string) => {
    if (!window.confirm("Voulez-vous vraiment annuler cette réservation ?")) return;
    setCancellingId(reservationId);
    try {
      await api.patch(`/reservations/${reservationId}/annuler`, {});
      setReservations((prev) =>
        prev.map((r) => (r.id === reservationId ? { ...r, statut: "ANNULEE" } : r))
      );
    } catch (err) {
      console.error("Erreur annulation:", err);
      alert(err instanceof Error ? err.message : "Impossible d'annuler la réservation");
    } finally {
      setCancellingId(null);
    }
  };

  const handleOpenAvis = (reservation: Reservation) => {
    setAvisReservation(reservation);
    setAvisNote(0);
    setAvisHover(0);
    setAvisCommentaire("");
    setAvisError("");
    setAvisSuccess(false);
  };

  const handleSubmitAvis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avisReservation) return;
    if (avisNote < 1) {
      setAvisError("Veuillez sélectionner une note");
      return;
    }

    setIsSubmittingAvis(true);
    setAvisError("");
    try {
      const created = await api.post<{ id: string }>("/avis", {
        prestataireId: avisReservation.prestataireId,
        reservationId: avisReservation.id,
        note: avisNote,
        commentaire: avisCommentaire.trim() || undefined,
      });
      setAvisSuccess(true);
      setReservations((prev) =>
        prev.map((r) =>
          r.id === avisReservation.id ? { ...r, avis: { id: created.id } } : r
        )
      );
      setTimeout(() => setAvisReservation(null), 1800);
    } catch (err) {
      setAvisError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmittingAvis(false);
    }
  };

  // ---- Disponibilités ----
  const handleOpenDispo = async (reservation: Reservation) => {
    setDispoReservation(reservation);
    setDispoError("");
    setDisponibilites({});
    // Ouvrir le calendrier sur le mois de l'événement s'il est à venir, sinon le mois courant
    const eventDate = new Date(reservation.dateEvenement);
    const now = new Date();
    setDispoMonth(eventDate > now ? new Date(eventDate.getFullYear(), eventDate.getMonth(), 1) : new Date(now.getFullYear(), now.getMonth(), 1));

    setIsLoadingDispo(true);
    try {
      const data = await api.get<unknown>(
        `/disponibilites/prestataire/${reservation.prestataireId}`
      );

      // Format de l'API : { datesIndisponibles: ["YYYY-MM-DD", ...], datesReservees?: [...] }
      // - datesIndisponibles = liste fusionnée (blocages manuels + réservations confirmées)
      // - datesReservees = sous-ensemble réservé (si le backend le renvoie), affiché en jaune
      const map: Record<string, string> = {};
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const obj = data as { datesIndisponibles?: string[]; datesReservees?: string[] };
        (obj.datesIndisponibles || []).forEach((jour) => {
          if (typeof jour === "string") map[jour] = "INDISPONIBLE";
        });
        (obj.datesReservees || []).forEach((jour) => {
          if (typeof jour === "string") map[jour] = "RESERVE";
        });
      } else if (Array.isArray(data)) {
        // Tolérance : ancien format tableau d'objets [{ date, statut }]
        (data as { date?: string; statut?: string }[]).forEach((d) => {
          if (!d?.date) return;
          const dateObj = new Date(d.date);
          if (isNaN(dateObj.getTime())) return;
          map[dateKey(dateObj)] = d.statut || "INDISPONIBLE";
        });
      }
      setDisponibilites(map);
    } catch (err) {
      setDispoError(
        err instanceof Error ? err.message : "Impossible de charger les disponibilités"
      );
    } finally {
      setIsLoadingDispo(false);
    }
  };

  const buildCalendarDays = (month: Date): (Date | null)[] => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(year, m, 1);
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    // Lundi = 0 ... Dimanche = 6
    const offset = (firstDay.getDay() + 6) % 7;
    const cells: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, m, d));
    return cells;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-red-400 text-center px-4">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-white/5">
        <nav className="px-4 md:px-8 py-3 md:py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight">
                LOK<span className="text-teal-400">EVENT</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-teal-400 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="text-sm">Accueil</span>
              </Link>
              <Link
                href="/messages"
                className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-teal-400 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">Messages</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Déconnexion</span>
              </button>
            </div>

            <button
              className="md:hidden p-2 rounded-full text-white hover:bg-white/10 active:bg-white/15 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>

        {/* Menu mobile DANS le header : il pousse le contenu au lieu de flotter dessus */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              className="md:hidden overflow-hidden bg-[#0a0a0a] border-t border-white/5"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="px-4 py-2">
                <Link
                  href="/"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/5 active:bg-white/10 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Home className="w-5 h-5" />
                  <span>Accueil</span>
                </Link>
                <Link
                  href="/messages"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/5 active:bg-white/10 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Messages</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 active:bg-red-500/15 transition-colors border-t border-white/5 mt-1"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Déconnexion</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="pt-6 md:pt-8 pb-12 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {user && (
            <motion.div
              className="lg:col-span-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  {user.prenom} {user.nom}
                  {estPremium && (
                    <span className="flex items-center gap-1 text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                      <Crown className="w-3 h-3" />
                      Premium
                    </span>
                  )}
                </h2>

                <div className="space-y-2 text-sm mt-4">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Mail className="w-4 h-4" />
                    {user.email}
                  </div>
                  {user.telephone && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Phone className="w-4 h-4" />
                      {user.telephone}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="w-4 h-4" />
                    Membre depuis {new Date(user.createdAt).toLocaleDateString("fr-FR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>

                {!estPremium && (
                  <Link
                    href="/premium"
                    className="mt-5 flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-yellow-400 border border-yellow-500/25 rounded-lg hover:bg-yellow-500/10 transition-colors"
                  >
                    <Crown className="w-4 h-4" />
                    Devenir Premium
                  </Link>
                )}
              </div>
            </motion.div>
          )}

          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 className="text-xl font-bold mb-4">Mes Réservations</h2>
            <div className="space-y-3">
              {reservations.length === 0 && (
                <p className="text-sm text-gray-500">Aucune réservation pour le moment.</p>
              )}
              {reservations.map((reservation, index) => {
                const statutInfo = statutLabels[reservation.statut] || {
                  label: reservation.statut,
                  color: "bg-gray-500/20 text-gray-400",
                };
                return (
                  <motion.div
                    key={reservation.id}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-teal-400/30 transition-all"
                    whileHover={{ scale: 1.01 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{reservation.prestataire.nomEntreprise}</h3>
                          <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-gray-400">
                            {reservation.typeEvenement}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(reservation.dateEvenement).toLocaleDateString("fr-FR")}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {reservation.lieuEvenement}
                          </span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statutInfo.color}`}>
                        {reservation.statut === "CONFIRMEE" && <Check className="w-3 h-3 inline mr-1" />}
                        {statutInfo.label}
                      </span>
                    </div>

                    {/* Actions selon le statut */}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <button
                        onClick={() => handleOpenDispo(reservation)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-400 border border-teal-400/20 rounded-lg hover:bg-teal-400/10 transition-colors"
                      >
                        <CalendarDays className="w-3 h-3" />
                        Disponibilités
                      </button>

                      {(reservation.statut === "EN_ATTENTE" ||
                        reservation.statut === "CONFIRMEE") && (
                        <button
                          onClick={() => handleAnnuler(reservation.id)}
                          disabled={cancellingId === reservation.id}
                          className="px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                          {cancellingId === reservation.id ? "Annulation..." : "Annuler"}
                        </button>
                      )}

                      {reservation.statut === "TERMINEE" && !reservation.avis && (
                        <button
                          onClick={() => handleOpenAvis(reservation)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-400 text-black rounded-lg hover:bg-teal-300 transition-colors"
                        >
                          <Star className="w-3 h-3" />
                          Laisser un avis
                        </button>
                      )}

                      {reservation.statut === "TERMINEE" && reservation.avis && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-teal-400">
                          <CheckCircle className="w-3 h-3" />
                          Avis publié
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Modal de disponibilités du prestataire */}
      <AnimatePresence>
        {dispoReservation && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDispoReservation(null)}
            />

            <motion.div
              className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 md:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-xl font-bold text-white">Disponibilités</h3>
                <button
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  onClick={() => setDispoReservation(null)}
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <p className="text-sm text-gray-400 mb-5">
                {dispoReservation.prestataire.nomEntreprise} — {dispoReservation.prestataire.quartier}
              </p>

              {isLoadingDispo ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
                </div>
              ) : dispoError ? (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {dispoError}
                </div>
              ) : (
                <>
                  {/* Navigation du mois */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() =>
                        setDispoMonth(
                          (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1)
                        )
                      }
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <span className="text-sm font-semibold capitalize">
                      {dispoMonth.toLocaleDateString("fr-FR", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <button
                      onClick={() =>
                        setDispoMonth(
                          (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1)
                        )
                      }
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  {/* Grille du calendrier */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {JOURS.map((j) => (
                      <div
                        key={j}
                        className="text-center text-[11px] text-gray-500 font-medium py-1"
                      >
                        {j}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {buildCalendarDays(dispoMonth).map((day, i) => {
                      if (!day) return <div key={`empty-${i}`} />;
                      const key = dateKey(day);
                      const statut = disponibilites[key];
                      const isEventDay =
                        key === dateKey(new Date(dispoReservation.dateEvenement));
                      const isPast =
                        day < new Date(new Date().setHours(0, 0, 0, 0));
                      return (
                        <div
                          key={key}
                          title={
                            statut === "INDISPONIBLE"
                              ? "Indisponible"
                              : statut === "RESERVE"
                              ? "Réservé"
                              : "Disponible"
                          }
                          className={`relative aspect-square flex items-center justify-center rounded-lg text-xs transition-colors ${
                            statut ? dispoStyles[statut] || dispoDefaut : dispoDefaut
                          } ${isPast ? "opacity-40" : ""} ${
                            isEventDay ? "ring-2 ring-teal-400" : ""
                          }`}
                        >
                          {day.getDate()}
                        </div>
                      );
                    })}
                  </div>

                  {/* Légende */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-teal-400/20 border border-teal-400/30" />
                      Disponible
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-red-500/30 border border-red-500/40" />
                      Indisponible
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-yellow-500/30 border border-yellow-500/40" />
                      Réservé
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded ring-2 ring-teal-400" />
                      Votre événement
                    </span>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal d'avis vérifié */}
      <AnimatePresence>
        {avisReservation && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAvisReservation(null)}
            />

            <motion.div
              className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 md:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              {avisSuccess ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-16 h-16 text-teal-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Merci pour votre avis !</h3>
                  <p className="text-gray-400 text-sm">
                    Il est maintenant visible sur la fiche de {avisReservation.prestataire.nomEntreprise}.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-bold text-white">Votre avis</h3>
                    <button
                      className="p-2 rounded-full hover:bg-white/10 transition-colors"
                      onClick={() => setAvisReservation(null)}
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 mb-6">
                    {avisReservation.prestataire.nomEntreprise} —{" "}
                    {avisReservation.typeEvenement} du{" "}
                    {new Date(avisReservation.dateEvenement).toLocaleDateString("fr-FR")}
                  </p>

                  <form onSubmit={handleSubmitAvis} className="space-y-4">
                    {avisError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {avisError}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Note</label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setAvisNote(n)}
                            onMouseEnter={() => setAvisHover(n)}
                            onMouseLeave={() => setAvisHover(0)}
                            className="p-1 transition-transform hover:scale-110"
                          >
                            <Star
                              className={`w-8 h-8 transition-colors ${
                                n <= (avisHover || avisNote)
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "text-gray-600 fill-gray-700"
                              }`}
                            />
                          </button>
                        ))}
                        {avisNote > 0 && (
                          <span className="text-sm text-gray-400 ml-2">{avisNote}/5</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">
                        Commentaire <span className="text-gray-600">— optionnel</span>
                      </label>
                      <textarea
                        value={avisCommentaire}
                        onChange={(e) => setAvisCommentaire(e.target.value)}
                        placeholder="Partagez votre expérience..."
                        rows={4}
                        maxLength={1000}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors resize-none"
                      />
                    </div>

                    <motion.button
                      type="submit"
                      disabled={isSubmittingAvis}
                      className="w-full py-3 bg-gradient-to-r from-teal-400 to-teal-500 text-black font-bold rounded-lg hover:shadow-[0_0_30px_rgba(20,184,166,0.3)] transition-all disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isSubmittingAvis ? "Publication..." : "Publier mon avis"}
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