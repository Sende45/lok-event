"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutAll = exports.getMe = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
// La tokenVersion est embarquée dans chaque JWT : le middleware protect la
// compare à celle en base à chaque requête. Incrémenter la version en base
// tue instantanément TOUS les tokens existants du compte (vol de session,
// déconnexion globale, bannissement ciblé...).
const generateToken = (id, role, tokenVersion) => jsonwebtoken_1.default.sign({ id, role, tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: "7d",
});
// Seuls ces rôles peuvent être choisis via l'inscription publique.
// ADMIN ne peut JAMAIS être créé par cette route — uniquement via le script de seed.
const ROLES_AUTORISES_A_INSCRIPTION = ["CLIENT", "PRESTATAIRE"];
const register = async (req, res) => {
    try {
        const { nom, prenom, email, motDePasse, telephone, role } = req.body;
        // On ignore toute valeur de "role" qui ne serait pas explicitement autorisée.
        // Si le champ est absent, invalide, ou vaut "ADMIN", on retombe sur CLIENT.
        const roleFinal = ROLES_AUTORISES_A_INSCRIPTION.includes(role) ? role : "CLIENT";
        const existe = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existe) {
            res.status(400).json({ message: "Email déjà utilisé" });
            return;
        }
        const hash = await bcryptjs_1.default.hash(motDePasse, 12);
        const user = await prisma_1.prisma.user.create({
            data: { nom, prenom, email, motDePasse: hash, telephone, role: roleFinal },
        });
        res.status(201).json({
            token: generateToken(user.id, user.role, user.tokenVersion),
            user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role },
        });
    }
    catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, motDePasse } = req.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user || !(await bcryptjs_1.default.compare(motDePasse, user.motDePasse))) {
            res.status(401).json({ message: "Email ou mot de passe incorrect" });
            return;
        }
        res.json({
            token: generateToken(user.id, user.role, user.tokenVersion),
            user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role },
        });
    }
    catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, nom: true, prenom: true, email: true, telephone: true, role: true, avatar: true },
        });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.getMe = getMe;
// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/logout-all — "Se déconnecter de tous les appareils"
// Incrémente la tokenVersion : tous les JWT existants de ce compte (y compris
// celui utilisé pour cet appel) deviennent immédiatement invalides.
// Cas d'usage : l'utilisateur suspecte un vol de session, un appareil perdu,
// un ordinateur partagé... Route à protéger avec le middleware protect.
// ─────────────────────────────────────────────────────────────────────────────
const logoutAll = async (req, res) => {
    try {
        await prisma_1.prisma.user.update({
            where: { id: req.user.id },
            data: { tokenVersion: { increment: 1 } },
        });
        res.json({
            message: "Vous avez été déconnecté de tous les appareils. Reconnectez-vous pour continuer.",
        });
    }
    catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.logoutAll = logoutAll;
//# sourceMappingURL=auth.controller.js.map