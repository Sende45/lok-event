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
  dateEvenement: string;
  lieuEvenement: string;
  typeEvenement: string;
  statut: string;
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

export default function ClientDashboard() {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
    }
    loadDashboard();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("lokevent_token");
    localStorage.removeItem("lokevent_user");
    router.push("/login");
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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight">
              LOK<span className="text-teal-400">EVENT</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Déconnexion</span>
            </button>
          </div>

          <button
            className="md:hidden text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl pt-20 px-6 md:hidden"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
          >
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-400"
            >
              <LogOut className="w-5 h-5" />
              <span>Déconnexion</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {user && (
            <motion.div
              className="lg:col-span-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <h2 className="text-lg font-bold">
                  {user.prenom} {user.nom}
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
                        <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
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
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}