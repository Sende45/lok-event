"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_controller_1 = require("../controllers/auth.controller");
const motDePasse_controller_1 = require("../controllers/motDePasse.controller");
const compte_controller_1 = require("../controllers/compte.controller");
const prestataire_controller_1 = require("../controllers/prestataire.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rateLimit_middleware_1 = require("../middlewares/rateLimit.middleware");
// Mot de passe oublié : 5 demandes de code / heure par IP (évite le spam d'emails)
const demandeCodeLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { message: "Trop de demandes de code. Réessayez dans une heure." },
    standardHeaders: true,
    legacyHeaders: false,
});
// Saisie du code : 15 essais / 15 min par IP (le code lui-même est limité à 5 essais)
const reinitialisationLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: { message: "Trop de tentatives. Réessayez dans 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});
const router = (0, express_1.Router)();
router.post("/register", rateLimit_middleware_1.registerLimiter, auth_controller_1.register);
router.post("/login", rateLimit_middleware_1.loginLimiter, auth_controller_1.login);
router.get("/me", auth_middleware_1.protect, auth_controller_1.getMe);
router.post("/mot-de-passe-oublie", demandeCodeLimiter, motDePasse_controller_1.demanderCode);
router.post("/reinitialiser-mot-de-passe", reinitialisationLimiter, motDePasse_controller_1.reinitialiserMotDePasse);
// Gestion de son propre compte (tous les rôles)
router.put("/profil", auth_middleware_1.protect, compte_controller_1.modifierProfil);
router.post("/avatar", auth_middleware_1.protect, prestataire_controller_1.uploadMiddleware.single("image"), prestataire_controller_1.uploadPhotoToImgbb);
router.put("/mot-de-passe", auth_middleware_1.protect, rateLimit_middleware_1.loginLimiter, compte_controller_1.changerMotDePasse);
router.delete("/compte", auth_middleware_1.protect, rateLimit_middleware_1.loginLimiter, compte_controller_1.supprimerCompte);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map