"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/app.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const prisma_1 = require("./lib/prisma");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const prestataire_routes_1 = __importDefault(require("./routes/prestataire.routes"));
const categorie_routes_1 = __importDefault(require("./routes/categorie.routes"));
const reservation_routes_1 = __importDefault(require("./routes/reservation.routes"));
const avis_routes_1 = __importDefault(require("./routes/avis.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const tag_routes_1 = __importDefault(require("./routes/tag.routes"));
const favori_routes_1 = __importDefault(require("./routes/favori.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const message_routes_1 = __importDefault(require("./routes/message.routes"));
const disponibilite_routes_1 = __importDefault(require("./routes/disponibilite.routes"));
const service_routes_1 = __importDefault(require("./routes/service.routes"));
const premium_routes_1 = __importDefault(require("./routes/premium.routes"));
const parametre_routes_1 = __importDefault(require("./routes/parametre.routes"));
const publicite_routes_1 = __importDefault(require("./routes/publicite.routes"));
const rateLimit_middleware_1 = require("./middlewares/rateLimit.middleware");
const app = (0, express_1.default)();
app.set("trust proxy", 1);
// En-têtes de sécurité HTTP (X-Content-Type-Options, HSTS, X-Frame-Options,
// etc.). L'API ne sert que du JSON : la politique CSP par défaut de helmet
// est faite pour des pages HTML et n'a pas de sens ici — on la désactive
// pour éviter tout effet de bord, tout le reste de helmet s'applique.
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
}));
// Active l'extension unaccent si absente (idempotent, sans danger).
// Garantit que la recherche insensible aux accents fonctionne,
// y compris après un changement ou une recréation de base de données.
async function ensureUnaccent() {
    try {
        await prisma_1.prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS unaccent`);
        console.log("Extension unaccent OK");
    }
    catch (err) {
        console.error("Impossible d'activer unaccent (réessaiera au prochain démarrage):", err);
    }
}
if (process.env.NODE_ENV !== "test") {
    ensureUnaccent();
}
const allowedOrigins = [
    "http://localhost:3000",
    // Domaine de production actuel (sous-domaine OVH branché sur Vercel)
    "https://lokevent.eden-group.co",
    // Ancienne URL Vercel — encore active, on la garde le temps de la transition
    "https://lok-event.vercel.app",
    process.env.FRONTEND_URL,
].filter(Boolean);
// Autorise en plus toute URL de preview Vercel du même projet
// (ex: lok-event-git-feature-xyz-tonequipe.vercel.app),
// en plus des origines fixes ci-dessus.
const vercelPreviewPattern = /^https:\/\/lok-event-[a-z0-9-]+\.vercel\.app$/;
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin) {
            // Requêtes sans origine (ex: Postman, curl, apps mobiles) — autorisées
            callback(null, true);
            return;
        }
        if (allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error("Non autorisé par la politique CORS"));
    },
    credentials: true,
}));
// Limite explicite du body JSON : largement suffisant pour tous tes
// endpoints (les photos passent par multer, pas par le body JSON).
// Bloque les payloads géants destinés à saturer la mémoire du serveur.
app.use(express_1.default.json({ limit: "200kb" }));
// Le rate-limiter global est désactivé en environnement de test
// pour ne pas fausser les résultats des tests qui font beaucoup de requêtes rapides.
if (process.env.NODE_ENV !== "test") {
    app.use(rateLimit_middleware_1.globalLimiter);
}
app.get("/health", (_req, res) => res.json({ status: "OK", service: "LOKEVENT API" }));
app.use("/api/auth", auth_routes_1.default);
app.use("/api/prestataires", prestataire_routes_1.default);
app.use("/api/categories", categorie_routes_1.default);
app.use("/api/reservations", reservation_routes_1.default);
app.use("/api/avis", avis_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
app.use("/api/tags", tag_routes_1.default);
app.use("/api/favoris", favori_routes_1.default);
app.use("/api/notifications", notification_routes_1.default);
app.use("/api/conversations", message_routes_1.default);
app.use("/api/disponibilites", disponibilite_routes_1.default);
app.use("/api/services", service_routes_1.default);
app.use("/api/premium", premium_routes_1.default);
app.use("/api/parametres", parametre_routes_1.default);
app.use("/api/publicites", publicite_routes_1.default);
exports.default = app;
//# sourceMappingURL=app.js.map