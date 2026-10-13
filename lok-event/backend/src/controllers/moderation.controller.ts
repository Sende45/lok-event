// lok-event/backend/src/controllers/moderation.controller.ts
//
// Signaler et bloquer (exigé par Google Play et l'App Store pour les apps
// où les utilisateurs publient du contenu et s'envoient des messages).
//
// Utilisateurs connectés :
//   POST   /api/moderation/signalements          { cibleType, cibleId, motif, details? }
//   GET    /api/moderation/blocages              → mes blocages
//   POST   /api/moderation/blocages              { utilisateurId? , prestataireId? }
//   DELETE /api/moderation/blocages/:utilisateurId
//
// Admins :
//   GET    /api/moderation/admin/signalements?statut=EN_ATTENTE
//   PATCH  /api/moderation/admin/signalements/:id
//          { statut: "TRAITE" | "REJETE", noteAdmin?, supprimerContenu?, desactiverCompte? }
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { getIO } from "../lib/socket";
import { sendNotification } from "./notification.controller";

const CIBLES = ["UTILISATEUR", "PRESTATAIRE", "AVIS", "MESSAGE"] as const;
const MOTIFS = ["FAUX_PROFIL", "ARNAQUE", "CONTENU_INAPPROPRIE", "HARCELEMENT", "SPAM", "AUTRE"] as const;
type Cible = (typeof CIBLES)[number];
type Motif = (typeof MOTIFS)[number];

const LIBELLES_MOTIF: Record<Motif, string> = {
  FAUX_PROFIL: "Faux profil",
  ARNAQUE: "Arnaque",
  CONTENU_INAPPROPRIE: "Contenu inapproprié",
  HARCELEMENT: "Harcèlement",
  SPAM: "Spam",
  AUTRE: "Autre",
};

/**
 * Retrouve le propriétaire du contenu signalé et une copie de ce contenu.
 * Renvoie null si le contenu n'existe pas ou si l'auteur du signalement
 * n'a pas le droit de le voir (message d'une conversation dont il ne fait pas partie).
 */
