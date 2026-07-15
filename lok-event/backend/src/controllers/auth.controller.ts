// backend/src/controllers/auth.controller.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

// La tokenVersion est embarquée dans chaque JWT : le middleware protect la
// compare à celle en base à chaque requête. Incrémenter la version en base
// tue instantanément TOUS les tokens existants du compte (vol de session,
// déconnexion globale, bannissement ciblé...).
const generateToken = (id: string, role: string, tokenVersion: number) =>
  jwt.sign({ id, role, tokenVersion }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });

// Seuls ces rôles peuvent être choisis via l'inscription publique.
// ADMIN ne peut JAMAIS être créé par cette route — uniquement via le script de seed.
const ROLES_AUTORISES_A_INSCRIPTION = ["CLIENT", "PRESTATAIRE"];

export const register = async (req: Request, res: Response) => {
  try {
    const { nom, prenom, email, motDePasse, telephone, role } = req.body;

    // On ignore toute valeur de "role" qui ne serait pas explicitement autorisée.
    // Si le champ est absent, invalide, ou vaut "ADMIN", on retombe sur CLIENT.
    const roleFinal = ROLES_AUTORISES_A_INSCRIPTION.includes(role) ? role : "CLIENT";

    const existe = await prisma.user.findUnique({ where: { email } });
    if (existe) {
      res.status(400).json({ message: "Email déjà utilisé" });
      return;
    }
    const hash = await bcrypt.hash(motDePasse, 12);
    const user = await prisma.user.create({
      data: { nom, prenom, email, motDePasse: hash, telephone, role: roleFinal },
    });
    res.status(201).json({
      token: generateToken(user.id, user.role, user.tokenVersion),
      user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, motDePasse } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(motDePasse, user.motDePasse))) {
      res.status(401).json({ message: "Email ou mot de passe incorrect" });
      return;
    }
    res.json({
      token: generateToken(user.id, user.role, user.tokenVersion),
      user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, nom: true, prenom: true, email: true, telephone: true, role: true, avatar: true },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/logout-all — "Se déconnecter de tous les appareils"
// Incrémente la tokenVersion : tous les JWT existants de ce compte (y compris
// celui utilisé pour cet appel) deviennent immédiatement invalides.
// Cas d'usage : l'utilisateur suspecte un vol de session, un appareil perdu,
// un ordinateur partagé... Route à protéger avec le middleware protect.
// ─────────────────────────────────────────────────────────────────────────────
export const logoutAll = async (req: any, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { tokenVersion: { increment: 1 } },
    });
    res.json({
      message:
        "Vous avez été déconnecté de tous les appareils. Reconnectez-vous pour continuer.",
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};