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
      email?: string;
    };
    // email avec repli sur chaîne vide : le type global exige email: string,
    // mais selon la date de génération du token, le payload peut ne pas le contenir
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email ?? "",
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