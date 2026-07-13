// backend/src/controllers/notification.controller.ts
//
// Point central du système de notifications LOKEVENT.
// Toutes les notifications de la plateforme passent par ce fichier :
//   • MESSAGERIE  → notifierNouveauMessage(...)
//   • RÉSERVATIONS → notifierNouvelleReservation(...), notifierStatutReservation(...),
//                    notifierAnnulationParClient(...)
// Les autres contrôleurs (message, reservation, prestataire) n'ont qu'à
// importer la fonction qui les concerne et l'appeler en une ligne.

import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { getIO } from "../lib/socket";

// Interface plus souple (user peut être undefined avant le middleware)
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// ==================== CONTROLLERS (routes HTTP) ====================

// GET /notifications?page=1&limit=20&nonLues=true
// Renvoie la liste + le compteur de non-lues (badge) en un seul appel.
export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Non authentifié" });
      return;
    }

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 50);
    const nonLues = req.query.nonLues === "true";

    const where: { userId: string; isRead?: boolean } = { userId: req.user.id };
    if (nonLues) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
    ]);

    res.json({
      notifications,
      unreadCount,
      pagination: { total, pages: Math.ceil(total / limit), currentPage: page, limit },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// GET /notifications/unread-count — léger, pour le polling du badge
export const getUnreadCount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Non authentifié" });
      return;
    }

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// PATCH /notifications/:id/read
// ⚠️ Sécurité : updateMany avec userId — on ne peut marquer QUE ses propres
// notifications (l'ancienne version acceptait n'importe quel id).
export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
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

    const result = await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { isRead: true },
    });

    if (result.count === 0) {
      res.status(404).json({ message: "Notification non trouvée" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// PATCH /notifications/read-all
export const markAllAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Non authentifié" });
      return;
    }

    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// DELETE /notifications/:id — supprime UNE notification (la sienne uniquement)
export const deleteNotification = async (req: AuthenticatedRequest, res: Response) => {
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

    const result = await prisma.notification.deleteMany({
      where: { id, userId: req.user.id },
    });

    if (result.count === 0) {
      res.status(404).json({ message: "Notification non trouvée" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// DELETE /notifications?luesSeulement=true — vide la liste
// (par défaut tout ; avec ?luesSeulement=true, ne supprime que les lues)
export const deleteAllNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Non authentifié" });
      return;
    }

    const luesSeulement = req.query.luesSeulement === "true";
    const where: { userId: string; isRead?: boolean } = { userId: req.user.id };
    if (luesSeulement) where.isRead = true;

    const result = await prisma.notification.deleteMany({ where });

    res.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ==================== FONCTION UTILITAIRE DE BASE ====================
// Crée la notification persistée + push temps réel à la room de l'utilisateur.
// Les fonctions métier ci-dessous s'appuient toutes dessus.
export const sendNotification = async (
  userId: string,
  type: any,
  title: string,
  message: string,
  data?: any
) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data,
      },
    });

    const io = getIO();
    io.to(`user-${userId}`).emit("newNotification", notification);

    return notification;
  } catch (error) {
    console.error("Erreur envoi notification:", error);
  }
};

