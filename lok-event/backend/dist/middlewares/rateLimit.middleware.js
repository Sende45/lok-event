"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalLimiter = exports.registerLimiter = exports.loginLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Limite stricte sur les tentatives de connexion : 10 essais / 15 min par IP.
// Protège contre le brute-force de mots de passe.
exports.loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: "Trop de tentatives de connexion. Réessayez dans 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});
// Limite un peu plus large sur l'inscription : 5 comptes créés / heure par IP.
// Évite la création massive de faux comptes.
exports.registerLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { message: "Trop de tentatives d'inscription. Réessayez plus tard." },
    standardHeaders: true,
    legacyHeaders: false,
});
// Limite générale sur toute l'API, plus permissive, pour éviter les abus massifs.
exports.globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { message: "Trop de requêtes. Réessayez plus tard." },
    standardHeaders: true,
    legacyHeaders: false,
});
//# sourceMappingURL=rateLimit.middleware.js.map