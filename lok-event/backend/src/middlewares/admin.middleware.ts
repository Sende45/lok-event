import { Request, Response, NextFunction } from "express";

export const requireAdmin = (req: any, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== "ADMIN") {
    res.status(403).json({ message: "Accès réservé aux administrateurs" });
    return;
  }
  next();
};