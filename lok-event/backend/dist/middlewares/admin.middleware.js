"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = void 0;
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "ADMIN") {
        res.status(403).json({ message: "Accès réservé aux administrateurs" });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
//# sourceMappingURL=admin.middleware.js.map