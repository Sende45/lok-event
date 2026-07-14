"use client";

// frontend/src/app/dashboard/page.tsx (routeur de dashboards)
//
// ⚠️ Deux bugs corrigés au passage (au-delà du responsive) :
//   1. localStorage.getItem('user') → l'app stocke sous "lokevent_user"
//      (c'est la clé que tes handleLogout suppriment). On lit les deux
//      par sécurité.
//   2. Les rôles étaient comparés en minuscules ('admin', 'provider')
//      alors que le backend renvoie "ADMIN", "PRESTATAIRE", "CLIENT"
//      → tout le monde tombait sur "Rôle non reconnu". On normalise.

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { User } from '@/types';

// Import dynamique pour éviter les erreurs
const AdminDashboard = dynamic(() => import('@/components/dashboard/AdminDashboard'), {
  ssr: false,
  loading: () => <LoadingSpinner />
});

const ProviderDashboard = dynamic(() => import('@/components/dashboard/ProviderDashboard'), {
  ssr: false,
  loading: () => <LoadingSpinner />
});

const ClientDashboard = dynamic(() => import('@/components/dashboard/ClientDashboard'), {
  ssr: false,
  loading: () => <LoadingSpinner />
});

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-12 h-12 border-4 border-teal-400/30 border-t-teal-400 rounded-full animate-spin"></div>
    </div>
  );
}

// Normalise le rôle quelle que soit sa forme ("PRESTATAIRE", "provider",
// "Client"...) vers l'un de : ADMIN | PRESTATAIRE | CLIENT | null
function normaliserRole(role: unknown): "ADMIN" | "PRESTATAIRE" | "CLIENT" | null {
  if (typeof role !== "string") return null;
  const r = role.toUpperCase();
  if (r === "ADMIN") return "ADMIN";
  if (r === "PRESTATAIRE" || r === "PROVIDER") return "PRESTATAIRE";
  if (r === "CLIENT") return "CLIENT";
  return null;
}

export default function DashboardRouter() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      // Clé principale de l'app + ancienne clé en secours
      const userData =
        localStorage.getItem('lokevent_user') || localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center w-full max-w-xs sm:max-w-sm">
          <p className="text-gray-400 mb-4">Veuillez vous connecter</p>
          {/* Pleine largeur sur mobile : plus facile à toucher */}
          <a
            href="/login"
            className="block w-full sm:w-auto sm:inline-block px-6 py-3 bg-teal-400 text-black font-semibold rounded-lg hover:bg-teal-300 active:bg-teal-500 transition-colors"
          >
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  // Redirection selon le rôle (normalisé)
  switch (normaliserRole(user.role)) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'PRESTATAIRE':
      return <ProviderDashboard />;
    case 'CLIENT':
      return <ClientDashboard />;
    default:
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
          <div className="text-center w-full max-w-xs sm:max-w-sm">
            <p className="text-red-400 mb-4">Rôle non reconnu</p>
            <a
              href="/login"
              className="block w-full sm:w-auto sm:inline-block px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/15 transition-colors"
            >
              Se reconnecter
            </a>
          </div>
        </div>
      );
  }
}