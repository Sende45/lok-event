"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supprimerPublicite = exports.modifierPublicite = exports.creerPublicite = exports.listerPublicitesAdmin = exports.enregistrerClic = exports.enregistrerAffichage = exports.getPublicitesActives = void 0;
const prisma_1 = require("../lib/prisma");
const EMPLACEMENTS = ["ACCUEIL_CARROUSEL", "ACCUEIL_ENCART"];
function urlHttpsValide(valeur) {
    if (typeof valeur !== "string" || valeur.length > 500)
        return false;
    try {
        return new URL(valeur).protocol === "https:";
    }
    catch {
        return false;
    }
}
function dateOuNull(valeur) {
    if (valeur === undefined || valeur === null || valeur === "")
        return null;
    const d = new Date(valeur);
    return isNaN(d.getTime()) ? "invalide" : d;
}
/** Valide le corps envoyé par l'admin. Renvoie un message d'erreur ou les données propres. */
function validerCorps(body, creation) {
    const data = {};
    if (creation || body.marque !== undefined) {
        if (typeof body.marque !== "string" || !body.marque.trim() || body.marque.length > 60) {
            return { erreur: "Nom de la marque requis (60 caractères max)" };
        }
        data.marque = body.marque.trim();
    }
    if (creation || body.imageUrl !== undefined) {
        if (!urlHttpsValide(body.imageUrl))
            return { erreur: "Image requise (URL https)" };
        data.imageUrl = body.imageUrl;
    }
    if (body.lien !== undefined) {
        if (body.lien === "" || body.lien === null)
            data.lien = null;
        else if (!urlHttpsValide(body.lien))
            return { erreur: "Le lien doit commencer par https://" };
        else
            data.lien = body.lien;
    }
    for (const champ of ["titre", "sousTitre"]) {
        if (body[champ] !== undefined) {
            if (body[champ] !== null && (typeof body[champ] !== "string" || body[champ].length > 120)) {
                return { erreur: `${champ} invalide (120 caractères max)` };
            }
            data[champ] = body[champ] ? body[champ].trim() : null;
        }
    }
    if (body.emplacement !== undefined) {
        if (!EMPLACEMENTS.includes(body.emplacement)) {
            return { erreur: `Emplacement invalide. Valeurs : ${EMPLACEMENTS.join(", ")}` };
        }
        data.emplacement = body.emplacement;
    }
    if (body.ordre !== undefined) {
        const ordre = parseInt(body.ordre, 10);
        if (isNaN(ordre))
            return { erreur: "Ordre invalide" };
        data.ordre = ordre;
    }
    if (body.actif !== undefined)
        data.actif = Boolean(body.actif);
    const debut = dateOuNull(body.debutLe);
    const fin = dateOuNull(body.finLe);
    if (debut === "invalide" || fin === "invalide")
        return { erreur: "Date invalide" };
    if (body.debutLe !== undefined && debut)
        data.debutLe = debut;
    if (body.finLe !== undefined)
        data.finLe = fin;
    if (debut && fin && fin <= debut)
        return { erreur: "La date de fin doit être après la date de début" };
    return { data };
}
// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────────────────────────────────────────
/** GET /publicites?emplacement=ACCUEIL_CARROUSEL — pubs en cours de diffusion */
const getPublicitesActives = async (req, res) => {
    try {
        const emplacement = req.query.emplacement;
        if (emplacement && !EMPLACEMENTS.includes(emplacement)) {
            res.status(400).json({ message: "Emplacement invalide" });
            return;
        }
        const maintenant = new Date();
        const pubs = await prisma_1.prisma.publicite.findMany({
            where: {
                actif: true,
                debutLe: { lte: maintenant },
                OR: [{ finLe: null }, { finLe: { gt: maintenant } }],
                ...(emplacement ? { emplacement: emplacement } : {}),
            },
            select: {
                id: true,
                marque: true,
                titre: true,
                sousTitre: true,
                imageUrl: true,
                lien: true,
                emplacement: true,
            },
            orderBy: [{ ordre: "asc" }, { createdAt: "desc" }],
            take: 10,
        });
        res.json(pubs);
    }
    catch (error) {
        console.error("Erreur liste publicités:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};
exports.getPublicitesActives = getPublicitesActives;
/** POST /publicites/:id/affichage — la pub a été vue */
const enregistrerAffichage = async (req, res) => {
    try {
        await prisma_1.prisma.publicite.updateMany({
            where: { id: req.params.id, actif: true },
            data: { affichages: { increment: 1 } },
        });
        res.status(204).end();
    }
    catch {
        res.status(204).end(); // le comptage ne doit jamais gêner l'utilisateur
    }
};
exports.enregistrerAffichage = enregistrerAffichage;
/** POST /publicites/:id/clic — la pub a été touchée */
const enregistrerClic = async (req, res) => {
    try {
        await prisma_1.prisma.publicite.updateMany({
            where: { id: req.params.id, actif: true },
            data: { clics: { increment: 1 } },
        });
        res.status(204).end();
    }
    catch {
        res.status(204).end();
    }
};
exports.enregistrerClic = enregistrerClic;
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────
/** GET /publicites/admin/toutes — toutes les pubs avec leurs statistiques */
const listerPublicitesAdmin = async (_req, res) => {
    try {
        const pubs = await prisma_1.prisma.publicite.findMany({
            orderBy: [{ emplacement: "asc" }, { ordre: "asc" }, { createdAt: "desc" }],
        });
        res.json(pubs);
    }
    catch (error) {
        console.error("Erreur liste admin publicités:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};
exports.listerPublicitesAdmin = listerPublicitesAdmin;
/** POST /publicites */
const creerPublicite = async (req, res) => {
    try {
        const resultat = validerCorps(req.body, true);
        if ("erreur" in resultat) {
            res.status(400).json({ message: resultat.erreur });
            return;
        }
        const pub = await prisma_1.prisma.publicite.create({ data: resultat.data });
        res.status(201).json(pub);
    }
    catch (error) {
        console.error("Erreur création publicité:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};
exports.creerPublicite = creerPublicite;
/** PUT /publicites/:id */
const modifierPublicite = async (req, res) => {
    try {
        const id = req.params.id;
        const existe = await prisma_1.prisma.publicite.findUnique({ where: { id }, select: { id: true } });
        if (!existe) {
            res.status(404).json({ message: "Publicité introuvable" });
            return;
        }
        const resultat = validerCorps(req.body, false);
        if ("erreur" in resultat) {
            res.status(400).json({ message: resultat.erreur });
            return;
        }
        const pub = await prisma_1.prisma.publicite.update({ where: { id }, data: resultat.data });
        res.json(pub);
    }
    catch (error) {
        console.error("Erreur modification publicité:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};
exports.modifierPublicite = modifierPublicite;
/** DELETE /publicites/:id */
const supprimerPublicite = async (req, res) => {
    try {
        const resultat = await prisma_1.prisma.publicite.deleteMany({ where: { id: req.params.id } });
        if (resultat.count === 0) {
            res.status(404).json({ message: "Publicité introuvable" });
            return;
        }
        res.json({ message: "Publicité supprimée" });
    }
    catch (error) {
        console.error("Erreur suppression publicité:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};
exports.supprimerPublicite = supprimerPublicite;
//# sourceMappingURL=publicite.controller.js.map