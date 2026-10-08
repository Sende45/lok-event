"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/premium.routes.ts
const express_1 = require("express");
const premium_controller_1 = require("../controllers/premium.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// ── Public ──────────────────────────────────────────────────────────────────
router.get("/packs", premium_controller_1.getPacks);
// ── Utilisateur connecté (CLIENT ou PRESTATAIRE) ────────────────────────────
router.get("/statut", auth_middleware_1.protect, premium_controller_1.getMonStatut);
router.post("/souscrire", auth_middleware_1.protect, premium_controller_1.souscrire);
// ── ADMIN (le contrôle du rôle est fait dans le contrôleur) ─────────────────
router.get("/demandes", auth_middleware_1.protect, premium_controller_1.getDemandes);
router.patch("/demandes/:id/valider", auth_middleware_1.protect, premium_controller_1.validerDemande);
router.patch("/demandes/:id/refuser", auth_middleware_1.protect, premium_controller_1.refuserDemande);
router.patch("/utilisateurs/:userId/desactiver", auth_middleware_1.protect, premium_controller_1.desactiverPremium);
router.post("/annonce", auth_middleware_1.protect, premium_controller_1.envoyerAnnoncePremium);
exports.default = router;
//# sourceMappingURL=premium.routes.js.map