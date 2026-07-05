// components/UserMenu.tsx
"use client";

import Link from "next/link";
import { User, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";

export default function UserMenu() {
  const [user, setUser] = useState(() => {
    if (typeof window !== "undefined") {
      return JSON.parse(localStorage.getItem("user") || "null");
    }
    return null;
  });

  if (!user) {
    return (
      <Link href="/login" className="px-4 py-2 bg-teal-400 text-black rounded-full text-sm font-medium hover:bg-teal-300 transition-colors">
        Se connecter
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {/* Redirection vers le bon dashboard selon le rôle */}
      <Link
        href={user.role === "client" ? "/client" : 
             user.role === "provider" ? "/provider" : 
             "/admin"}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white hover:border-teal-400/50 transition-colors"
      >
        <LayoutDashboard className="w-4 h-4" />
        <span className="text-sm">Dashboard</span>
      </Link>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-teal-400/20 flex items-center justify-center">
          <User className="w-4 h-4 text-teal-400" />
        </div>
        <span className="text-sm text-gray-300">{user.name}</span>
      </div>

      <button
        onClick={() => {
          localStorage.removeItem("user");
          window.location.href = "/";
        }}
        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}