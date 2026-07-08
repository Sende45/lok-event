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

// ==================== CONTROLLERS ====================

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Non authentifié" });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

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

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Non authentifié" });
      return;
    }

    await prisma.notification.updateMany({
      where: { 
        userId: req.user.id, 
        isRead: false 
      },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Fonction utilitaire
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