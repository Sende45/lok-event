// components/UserMenu.tsx
"use client";

import Link from "next/link";
import { User, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";

interface StoredUser {
  prenom: string;
  nom: string;
  role: "ADMIN" | "PRESTATAIRE" | "CLIENT";
}

export default function UserMenu() {
  // ⚠️ Aligné sur les clés utilisées partout ailleurs : lokevent_user / lokevent_token
  // (l'ancienne version lisait "user" avec des rôles en minuscules — jamais rempli)
  const [user] = useState<StoredUser | null>(() => {
    if (typeof window !== "undefined") {
      try {
        return JSON.parse(localStorage.getItem("lokevent_user") || "null");
      } catch {
        return null;
      }
    }
    return null;
  });

  if (!user) {
    return (
      <Link
        href="/login"
        className="px-3 md:px-4 py-2 bg-teal-400 text-black rounded-full text-sm font-medium hover:bg-teal-300 transition-colors whitespace-nowrap"
      >
        Se connecter
      </Link>
    );
  }

  const dashboardHref =
    user.role === "CLIENT"
      ? "/dashboard/client"
      : user.role === "PRESTATAIRE"
      ? "/provider"
      : "/admin";

  return (
    <div className="flex items-center gap-2 md:gap-4">
      {/* Sur mobile : icône seule (zone tactile compacte). Texte à partir de sm */}
      <Link
        href={dashboardHref}
        className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white hover:border-teal-400/50 transition-colors"
        title="Dashboard"
      >
        <LayoutDashboard className="w-4 h-4" />
        <span className="text-sm hidden sm:inline">Dashboard</span>
      </Link>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-teal-400/20 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-teal-400" />
        </div>
        <span className="text-sm text-gray-300 hidden md:inline max-w-[120px] truncate">
          {user.prenom}
        </span>
      </div>

      <button
        onClick={() => {
          localStorage.removeItem("lokevent_token");
          localStorage.removeItem("lokevent_user");
          window.location.href = "/";
        }}
        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
        title="Déconnexion"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}