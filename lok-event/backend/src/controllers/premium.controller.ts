// backend/src/controllers/premium.controller.ts
import { Request, Response } from "express";
import { StatutAbonnement } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { emitToPremium, rafraichirRoomPremium, premiumEstActif } from "../lib/socket";
import { sendNotification } from "./notification.controller";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Packs Premium (montants en FCFA — ajuste-les selon ta grille tarifaire)
// ─────────────────────────────────────────────────────────────────────────────
const PACKS: Record<string, { montant: number; dureeMois: number; label: string }> = {
  MENSUEL: { montant: 25000, dureeMois: 1, label: "Pack Mensuel" },
  TRIMESTRIEL: { montant: 60000, dureeMois: 3, label: "Pack Trimestriel" },
  ANNUEL: { montant: 240000, dureeMois: 12, label: "Pack Annuel" },
};

const MOYENS_PAIEMENT = ["WAVE", "ORANGE_MONEY", "MTN", "ESPECES"];

// ─────────────────────────────────────────────────────────────────────────────
// GET /premium/packs — liste publique des packs (pour la page d'abonnement)
// ─────────────────────────────────────────────────────────────────────────────
export const getPacks = async (_req: Request, res: Response) => {
  res.json(
    Object.entries(PACKS).map(([code, p]) => ({
      code,
      label: p.label,
      montant: p.montant,
      dureeMois: p.dureeMois,
    }))
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /premium/statut — mon statut Premium (avec expiration paresseuse :
// si la date est dépassée, on rétrograde automatiquement, pas besoin de cron)
// ─────────────────────────────────────────────────────────────────────────────
export const getMonStatut = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, estPremium: true, premiumJusquau: true },
    });
    if (!user) {
      res.status(404).json({ message: "Utilisateur non trouvé" });
      return;
    }

    // Expiration paresseuse
    if (user.estPremium && user.premiumJusquau && user.premiumJusquau <= new Date()) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { estPremium: false },
        }),
        prisma.abonnement.updateMany({
          where: { userId: user.id, statut: "ACTIF", finLe: { lte: new Date() } },
          data: { statut: "EXPIRE" },
        }),
      ]);
      await rafraichirRoomPremium(user.id, false);
      res.json({ estPremium: false, premiumJusquau: null, expire: true });
      return;
    }

    // Demande en attente éventuelle (pour afficher "en cours de validation")
    const demandeEnAttente = await prisma.abonnement.findFirst({
      where: { userId: user.id, statut: "EN_ATTENTE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, pack: true, montant: true, createdAt: true },
    });

    res.json({
      estPremium: premiumEstActif(user),
      premiumJusquau: user.premiumJusquau,
      demandeEnAttente,
    });
  } catch (error) {
    console.error("Erreur statut premium:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /premium/souscrire — le client choisit un pack et déclare son paiement
// mobile money. L'abonnement est créé EN_ATTENTE jusqu'à validation admin.
// Body : { pack, moyenPaiement, referencePaiement? }
// ─────────────────────────────────────────────────────────────────────────────
export const souscrire = async (req: AuthRequest, res: Response) => {
  try {
    const { pack, moyenPaiement, referencePaiement } = req.body;

    const packInfo = PACKS[pack];
    if (!packInfo) {
      res.status(400).json({
        message: `Pack invalide. Valeurs acceptées : ${Object.keys(PACKS).join(", ")}`,
      });
      return;
    }

    if (!moyenPaiement || !MOYENS_PAIEMENT.includes(moyenPaiement)) {
      res.status(400).json({
        message: `Moyen de paiement invalide. Valeurs acceptées : ${MOYENS_PAIEMENT.join(", ")}`,
      });
      return;
    }

    // Déjà premium actif ?
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { estPremium: true, premiumJusquau: true },
    });
    if (user && premiumEstActif(user)) {
      res.status(400).json({
        message: "Vous êtes déjà Premium. Attendez l'expiration pour renouveler.",
      });
      return;
    }

    // Une seule demande en attente à la fois
    const demandeExistante = await prisma.abonnement.findFirst({
      where: { userId: req.user!.id, statut: "EN_ATTENTE" },
    });
    if (demandeExistante) {
      res.status(400).json({
        message: "Vous avez déjà une demande en cours de validation.",
      });
      return;
    }

    const abonnement = await prisma.abonnement.create({
      data: {
        userId: req.user!.id,
        pack,
        montant: packInfo.montant,
        moyenPaiement,
        referencePaiement: referencePaiement || undefined,
      },
    });

    // Notifier tous les ADMIN qu'une demande attend validation
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    for (const admin of admins) {
      sendNotification(
        admin.id,
        "PREMIUM",
        "Nouvelle demande Premium 💎",
        `${packInfo.label} (${packInfo.montant.toLocaleString("fr-FR")} FCFA) via ${moyenPaiement} — en attente de validation`,
        { abonnementId: abonnement.id }
      );
    }

    res.status(201).json({
      message:
        "Demande enregistrée. Votre Premium sera activé dès validation du paiement par notre équipe.",
      abonnement,
    });
  } catch (error) {
    console.error("Erreur souscription premium:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /premium/demandes — [ADMIN] liste des demandes (filtre ?statut=EN_ATTENTE)
// ─────────────────────────────────────────────────────────────────────────────
export const getDemandes = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "ADMIN") {
      res.status(403).json({ message: "Réservé aux administrateurs" });
      return;
    }

    // Validation + typage du filtre contre l'enum Prisma (sinon TS2322 :
    // un `string` quelconque n'est pas assignable à StatutAbonnement)
    const statutParam = req.query.statut as string | undefined;
    let statut: StatutAbonnement | undefined;
    if (statutParam) {
      if (!Object.values(StatutAbonnement).includes(statutParam as StatutAbonnement)) {
        res.status(400).json({
          message: `Statut invalide. Valeurs acceptées : ${Object.values(StatutAbonnement).join(", ")}`,
        });
        return;
      }
      statut = statutParam as StatutAbonnement;
    }

    const demandes = await prisma.abonnement.findMany({
      where: statut ? { statut } : {},
      include: {
        user: { select: { id: true, nom: true, prenom: true, email: true, telephone: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(demandes);
  } catch (error) {
    console.error("Erreur liste demandes premium:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /premium/demandes/:id/valider — [ADMIN] paiement vérifié → activation
// ─────────────────────────────────────────────────────────────────────────────
export const validerDemande = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "ADMIN") {
      res.status(403).json({ message: "Réservé aux administrateurs" });
      return;
    }

    const abonnementId = req.params.id as string;
    const abonnement = await prisma.abonnement.findUnique({
      where: { id: abonnementId },
    });
    if (!abonnement) {
      res.status(404).json({ message: "Demande non trouvée" });
      return;
    }
    if (abonnement.statut !== "EN_ATTENTE") {
      res.status(400).json({ message: `Cette demande est déjà ${abonnement.statut}` });
      return;
    }

    const packInfo = PACKS[abonnement.pack];
    const debut = new Date();
    const fin = new Date(debut);
    fin.setMonth(fin.getMonth() + (packInfo?.dureeMois || 1));

    await prisma.$transaction([
      prisma.abonnement.update({
        where: { id: abonnementId },
        data: { statut: "ACTIF", debutLe: debut, finLe: fin },
      }),
      prisma.user.update({
        where: { id: abonnement.userId },
        data: { estPremium: true, premiumJusquau: fin },
      }),
    ]);

    // Fait rejoindre la room aux sessions déjà connectées, sans reconnexion
    await rafraichirRoomPremium(abonnement.userId, true);

    sendNotification(
      abonnement.userId,
      "PREMIUM",
      "Bienvenue dans LOKEVENT Premium 💎",
      `Votre ${packInfo?.label || abonnement.pack} est actif jusqu'au ${fin.toLocaleDateString("fr-FR")}. Profitez de vos avantages exclusifs !`,
      { abonnementId }
    );

    res.json({ message: "Premium activé", finLe: fin });
  } catch (error) {
    console.error("Erreur validation premium:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /premium/demandes/:id/refuser — [ADMIN] paiement introuvable → refus
// ─────────────────────────────────────────────────────────────────────────────
export const refuserDemande = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "ADMIN") {
      res.status(403).json({ message: "Réservé aux administrateurs" });
      return;
    }

    const abonnementId = req.params.id as string;
    const { motif } = req.body;

    const abonnement = await prisma.abonnement.findUnique({
      where: { id: abonnementId },
    });
    if (!abonnement) {
      res.status(404).json({ message: "Demande non trouvée" });
      return;
    }
    if (abonnement.statut !== "EN_ATTENTE") {
      res.status(400).json({ message: `Cette demande est déjà ${abonnement.statut}` });
      return;
    }

    await prisma.abonnement.update({
      where: { id: abonnementId },
      data: { statut: "REFUSE" },
    });

    sendNotification(
      abonnement.userId,
      "PREMIUM",
      "Demande Premium non validée",
      motif ||
        "Nous n'avons pas pu vérifier votre paiement. Vérifiez la référence de transaction et réessayez, ou contactez le support.",
      { abonnementId }
    );

    res.json({ message: "Demande refusée" });
  } catch (error) {
    console.error("Erreur refus premium:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /premium/utilisateurs/:userId/desactiver — [ADMIN] révocation manuelle
// ─────────────────────────────────────────────────────────────────────────────
export const desactiverPremium = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "ADMIN") {
      res.status(403).json({ message: "Réservé aux administrateurs" });
      return;
    }

    const userId = req.params.userId as string;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, estPremium: true },
    });
    if (!user) {
      res.status(404).json({ message: "Utilisateur non trouvé" });
      return;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { estPremium: false, premiumJusquau: null },
      }),
      prisma.abonnement.updateMany({
        where: { userId, statut: "ACTIF" },
        data: { statut: "EXPIRE", finLe: new Date() },
      }),
    ]);

    await rafraichirRoomPremium(userId, false);

    res.json({ message: "Premium désactivé" });
  } catch (error) {
    console.error("Erreur désactivation premium:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /premium/annonce — [ADMIN] diffuse une annonce exclusive à TOUS les
// Premium : temps réel via la room + notification persistée pour chacun.
// Body : { titre, message, data? }
// ─────────────────────────────────────────────────────────────────────────────
export const envoyerAnnoncePremium = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "ADMIN") {
      res.status(403).json({ message: "Réservé aux administrateurs" });
      return;
    }

    const { titre, message, data } = req.body;
    if (!titre || !message) {
      res.status(400).json({ message: "Titre et message sont requis" });
      return;
    }

    // Tous les Premium actifs (connectés ou non : la notification persistée
    // sera vue à leur prochaine connexion)
    const premiums = await prisma.user.findMany({
      where: {
        estPremium: true,
        OR: [{ premiumJusquau: null }, { premiumJusquau: { gt: new Date() } }],
      },
      select: { id: true },
    });

    for (const p of premiums) {
      sendNotification(p.id, "PREMIUM", titre, message, data);
    }

    // Diffusion temps réel à la room (sessions connectées)
    emitToPremium("notification:premium", { titre, message, data });

    res.json({ message: `Annonce envoyée à ${premiums.length} membre(s) Premium` });
  } catch (error) {
    console.error("Erreur annonce premium:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};