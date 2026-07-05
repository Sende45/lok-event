"use client";

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
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-teal-400/30 border-t-teal-400 rounded-full animate-spin"></div>
    </div>
  );
}

export default function DashboardRouter() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const userData = localStorage.getItem('user');
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Veuillez vous connecter</p>
          <a href="/login" className="px-6 py-3 bg-teal-400 text-black font-semibold rounded-lg hover:bg-teal-300 transition-colors">
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  // Redirection selon le rôle
  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'provider':
      return <ProviderDashboard />;
    case 'client':
      return <ClientDashboard />;
    default:
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <p className="text-red-400">Rôle non reconnu</p>
        </div>
      );
  }
}