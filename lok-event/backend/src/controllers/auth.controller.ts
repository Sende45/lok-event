// lok-event/backend/src/controllers/auth.controller.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { effacerCookieSession, estClientWeb, poserCookieSession } from "../lib/cookieSession";

// La tokenVersion est embarquée dans chaque JWT : le middleware protect la
// compare à celle en base à chaque requête. Incrémenter la version en base
// tue instantanément TOUS les tokens existants du compte (vol de session,
// déconnexion globale, bannissement ciblé...).
const generateToken = (id: string, role: string, tokenVersion: number) =>
  jwt.sign({ id, role, tokenVersion }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });

// Infos renvoyées au client après inscription / connexion.
// Doit contenir la même chose que GET /auth/me (sinon la photo de profil
// et le téléphone "disparaissent" à chaque nouvelle connexion).
const profilPublic = (user: {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  role: string;
  avatar: string | null;
}) => ({
  id: user.id,
  nom: user.nom,
  prenom: user.prenom,
  email: user.email,
  telephone: user.telephone,
  role: user.role,
  avatar: user.avatar,
});

// L'email est TOUJOURS enregistré et recherché en minuscules :
// "Ben@Gmail.com" et "ben@gmail.com" désignent le même compte.
export function normaliserEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const propre = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(propre) && propre.length <= 200 ? propre : null;
}

const LONGUEUR_MIN_MDP = 8;

/** Texte obligatoire, nettoyé, de longueur max donnée (null si invalide) */
function texteRequis(valeur: unknown, max: number): string | null {
  if (typeof valeur !== "string") return null;
  const propre = valeur.trim();
  return propre && propre.length <= max ? propre : null;
}

// Seuls ces rôles peuvent être choisis via l'inscription publique.
// ADMIN ne peut JAMAIS être créé par cette route — uniquement via le script de seed.
const ROLES_AUTORISES_A_INSCRIPTION = ["CLIENT", "PRESTATAIRE"];

export const register = async (req: Request, res: Response) => {
  try {
    const { motDePasse, telephone, role } = req.body ?? {};
    const email = normaliserEmail(req.body?.email);
    const nom = texteRequis(req.body?.nom, 60);
    const prenom = texteRequis(req.body?.prenom, 60);

    if (!email) {
      res.status(400).json({ message: "Adresse email invalide" });
      return;
    }
    if (!nom || !prenom) {
      res.status(400).json({ message: "Le nom et le prénom sont obligatoires (60 caractères max)" });
      return;
    }
    if (typeof motDePasse !== "string" || motDePasse.length < LONGUEUR_MIN_MDP || motDePasse.length > 128) {
      res.status(400).json({
        message: `Le mot de passe doit contenir entre ${LONGUEUR_MIN_MDP} et 128 caractères`,
      });
      return;
    }
    const telephoneFinal =
      typeof telephone === "string" && telephone.trim() ? telephone.trim().slice(0, 30) : null;

    // On ignore toute valeur de "role" qui ne serait pas explicitement autorisée.
    // Si le champ est absent, invalide, ou vaut "ADMIN", on retombe sur CLIENT.
    const roleFinal = ROLES_AUTORISES_A_INSCRIPTION.includes(role) ? role : "CLIENT";

    // Recherche insensible à la casse : couvre aussi les anciens comptes
    // enregistrés avec des majuscules avant ce correctif
    const existe = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existe) {
      res.status(400).json({ message: "Email déjà utilisé" });
      return;
    }
    const hash = await bcrypt.hash(motDePasse, 12);
    const user = await prisma.user.create({
      data: { nom, prenom, email, motDePasse: hash, telephone: telephoneFinal, role: roleFinal },
    });
    const token = generateToken(user.id, user.role, user.tokenVersion);
    // Site web : session en cookie httpOnly. Mobile : token dans la réponse
    // (pas de cookie, sinon il resterait dans la mémoire du téléphone).
    if (estClientWeb(req)) poserCookieSession(res, token);
    res.status(201).json({
      // Le site web reçoit la session dans le cookie httpOnly uniquement
      ...(estClientWeb(req) ? {} : { token }),
      user: profilPublic(user),
    });
  } catch (error) {
    console.error("Erreur inscription:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const email = normaliserEmail(req.body?.email);
    const motDePasse = req.body?.motDePasse;
    if (!email || typeof motDePasse !== "string" || !motDePasse) {
      res.status(401).json({ message: "Email ou mot de passe incorrect" });
      return;
    }
    // Insensible à la casse : "Ben@Gmail.com" se connecte comme "ben@gmail.com"
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (!user || !(await bcrypt.compare(motDePasse, user.motDePasse))) {
      res.status(401).json({ message: "Email ou mot de passe incorrect" });
      return;
    }
    const token = generateToken(user.id, user.role, user.tokenVersion);
    // Site web : session en cookie httpOnly. Mobile : token dans la réponse
    // (pas de cookie, sinon il resterait dans la mémoire du téléphone).
    if (estClientWeb(req)) poserCookieSession(res, token);
    res.json({
      // Le site web reçoit la session dans le cookie httpOnly uniquement
      ...(estClientWeb(req) ? {} : { token }),
      user: profilPublic(user),
    });
  } catch (error) {
    console.error("Erreur connexion:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// POST /auth/logout — efface le cookie de session du site web.
// (L'application mobile se déconnecte en oubliant simplement son token.)
export const logout = async (_req: Request, res: Response) => {
  effacerCookieSession(res);
  res.json({ message: "Déconnecté" });
};

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, nom: true, prenom: true, email: true, telephone: true, role: true, avatar: true },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
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
    res.status(500).json({ message: "Erreur serveur" });
  }
};