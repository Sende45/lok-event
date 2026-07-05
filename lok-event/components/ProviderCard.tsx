"use client";

import { MapPin, Star, Heart, MessageCircle, Info } from "lucide-react";
import { Provider } from "../types/provider";
import Image from "next/image";
import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const TEAL_COLOR = "#14B8A6";
const TEAL_BORDER = "rgba(20, 184, 166, 0.6)";

export default function ProviderCard({
  p,
  initialFavorite = false,
}: {
  p: Provider;
  initialFavorite?: boolean;
}) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const token = localStorage.getItem("lokevent_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setIsToggling(true);
    try {
      if (isFavorite) {
        await api.delete(`/favoris/${p.id}`);
        setIsFavorite(false);
      } else {
        await api.post("/favoris", { prestataireId: p.id });
        setIsFavorite(true);
      }
    } catch (err) {
      console.error("Erreur favori:", err);
    } finally {
      setIsToggling(false);
    }
  };

  const handleContact = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const number = p.whatsapp || p.telephone;
    if (!number) return;

    const cleaned = number.replace(/[^0-9+]/g, "");
    const message = encodeURIComponent(
      `Bonjour, je vous contacte via LOKEVENT concernant vos services de ${p.name}.`
    );
    window.open(`https://wa.me/${cleaned.replace("+", "")}?text=${message}`, "_blank");
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/prestataires/${p.id}`);
  };

  const hasContact = Boolean(p.whatsapp || p.telephone);

  return (
    <motion.article
      whileHover={{ y: -16, scale: 1.02, transition: { duration: 0.4, ease: "easeOut" } }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="group relative will-change-transform cursor-pointer"
      onClick={handleViewDetails}
    >
      <motion.div
        className="absolute -inset-0.5 bg-gradient-to-tr from-teal-400 to-teal-600 rounded-[2rem] pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 0.3, scale: 1.03, transition: { duration: 0.5 } }}
      />

      <motion.div
        className="relative bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden shadow-lg"
        whileHover={{
          borderColor: TEAL_BORDER,
          backgroundColor: "#0a1a18",
          boxShadow: "0 20px 60px rgba(20, 184, 166, 0.2)",
          transition: { duration: 0.3 },
        }}
      >
        <div className="h-64 relative overflow-hidden">
          <motion.div className="w-full h-full" whileHover={{ scale: 1.08 }} transition={{ duration: 0.6 }}>
            <Image
              src={p.image || "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800"}
              alt={p.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
            />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-10" />

          <motion.button
            className="absolute top-4 right-4 z-20 p-2.5 bg-black/50 backdrop-blur-xl rounded-full border border-white/10 transition-all duration-300 disabled:opacity-50"
            whileHover={{
              backgroundColor: TEAL_COLOR,
              borderColor: TEAL_COLOR,
              scale: 1.1,
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleFavorite}
            disabled={isToggling}
          >
            <Heart
              className={`w-4 h-4 transition-colors duration-300 ${
                isFavorite ? "text-red-500 fill-red-500" : "text-white"
              }`}
            />
          </motion.button>
        </div>

        <div className="p-7">
          <div className="flex justify-between items-start mb-3">
            <motion.h4 className="font-bold text-lg text-white transition-colors duration-300" whileHover={{ color: TEAL_COLOR }}>
              {p.name}
            </motion.h4>
            <motion.div
              className="flex items-center gap-1 text-[11px] bg-teal-400/10 px-2 py-0.5 rounded-md border border-teal-400/20"
              whileHover={{
                backgroundColor: "rgba(20, 184, 166, 0.2)",
                borderColor: "rgba(20, 184, 166, 0.4)",
                scale: 1.05,
                transition: { duration: 0.2 },
              }}
            >
              <Star className="w-3 h-3 text-teal-400 fill-teal-400" />
              <span className="text-teal-400 font-bold">{p.rating}</span>
            </motion.div>
          </div>

          <div className="flex items-center gap-2 text-gray-500 text-xs mb-6 font-medium">
            <MapPin className="w-3.5 h-3.5 text-teal-400" />
            {p.location}
          </div>

          <div className="border-t border-white/10 pt-5">
            <p className="font-mono text-sm font-semibold tracking-wider text-white mb-3">
              {p.price.toLocaleString()} FCFA
            </p>

            <div className="flex gap-2">
              <motion.button
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300"
                whileHover={{
                  backgroundColor: TEAL_COLOR,
                  color: "#000000",
                  borderColor: TEAL_COLOR,
                  scale: 1.02,
                  transition: { duration: 0.2 },
                }}
                whileTap={{ scale: 0.95 }}
                onClick={handleViewDetails}
              >
                <Info className="w-3.5 h-3.5" />
                Détails
              </motion.button>

              {hasContact ? (
                <motion.button
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300"
                  whileHover={{
                    backgroundColor: "#25D366",
                    color: "#000000",
                    borderColor: "#25D366",
                    scale: 1.02,
                    boxShadow: "0 4px 20px rgba(37, 211, 102, 0.4)",
                    transition: { duration: 0.2 },
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleContact}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Contacter
                </motion.button>
              ) : (
                <span className="flex-1 flex items-center justify-center text-[10px] text-gray-600 uppercase tracking-wider">
                  Contact indisponible
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.article>
  );
}