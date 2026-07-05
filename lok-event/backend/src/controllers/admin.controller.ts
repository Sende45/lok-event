import { Response } from "express";
import { prisma } from "../lib/prisma";

export const getStats = async (req: any, res: Response) => {
  try {
    const [
      totalUsers,
      totalProviders,
      totalBookings,
      pendingProviders,
      todayBookings,
      reservationsAvecBudget,
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
      prisma.reservation.findMany({
        where: { statut: "TERMINEE", budget: { not: null } },
        select: { budget: true },
      }),
    ]);

    const totalRevenue = reservationsAvecBudget.reduce(
      (sum, r) => sum + (r.budget || 0),
      0
    );

    res.json({
      totalUsers,
      totalProviders,
      totalBookings,
      totalRevenue,
      pendingProviders,
      todayBookings,
    });
  } catch (error) {
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