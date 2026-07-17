"use client";

import { Calendar, Star, DollarSign, AlertCircle, LogOut, Menu, X, Camera, Trash2, Edit2, Building2, MapPin, Phone, FileText, Home, MessageSquare, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { uploadToImgbb } from "@/lib/imgbb";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import MessageBadge from "@/components/messages/MessageBadge";
import AvailabilityCalendar from "./AvailabilityCalendar";
import ServicesManager from "./ServicesManager";

// ⚠️ Leaflet ne fonctionne pas en SSR : import dynamique obligatoire
const LocationPicker = dynamic(() => import("@/components/map/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] rounded-xl bg-white/5 animate-pulse" />
  ),
});

interface ProviderProfile {
  nomEntreprise: string;
  description: string | null;
  quartier: string;
  commune: string | null;
  ville: string;
  latitude: number | null;
  longitude: number | null;
  telephone: string | null;
  whatsapp: string | null;
  prixMin: number | null;
  prixMax: number | null;
  verifie: boolean;
  notemoyenne: number;
  totalAvis: number;
  photos: string[];
  categorie: { nom: string };
}

interface Stats {
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
}

interface Booking {
  id: string;
  client: { nom: string; prenom: string };
  typeEvenement: string;
  dateEvenement: string;
  statut: string;
}

interface BookingsResponse {
  bookings: Booking[];
  pagination: { total: number; pages: number };
}

interface Review {
  id: string;
  auteur: { nom: string; prenom: string };
  note: number;
  commentaire: string | null;
  createdAt: string;
}

interface ReviewsResponse {
  reviews: Review[];
  stats: { averageRating: number; totalReviews: number };
}

// Statut Premium : le Premium est réservé aux prestataires — ce sont eux
// les clients payants de LOKEVENT (souscription aux packs).
interface PremiumStatut {
  estPremium: boolean;
  premiumJusquau: string | null;
  demandeEnAttente?: { id: string; pack: string; montant: number; createdAt: string } | null;
}

const statutLabels: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: "En attente", color: "bg-yellow-500/20 text-yellow-500" },
  CONFIRMEE: { label: "Confirmé", color: "bg-green-500/20 text-green-500" },
  TERMINEE: { label: "Terminé", color: "bg-blue-500/20 text-blue-500" },
  ANNULEE: { label: "Annulé", color: "bg-red-500/20 text-red-500" },
};

