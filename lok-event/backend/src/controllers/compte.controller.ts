// backend/src/controllers/compte.controller.ts
// Gestion du compte par l'utilisateur lui-même (tous les rôles) :
//  PUT    /auth/profil       { nom?, prenom?, telephone?, avatar? }
//  PUT    /auth/mot-de-passe { actuel, nouveau }
//  DELETE /auth/compte       { motDePasse }   ← exigé par Apple et Google
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { getIO } from "../lib/socket";

const LONGUEUR_MIN_MDP = 8;

function texteOuNull(valeur: unknown, max: number): string | null | undefined | "invalide" {
  if (valeur === undefined) return undefined; // champ non envoyé : on n'y touche pas
  if (valeur === null || valeur === "") return null;
  if (typeof valeur !== "string") return "invalide";
  const propre = valeur.trim();
  if (propre.length > max) return "invalide";
  return propre || null;
}

const SELECT_USER = {
  id: true,
  nom: true,
  prenom: true,
  email: true,
  telephone: true,
  role: true,
  avatar: true,
} as const;

/** PUT /auth/profil */
export const modifierProfil = async (req: Request, res: Response) => {
  try {
    const nom = texteOuNull(req.body?.nom, 60);
    const prenom = texteOuNull(req.body?.prenom, 60);
    const telephone = texteOuNull(req.body?.telephone, 30);
    const avatar = texteOuNull(req.body?.avatar, 500);

    if ([nom, prenom, telephone, avatar].includes("invalide")) {
      res.status(400).json({ message: "Un des champs est invalide ou trop long" });
      return;
    }
    // Nom et prénom ne peuvent pas être vidés
    if (nom === null || prenom === null) {
      res.status(400).json({ message: "Le nom et le prénom sont obligatoires" });
      return;
    }
    if (avatar && !/^https:\/\//.test(avatar)) {
      res.status(400).json({ message: "Photo de profil invalide" });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(nom !== undefined ? { nom } : {}),
        ...(prenom !== undefined ? { prenom } : {}),
        ...(telephone !== undefined ? { telephone } : {}),
        ...(avatar !== undefined ? { avatar } : {}),
      },
      select: SELECT_USER,
    });

    res.json(user);
  } catch (error) {
    console.error("Erreur modification profil:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/** PUT /auth/mot-de-passe */
export const changerMotDePasse = async (req: Request, res: Response) => {
  try {
    const { actuel, nouveau } = req.body ?? {};
    if (typeof actuel !== "string" || typeof nouveau !== "string") {
      res.status(400).json({ message: "Mot de passe actuel et nouveau mot de passe requis" });
      return;
    }
    if (nouveau.length < LONGUEUR_MIN_MDP || nouveau.length > 128) {
      res.status(400).json({ message: `Le nouveau mot de passe doit contenir au moins ${LONGUEUR_MIN_MDP} caractères` });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { motDePasse: true },
    });
    if (!user || !(await bcrypt.compare(actuel, user.motDePasse))) {
      res.status(400).json({ message: "Mot de passe actuel incorrect" });
      return;
    }

    await prisma.user.update({
      where: { id: req.user!.id },
      // tokenVersion +1 : les autres appareils sont déconnectés.
      // L'appareil courant doit se reconnecter aussi (message côté app).
      data: { motDePasse: await bcrypt.hash(nouveau, 12), tokenVersion: { increment: 1 } },
    });

    res.json({ message: "Mot de passe modifié. Reconnectez-vous avec votre nouveau mot de passe." });
  } catch (error) {
    console.error("Erreur changement mot de passe:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/** DELETE /auth/compte — suppression définitive du compte et de ses données */
export const supprimerCompte = async (req: Request, res: Response) => {
  try {
    const motDePasse = req.body?.motDePasse;
    if (typeof motDePasse !== "string" || !motDePasse) {
      res.status(400).json({ message: "Confirmez avec votre mot de passe" });
      return;
    }

    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { motDePasse: true, role: true },
    });
    if (!user || !(await bcrypt.compare(motDePasse, user.motDePasse))) {
      res.status(400).json({ message: "Mot de passe incorrect" });
      return;
    }

    // Garde-fou : on ne supprime jamais le dernier administrateur
    if (user.role === "ADMIN") {
      const nbAdmins = await prisma.user.count({ where: { role: "ADMIN" } });
      if (nbAdmins <= 1) {
        res.status(400).json({ message: "Impossible de supprimer le dernier compte administrateur" });
        return;
      }
    }

    // Prestataires dont les notes changent quand les avis de ce client disparaissent
    const avisDuClient = await prisma.avis.findMany({
      where: { auteurId: userId },
      select: { prestataireId: true },
    });
    const prestatairesARecalculer = [...new Set(avisDuClient.map((a: { prestataireId: string }) => a.prestataireId))];

    // Le schéma est en "onDelete: Cascade" : profil prestataire, réservations,
    // avis, favoris, conversations, messages, notifications et abonnements
    // sont supprimés avec le compte.
    await prisma.user.delete({ where: { id: userId } });

    // Recalcul des notes moyennes des prestataires concernés
    for (const prestataireId of prestatairesARecalculer) {
      const stats = await prisma.avis.aggregate({
        where: { prestataireId },
        _avg: { note: true },
        _count: { note: true },
      });
      await prisma.prestataire
        .update({
          where: { id: prestataireId },
          data: {
            notemoyenne: Math.round((stats._avg.note || 0) * 10) / 10,
            totalAvis: stats._count.note,
          },
        })
        .catch(() => {}); // prestataire déjà supprimé entre-temps : rien à faire
    }

    // Coupe les connexions temps réel encore ouvertes pour ce compte
    try {
      getIO().in(`user-${userId}`).disconnectSockets(true);
    } catch {
      // Socket.io pas initialisé (tests) : rien à faire
    }

    res.json({ message: "Votre compte et vos données ont été supprimés." });
  } catch (error) {
    console.error("Erreur suppression compte:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};