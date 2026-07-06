import rateLimit from "express-rate-limit";

// Limite stricte sur les tentatives de connexion : 10 essais / 15 min par IP.
// Protège contre le brute-force de mots de passe.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Trop de tentatives de connexion. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limite un peu plus large sur l'inscription : 5 comptes créés / heure par IP.
// Évite la création massive de faux comptes.
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Trop de tentatives d'inscription. Réessayez plus tard." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limite générale sur toute l'API, plus permissive, pour éviter les abus massifs.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: "Trop de requêtes. Réessayez plus tard." },
  standardHeaders: true,
  legacyHeaders: false,
});