"use client";

import { Search, LogIn, UserPlus, LogOut, LayoutDashboard, Heart, Calendar, MapPin, LocateFixed } from "lucide-react";
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
  commune?: string | null;
  ville: string;
  distance?: number; // renvoyé uniquement par /proximite
  categorie: { nom: string };
}

interface SearchResponse {
  prestataires: PrestataireResult[];
}

// Localités connues pour router le champ "Où ?" vers le bon paramètre API
const VILLES = ["Abidjan", "Bouaké", "Daloa", "Yamoussoukro", "San-Pédro", "Korhogo"];
const COMMUNES = [
  "Cocody",
  "Yopougon",
  "Marcory",
  "Treichville",
  "Plateau",
  "Adjamé",
  "Abobo",
  "Koumassi",
  "Port-Bouët",
  "Attécoubé",
  "Bingerville",
  "Anyama",
];

// Quartiers connus d'Abidjan → leur commune (pour les suggestions).
// Liste extensible librement — garde-la synchronisée avec celle du backend.
const QUARTIERS: Record<string, string> = {
  Blockhaus: "Cocody",
  Riviera: "Cocody",
  Angré: "Cocody",
  "Deux-Plateaux": "Cocody",
  Danga: "Cocody",
  Palmeraie: "Cocody",
  Vallon: "Cocody",
  Bonoumin: "Cocody",
  "M'Pouto": "Cocody",
  Niangon: "Yopougon",
  Sideci: "Yopougon",
  Selmer: "Yopougon",
  Maroc: "Yopougon",
  Koweit: "Yopougon",
  "Toits Rouges": "Yopougon",
  "Zone 4": "Marcory",
  Biétry: "Marcory",
  Anoumabo: "Marcory",
  Remblais: "Marcory",
  "Zone 3": "Treichville",
  Williamsville: "Adjamé",
  Avocatier: "Abobo",
  Dokui: "Abobo",
  Vridi: "Port-Bouët",
  Gonzagueville: "Port-Bouët",
};

