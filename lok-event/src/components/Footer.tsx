// src/components/Footer.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  MapPin, 
  Phone, 
  Mail, 
  Heart,
  Clock,
  Award,
  Shield,
  ChevronRight
} from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    plateforme: [
      { label: "Accueil", href: "/" },
      { label: "Explorer", href: "/explore" },
      { label: "Devenir Prestataire", href: "/become-provider" },
      { label: "Tarifs", href: "/pricing" },
      { label: "Blog", href: "/blog" },
    ],
    prestataires: [
      { label: "Traiteurs", href: "/explore?category=traiteurs" },
      { label: "Décoration", href: "/explore?category=decoration" },
      { label: "Salles", href: "/explore?category=salles" },
      { label: "Photographie", href: "/explore?category=photographie" },
      { label: "DJ & Musique", href: "/explore?category=dj" },
    ],
    aide: [
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
      { label: "Conditions d'utilisation", href: "/terms" },
      { label: "Politique de confidentialité", href: "/privacy" },
      { label: "Mentions légales", href: "/legal" },
    ],
  };

  const socialLinks = [
    { icon: "📘", href: "https://facebook.com", label: "Facebook" },
    { icon: "📸", href: "https://instagram.com", label: "Instagram" },
    { icon: "🐦", href: "https://twitter.com", label: "Twitter" },
    { icon: "▶️", href: "https://youtube.com", label: "YouTube" },
    { icon: "🔗", href: "https://linkedin.com", label: "LinkedIn" },
  ];

  const partners = [
    { name: "Hotel Ivoire", logo: "🏨" },
    { name: "Palais des Congrès", logo: "🏛️" },
    { name: "Golf Hôtel", logo: "⛳" },
    { name: "Radisson Blu", logo: "🏢" },
  ];

  return (
    <footer className="relative bg-[#0a0a0a] border-t border-white/5 overflow-hidden">
      {/* Effet de glow en arrière-plan */}
      <div className="absolute inset-0 bg-gradient-to-b from-teal-400/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        {/* Top Section - Logo & CTA */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-8 h-8 text-teal-400" />
              <span className="text-2xl font-bold tracking-tight text-white">
                LOK<span className="text-teal-400">EVENT</span>
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-4 max-w-xs">
              L'excellence événementielle en Côte d'Ivoire. 
              Découvrez les meilleurs prestataires pour vos événements.
            </p>
            
            {/* Badges de confiance */}
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

          {/* Liens - Plateforme */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Plateforme
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.plateforme.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Liens - Prestataires */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Prestataires
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.prestataires.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Liens - Aide & Contact */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Aide & Contact
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.aide.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Contact rapide */}
            <div className="mt-4 space-y-2">
              <a 
                href="tel:+2250768756151"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-teal-400 transition-colors"
              >
                <Phone className="w-4 h-4" />
                +225 07 68 75 61 51
              </a>
              <a 
                href="mailto:contact@lokevent.com"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-teal-400 transition-colors"
              >
                <Mail className="w-4 h-4" />
                contact@lokevent.com
              </a>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MapPin className="w-4 h-4" />
                Abidjan, Côte d'Ivoire
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section - Partners & Social */}
        <div className="border-t border-white/5 pt-8 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            {/* Partenaires */}
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                Nos partenaires
              </span>
              <div className="flex items-center gap-4">
                {partners.map((partner, index) => (
                  <span
                    key={index}
                    className="text-2xl opacity-60 hover:opacity-100 transition-opacity cursor-default"
                  >
                    {partner.logo}
                  </span>
                ))}
              </div>
            </div>

            {/* Réseaux sociaux */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider mr-2">
                Suivez-nous
              </span>
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-teal-400 hover:border-teal-400/50 transition-all text-lg"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section - Copyright */}
        <div className="border-t border-white/5 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              © {currentYear} LOKEVENT Prestige. Tous droits réservés.
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <Link href="/terms" className="hover:text-teal-400 transition-colors">
                Conditions
              </Link>
              <span className="w-0.5 h-3 bg-white/10"></span>
              <Link href="/privacy" className="hover:text-teal-400 transition-colors">
                Confidentialité
              </Link>
              <span className="w-0.5 h-3 bg-white/10"></span>
              <Link href="/sitemap" className="hover:text-teal-400 transition-colors">
                Plan du site
              </Link>
            </div>
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