export default function ProviderDashboard() {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const unreadMessages = useUnreadMessages();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Statut Premium du prestataire (badge + CTA de souscription)
  const [estPremium, setEstPremium] = useState(false);
  const [premiumJusquau, setPremiumJusquau] = useState<string | null>(null);
  const [demandePremiumEnAttente, setDemandePremiumEnAttente] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nomEntreprise: "",
    description: "",
    quartier: "",
    commune: "",
    ville: "",
    telephone: "",
    whatsapp: "",
    prixMin: "",
    prixMax: "",
  });
  const [editPosition, setEditPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [profileData, statsData, bookingsData, reviewsData] = await Promise.all([
          api.get<ProviderProfile>("/prestataires/profile"),
          api.get<Stats>("/prestataires/stats"),
          api.get<BookingsResponse>("/prestataires/bookings"),
          api.get<ReviewsResponse>("/prestataires/reviews"),
        ]);
        setProfile(profileData);
        setStats(statsData);
        setBookings(bookingsData.bookings);
        setReviews(reviewsData.reviews);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        setIsLoading(false);
      }
      // Statut Premium — non bloquant : en cas d'erreur on ignore simplement
      try {
        const statut = await api.get<PremiumStatut>("/premium/statut");
        setEstPremium(Boolean(statut?.estPremium));
        setPremiumJusquau(statut?.premiumJusquau ?? null);
        setDemandePremiumEnAttente(Boolean(statut?.demandeEnAttente));
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadToImgbb(file);
      await api.post("/prestataires/photos", { url });
      setProfile((prev) => (prev ? { ...prev, photos: [...(prev.photos || []), url] } : prev));
    } catch (err) {
      console.error("Erreur upload photo:", err);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handlePhotoRemove = async (url: string) => {
    try {
      await api.deleteWithBody("/prestataires/photos", { url });
      setProfile((prev) =>
        prev ? { ...prev, photos: (prev.photos || []).filter((p) => p !== url) } : prev
      );
    } catch (err) {
      console.error("Erreur suppression photo:", err);
    }
  };

  const handleOpenEdit = () => {
    if (!profile) return;
    setEditForm({
      nomEntreprise: profile.nomEntreprise || "",
      description: profile.description || "",
      quartier: profile.quartier || "",
      commune: profile.commune || "",
      ville: profile.ville || "",
      telephone: profile.telephone || "",
      whatsapp: profile.whatsapp || "",
      prixMin: profile.prixMin?.toString() || "",
      prixMax: profile.prixMax?.toString() || "",
    });
    setEditPosition(
      profile.latitude != null && profile.longitude != null
        ? { latitude: profile.latitude, longitude: profile.longitude }
        : null
    );
    setSaveError("");
    setIsEditModalOpen(true);
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setSaveError("");

    try {
      await api.put("/prestataires/profile", {
        ...editForm,
        latitude: editPosition?.latitude,
        longitude: editPosition?.longitude,
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              nomEntreprise: editForm.nomEntreprise,
              description: editForm.description,
              quartier: editForm.quartier,
              commune: editForm.commune || null,
              ville: editForm.ville,
              latitude: editPosition?.latitude ?? prev.latitude,
              longitude: editPosition?.longitude ?? prev.longitude,
              telephone: editForm.telephone,
              whatsapp: editForm.whatsapp,
              prixMin: editForm.prixMin ? parseFloat(editForm.prixMin) : null,
              prixMax: editForm.prixMax ? parseFloat(editForm.prixMax) : null,
            }
          : prev
      );
      setIsEditModalOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleBookingStatus = async (bookingId: string, statut: string) => {
    setUpdatingBookingId(bookingId);
    try {
      await api.put(`/prestataires/bookings/${bookingId}/status`, { statut });
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, statut } : b))
      );
    } catch (err) {
      console.error("Erreur mise à jour réservation:", err);
      alert(err instanceof Error ? err.message : "Impossible de mettre à jour la réservation");
    } finally {
      setUpdatingBookingId(null);
    }
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
              <span className="text-2xl font-bold">
                LOK<span className="text-teal-400">EVENT</span>
              </span>
              <span className="text-[10px] bg-teal-400/20 text-teal-400 px-2 py-0.5 rounded-full">Pro</span>
            </Link>
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-teal-400 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="text-sm">Accueil</span>
              </Link>
              <Link
                href="/messages"
                className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-teal-400 transition-colors"
              >
                <span className="relative">
                  <MessageSquare className="w-4 h-4" />
                  <MessageBadge count={unreadMessages} />
                </span>
                <span className="text-sm">Messages</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-300 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Déconnexion</span>
              </button>
            </div>
            <button
              className="md:hidden p-2 rounded-full text-white hover:bg-white/10 active:bg-white/15 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
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
                  <span className="relative">
                    <MessageSquare className="w-5 h-5" />
                    <MessageBadge count={unreadMessages} />
                  </span>
                  <span>Messages</span>
                  {unreadMessages > 0 && (
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold">
                      {unreadMessages}
                    </span>
                  )}
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
        {profile && (
          <motion.div
            className="bg-gradient-to-r from-teal-400/10 to-teal-500/5 border border-teal-400/20 rounded-2xl p-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-teal-400 flex-shrink-0">
                {profile.photos && profile.photos.length > 0 ? (
                  <img src={profile.photos[0]} alt={profile.nomEntreprise} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-teal-400 to-teal-600 flex items-center justify-center text-black font-bold text-lg">
                    {profile.nomEntreprise.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold">{profile.nomEntreprise}</h1>
                  {profile.verifie && (
                    <span className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full text-xs">✓ Vérifié</span>
                  )}
                  {estPremium && (
                    <span
                      className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full"
                      title={
                        premiumJusquau
                          ? `Premium actif jusqu'au ${new Date(premiumJusquau).toLocaleDateString("fr-FR")}`
                          : "Premium actif"
                      }
                    >
                      <Crown className="w-3 h-3" />
                      Premium
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-sm text-yellow-500">
                    <Star className="w-4 h-4 fill-yellow-500" />
                    {profile.notemoyenne.toFixed(1)} ({profile.totalAvis} avis)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mt-1">
                  <span>{profile.categorie.nom}</span>
                  <span>
                    {profile.quartier}
                    {profile.commune ? `, ${profile.commune}` : ""}, {profile.ville}
                  </span>
                  {profile.latitude == null && (
                    <span className="text-yellow-500/80 text-xs">
                      ⚠️ Position non définie — éditez votre profil pour apparaître sur la carte
                    </span>
                  )}
                </div>
                {profile.description && (
                  <p className="text-sm text-gray-400 mt-2 max-w-2xl">{profile.description}</p>
                )}
              </div>

              <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                <button
                  onClick={handleOpenEdit}
                  className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-3 md:px-4 py-2 bg-white/5 border border-white/10 rounded-lg font-medium text-sm hover:border-teal-400/50 hover:text-teal-400 transition-colors whitespace-nowrap"
                >
                  <Edit2 className="w-4 h-4" />
                  Éditer le profil
                </button>
                <label className="flex-1 sm:flex-none flex items-center gap-2 px-3 md:px-4 py-2 bg-teal-400 text-black rounded-lg font-medium text-sm hover:bg-teal-300 transition-colors cursor-pointer justify-center whitespace-nowrap">
                  <Camera className="w-4 h-4" />
                  {isUploading ? "Envoi..." : "Ajouter une photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={isUploading}
                  />
                </label>
                {/* Souscription Premium : réservée aux prestataires */}
                {!estPremium && !demandePremiumEnAttente && (
                  <Link
                    href="/premium"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-sm font-medium text-yellow-400 border border-yellow-500/25 rounded-lg hover:bg-yellow-500/10 transition-colors whitespace-nowrap"
                  >
                    <Crown className="w-4 h-4" />
                    Devenir Premium
                  </Link>
                )}
                {!estPremium && demandePremiumEnAttente && (
                  <span className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-xs text-yellow-400/80 whitespace-nowrap">
                    <Crown className="w-4 h-4" />
                    Premium en validation…
                  </span>
                )}
              </div>
            </div>

            {profile.photos && profile.photos.length > 0 && (
              <div className="flex gap-3 mt-4 flex-wrap">
                {profile.photos.map((url) => (
                  <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => handlePhotoRemove(url)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {stats && (
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 uppercase tracking-wider">Réservations</span>
                <Calendar className="w-5 h-5 text-teal-400" />
              </div>
              <p className="text-2xl font-bold mt-2">{stats.totalBookings}</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 uppercase tracking-wider">En attente</span>
                <AlertCircle className="w-5 h-5 text-yellow-400" />
              </div>
              <p className="text-2xl font-bold mt-2">{stats.pendingBookings}</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 uppercase tracking-wider">Chiffre d'affaires</span>
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-2xl font-bold mt-2">{stats.totalRevenue.toLocaleString()} FCFA</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 uppercase tracking-wider">Note moyenne</span>
                <Star className="w-5 h-5 text-yellow-400" />
              </div>
              <p className="text-2xl font-bold mt-2">{stats.averageRating.toFixed(1)}</p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-4">Prochaines réservations</h2>
              <div className="space-y-3">
                {bookings.length === 0 && (
                  <p className="text-sm text-gray-500">Aucune réservation pour le moment.</p>
                )}
                {bookings.map((booking) => {
                  const statutInfo = statutLabels[booking.statut] || {
                    label: booking.statut,
                    color: "bg-gray-500/20 text-gray-400",
                  };
                  return (
                    <motion.div
                      key={booking.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                      whileHover={{ scale: 1.01 }}
                    >
                      <div>
                        <p className="font-medium">
                          {booking.client.prenom} {booking.client.nom}
                        </p>
                        <p className="text-sm text-gray-400">{booking.typeEvenement}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(booking.dateEvenement).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 w-full sm:w-auto">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statutInfo.color}`}>
                          {statutInfo.label}
                        </span>

                        {booking.statut === "EN_ATTENTE" && (
                          <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
                            <button
                              onClick={() => handleBookingStatus(booking.id, "CONFIRMEE")}
                              disabled={updatingBookingId === booking.id}
                              className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-xs font-medium bg-teal-400 text-black rounded-lg hover:bg-teal-300 active:bg-teal-500 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              Accepter
                            </button>
                            <button
                              onClick={() => handleBookingStatus(booking.id, "ANNULEE")}
                              disabled={updatingBookingId === booking.id}
                              className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-xs font-medium text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 active:bg-red-500/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              Refuser
                            </button>
                          </div>
                        )}

                        {booking.statut === "CONFIRMEE" && (
                          <button
                            onClick={() => handleBookingStatus(booking.id, "TERMINEE")}
                            disabled={updatingBookingId === booking.id}
                            className="px-3 py-2 sm:py-1.5 text-xs font-medium text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/10 active:bg-blue-500/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            Marquer terminé
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <ServicesManager />
            </div>
          </motion.div>

          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <AvailabilityCalendar />

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Avis récents</h3>
              <div className="space-y-3">
                {reviews.length === 0 && (
                  <p className="text-sm text-gray-500">Aucun avis pour le moment.</p>
                )}
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-white/5 last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {review.auteur.prenom} {review.auteur.nom}
                      </p>
                      <span className="text-xs text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < review.note ? "fill-yellow-500" : "fill-gray-600"}`} />
                      ))}
                    </div>
                    {review.commentaire && (
                      <p className="text-xs text-gray-400 mt-1">{review.commentaire}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <AnimatePresence>
        {isEditModalOpen && (
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
              onClick={() => setIsEditModalOpen(false)}
            />

            <motion.div
              className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-5 md:p-8 max-w-2xl w-full max-h-[90vh] md:max-h-[85vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Éditer mon profil</h3>
                <button
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {saveError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {saveError}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Nom de l'entreprise</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      name="nomEntreprise"
                      value={editForm.nomEntreprise}
                      onChange={handleEditChange}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-teal-400/50 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Description</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <textarea
                      name="description"
                      value={editForm.description}
                      onChange={handleEditChange}
                      placeholder="Présentez vos services, votre expérience..."
                      rows={4}
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
                        value={editForm.quartier}
                        onChange={handleEditChange}
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
                      value={editForm.commune}
                      onChange={handleEditChange}
                      placeholder="Cocody"
                      className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Ville</label>
                    <input
                      type="text"
                      name="ville"
                      value={editForm.ville}
                      onChange={handleEditChange}
                      className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-teal-400/50 focus:outline-none transition-colors"
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
                    initialPosition={editPosition}
                    onChange={setEditPosition}
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
                        value={editForm.telephone}
                        onChange={handleEditChange}
                        className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-teal-400/50 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">WhatsApp</label>
                    <input
                      type="tel"
                      name="whatsapp"
                      value={editForm.whatsapp}
                      onChange={handleEditChange}
                      className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-teal-400/50 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">
                    Fourchette de prix indicative (FCFA) <span className="text-gray-600">— optionnel</span>
                  </label>
                  <p className="text-xs text-gray-600 mb-2">
                    Aucun paiement n'est effectué sur LOKEVENT. Ceci n'est qu'un repère pour aider les clients à estimer leur budget.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      name="prixMin"
                      value={editForm.prixMin}
                      onChange={handleEditChange}
                      placeholder="Minimum"
                      className="px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                    />
                    <input
                      type="number"
                      name="prixMax"
                      value={editForm.prixMax}
                      onChange={handleEditChange}
                      placeholder="Maximum"
                      className="px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full py-3 bg-gradient-to-r from-teal-400 to-teal-500 text-black font-bold rounded-lg hover:shadow-[0_0_30px_rgba(20,184,166,0.3)] transition-all disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSavingProfile ? "Enregistrement..." : "Enregistrer les modifications"}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}