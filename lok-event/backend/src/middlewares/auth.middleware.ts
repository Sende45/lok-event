// backend/src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

// La propriété req.user est désormais déclarée GLOBALEMENT sur Request
// (via src/types/express.d.ts). On garde cet alias uniquement pour que
// les fichiers qui importent encore AuthRequest continuent de compiler.
export type AuthRequest = Request;

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ message: "Non autorisé, token manquant" });
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      role: string;
      tokenVersion?: number;
      email?: string;
    };

    // ── Re-vérification en base à chaque requête ──────────────────────────
    // Le token seul ne suffit pas : un compte supprimé ou banni garderait
    // sinon l'accès jusqu'à l'expiration du JWT (7 jours). Ce lookup par
    // clé primaire est indexé et coûte < 1 ms — négligeable.
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, actif: true, tokenVersion: true },
    });

    if (!user) {
      res.status(401).json({ message: "Compte introuvable. Reconnectez-vous." });
      return;
    }

    if (!user.actif) {
      res.status(403).json({
        message: "Ce compte a été désactivé. Contactez le support LOKEVENT.",
      });
      return;
    }

    // ── Révocation de session (anti vol de token) ─────────────────────────
    // Chaque JWT embarque la tokenVersion au moment de sa création.
    // Si elle ne correspond plus à celle en base (incrémentée par une
    // "déconnexion de tous les appareils" ou par un admin), le token est
    // mort — même s'il n'a pas expiré. Un token volé devient révocable.
    // NB : les anciens tokens émis AVANT cette mise à jour n'ont pas de
    // tokenVersion → decoded.tokenVersion vaut undefined → rejetés →
    // tout le monde se reconnecte une fois au déploiement, c'est voulu.
    if (decoded.tokenVersion !== user.tokenVersion) {
      res.status(401).json({
        message: "Session expirée. Veuillez vous reconnecter.",
      });
      return;
    }

    // Rôle et email lus depuis la BASE, pas depuis le token :
    // une révocation de rôle prend effet immédiatement.
    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
    };
    next();
  } catch {
    res.status(401).json({ message: "Token invalide" });
  }
};

export const adminOnly = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ message: "Accès réservé aux admins" });
    return;
  }
  next();
};