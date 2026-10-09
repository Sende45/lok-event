// src/hooks/useAuth.ts
"use client";

import { useState, useEffect } from "react";
import { deconnecter } from "@/lib/session";

interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  avatar?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem("lokevent_user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error("Erreur lecture user localStorage", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const logout = () => {
    setUser(null);
    deconnecter("/login"); // efface aussi le cookie httpOnly côté API
  };

  return {
    user,
    isLoading,
    logout,
  };
}