"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireProvider = void 0;
const requireProvider = (req, res, next) => {
    if (!req.user || req.user.role !== "PRESTATAIRE") {
        res.status(403).json({ message: "Accès réservé aux prestataires" });
        return;
    }
    next();
};
exports.requireProvider = requireProvider;
//# sourceMappingURL=provider.middleware.js.map