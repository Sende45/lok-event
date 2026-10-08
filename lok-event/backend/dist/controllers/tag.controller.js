"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTag = exports.updateTag = exports.createTag = exports.getTags = void 0;
const prisma_1 = require("../lib/prisma");
// Validation commune création/modification
function validerChamps(body) {
    const { nom, slug, groupe } = body;
    if (typeof nom !== "string" || !nom.trim())
        return "Le nom est requis";
    if (typeof slug !== "string" || !slug.trim())
        return "Le slug est requis";
    if (typeof groupe !== "string" || !groupe.trim())
        return "Le groupe est requis";
    if (nom.trim().length > 60)
        return "Nom trop long (60 caractères max)";
    // Slug propre : minuscules, chiffres et tirets uniquement (utilisé dans les URLs)
    if (!/^[a-z0-9-]+$/.test(slug.trim()))
        return "Slug invalide : minuscules, chiffres et tirets uniquement (ex: mariage-traditionnel)";
    return null;
}
// Prisma P2002 = violation de contrainte unique (slug ou nom en doublon)
function estDoublonPrisma(error) {
    return (typeof error === "object" &&
        error !== null &&
        error.code === "P2002");
}
const getTags = async (_req, res) => {
    try {
        const tags = await prisma_1.prisma.tag.findMany({
            orderBy: { nom: "asc" },
        });
        const grouped = tags.reduce((acc, tag) => {
            if (!acc[tag.groupe])
                acc[tag.groupe] = [];
            acc[tag.groupe].push(tag);
            return acc;
        }, {});
        res.json(grouped);
    }
    catch (error) {
        console.error("Erreur liste tags:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.getTags = getTags;
const createTag = async (req, res) => {
    try {
        const erreur = validerChamps(req.body);
        if (erreur) {
            res.status(400).json({ message: erreur });
            return;
        }
        const { nom, slug, groupe, icone } = req.body;
        const tag = await prisma_1.prisma.tag.create({
            data: { nom: nom.trim(), slug: slug.trim(), groupe: groupe.trim(), icone },
        });
        res.status(201).json(tag);
    }
    catch (error) {
        if (estDoublonPrisma(error)) {
            res.status(400).json({ message: "Un tag avec ce nom ou ce slug existe déjà" });
            return;
        }
        console.error("Erreur création tag:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.createTag = createTag;
const updateTag = async (req, res) => {
    try {
        const id = req.params.id;
        const erreur = validerChamps(req.body);
        if (erreur) {
            res.status(400).json({ message: erreur });
            return;
        }
        const { nom, slug, groupe, icone } = req.body;
        const tag = await prisma_1.prisma.tag.update({
            where: { id },
            data: { nom: nom.trim(), slug: slug.trim(), groupe: groupe.trim(), icone },
        });
        res.json(tag);
    }
    catch (error) {
        if (estDoublonPrisma(error)) {
            res.status(400).json({ message: "Un tag avec ce nom ou ce slug existe déjà" });
            return;
        }
        console.error("Erreur modification tag:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.updateTag = updateTag;
const deleteTag = async (req, res) => {
    try {
        const id = req.params.id;
        // Même garde-fou que pour les catégories : on ne supprime pas un tag
        // encore lié à des prestataires (sinon erreur de contrainte ou données orphelines)
        const enUsage = await prisma_1.prisma.prestataire.count({
            where: { tags: { some: { id } } },
        });
        if (enUsage > 0) {
            res.status(400).json({
                message: `Impossible de supprimer : ${enUsage} prestataire(s) utilisent ce tag. Retirez-le de leurs profils d'abord.`,
            });
            return;
        }
        await prisma_1.prisma.tag.delete({ where: { id } });
        res.json({ message: "Tag supprimé" });
    }
    catch (error) {
        console.error("Erreur suppression tag:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.deleteTag = deleteTag;
//# sourceMappingURL=tag.controller.js.map