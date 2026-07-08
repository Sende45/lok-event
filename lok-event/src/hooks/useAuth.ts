// src/hooks/useAuth.ts
"use client";

import { useState, useEffect } from "react";

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
    localStorage.removeItem("lokevent_token");
    localStorage.removeItem("lokevent_user");
    setUser(null);
    window.location.href = "/login";
  };

  return {
    user,
    isLoading,
    logout,
  };
}