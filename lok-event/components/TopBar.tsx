"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Sparkles,
  Briefcase, 
  Phone, 
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

export default function TopBar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Accueil", icon: Home },
    { href: "/splash", label: "Splash", icon: Sparkles },
    { href: "/register", label: "Devenir prestataire", icon: Briefcase },
  ];

  return (
    <motion.header 
      className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a] shadow-lg shadow-black/50"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}

    >
      {/* Barre principale : hauteur fixe et maîtrisée */}
      <div className="px-4 md:px-8 h-14 md:h-20 flex items-center justify-between text-[11px] text-gray-400 uppercase tracking-wider">
        {/* Logo / Brand */}
        <Link href="/" className="flex-shrink-0">
          <motion.div whileHover={{ scale: 1.02 }}>
            <Image
             src="/images/logo.svg"
             alt="LOKEVENT"
             width={400}
             height={130}
             className="h-11 md:h-16 w-auto object-contain"
             priority
            />
          </motion.div>
        </Link>

        {/* Navigation - Desktop */}
        <div className="hidden md:flex gap-6 lg:gap-8">
          {navItems.map((item, index) => {
            const actif = pathname === item.href;
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link 
                  href={item.href} 
                  className={`group relative flex items-center gap-2 transition-all duration-300 ${
                    actif 
                      ? 'text-teal-400 font-medium' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <item.icon className={`w-3.5 h-3.5 transition-transform duration-300 ${
                    actif ? 'text-teal-400' : 'text-gray-500'
                  }`} />
                  <span className="relative">
                    {item.label}
                    <motion.span 
                      className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-teal-400"
                      whileHover={{ width: "100%" }}
                      transition={{ duration: 0.3 }}
                    />
                    {actif && (
                      <motion.span 
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-400"
                        layoutId="activeDot"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Contact & Statut - Desktop */}
        <div className="hidden md:flex items-center gap-6">
          <motion.a 
            href="tel:+2250768756151"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
            whileHover={{ scale: 1.05 }}
          >
            <Phone className="w-3.5 h-3.5 text-teal-400 group-hover:rotate-12 transition-transform" />
            <span className="text-[10px]">+225 07 68 75 61 51</span>
          </motion.a>

          <motion.div 
            className="flex items-center gap-2 text-teal-400 px-3 py-1 rounded-full bg-teal-400/10 border border-teal-400/20"
            whileHover={{ 
              scale: 1.05,
              backgroundColor: "rgba(20, 184, 166, 0.2)",
              borderColor: "rgba(20, 184, 166, 0.4)",
            }}
          >
            <span className="relative flex h-2 w-2">
              <motion.span 
                className="absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.75, 0, 0.75],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
            </span>
            <span className="text-[10px] font-medium tracking-wider">CONCIERGE ACTIVE</span>
          </motion.div>
        </div>

        {/* Mobile : appel rapide + burger */}
        <div className="flex md:hidden items-center gap-1">
          <motion.a
            href="tel:+2250768756151"
            className="p-2.5 rounded-full text-teal-400 hover:bg-white/10 active:bg-white/15 transition-colors"
            whileTap={{ scale: 0.9 }}
            title="Appeler"
          >
            <Phone className="w-5 h-5" />
          </motion.a>
          <motion.button 
            className="p-2.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            whileTap={{ scale: 0.9 }}
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>
        </div>
      </div>

      {/* Menu Mobile : DANS le header (pas fixed) => il pousse le contenu
          au lieu de flotter par-dessus, et suit la hauteur réelle de la barre */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            className="md:hidden overflow-hidden bg-[#0a0a0a] border-t border-white/5"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="p-4 space-y-2">
              {navItems.map((item, index) => {
                const actif = pathname === item.href;
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link 
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                        actif 
                          ? 'bg-teal-400/10 text-teal-400 border border-teal-400/20' 
                          : 'text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon className={`w-4 h-4 ${actif ? 'text-teal-400' : ''}`} />
                      <span className="text-sm font-medium normal-case tracking-normal">{item.label}</span>
                      {actif && (
                        <motion.div 
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400"
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </Link>
                  </motion.div>
                );
              })}

              <div className="border-t border-white/5 my-2 pt-3 flex items-center justify-between px-4">
                <a 
                  href="tel:+2250768756151"
                  className="flex items-center gap-3 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Phone className="w-4 h-4 text-teal-400" />
                  <span className="text-xs">+225 07 68 75 61 51</span>
                </a>

                <div className="flex items-center gap-2 text-teal-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400"></span>
                  </span>
                  <span className="text-[10px] font-medium tracking-wider">CONCIERGE</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}