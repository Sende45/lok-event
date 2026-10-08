"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.masquerNonPremium = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const socket_1 = require("../lib/socket");
/** Lit le token s'il y en a un, sans bloquer la requête s'il est absent ou invalide */
function lecteurOptionnel(req) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
        return null;
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        return decoded.id ? { id: decoded.id, role: decoded.role || "CLIENT" } : null;
    }
    catch {
        return null;
    }
}
function userIdDe(p) {
    return p.userId || p.user?.id;
}
/** Version publique d'un prestataire non Premium. Même forme que l'original pour ne casser aucun écran. */
function masquer(p) {
    return {
        id: p.id,
        masque: true,
        premium: false,
        nomEntreprise: "Prestataire LOKEVENT",
        description: null,
        categorieId: p.categorieId,
        categorie: p.categorie,
        quartier: "",
        commune: p.commune ?? null,
        ville: p.ville,
        latitude: null,
        longitude: null,
        telephone: null,
        whatsapp: null,
        email: null,
        siteWeb: null,
        // Pas de photo nette : seule la première, que l'app affiche floutée
        photos: [],
        photoFloue: Array.isArray(p.photos) && p.photos.length > 0 ? p.photos[0] : null,
        prixMin: p.prixMin ?? null,
        prixMax: p.prixMax ?? null,
        notemoyenne: p.notemoyenne ?? 0,
        totalAvis: p.totalAvis ?? 0,
        verifie: p.verifie ?? false,
        actif: p.actif ?? true,
        userId: "",
        user: { id: "", nom: "", prenom: "", avatar: null },
        services: [],
        avis: [],
        _count: p._count ?? { avis: 0, reservations: 0 },
        ...(p.distance !== undefined ? { distance: p.distance } : {}),
    };
}
const masquerNonPremium = (req, res, next) => {
    const jsonOriginal = res.json.bind(res);
    res.json = ((body) => {
        // Erreurs (4xx/5xx) ou réponse inattendue : on ne touche à rien
        if (res.statusCode >= 400 || !body || typeof body !== "object") {
            return jsonOriginal(body);
        }
        const liste = Array.isArray(body.prestataires)
            ? body.prestataires
            : null;
        const unSeul = !liste && typeof body.id === "string" && "nomEntreprise" in body ? body : null;
        const cibles = liste ?? (unSeul ? [unSeul] : []);
        if (cibles.length === 0)
            return jsonOriginal(body);
        const lecteur = lecteurOptionnel(req);
        const ids = [...new Set(cibles.map(userIdDe).filter(Boolean))];
        prisma_1.prisma.user
            .findMany({
            where: { id: { in: ids } },
            select: { id: true, estPremium: true, premiumJusquau: true },
        })
            .then((users) => {
            const premiumParUser = new Map(users.map((u) => [u.id, (0, socket_1.premiumEstActif)(u)]));
            const transformer = (p) => {
                const proprietaire = userIdDe(p);
                const premium = proprietaire ? premiumParUser.get(proprietaire) === true : false;
                const voitTout = lecteur?.role === "ADMIN" || (lecteur && proprietaire && lecteur.id === proprietaire);
                if (premium)
                    return { ...p, masque: false, premium: true };
                if (voitTout)
                    return { ...p, masque: false, premium: false };
                return masquer(p);
            };
            if (liste) {
                const transformes = liste.map(transformer);
                // Les fiches visibles d'abord, en gardant l'ordre d'origine
                transformes.sort((a, b) => Number(a.masque) - Number(b.masque));
                jsonOriginal({ ...body, prestataires: transformes });
            }
            else {
                jsonOriginal(transformer(unSeul));
            }
        })
            .catch((err) => {
            console.error("Erreur masquage prestataires:", err);
            // En cas d'erreur, on masque tout plutôt que de tout exposer
            if (liste)
                jsonOriginal({ ...body, prestataires: liste.map(masquer) });
            else
                jsonOriginal(masquer(unSeul));
        });
        return res;
    });
    next();
};
exports.masquerNonPremium = masquerNonPremium;
//# sourceMappingURL=visibilite.middleware.js.map