// Supprime les accents pour comparer "cocody" et "Cocody" ou "attecoube" et "Attécoubé"
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function SearchBar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [searchValue, setSearchValue] = useState("");
  const [locationValue, setLocationValue] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isLocationFocused, setIsLocationFocused] = useState(false);
  const [results, setResults] = useState<PrestataireResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isNearbyMode, setIsNearbyMode] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
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

  // Recherche débouncée : se déclenche sur le "quoi" ET/OU le "où"
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const quoi = searchValue.trim();
    const ou = locationValue.trim();

    if (quoi.length < 2 && ou.length < 2) {
      setResults([]);
      setIsNearbyMode(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setIsNearbyMode(false);
      try {
        const params = new URLSearchParams();
        params.set("limit", "6");
        if (quoi.length >= 2) params.set("search", quoi);

        if (ou.length >= 2) {
          const ouNorm = normalize(ou);
          const commune = COMMUNES.find((c) => normalize(c).includes(ouNorm));
          const ville = VILLES.find((v) => normalize(v).includes(ouNorm));
          if (commune) params.set("commune", commune);
          else if (ville) params.set("ville", ville);
          else {
            // Quartier ou texte libre : on l'ajoute à la recherche intelligente
            // du backend, qui connaît les quartiers d'Abidjan
            // (ex: "blockhaus" => élargi à toute la commune de Cocody)
            params.set("search", `${quoi} ${ou}`.trim());
          }
        }

        const data = await api.get<SearchResponse>(`/prestataires?${params.toString()}`);
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
  }, [searchValue, locationValue]);

  const handleNearMe = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsSearching(true);
        try {
          const params = new URLSearchParams();
          params.set("lat", pos.coords.latitude.toString());
          params.set("lng", pos.coords.longitude.toString());
          params.set("rayon", "10");
          params.set("limit", "6");

          const data = await api.get<SearchResponse>(
            `/prestataires/proximite?${params.toString()}`
          );
          setResults(data.prestataires);
          setIsNearbyMode(true);
          setLocationValue("Autour de moi");
          setIsSearchFocused(true);
        } catch (err) {
          console.error("Erreur proximité:", err);
          setResults([]);
        } finally {
          setIsSearching(false);
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSelectResult = (id: string) => {
    setSearchValue("");
    setLocationValue("");
    setResults([]);
    setIsNearbyMode(false);
    router.push(`/prestataires/${id}`);
  };

  const handleSelectLocation = (loc: string) => {
    setLocationValue(loc);
    setIsLocationFocused(false);
  };

  // Suggestions de localités filtrées par la saisie : quartiers, communes et villes
  const locationSuggestions: { label: string; badge: string | null }[] = [
    ...Object.entries(QUARTIERS).map(([q, commune]) => ({
      label: q,
      badge: commune,
    })),
    ...COMMUNES.map((c) => ({ label: c, badge: "Abidjan" })),
    ...VILLES.map((v) => ({ label: v, badge: null })),
  ].filter(
    (loc) =>
      locationValue.trim().length === 0 ||
      normalize(loc.label).includes(normalize(locationValue))
  );

  const showResultsDropdown =
    (isSearchFocused || isNearbyMode) &&
    (searchValue.trim().length >= 2 || locationValue.trim().length >= 2 || isNearbyMode);

  const handleLogout = () => {
    localStorage.removeItem("lokevent_token");
    localStorage.removeItem("lokevent_user");
    setUser(null);
    setIsMenuOpen(false);
    window.location.href = "/";
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
    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4 w-full">
      <div className="relative flex-1 md:max-w-3xl order-2 md:order-1">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Champ QUOI */}
          <div className="relative flex-1">
            <Search
              className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                isSearchFocused ? "text-teal-400" : "text-gray-500"
              }`}
            />
            {/* text-base sur mobile pour éviter le zoom automatique iOS (<16px) */}
            <input
              className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 md:py-3 pl-12 pr-4 text-base sm:text-sm outline-none transition-all duration-300 focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 shadow-xl placeholder:text-gray-500 text-white"
              placeholder="Traiteur, DJ, décoration..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />
          </div>

          {/* Champ OÙ */}
          <div className="relative sm:w-44 md:w-52">
            <MapPin
              className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                isLocationFocused ? "text-teal-400" : "text-gray-500"
              }`}
            />
            <input
              className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 md:py-3 pl-11 pr-11 text-base sm:text-sm outline-none transition-all duration-300 focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 shadow-xl placeholder:text-gray-500 text-white"
              placeholder="Où ?"
              value={locationValue}
              onChange={(e) => {
                setLocationValue(e.target.value);
                setIsNearbyMode(false);
              }}
              onFocus={() => {
                setIsLocationFocused(true);
                setIsSearchFocused(true);
              }}
              onBlur={() => setTimeout(() => setIsLocationFocused(false), 200)}
            />
            {/* Bouton géolocalisation — zone tactile élargie sur mobile */}
            <button
              type="button"
              onClick={handleNearMe}
              disabled={isLocating}
              title="Chercher autour de moi"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-500 hover:text-teal-400 hover:bg-teal-400/10 transition-colors disabled:opacity-50"
            >
              <LocateFixed className={`w-4 h-4 ${isLocating ? "animate-pulse text-teal-400" : ""}`} />
            </button>

            {/* Suggestions de localités */}
            <AnimatePresence>
              {isLocationFocused && locationSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full mt-2 left-0 right-0 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-56 md:max-h-64 overflow-y-auto"
                >
                  {locationSuggestions.map((loc) => (
                    <button
                      key={loc.label}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/5 active:bg-white/10 transition-colors flex items-center gap-2"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectLocation(loc.label)}
                    >
                      <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      {loc.label}
                      {loc.badge && (
                        <span className="text-[10px] text-gray-600 ml-auto">{loc.badge}</span>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Résultats de recherche — hauteur limitée avec défilement sur petit écran */}
        <AnimatePresence>
          {showResultsDropdown && !isLocationFocused && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full mt-2 left-0 right-0 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[60vh] overflow-y-auto"
            >
              {isSearching && (
                <div className="px-4 py-3 text-sm text-gray-500">Recherche...</div>
              )}

              {!isSearching && results.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500">
                  {isNearbyMode
                    ? "Aucun prestataire géolocalisé à moins de 10 km."
                    : `Aucun prestataire trouvé${searchValue ? ` pour "${searchValue}"` : ""}${
                        locationValue && !isNearbyMode ? ` à ${locationValue}` : ""
                      }`}
                </div>
              )}

              {!isSearching &&
                results.map((r) => (
                  <button
                    key={r.id}
                    className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-white/5 active:bg-white/10 transition-colors flex items-center justify-between gap-3"
                    onClick={() => handleSelectResult(r.id)}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="truncate">
                        {r.nomEntreprise}
                        <span className="text-gray-500 ml-2 text-xs">
                          {r.categorie.nom} · {r.quartier}
                          {r.commune ? `, ${r.commune}` : ""}
                        </span>
                      </span>
                    </span>
                    {r.distance != null && (
                      <span className="text-xs text-teal-400 font-medium flex-shrink-0">
                        {r.distance} km
                      </span>
                    )}
                  </button>
                ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative flex-shrink-0 order-1 md:order-2 flex justify-end">
        {user ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 px-2.5 md:px-3 py-2 rounded-full bg-white/5 border border-white/10 hover:border-teal-400/50 transition-all hover:bg-white/10"
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
                  className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-xs md:w-72 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="font-medium text-white">
                      {user.prenom} {user.nom}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
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
          <div className="grid grid-cols-2 md:flex items-center gap-2 w-full md:w-auto">
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