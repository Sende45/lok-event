"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnreadMessagesCount = exports.sendMessage = exports.getMessages = exports.getMesConversations = exports.getOrCreateConversation = void 0;
const prisma_1 = require("../lib/prisma");
const socket_1 = require("../lib/socket");
// Ouvre (ou retrouve) la conversation entre le client connecté et un prestataire
const getOrCreateConversation = async (req, res) => {
    try {
        const { prestataireId } = req.body;
        if (!prestataireId) {
            res.status(400).json({ message: "prestataireId requis" });
            return;
        }
        const prestataire = await prisma_1.prisma.prestataire.findUnique({
            where: { id: prestataireId },
            select: { id: true, userId: true, actif: true },
        });
        if (!prestataire || !prestataire.actif) {
            res.status(404).json({ message: "Prestataire non trouvé" });
            return;
        }
        if (prestataire.userId === req.user.id) {
            res.status(400).json({ message: "Vous ne pouvez pas vous envoyer de message à vous-même" });
            return;
        }
        let conversation = await prisma_1.prisma.conversation.findUnique({
            where: {
                clientId_prestataireId: {
                    clientId: req.user.id,
                    prestataireId,
                },
            },
        });
        if (!conversation) {
            conversation = await prisma_1.prisma.conversation.create({
                data: { clientId: req.user.id, prestataireId },
            });
        }
        res.json(conversation);
    }
    catch (error) {
        console.error("Erreur ouverture conversation:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.getOrCreateConversation = getOrCreateConversation;
// Liste des conversations de l'utilisateur connecté (côté client ET côté prestataire)
const getMesConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        // Si l'utilisateur est aussi prestataire, il voit les conversations
        // où il est le prestataire contacté
        const profilPrestataire = await prisma_1.prisma.prestataire.findUnique({
            where: { userId },
            select: { id: true },
        });
        const conversations = await prisma_1.prisma.conversation.findMany({
            where: profilPrestataire
                ? { OR: [{ clientId: userId }, { prestataireId: profilPrestataire.id }] }
                : { clientId: userId },
            include: {
                client: { select: { id: true, nom: true, prenom: true, avatar: true } },
                prestataire: {
                    select: { id: true, nomEntreprise: true, photos: true, userId: true },
                },
                messages: { orderBy: { createdAt: "desc" }, take: 1 },
            },
            orderBy: { updatedAt: "desc" },
        });
        // Compte des messages non lus (reçus, pas envoyés) par conversation
        const withUnread = await Promise.all(conversations.map(async (c) => ({
            ...c,
            nonLus: await prisma_1.prisma.message.count({
                where: { conversationId: c.id, lu: false, senderId: { not: userId } },
            }),
        })));
        res.json(withUnread);
    }
    catch (error) {
        console.error("Erreur liste conversations:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.getMesConversations = getMesConversations;
// Vérifie que l'utilisateur est bien un des deux participants
async function getConversationSiParticipant(conversationId, userId) {
    const conversation = await prisma_1.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { prestataire: { select: { userId: true, nomEntreprise: true } } },
    });
    if (!conversation)
        return null;
    const estParticipant = conversation.clientId === userId || conversation.prestataire.userId === userId;
    return estParticipant ? conversation : null;
}
// Messages d'une conversation (+ marque comme lus ceux reçus)
const getMessages = async (req, res) => {
    try {
        const conversationId = req.params.id;
        const conversation = await getConversationSiParticipant(conversationId, req.user.id);
        if (!conversation) {
            res.status(404).json({ message: "Conversation non trouvée" });
            return;
        }
        const messages = await prisma_1.prisma.message.findMany({
            where: { conversationId },
            include: { sender: { select: { id: true, nom: true, prenom: true } } },
            orderBy: { createdAt: "asc" },
            take: 100,
        });
        // Ouvrir la conversation = lire les messages reçus
        await prisma_1.prisma.message.updateMany({
            where: { conversationId, lu: false, senderId: { not: req.user.id } },
            data: { lu: true },
        });
        res.json(messages);
    }
    catch (error) {
        console.error("Erreur messages:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.getMessages = getMessages;
// Envoi d'un message + émission temps réel au destinataire
const sendMessage = async (req, res) => {
    try {
        const conversationId = req.params.id;
        const { contenu } = req.body;
        if (!contenu || !contenu.trim()) {
            res.status(400).json({ message: "Le message ne peut pas être vide" });
            return;
        }
        if (contenu.length > 2000) {
            res.status(400).json({ message: "Message trop long (2000 caractères max)" });
            return;
        }
        const conversation = await getConversationSiParticipant(conversationId, req.user.id);
        if (!conversation) {
            res.status(404).json({ message: "Conversation non trouvée" });
            return;
        }
        const message = await prisma_1.prisma.message.create({
            data: {
                conversationId,
                senderId: req.user.id,
                contenu: contenu.trim(),
            },
            include: { sender: { select: { id: true, nom: true, prenom: true } } },
        });
        // Remonte la conversation en haut de la liste
        await prisma_1.prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });
        // Temps réel : on émet vers la room personnelle du destinataire
        const destinataireUserId = conversation.clientId === req.user.id
            ? conversation.prestataire.userId
            : conversation.clientId;
        try {
            (0, socket_1.getIO)().to(`user-${destinataireUserId}`).emit("newMessage", message);
        }
        catch (err) {
            // Socket non initialisé (ex: tests) : le message reste en base, pas bloquant
            console.error("Emission socket newMessage échouée:", err);
        }
        res.status(201).json(message);
    }
    catch (error) {
        console.error("Erreur envoi message:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.sendMessage = sendMessage;
// Nombre total de messages non lus de l'utilisateur (côté client ET côté prestataire)
const getUnreadMessagesCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const profilPrestataire = await prisma_1.prisma.prestataire.findUnique({
            where: { userId },
            select: { id: true },
        });
        const unreadCount = await prisma_1.prisma.message.count({
            where: {
                lu: false,
                senderId: { not: userId },
                conversation: profilPrestataire
                    ? { OR: [{ clientId: userId }, { prestataireId: profilPrestataire.id }] }
                    : { clientId: userId },
            },
        });
        res.json({ unreadCount });
    }
    catch (error) {
        console.error("Erreur comptage messages non lus:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.getUnreadMessagesCount = getUnreadMessagesCount;
//# sourceMappingURL=message.controller.js.map