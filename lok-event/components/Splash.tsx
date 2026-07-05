"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, MapPin, Award, Star } from 'lucide-react';

interface SplashProps {
  title?: React.ReactNode;
  subtitle?: string;
  description?: string;
  stats?: string[];
  ctaText?: string;
}

export default function Splash({ 
  title = <>AKWABA </>, 
  subtitle = "✨ Destination d'Élite", 
  description = "Découvrez l'excellence des traiteurs, de la décoration, des salles prestigieuses et des photographes d'élite en Côte d'Ivoire.",
  stats = ["42 Traiteurs d'Élite", "Service Concierge Luxe", "100% Vérifié"],
  ctaText = "EXPLORER LES OFFRES"
}: SplashProps) {
  return (
    <section className="relative w-full h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0a]">
      {/* Background avec animation */}
      <motion.div 
        className="absolute inset-0 bg-[url('/images/abidjan-night.png')] bg-cover bg-center"
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 10, ease: "easeOut" }}
      >
        {/* Overlay avec gradient dynamique */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-[#0a0a0a]" />
        
        {/* Glow effect animé */}
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-teal-400/10 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Particules flottantes */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-teal-400/20 rounded-full"
              initial={{
                x: Math.random() * 100 + "%",
                y: Math.random() * 100 + "%",
              }}
              animate={{
                y: [null, -100, -200],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 5,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: "linear",
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Content Layer */}
      <div className="relative z-10 text-center space-y-8 px-4 max-w-5xl">
        {/* Subtitle avec icône */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-xl px-6 py-2 rounded-full border border-white/10"
        >
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span className="text-teal-400 text-[11px] uppercase tracking-[0.3em] font-medium">
            {subtitle}
          </span>
        </motion.div>
        
        {/* Title avec animation */}
        <motion.h1 
          className="text-6xl md:text-8xl lg:text-9xl font-bold text-white tracking-tighter leading-[0.85]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {title}
        </motion.h1>
        
        {/* Description */}
        <motion.p 
          className="text-gray-300 text-base md:text-lg max-w-2xl mx-auto font-light leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {description}
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Link href="/">
            <motion.button 
              className="group relative px-10 py-4 bg-gradient-to-r from-teal-400 to-teal-500 text-black font-bold rounded-full transition-all duration-300 flex items-center gap-3 mx-auto text-sm tracking-wider overflow-hidden"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 0 40px rgba(20, 184, 166, 0.3)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="relative z-10">{ctaText}</span>
              <motion.span
                className="relative z-10"
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-5 h-5" />
              </motion.span>
              
              {/* Ripple effect au survol */}
              <motion.span 
                className="absolute inset-0 bg-white/20"
                initial={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </Link>
        </motion.div>

        {/* Indicateur de scroll */}
        <motion.div
          className="absolute bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <span className="text-white/30 text-[10px] uppercase tracking-[0.3em] text-xs">
            Scroll
          </span>
          <motion.div
            className="w-0.5 h-12 bg-gradient-to-b from-teal-400/50 to-transparent"
            animate={{
              scaleY: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      </div>

      {/* Footer Stats avec animations */}
      <motion.div 
        className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 md:gap-16 text-[10px] text-gray-400 uppercase tracking-[0.2em] px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        {stats.map((stat, i) => (
          <motion.span 
            key={i} 
            className="flex items-center gap-2"
            whileHover={{ color: "#14B8A6", scale: 1.05 }}
          >
            <motion.span 
              className="w-1.5 h-1.5 rounded-full bg-teal-400"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.5,
              }}
            />
            {stat}
          </motion.span>
        ))}
      </motion.div>

      {/* Badge de luxe en haut à droite */}
      <motion.div
        className="absolute top-8 right-8 z-20 hidden md:flex items-center gap-2 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/5"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Award className="w-4 h-4 text-teal-400" />
        <span className="text-white/60 text-[10px] uppercase tracking-[0.1em]">Premium</span>
      </motion.div>

      {/* Badge de localisation en haut à gauche */}
      <motion.div
        className="absolute top-8 left-8 z-20 hidden md:flex items-center gap-2 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/5"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        <MapPin className="w-4 h-4 text-teal-400" />
        <span className="text-white/60 text-[10px] uppercase tracking-[0.1em]">Côte d'Ivoire</span>
      </motion.div>

      {/* Étoiles flottantes décoratives */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
              opacity: 0,
              scale: 0,
            }}
            animate={{
              opacity: [0, 0.5, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut",
            }}
          >
            <Star className={`w-${2 + Math.floor(Math.random() * 3)} h-${2 + Math.floor(Math.random() * 3)} text-teal-400/30`} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}