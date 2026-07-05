import { Request, Response, NextFunction } from "express";

export const requireProvider = (req: any, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== "PRESTATAIRE") {
    res.status(403).json({ message: "Accès réservé aux prestataires" });
    return;
  }
  next();
};