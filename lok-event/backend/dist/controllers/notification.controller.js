"use strict";
// backend/src/controllers/notification.controller.ts
//
// Point central du système de notifications LOKEVENT.
// Toutes les notifications de la plateforme passent par ce fichier :
//   • MESSAGERIE  → notifierNouveauMessage(...)
//   • RÉSERVATIONS → notifierNouvelleReservation(...), notifierStatutReservation(...),
//                    notifierAnnulationParClient(...)
// Les autres contrôleurs (message, reservation, prestataire) n'ont qu'à
// importer la fonction qui les concerne et l'appeler en une ligne.
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifierAnnulationParClient = exports.notifierStatutReservation = exports.notifierNouvelleReservation = exports.notifierNouveauMessage = exports.sendNotification = exports.deleteAllNotifications = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getUnreadCount = exports.getNotifications = void 0;
const prisma_1 = require("../lib/prisma");
const socket_1 = require("../lib/socket");
// ==================== CONTROLLERS (routes HTTP) ====================
// GET /notifications?page=1&limit=20&nonLues=true
// Renvoie la liste + le compteur de non-lues (badge) en un seul appel.
const getNotifications = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Non authentifié" });
            return;
        }
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
        const nonLues = req.query.nonLues === "true";
        const where = { userId: req.user.id };
        if (nonLues)
            where.isRead = false;
        const [notifications, total, unreadCount] = await Promise.all([
            prisma_1.prisma.notification.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma_1.prisma.notification.count({ where }),
            prisma_1.prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
        ]);
        res.json({
            notifications,
            unreadCount,
            pagination: { total, pages: Math.ceil(total / limit), currentPage: page, limit },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};
exports.getNotifications = getNotifications;
// GET /notifications/unread-count — léger, pour le polling du badge
const getUnreadCount = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Non authentifié" });
            return;
        }
        const unreadCount = await prisma_1.prisma.notification.count({
            where: { userId: req.user.id, isRead: false },
        });
        res.json({ unreadCount });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};
exports.getUnreadCount = getUnreadCount;
// PATCH /notifications/:id/read
// ⚠️ Sécurité : updateMany avec userId — on ne peut marquer QUE ses propres
// notifications (l'ancienne version acceptait n'importe quel id).
const markAsRead = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Non authentifié" });
            return;
        }
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) {
            res.status(400).json({ message: "ID invalide" });
            return;
        }
        const result = await prisma_1.prisma.notification.updateMany({
            where: { id, userId: req.user.id },
            data: { isRead: true },
        });
        if (result.count === 0) {
            res.status(404).json({ message: "Notification non trouvée" });
            return;
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};
exports.markAsRead = markAsRead;
// PATCH /notifications/read-all
const markAllAsRead = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Non authentifié" });
            return;
        }
        await prisma_1.prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true },
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};
exports.markAllAsRead = markAllAsRead;
// DELETE /notifications/:id — supprime UNE notification (la sienne uniquement)
const deleteNotification = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Non authentifié" });
            return;
        }
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) {
            res.status(400).json({ message: "ID invalide" });
            return;
        }
        const result = await prisma_1.prisma.notification.deleteMany({
            where: { id, userId: req.user.id },
        });
        if (result.count === 0) {
            res.status(404).json({ message: "Notification non trouvée" });
            return;
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};
exports.deleteNotification = deleteNotification;
// DELETE /notifications?luesSeulement=true — vide la liste
// (par défaut tout ; avec ?luesSeulement=true, ne supprime que les lues)
const deleteAllNotifications = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Non authentifié" });
            return;
        }
        const luesSeulement = req.query.luesSeulement === "true";
        const where = { userId: req.user.id };
        if (luesSeulement)
            where.isRead = true;
        const result = await prisma_1.prisma.notification.deleteMany({ where });
        res.json({ success: true, deleted: result.count });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};
