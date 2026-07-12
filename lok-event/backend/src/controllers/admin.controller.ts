// backend/src/controllers/admin.controller.ts
import { Response } from "express";
import { prisma } from "../lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// STATS
// Distinction importante :
// - totalRevenue   = VRAIS revenus LOKEVENT : somme des abonnements Premium
//                    validés (ACTIF ou EXPIRE = argent réellement encaissé).
// - volumeAffaires = GMV : somme des budgets des prestations TERMINEES.
//                    C'est l'argent qui transite vers les prestataires,
//                    pas le chiffre d'affaires de la plateforme.
// ─────────────────────────────────────────────────────────────────────────────

/** Renvoie les 6 derniers mois sous forme de clés "YYYY-MM" + labels "juil. 26" */
function derniersMois(nb: number): { cle: string; label: string; debut: Date }[] {
  const mois: { cle: string; label: string; debut: Date }[] = [];
  const maintenant = new Date();
  for (let i = nb - 1; i >= 0; i--) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
    mois.push({
      cle: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      debut: d,
    });
  }
  return mois;
}

function cleMois(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export const getStats = async (req: any, res: Response) => {
  try {
    const mois = derniersMois(6);
    const debutPeriode = mois[0].debut;

    const [
      totalUsers,
      totalProviders,
      totalBookings,
      pendingProviders,
      todayBookings,
      totalPremium,
      abonnementsEnAttente,
      reservationsTerminees,
      abonnementsValides,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.prestataire.count(),
      prisma.reservation.count(),
      prisma.prestataire.count({ where: { verifie: false } }),
      prisma.reservation.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      // Membres Premium actuellement actifs
      prisma.user.count({
        where: {
          estPremium: true,
          OR: [{ premiumJusquau: null }, { premiumJusquau: { gt: new Date() } }],
        },
      }),
      // Demandes Premium à valider (à afficher dans le dashboard admin)
      prisma.abonnement.count({ where: { statut: "EN_ATTENTE" } }),
      // Volume d'affaires : prestations terminées avec budget renseigné
      prisma.reservation.findMany({
        where: { statut: "TERMINEE", budget: { not: null } },
        select: { budget: true, updatedAt: true },
      }),
      // Revenus réels : abonnements Premium validés (ACTIF ou déjà EXPIRE,
      // dans les deux cas l'argent a été encaissé)
      prisma.abonnement.findMany({
        where: { statut: { in: ["ACTIF", "EXPIRE"] } },
        select: { montant: true, debutLe: true, createdAt: true },
      }),
    ]);

    // Totaux
    const volumeAffaires = reservationsTerminees.reduce(
      (sum, r) => sum + (r.budget || 0),
      0
    );
    const totalRevenue = abonnementsValides.reduce((sum, a) => sum + a.montant, 0);

    // Évolution mensuelle sur 6 mois (revenus Premium + volume d'affaires)
    const revenusParCle = new Map<string, number>();
    const volumeParCle = new Map<string, number>();

    for (const a of abonnementsValides) {
      const date = a.debutLe || a.createdAt;
      if (date >= debutPeriode) {
        const cle = cleMois(date);
        revenusParCle.set(cle, (revenusParCle.get(cle) || 0) + a.montant);
      }
    }
    for (const r of reservationsTerminees) {
      // updatedAt ≈ date à laquelle la prestation est passée TERMINEE
      if (r.updatedAt >= debutPeriode) {
        const cle = cleMois(r.updatedAt);
        volumeParCle.set(cle, (volumeParCle.get(cle) || 0) + (r.budget || 0));
      }
    }

    const evolutionMensuelle = mois.map((m) => ({
      mois: m.label,
      revenus: revenusParCle.get(m.cle) || 0,
      volumeAffaires: volumeParCle.get(m.cle) || 0,
    }));

    res.json({
      totalUsers,
      totalProviders,
      totalBookings,
      totalRevenue,
      volumeAffaires,
      totalPremium,
      abonnementsEnAttente,
      pendingProviders,
      todayBookings,
      evolutionMensuelle,
    });
  } catch (error) {
    console.error("Erreur stats admin:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const getRecentBookings = async (req: any, res: Response) => {
  try {
    const bookings = await prisma.reservation.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { nom: true, prenom: true } },
        prestataire: { select: { nomEntreprise: true } },
      },
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============ PRESTATAIRES EN ATTENTE ============
export const getPendingProviders = async (req: any, res: Response) => {
  try {
    const providers = await prisma.prestataire.findMany({
      where: { verifie: false },
      orderBy: { createdAt: "desc" },
      include: { categorie: true },
    });
    res.json(providers);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const verifyProvider = async (req: any, res: Response) => {
  try {
    const updated = await prisma.prestataire.update({
      where: { id: req.params.id as string },
      data: { verifie: true },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const rejectProvider = async (req: any, res: Response) => {
  try {
    const updated = await prisma.prestataire.update({
      where: { id: req.params.id as string },
      data: { actif: false },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============ TOUS LES PRESTATAIRES ============
export const getAllProviders = async (req: any, res: Response) => {
  try {
    const { search, verifie, actif, page = "1", limit = "20" } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (search) {
      where.nomEntreprise = { contains: search as string, mode: "insensitive" };
    }
    if (verifie !== undefined) where.verifie = verifie === "true";
    if (actif !== undefined) where.actif = actif === "true";

    const [providers, total] = await Promise.all([
      prisma.prestataire.findMany({
        where,
        include: {
          categorie: true,
          user: { select: { nom: true, prenom: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.prestataire.count({ where }),
    ]);

    res.json({
      providers,
      pagination: {
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
        currentPage: parseInt(page as string),
        limit: parseInt(limit as string),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const toggleProviderActive = async (req: any, res: Response) => {
  try {
    const provider = await prisma.prestataire.findUnique({
      where: { id: req.params.id as string },
    });
    if (!provider) {
      res.status(404).json({ message: "Prestataire non trouvé" });
      return;
    }
    const updated = await prisma.prestataire.update({
      where: { id: req.params.id as string },
      data: { actif: !provider.actif },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============ UTILISATEURS ============
export const getAllUsers = async (req: any, res: Response) => {
  try {
    const { search, role, page = "1", limit = "20" } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (search) {
      where.OR = [
        { nom: { contains: search as string, mode: "insensitive" } },
        { prenom: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
      ];
    }
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          role: true,
          estPremium: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
        currentPage: parseInt(page as string),
        limit: parseInt(limit as string),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};