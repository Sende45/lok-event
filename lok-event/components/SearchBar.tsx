"use client";

import { Search, LogIn, UserPlus, LogOut, LayoutDashboard, Settings, Heart, Calendar } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: "ADMIN" | "PRESTATAIRE" | "CLIENT";
}

interface PrestataireResult {
  id: string;
  nomEntreprise: string;
  quartier: string;
  ville: string;
  categorie: { nom: string };
}

interface SearchResponse {
  prestataires: PrestataireResult[];
}

export default function SearchBar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [results, setResults] = useState<PrestataireResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("lokevent_user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Erreur de parsing:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchValue.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await api.get<SearchResponse>(
          `/prestataires?search=${encodeURIComponent(searchValue)}&limit=6`
        );
        setResults(data.prestataires);
      } catch (err) {
        console.error("Erreur recherche:", err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchValue]);

  const handleLogout = () => {
    localStorage.removeItem("lokevent_token");
    localStorage.removeItem("lokevent_user");
    setUser(null);
    setIsMenuOpen(false);
    window.location.href = "/";
  };

  const handleSelectResult = (id: string) => {
    setSearchValue("");
    setResults([]);
    router.push(`/prestataires/${id}`);
  };

  const getDashboardLink = () => {
    if (!user) return "/login";
    switch (user.role) {
      case "ADMIN":
        return "/admin";
      case "PRESTATAIRE":
        return "/provider";
      case "CLIENT":
        return "/dashboard/client";
      default:
        return "/login";
    }
  };

  const getDashboardLabel = () => {
    if (!user) return "Se connecter";
    switch (user.role) {
      case "ADMIN":
        return "Admin";
      case "PRESTATAIRE":
        return "Dashboard Pro";
      case "CLIENT":
        return "Mon Dashboard";
      default:
        return "Dashboard";
    }
  };

  const getInitials = (nom: string, prenom: string) => {
    return `${prenom[0] || ""}${nom[0] || ""}`.toUpperCase();
  };

  const roleLabel = (role: User["role"]) =>
    role === "ADMIN" ? "Admin" : role === "PRESTATAIRE" ? "Pro" : "Client";

  const roleBadgeColor = (role: User["role"]) =>
    role === "ADMIN"
      ? "bg-purple-500/20 text-purple-400"
      : role === "PRESTATAIRE"
      ? "bg-blue-500/20 text-blue-400"
      : "bg-teal-500/20 text-teal-400";

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 w-full">
      <div className="relative flex-1 md:max-w-2xl order-1">
        <Search
          className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
            isSearchFocused ? "text-teal-400" : "text-gray-500"
          }`}
        />

        <input
          className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-6 text-sm outline-none transition-all duration-300 focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 shadow-xl placeholder:text-gray-500 text-white"
          placeholder="Rechercher un prestataire, un lieu, un service..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
        />

        <AnimatePresence>
          {isSearchFocused && searchValue.trim().length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full mt-2 left-0 right-0 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
            >
              {isSearching && (
                <div className="px-4 py-3 text-sm text-gray-500">Recherche...</div>
              )}

              {!isSearching && results.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500">
                  Aucun prestataire trouvé pour "{searchValue}"
                </div>
              )}

              {!isSearching &&
                results.map((r) => (
                  <button
                    key={r.id}
                    className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center justify-between gap-3"
                    onClick={() => handleSelectResult(r.id)}
                  >
                    <span className="flex items-center gap-3">
                      <Search className="w-4 h-4 text-gray-500" />
                      <span>
                        {r.nomEntreprise}
                        <span className="text-gray-500 ml-2 text-xs">
                          {r.categorie.nom} · {r.quartier}
                        </span>
                      </span>
                    </span>
                  </button>
                ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative flex-shrink-0 order-2">
        {user ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10 hover:border-teal-400/50 transition-all hover:bg-white/10"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-400 to-teal-500 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                {getInitials(user.nom, user.prenom)}
              </div>
              <span className="text-sm text-white hidden sm:block">{user.prenom}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${roleBadgeColor(user.role)}`}>
                {roleLabel(user.role)}
              </span>
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-0 right-0 md:right-auto top-full mt-2 md:w-72 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="font-medium text-white">
                      {user.prenom} {user.nom}
                    </p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>

                  <div className="py-2">
                    <Link
                      href={getDashboardLink()}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4 text-teal-400" />
                      {getDashboardLabel()}
                    </Link>

                    {user.role === "CLIENT" && (
                      <Link
                        href="/dashboard/client"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Heart className="w-4 h-4 text-teal-400" />
                        Mes Réservations & Favoris
                      </Link>
                    )}

                    {user.role === "PRESTATAIRE" && (
                      <Link
                        href="/provider"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Calendar className="w-4 h-4 text-teal-400" />
                        Réservations
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full border-t border-white/5 mt-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:flex items-center gap-2">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 text-sm text-gray-300 hover:text-white transition-colors rounded-lg bg-white/5 md:bg-transparent hover:bg-white/10 md:hover:bg-white/5"
            >
              <LogIn className="w-4 h-4" />
              <span>Connexion</span>
            </Link>
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 bg-gradient-to-r from-teal-400 to-teal-500 text-black font-medium rounded-lg hover:shadow-[0_0_30px_rgba(20,184,166,0.3)] transition-all text-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>S'inscrire</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}