exports.deleteAllNotifications = deleteAllNotifications;
// ==================== FONCTION UTILITAIRE DE BASE ====================
// Crée la notification persistée + push temps réel à la room de l'utilisateur.
// Les fonctions métier ci-dessous s'appuient toutes dessus.
const sendNotification = async (userId, type, title, message, data) => {
    try {
        const notification = await prisma_1.prisma.notification.create({
            data: {
                userId,
                type,
                title,
                message,
                data,
            },
        });
        const io = (0, socket_1.getIO)();
        io.to(`user-${userId}`).emit("newNotification", notification);
        return notification;
    }
    catch (error) {
        console.error("Erreur envoi notification:", error);
    }
};
exports.sendNotification = sendNotification;
// Helper interne : retrouve le userId d'un prestataire à partir de son
// prestataireId (piège classique : les rooms socket utilisent le userId).
async function getPrestataireUser(prestataireId) {
    return prisma_1.prisma.prestataire.findUnique({
        where: { id: prestataireId },
        select: { userId: true, nomEntreprise: true },
    });
}
// ==================== NOTIFICATIONS MESSAGERIE ====================
// À appeler dans message.controller.ts, juste après prisma.message.create(...) :
//
//   import { notifierNouveauMessage } from "./notification.controller";
//   notifierNouveauMessage(destinataireId, expediteur, conversationId, message.id, contenu);
//
// (destinataireId = userId du destinataire ; expediteur = { prenom, nom })
const notifierNouveauMessage = async (destinataireUserId, expediteur, conversationId, messageId, contenu) => {
    // Aperçu court du message (évite de dupliquer tout le contenu en notif)
    const apercu = contenu && contenu.length > 0
        ? contenu.length > 80
            ? contenu.slice(0, 77) + "..."
            : contenu
        : "";
    return (0, exports.sendNotification)(destinataireUserId, "MESSAGE", // ⚠️ doit exister dans ton enum NotificationType (Prisma)
    "Nouveau message 💬", apercu
        ? `${expediteur.prenom} : ${apercu}`
        : `${expediteur.prenom} vous a envoyé un message`, { conversationId, messageId });
};
exports.notifierNouveauMessage = notifierNouveauMessage;
// ==================== NOTIFICATIONS RÉSERVATIONS ====================
// 1) Client → Prestataire : nouvelle demande de réservation.
// À appeler dans reservation.controller.ts après prisma.reservation.create(...) :
//
//   import { notifierNouvelleReservation } from "./notification.controller";
//   notifierNouvelleReservation(prestataireId, client, reservation);
const notifierNouvelleReservation = async (prestataireId, client, reservation) => {
    const prestataire = await getPrestataireUser(prestataireId);
    if (!prestataire)
        return;
    const date = reservation.dateEvenement.toLocaleDateString("fr-FR");
    return (0, exports.sendNotification)(prestataire.userId, "RESERVATION", // ⚠️ doit exister dans ton enum NotificationType (Prisma)
    "Nouvelle demande de réservation 📅", `${client.prenom} ${client.nom} souhaite réserver pour un(e) ${reservation.typeEvenement} le ${date}.`, { reservationId: reservation.id });
};
exports.notifierNouvelleReservation = notifierNouvelleReservation;
// 2) Prestataire → Client : changement de statut (accepté / refusé / terminé).
// À appeler dans updateBookingStatus (prestataire.controller.ts) après l'update :
//
//   import { notifierStatutReservation } from "./notification.controller";
//   notifierStatutReservation(updatedBooking.client.id, booking.prestataire.nomEntreprise, statut, updatedBooking);
const NOTIFS_STATUT = {
    CONFIRMEE: {
        titre: "Réservation confirmée 🎉",
        message: (nom, date) => `${nom} a confirmé votre réservation du ${date}.`,
    },
    ANNULEE: {
        titre: "Réservation refusée",
        message: (nom, date) => `${nom} n'a pas pu accepter votre réservation du ${date}. Vous pouvez contacter d'autres prestataires disponibles.`,
    },
    TERMINEE: {
        titre: "Prestation terminée ⭐",
        message: (nom, date) => `Votre événement du ${date} avec ${nom} est marqué comme terminé. Partagez votre expérience en laissant un avis !`,
    },
};
const notifierStatutReservation = async (clientUserId, nomEntreprise, statut, reservation) => {
    const notif = NOTIFS_STATUT[statut];
    if (!notif)
        return; // statut sans notification (ex : EN_ATTENTE)
    const date = reservation.dateEvenement.toLocaleDateString("fr-FR");
    return (0, exports.sendNotification)(clientUserId, "RESERVATION", notif.titre, notif.message(nomEntreprise, date), { reservationId: reservation.id, statut });
};
exports.notifierStatutReservation = notifierStatutReservation;
// 3) Client → Prestataire : annulation par le client.
// À appeler dans reservation.controller.ts (PATCH /reservations/:id/annuler) :
//
//   import { notifierAnnulationParClient } from "./notification.controller";
//   notifierAnnulationParClient(reservation.prestataireId, client, reservation);
const notifierAnnulationParClient = async (prestataireId, client, reservation) => {
    const prestataire = await getPrestataireUser(prestataireId);
    if (!prestataire)
        return;
    const date = reservation.dateEvenement.toLocaleDateString("fr-FR");
    return (0, exports.sendNotification)(prestataire.userId, "RESERVATION", "Réservation annulée", `${client.prenom} ${client.nom} a annulé sa réservation du ${date}.`, { reservationId: reservation.id, statut: "ANNULEE" });
};
exports.notifierAnnulationParClient = notifierAnnulationParClient;
//# sourceMappingURL=notification.controller.js.map