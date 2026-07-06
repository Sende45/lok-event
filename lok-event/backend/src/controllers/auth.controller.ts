import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const generateToken = (id: string, role: string) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET!, { expiresIn: "7d" });

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
      token: generateToken(user.id, user.role),
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
      token: generateToken(user.id, user.role),
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