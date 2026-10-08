import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, getMe } from "../controllers/auth.controller";
import { demanderCode, reinitialiserMotDePasse } from "../controllers/motDePasse.controller";
import { modifierProfil, changerMotDePasse, supprimerCompte } from "../controllers/compte.controller";
import { uploadMiddleware, uploadPhotoToImgbb } from "../controllers/prestataire.controller";
import { protect } from "../middlewares/auth.middleware";
import { loginLimiter, registerLimiter } from "../middlewares/rateLimit.middleware";

// Mot de passe oublié : 5 demandes de code / heure par IP (évite le spam d'emails)
const demandeCodeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Trop de demandes de code. Réessayez dans une heure." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Saisie du code : 15 essais / 15 min par IP (le code lui-même est limité à 5 essais)
const reinitialisationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { message: "Trop de tentatives. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();
router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.get("/me", protect, getMe);
router.post("/mot-de-passe-oublie", demandeCodeLimiter, demanderCode);
router.post("/reinitialiser-mot-de-passe", reinitialisationLimiter, reinitialiserMotDePasse);

// Gestion de son propre compte (tous les rôles)
router.put("/profil", protect, modifierProfil);
router.post("/avatar", protect, uploadMiddleware.single("image"), uploadPhotoToImgbb);
router.put("/mot-de-passe", protect, loginLimiter, changerMotDePasse);
router.delete("/compte", protect, loginLimiter, supprimerCompte);
export default router;