"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  User,
  Phone,
  CheckCircle,
  AlertCircle,
  Search,
  Briefcase,
} from "lucide-react";
import { api } from "@/lib/api";
import { AuthResponse } from "@/types/user";

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    password: "",
    confirmPassword: "",
    role: "CLIENT" as "CLIENT" | "PRESTATAIRE",
    acceptTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (name === "password") {
      calculatePasswordStrength(value);
    }
  };

  const handleRoleSelect = (role: "CLIENT" | "PRESTATAIRE") => {
    setFormData((prev) => ({ ...prev, role }));
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    setPasswordStrength(strength);
  };

  const getPasswordStrengthLabel = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return { label: "Très faible", color: "bg-red-500" };
      case 2:
        return { label: "Faible", color: "bg-orange-500" };
      case 3:
        return { label: "Moyen", color: "bg-yellow-500" };
      case 4:
        return { label: "Fort", color: "bg-green-500" };
      case 5:
        return { label: "Très fort", color: "bg-emerald-500" };
      default:
        return { label: "", color: "bg-gray-500" };
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setIsLoading(false);
      return;
    }

    if (!formData.acceptTerms) {
      setError("Vous devez accepter les conditions d'utilisation");
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.post<AuthResponse>("/auth/register", {
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        motDePasse: formData.password,
        telephone: formData.telephone,
        role: formData.role,
      });

      localStorage.setItem("lokevent_token", data.token);
      localStorage.setItem("lokevent_user", JSON.stringify(data.user));

      setSuccess(true);

      setTimeout(() => {
        const redirectPath =
          data.user.role === "PRESTATAIRE" ? "/provider/setup" : "/dashboard/client";
        router.push(redirectPath);
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue. Veuillez réessayer."
      );
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <CheckCircle className="w-20 h-20 text-teal-400 mx-auto mb-4" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">Inscription réussie !</h2>
          <p className="text-gray-400">Redirection...</p>
          <div className="mt-4 w-12 h-12 border-4 border-teal-400/30 border-t-teal-400 rounded-full animate-spin mx-auto"></div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-400/5 via-transparent to-teal-400/5" />

      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full bg-teal-400/10 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.button
        onClick={() => router.push("/")}
        className="absolute top-8 left-8 z-20 flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 group"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm">Retour</span>
      </motion.button>

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="inline-flex items-center gap-2 mb-2"
            >
              <Sparkles className="w-8 h-8 text-teal-400" />
              <span className="text-3xl font-bold tracking-tight text-white">
                LOK<span className="text-teal-400">EVENT</span>
              </span>
            </motion.div>
            <p className="text-gray-400 text-sm">Créez votre compte</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-2">Je suis</label>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  type="button"
                  onClick={() => handleRoleSelect("CLIENT")}
                  whileTap={{ scale: 0.97 }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
                    formData.role === "CLIENT"
                      ? "bg-teal-400/10 border-teal-400 text-teal-400"
                      : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <Search className="w-5 h-5" />
                  <div className="text-center">
                    <p className="text-sm font-semibold">Client</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Je cherche des prestataires</p>
                  </div>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => handleRoleSelect("PRESTATAIRE")}
                  whileTap={{ scale: 0.97 }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
                    formData.role === "PRESTATAIRE"
                      ? "bg-teal-400/10 border-teal-400 text-teal-400"
                      : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <Briefcase className="w-5 h-5" />
                  <div className="text-center">
                    <p className="text-sm font-semibold">Prestataire</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Je propose mes services</p>
                  </div>
                </motion.button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Prénom</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleChange}
                    placeholder="Jean"
                    className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Nom</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  placeholder="Koussi"
                  className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="exemple@lokevent.com"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="tel"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  placeholder="+225 07 68 75 61 51"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {formData.password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 h-1.5">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-full transition-all ${
                          i < passwordStrength ? getPasswordStrengthLabel().color : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Force : {getPasswordStrengthLabel().label}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-400/50 focus:outline-none transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="w-4 h-4 mt-1 bg-white/5 border border-white/10 rounded checked:bg-teal-400 checked:border-teal-400"
                required
              />
              <label className="text-sm text-gray-400">
                J'accepte les{" "}
                <Link href="/terms" className="text-teal-400 hover:text-teal-300 transition-colors">
                  conditions d'utilisation
                </Link>{" "}
                et la{" "}
                <Link href="/privacy" className="text-teal-400 hover:text-teal-300 transition-colors">
                  politique de confidentialité
                </Link>
              </label>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-teal-400 to-teal-500 text-black font-bold rounded-lg hover:shadow-[0_0_30px_rgba(20,184,166,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Inscription en cours...
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Créer mon compte
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Déjà un compte ?{" "}
              <Link href="/login" className="text-teal-400 hover:text-teal-300 transition-colors font-medium">
                Se connecter
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          © 2026 LOKEVENT Prestige. Tous droits réservés.
        </p>
      </motion.div>
    </div>
  );
}