// Helper interne : retrouve le userId d'un prestataire à partir de son
// prestataireId (piège classique : les rooms socket utilisent le userId).
async function getPrestataireUser(prestataireId: string) {
  return prisma.prestataire.findUnique({
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
export const notifierNouveauMessage = async (
  destinataireUserId: string,
  expediteur: { prenom: string; nom?: string },
  conversationId: string,
  messageId: string,
  contenu?: string
) => {
  // Aperçu court du message (évite de dupliquer tout le contenu en notif)
  const apercu =
    contenu && contenu.length > 0
      ? contenu.length > 80
        ? contenu.slice(0, 77) + "..."
        : contenu
      : "";

  return sendNotification(
    destinataireUserId,
    "MESSAGE", // ⚠️ doit exister dans ton enum NotificationType (Prisma)
    "Nouveau message 💬",
    apercu
      ? `${expediteur.prenom} : ${apercu}`
      : `${expediteur.prenom} vous a envoyé un message`,
    { conversationId, messageId }
  );
};

// ==================== NOTIFICATIONS RÉSERVATIONS ====================

// 1) Client → Prestataire : nouvelle demande de réservation.
// À appeler dans reservation.controller.ts après prisma.reservation.create(...) :
//
//   import { notifierNouvelleReservation } from "./notification.controller";
//   notifierNouvelleReservation(prestataireId, client, reservation);
export const notifierNouvelleReservation = async (
  prestataireId: string,
  client: { prenom: string; nom: string },
  reservation: { id: string; typeEvenement: string; dateEvenement: Date }
) => {
  const prestataire = await getPrestataireUser(prestataireId);
  if (!prestataire) return;

  const date = reservation.dateEvenement.toLocaleDateString("fr-FR");
  return sendNotification(
    prestataire.userId,
    "RESERVATION", // ⚠️ doit exister dans ton enum NotificationType (Prisma)
    "Nouvelle demande de réservation 📅",
    `${client.prenom} ${client.nom} souhaite réserver pour un(e) ${reservation.typeEvenement} le ${date}.`,
    { reservationId: reservation.id }
  );
};

// 2) Prestataire → Client : changement de statut (accepté / refusé / terminé).
// À appeler dans updateBookingStatus (prestataire.controller.ts) après l'update :
//
//   import { notifierStatutReservation } from "./notification.controller";
//   notifierStatutReservation(updatedBooking.client.id, booking.prestataire.nomEntreprise, statut, updatedBooking);
const NOTIFS_STATUT: Record<string, { titre: string; message: (nom: string, date: string) => string }> = {
  CONFIRMEE: {
    titre: "Réservation confirmée 🎉",
    message: (nom, date) => `${nom} a confirmé votre réservation du ${date}.`,
  },
  ANNULEE: {
    titre: "Réservation refusée",
    message: (nom, date) =>
      `${nom} n'a pas pu accepter votre réservation du ${date}. Vous pouvez contacter d'autres prestataires disponibles.`,
  },
  TERMINEE: {
    titre: "Prestation terminée ⭐",
    message: (nom, date) =>
      `Votre événement du ${date} avec ${nom} est marqué comme terminé. Partagez votre expérience en laissant un avis !`,
  },
};

export const notifierStatutReservation = async (
  clientUserId: string,
  nomEntreprise: string,
  statut: string,
  reservation: { id: string; dateEvenement: Date }
) => {
  const notif = NOTIFS_STATUT[statut];
  if (!notif) return; // statut sans notification (ex : EN_ATTENTE)

  const date = reservation.dateEvenement.toLocaleDateString("fr-FR");
  return sendNotification(
    clientUserId,
    "RESERVATION",
    notif.titre,
    notif.message(nomEntreprise, date),
    { reservationId: reservation.id, statut }
  );
};

// 3) Client → Prestataire : annulation par le client.
// À appeler dans reservation.controller.ts (PATCH /reservations/:id/annuler) :
//
//   import { notifierAnnulationParClient } from "./notification.controller";
//   notifierAnnulationParClient(reservation.prestataireId, client, reservation);
export const notifierAnnulationParClient = async (
  prestataireId: string,
  client: { prenom: string; nom: string },
  reservation: { id: string; dateEvenement: Date }
) => {
  const prestataire = await getPrestataireUser(prestataireId);
  if (!prestataire) return;

  const date = reservation.dateEvenement.toLocaleDateString("fr-FR");
  return sendNotification(
    prestataire.userId,
    "RESERVATION",
    "Réservation annulée",
    `${client.prenom} ${client.nom} a annulé sa réservation du ${date}.`,
    { reservationId: reservation.id, statut: "ANNULEE" }
  );
};