async function resoudreCible(
  cibleType: Cible,
  cibleId: string,
  auteurId: string
): Promise<{ proprietaireId: string; apercu: string } | null> {
  switch (cibleType) {
    case "UTILISATEUR": {
      const user = await prisma.user.findUnique({
        where: { id: cibleId },
        select: { id: true, prenom: true, nom: true },
      });
      return user ? { proprietaireId: user.id, apercu: `${user.prenom} ${user.nom}` } : null;
    }
    case "PRESTATAIRE": {
      const p = await prisma.prestataire.findUnique({
        where: { id: cibleId },
        select: { userId: true, nomEntreprise: true },
      });
      return p ? { proprietaireId: p.userId, apercu: p.nomEntreprise } : null;
    }
    case "AVIS": {
      const avis = await prisma.avis.findUnique({
        where: { id: cibleId },
        select: { auteurId: true, note: true, commentaire: true },
      });
      return avis
        ? { proprietaireId: avis.auteurId, apercu: `${avis.note}/5 — ${avis.commentaire ?? ""}`.slice(0, 500) }
        : null;
    }
    case "MESSAGE": {
      const message = await prisma.message.findUnique({
        where: { id: cibleId },
        select: {
          senderId: true,
          contenu: true,
          conversation: { select: { clientId: true, prestataire: { select: { userId: true } } } },
        },
      });
      if (!message) return null;
      // Seul un participant de la conversation peut signaler un de ses messages
      const participants = [message.conversation.clientId, message.conversation.prestataire.userId];
      if (!participants.includes(auteurId)) return null;
      return { proprietaireId: message.senderId, apercu: message.contenu.slice(0, 500) };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/moderation/signalements
// ─────────────────────────────────────────────────────────────────────────────
export const creerSignalement = async (req: Request, res: Response) => {
  try {
    const auteurId = req.user!.id;
    const { cibleType, cibleId, motif, details } = req.body ?? {};

    if (!CIBLES.includes(cibleType) || typeof cibleId !== "string" || !cibleId) {
      res.status(400).json({ message: "Contenu à signaler invalide" });
      return;
    }
    if (!MOTIFS.includes(motif)) {
      res.status(400).json({ message: "Choisissez un motif de signalement" });
      return;
    }
    const detailsPropres =
      typeof details === "string" && details.trim() ? details.trim().slice(0, 1000) : null;

    const cible = await resoudreCible(cibleType, cibleId, auteurId);
    if (!cible) {
      res.status(404).json({ message: "Contenu introuvable" });
      return;
    }
    if (cible.proprietaireId === auteurId) {
      res.status(400).json({ message: "Vous ne pouvez pas signaler votre propre contenu" });
      return;
    }

    // Un seul signalement par personne et par contenu : un deuxième envoi
    // ne crée pas de doublon, on répond simplement que c'est déjà fait
    const existant = await prisma.signalement.findUnique({
      where: { auteurId_cibleType_cibleId: { auteurId, cibleType, cibleId } },
      select: { id: true },
    });
    if (existant) {
      res.json({ message: "Vous avez déjà signalé ce contenu. Notre équipe l'examine." });
      return;
    }

    const signalement = await prisma.signalement.create({
      data: {
        auteurId,
        cibleType,
        cibleId,
        utilisateurSignaleId: cible.proprietaireId,
        motif,
        details: detailsPropres,
        apercu: cible.apercu,
      },
    });

    // Prévenir les admins
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    for (const admin of admins) {
      sendNotification(
        admin.id,
        "SIGNALEMENT",
        "Nouveau signalement 🚩",
        `${LIBELLES_MOTIF[motif as Motif]} — ${cible.apercu.slice(0, 80)}`,
        { signalementId: signalement.id }
      );
    }

    res.status(201).json({
      message: "Merci, votre signalement a été envoyé. Notre équipe va l'examiner.",
    });
  } catch (error) {
    console.error("Erreur signalement:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/moderation/blocages — les utilisateurs que j'ai bloqués
// ─────────────────────────────────────────────────────────────────────────────
export const mesBlocages = async (req: Request, res: Response) => {
  try {
    const blocages = await prisma.blocage.findMany({
      where: { bloqueurId: req.user!.id },
      include: {
        bloque: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            avatar: true,
            prestataire: { select: { id: true, nomEntreprise: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(
      blocages.map((b) => ({
        id: b.id,
        createdAt: b.createdAt,
        utilisateur: {
          id: b.bloque.id,
          // Pour un prestataire, on affiche le nom de son entreprise
          nom: b.bloque.prestataire?.nomEntreprise ?? `${b.bloque.prenom} ${b.bloque.nom}`.trim(),
          avatar: b.bloque.avatar,
          prestataireId: b.bloque.prestataire?.id ?? null,
        },
      }))
    );
  } catch (error) {
    console.error("Erreur liste blocages:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/moderation/blocages — { utilisateurId } ou { prestataireId }
// ─────────────────────────────────────────────────────────────────────────────
export const bloquer = async (req: Request, res: Response) => {
  try {
    const bloqueurId = req.user!.id;
    let bloqueId: string | null =
      typeof req.body?.utilisateurId === "string" ? req.body.utilisateurId : null;

    // Depuis une fiche prestataire, l'app ne connaît que l'id de la fiche
    if (!bloqueId && typeof req.body?.prestataireId === "string") {
      const p = await prisma.prestataire.findUnique({
        where: { id: req.body.prestataireId },
        select: { userId: true },
      });
      bloqueId = p?.userId ?? null;
    }

    if (!bloqueId) {
      res.status(400).json({ message: "Utilisateur à bloquer introuvable" });
      return;
    }
    if (bloqueId === bloqueurId) {
      res.status(400).json({ message: "Vous ne pouvez pas vous bloquer vous-même" });
      return;
    }

    const cible = await prisma.user.findUnique({ where: { id: bloqueId }, select: { role: true } });
    if (!cible) {
      res.status(404).json({ message: "Utilisateur introuvable" });
      return;
    }
    if (cible.role === "ADMIN") {
      res.status(400).json({ message: "Impossible de bloquer l'équipe LOKEVENT" });
      return;
    }

    await prisma.blocage.upsert({
      where: { bloqueurId_bloqueId: { bloqueurId, bloqueId } },
      update: {},
      create: { bloqueurId, bloqueId },
    });

    res.status(201).json({
      message: "Utilisateur bloqué. Vous ne recevrez plus ses messages ni ses demandes.",
      utilisateurId: bloqueId,
    });
  } catch (error) {
    console.error("Erreur blocage:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/moderation/blocages/:utilisateurId
// ─────────────────────────────────────────────────────────────────────────────
export const debloquer = async (req: Request, res: Response) => {
  try {
    await prisma.blocage.deleteMany({
      where: { bloqueurId: req.user!.id, bloqueId: req.params.utilisateurId as string },
    });
    res.json({ message: "Utilisateur débloqué" });
  } catch (error) {
    console.error("Erreur déblocage:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// [ADMIN] GET /api/moderation/admin/signalements?statut=EN_ATTENTE
// ─────────────────────────────────────────────────────────────────────────────
export const listerSignalements = async (req: Request, res: Response) => {
  try {
    const statut = req.query.statut as string | undefined;
    const statutsValides = ["EN_ATTENTE", "TRAITE", "REJETE"];
    if (statut && !statutsValides.includes(statut)) {
      res.status(400).json({ message: `Statut invalide. Valeurs : ${statutsValides.join(", ")}` });
      return;
    }

    const signalements = await prisma.signalement.findMany({
      where: statut ? { statut: statut as "EN_ATTENTE" | "TRAITE" | "REJETE" } : {},
      include: {
        auteur: { select: { id: true, nom: true, prenom: true, email: true } },
        utilisateurSignale: {
          select: { id: true, nom: true, prenom: true, email: true, actif: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Nombre total de signalements reçus par chaque utilisateur visé
    // (aide l'admin à repérer les récidivistes)
    const idsVises = [
      ...new Set(signalements.map((s) => s.utilisateurSignaleId).filter(Boolean)),
    ] as string[];
    const compteurs = await prisma.signalement.groupBy({
      by: ["utilisateurSignaleId"],
      where: { utilisateurSignaleId: { in: idsVises } },
      _count: true,
    });
    const totalParUser = new Map(compteurs.map((c) => [c.utilisateurSignaleId, c._count]));

    res.json(
      signalements.map((s) => ({
        ...s,
        totalSignalementsUtilisateur: s.utilisateurSignaleId
          ? totalParUser.get(s.utilisateurSignaleId) ?? 1
          : 0,
      }))
    );
  } catch (error) {
    console.error("Erreur liste signalements:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// [ADMIN] PATCH /api/moderation/admin/signalements/:id
// Body : { statut: "TRAITE" | "REJETE", noteAdmin?, supprimerContenu?, desactiverCompte? }
// ─────────────────────────────────────────────────────────────────────────────
export const traiterSignalement = async (req: Request, res: Response) => {
  try {
    const { statut, noteAdmin, supprimerContenu, desactiverCompte } = req.body ?? {};
    if (!["TRAITE", "REJETE"].includes(statut)) {
      res.status(400).json({ message: "Statut invalide (TRAITE ou REJETE)" });
      return;
    }

    const signalement = await prisma.signalement.findUnique({
      where: { id: req.params.id as string },
    });
    if (!signalement) {
      res.status(404).json({ message: "Signalement introuvable" });
      return;
    }

    const actions: string[] = [];

    if (statut === "TRAITE" && supprimerContenu === true) {
      if (signalement.cibleType === "MESSAGE") {
        await prisma.message.deleteMany({ where: { id: signalement.cibleId } });
        actions.push("message supprimé");
      } else if (signalement.cibleType === "AVIS") {
        const avis = await prisma.avis.findUnique({
          where: { id: signalement.cibleId },
          select: { prestataireId: true },
        });
        if (avis) {
          await prisma.avis.delete({ where: { id: signalement.cibleId } });
          // Recalcul de la note du prestataire concerné
          const stats = await prisma.avis.aggregate({
            where: { prestataireId: avis.prestataireId },
            _avg: { note: true },
            _count: { note: true },
          });
          await prisma.prestataire.update({
            where: { id: avis.prestataireId },
            data: {
              notemoyenne: Math.round((stats._avg.note || 0) * 10) / 10,
              totalAvis: stats._count.note,
            },
          });
          actions.push("avis supprimé");
        }
      } else if (signalement.cibleType === "PRESTATAIRE") {
        await prisma.prestataire.updateMany({
          where: { id: signalement.cibleId },
          data: { actif: false },
        });
        actions.push("fiche prestataire masquée");
      }
    }

    if (statut === "TRAITE" && desactiverCompte === true && signalement.utilisateurSignaleId) {
      const vise = await prisma.user.findUnique({
        where: { id: signalement.utilisateurSignaleId },
        select: { role: true },
      });
      if (vise && vise.role !== "ADMIN") {
        await prisma.$transaction([
          // actif=false + tokenVersion+1 : toutes ses sessions sont coupées
          prisma.user.update({
            where: { id: signalement.utilisateurSignaleId },
            data: { actif: false, tokenVersion: { increment: 1 } },
          }),
          prisma.prestataire.updateMany({
            where: { userId: signalement.utilisateurSignaleId },
            data: { actif: false },
          }),
        ]);
        try {
          getIO().in(`user-${signalement.utilisateurSignaleId}`).disconnectSockets(true);
        } catch {
          // Socket.io non initialisé (tests) : rien à faire
        }
        actions.push("compte désactivé");
      }
    }

    const misAJour = await prisma.signalement.update({
      where: { id: signalement.id },
      data: {
        statut,
        noteAdmin: typeof noteAdmin === "string" ? noteAdmin.trim().slice(0, 1000) || null : null,
        traiteLe: new Date(),
      },
    });

    // Retour à l'auteur du signalement (sans détailler la sanction)
    sendNotification(
      signalement.auteurId,
      "SIGNALEMENT",
      "Votre signalement a été examiné",
      statut === "TRAITE"
        ? "Merci : notre équipe a pris les mesures nécessaires."
        : "Merci : après examen, ce contenu respecte nos règles.",
      { signalementId: signalement.id }
    );

    res.json({ signalement: misAJour, actions });
  } catch (error) {
    console.error("Erreur traitement signalement:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};