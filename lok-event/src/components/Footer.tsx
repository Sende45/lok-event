"use client";

import Link from "next/link";
import {
  Sparkles,
  MapPin,
  Phone,
  Heart,
  Clock,
  Award,
  Shield,
} from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-[#0a0a0a] border-t border-white/5 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-teal-400/5 via-transparent to-transparent pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-8 h-8 text-teal-400" />
              <span className="text-2xl font-bold tracking-tight text-white">
                LOK<span className="text-teal-400">EVENT</span>
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-4 max-w-xs">
              L'excellence événementielle en Côte d'Ivoire. Découvrez les meilleurs prestataires pour vos événements.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-400/10 border border-teal-400/20 rounded-full text-[10px] text-teal-400">
                <Award className="w-3 h-3" />
                Prestige
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-400/10 border border-green-400/20 rounded-full text-[10px] text-green-400">
                <Shield className="w-3 h-3" />
                Vérifié
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-400/10 border border-blue-400/20 rounded-full text-[10px] text-blue-400">
                <Clock className="w-3 h-3" />
                24/7
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Plateforme
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Devenir prestataire
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Se connecter
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Contact
            </h3>
            <div className="space-y-2">
              <a href="tel:+2250768756151" className="flex items-center gap-2 text-sm text-gray-400 hover:text-teal-400 transition-colors">
                <Phone className="w-4 h-4" />
                +225 07 68 75 61 51
              </a>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MapPin className="w-4 h-4" />
                Abidjan, Côte d'Ivoire
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              © {currentYear} LOKEVENT Prestige. Tous droits réservés.
            </p>
            <div className="flex items-center gap-1 text-[10px] text-gray-600">
              <Heart className="w-3 h-3 text-teal-400 fill-teal-400" />
              Fait avec passion en Côte d'Ivoire
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}