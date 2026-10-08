"use client";
// src/app/mot-de-passe-oublie/page.tsx — réinitialisation du mot de passe en 2 étapes
// 1. email → code à 6 chiffres envoyé par email   2. code + nouveau mot de passe

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, KeyRound, Lock, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

const champ =
  "w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors";

function MotDePasseOublieContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [etape, setEtape] = useState<"email" | "code" | "fini">("email");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [info, setInfo] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const envoyerCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      const res = await api.post<{ message: string }>("/auth/mot-de-passe-oublie", {
        email: email.trim().toLowerCase(),
      });
      setInfo(res.message);
      setEtape("code");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setChargement(false);
    }
  };

  const valider = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    if (motDePasse.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setChargement(true);
    try {
      await api.post("/auth/reinitialiser-mot-de-passe", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        nouveauMotDePasse: motDePasse,
      });
      setEtape("fini");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8">
          {etape === "fini" ? (
            <div className="text-center flex flex-col items-center gap-4">
              <CheckCircle className="w-16 h-16 text-teal-400" />
              <h1 className="text-2xl font-bold text-white">Mot de passe modifié</h1>
              <p className="text-gray-400 text-sm">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
              <button
                onClick={() => router.push("/login")}
                className="w-full py-3 bg-gradient-to-r from-teal-400 to-teal-500 text-black font-bold rounded-lg"
              >
                Se connecter
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-teal-400/10 flex items-center justify-center mx-auto mb-4">
                  {etape === "email" ? (
                    <KeyRound className="w-7 h-7 text-teal-400" />
                  ) : (
                    <Mail className="w-7 h-7 text-teal-400" />
                  )}
                </div>
                <h1 className="text-2xl font-bold text-white">
                  {etape === "email" ? "Mot de passe oublié ?" : "Vérifiez vos emails"}
                </h1>
                <p className="text-gray-400 text-sm mt-2">
                  {etape === "email"
                    ? "Saisissez l'email de votre compte : nous vous enverrons un code à 6 chiffres."
                    : info}
                </p>
              </div>

              {erreur && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {erreur}
                </div>
              )}

              {etape === "email" ? (
                <form onSubmit={envoyerCode} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vous@exemple.com"
                      className={champ}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={chargement}
                    className="w-full py-3 bg-gradient-to-r from-teal-400 to-teal-500 text-black font-bold rounded-lg disabled:opacity-50"
                  >
                    {chargement ? "Envoi..." : "Recevoir un code"}
                  </button>
                </form>
              ) : (
                <form onSubmit={valider} className="space-y-4">
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    className="w-full py-3 bg-white/5 border border-white/10 rounded-lg text-white text-center text-2xl font-bold tracking-[0.5em] placeholder-gray-600 focus:border-teal-400/50 focus:outline-none"
                    required
                    pattern="\d{6}"
                  />
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="password"
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      placeholder="Nouveau mot de passe (8 caractères min.)"
                      className={champ}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="password"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                      placeholder="Confirmer le mot de passe"
                      className={champ}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={chargement}
                    className="w-full py-3 bg-gradient-to-r from-teal-400 to-teal-500 text-black font-bold rounded-lg disabled:opacity-50"
                  >
                    {chargement ? "Vérification..." : "Changer mon mot de passe"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCode("");
                      setErreur("");
                      setEtape("email");
                    }}
                    className="w-full text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Je n&apos;ai pas reçu de code
                  </button>
                </form>
              )}

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function MotDePasseOubliePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505]" />}>
      <MotDePasseOublieContent />
    </Suspense>
  );
}