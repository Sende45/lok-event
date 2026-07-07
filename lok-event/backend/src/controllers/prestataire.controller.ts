// backend/src/controllers/prestataire.controller.ts
import { Request, Response } from "express";
import multer from "multer";
import FormData from "form-data";
import { prisma } from "../lib/prisma";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// ============ HELPERS GÉOLOCALISATION ============
function parseCoordinate(value: unknown, type: "lat" | "lng"): number | null {
  if (value === undefined || value === null || value === "") return null;
  const num = typeof value === "number" ? value : parseFloat(value as string);
  if (isNaN(num)) return null;
  if (type === "lat" && (num < -90 || num > 90)) return null;
  if (type === "lng" && (num < -180 || num > 180)) return null;
  return num;
}

// Normalise pour comparaison : minuscules + sans accents
function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Connaissance locale : quartiers d'Abidjan → commune.
// Chercher un quartier remonte aussi tous les prestataires de sa commune.
// Clés en minuscules SANS accents. Liste extensible librement.
const QUARTIERS_COMMUNES: Record<string, string> = {
  // Cocody
  blockhaus: "Cocody",
  riviera: "Cocody",
  angre: "Cocody",
  plateaux: "Cocody", // Deux-Plateaux ("plateau" singulier = la commune du Plateau)
  danga: "Cocody",
  ambassades: "Cocody",
  vallon: "Cocody",
  palmeraie: "Cocody",
  mpouto: "Cocody",
  bonoumin: "Cocody",
  // Yopougon
  niangon: "Yopougon",
  sideci: "Yopougon",
  selmer: "Yopougon",
  maroc: "Yopougon",
  koweit: "Yopougon",
  micao: "Yopougon",
  // Marcory
  bietry: "Marcory",
  anoumabo: "Marcory",
  remblais: "Marcory",
  // Treichville
  arras: "Treichville",
  // Adjamé
  williamsville: "Adjamé",
  // Abobo
  avocatier: "Abobo",
  dokui: "Abobo",
  // Port-Bouët
  vridi: "Port-Bouët",
  gonzagueville: "Port-Bouët",
  // Koumassi
  prodomo: "Koumassi",
};

// "zone 4" (Marcory) et "zone 3" (Treichville) : quartiers en deux mots,
// détectés sur la phrase complète avant découpage
const QUARTIERS_MULTIMOTS: { motif: RegExp; commune: string }[] = [
  { motif: /zone\s*4/i, commune: "Marcory" },
  { motif: /zone\s*3/i, commune: "Treichville" },
  { motif: /deux[\s-]*plateaux/i, commune: "Cocody" },
  { motif: /toits[\s-]*rouges/i, commune: "Yopougon" },
];

// ============ CRÉATION DU PROFIL ============
export const createPrestataireProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      categorieId,
      nomEntreprise,
      description,
      quartier,
      commune,
      ville,
      latitude,
      longitude,
      telephone,
      whatsapp,
      prixMin,
      prixMax,
    } = req.body;

    const existant = await prisma.prestataire.findUnique({ where: { userId } });
    if (existant) {
      res.status(400).json({ message: "Un profil prestataire existe déjà" });
      return;
    }

    const lat = parseCoordinate(latitude, "lat");
    const lng = parseCoordinate(longitude, "lng");

    const prestataire = await prisma.prestataire.create({
      data: {
        userId: userId!,
        categorieId,
        nomEntreprise,
        description,
        quartier,
        commune: commune || undefined,
        ville: ville || "Abidjan",
        latitude: lat ?? undefined,
        longitude: lng ?? undefined,
        telephone,
        whatsapp,
        prixMin: prixMin ? parseFloat(prixMin) : undefined,
        prixMax: prixMax ? parseFloat(prixMax) : undefined,
      },
      include: { categorie: true },
    });

    res.status(201).json(prestataire);
  } catch (error) {
    console.error("Erreur création profil:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============ PHOTOS ============
export const addPrestatairePhoto = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { url } = req.body;

    if (!url) {
      res.status(400).json({ message: "URL manquante" });
      return;
    }

    const prestataire = await prisma.prestataire.findUnique({ where: { userId } });
    if (!prestataire) {
      res.status(404).json({ message: "Prestataire non trouvé" });
      return;
    }

    const updated = await prisma.prestataire.update({
      where: { id: prestataire.id },
      data: { photos: { push: url } },
    });

    res.json(updated);
  } catch (error) {
    console.error("Erreur ajout photo:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const removePrestatairePhoto = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { url } = req.body;

    const prestataire = await prisma.prestataire.findUnique({ where: { userId } });
    if (!prestataire) {
      res.status(404).json({ message: "Prestataire non trouvé" });
      return;
    }

    const updated = await prisma.prestataire.update({
      where: { id: prestataire.id },
      data: { photos: prestataire.photos.filter((p) => p !== url) },
    });

    res.json(updated);
  } catch (error) {
    console.error("Erreur suppression photo:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============ UPLOAD SÉCURISÉ VERS IMGBB (clé jamais exposée au client) ============
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter: (_req, file, cb) => {
    const typesAutorises = ["image/jpeg", "image/png", "image/webp"];
    if (!typesAutorises.includes(file.mimetype)) {
      cb(new Error("Format d'image non autorisé (JPEG, PNG ou WebP uniquement)"));
      return;
    }
    cb(null, true);
  },
});

interface ImgbbResponse {
  success: boolean;
  data?: { url: string };
}

export const uploadPhotoToImgbb = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "Aucun fichier envoyé" });
      return;
    }

    const params = new URLSearchParams();
    params.append("key", process.env.IMGBB_API_KEY!);
    params.append("image", req.file.buffer.toString("base64"));

    const imgbbRes = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const data = (await imgbbRes.json()) as ImgbbResponse;

    if (!data.success || !data.data) {
      console.error("Réponse Imgbb en échec:", JSON.stringify(data));
      res.status(502).json({ message: "Échec de l'upload vers Imgbb" });
      return;
    }

    res.json({ url: data.data.url });
  } catch (error) {
    console.error("Erreur upload photo:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============ DASHBOARD PRINCIPAL ============
export const getPrestataireDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const prestataire = await prisma.prestataire.findUnique({
      where: { userId },
      include: {
        categorie: true,
        user: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            avatar: true,
            telephone: true,
          },
        },
      },
    });

    if (!prestataire) {
      res.status(404).json({ message: "Prestataire non trouvé" });
      return;
    }

    const stats = await getPrestataireStatsData(prestataire.id);

    const upcomingBookings = await prisma.reservation.findMany({
      where: {
        prestataireId: prestataire.id,
        dateEvenement: { gte: new Date() },
        statut: { in: ["EN_ATTENTE", "CONFIRMEE"] },
      },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            avatar: true,
            email: true,
            telephone: true,
          },
        },
      },
      orderBy: { dateEvenement: "asc" },
      take: 5,
    });

    const recentReviews = await prisma.avis.findMany({
      where: { prestataireId: prestataire.id },
      include: {
        auteur: {
          select: { id: true, nom: true, prenom: true, avatar: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    res.json({ prestataire, stats, upcomingBookings, recentReviews });
  } catch (error) {
    console.error("Erreur dashboard:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============ STATISTIQUES ============
export const getPrestataireStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const prestataire = await prisma.prestataire.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!prestataire) {
      res.status(404).json({ message: "Prestataire non trouvé" });
      return;
    }

    const stats = await getPrestataireStatsData(prestataire.id);
    res.json(stats);
  } catch (error) {
    console.error("Erreur stats:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

async function getPrestataireStatsData(prestataireId: string) {
  const [
    totalBookings,
    completedBookings,
    pendingBookings,
    cancelledBookings,
    totalRevenue,
    averageRating,
    totalReviews,
  ] = await Promise.all([
    prisma.reservation.count({ where: { prestataireId } }),
    prisma.reservation.count({ where: { prestataireId, statut: "TERMINEE" } }),
    prisma.reservation.count({ where: { prestataireId, statut: "EN_ATTENTE" } }),
    prisma.reservation.count({ where: { prestataireId, statut: "ANNULEE" } }),
    prisma.reservation.aggregate({
      where: { prestataireId, statut: "TERMINEE" },
      _sum: { budget: true },
    }),
    prisma.avis.aggregate({
      where: { prestataireId },
      _avg: { note: true },
    }),
    prisma.avis.count({ where: { prestataireId } }),
  ]);

  return {
    totalBookings,
    completedBookings,
    pendingBookings,
    cancelledBookings,
    totalRevenue: totalRevenue._sum.budget || 0,
    averageRating: averageRating._avg.note || 0,
    totalReviews,
    monthlyData: await getMonthlyBookingData(prestataireId),
  };
}

async function getMonthlyBookingData(prestataireId: string) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const bookings = await prisma.reservation.findMany({
    where: { prestataireId, dateEvenement: { gte: sixMonthsAgo } },
    select: { dateEvenement: true, budget: true },
  });

  const monthlyData: { [key: string]: { count: number; revenue: number } } = {};

  bookings.forEach((booking) => {
    const monthKey = booking.dateEvenement.toLocaleString("fr-FR", {
      month: "short",
      year: "numeric",
    });
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { count: 0, revenue: 0 };
    }
    monthlyData[monthKey].count++;
    monthlyData[monthKey].revenue += booking.budget || 0;
  });

  return Object.entries(monthlyData).map(([month, data]) => ({
    month,
    count: data.count,
    revenue: data.revenue,
  }));
}

// ============ PROFIL PRESTATAIRE ============
export const getPrestataireProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const prestataire = await prisma.prestataire.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            avatar: true,
            telephone: true,
            createdAt: true,
          },
        },
        categorie: true,
        _count: { select: { reservations: true, avis: true } },
      },
    });

    if (!prestataire) {
      res.status(404).json({ message: "Prestataire non trouvé" });
      return;
    }

    res.json(prestataire);
  } catch (error) {
    console.error("Erreur profile:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const updatePrestataireProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      nomEntreprise,
      description,
      quartier,
      commune,
      ville,
      latitude,
      longitude,
      telephone,
      whatsapp,
      prixMin,
      prixMax,
      categorieId,
      nom,
      prenom,
      email,
      avatar,
    } = req.body;

    const prestataire = await prisma.prestataire.findUnique({ where: { userId } });

    if (!prestataire) {
      res.status(404).json({ message: "Prestataire non trouvé" });
      return;
    }

    const lat = parseCoordinate(latitude, "lat");
    const lng = parseCoordinate(longitude, "lng");

    const updatedPrestataire = await prisma.prestataire.update({
      where: { id: prestataire.id },
      data: {
        nomEntreprise: nomEntreprise || undefined,
        description: description || undefined,
        quartier: quartier || undefined,
        commune: commune || undefined,
        ville: ville || undefined,
        latitude: lat ?? undefined,
        longitude: lng ?? undefined,
        telephone: telephone || undefined,
        whatsapp: whatsapp || undefined,
        prixMin: prixMin ? parseFloat(prixMin) : undefined,
        prixMax: prixMax ? parseFloat(prixMax) : undefined,
        categorieId: categorieId || undefined,
      },
      include: { categorie: true },
    });

    if (nom || prenom || email || avatar) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          nom: nom || undefined,
          prenom: prenom || undefined,
          email: email || undefined,
          avatar: avatar || undefined,
        },
      });
    }

    res.json({ message: "Profil mis à jour avec succès", prestataire: updatedPrestataire });
  } catch (error) {
    console.error("Erreur update profile:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============ RÉSERVATIONS ============
export const getPrestataireBookings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { statut, page = "1", limit = "10" } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const prestataire = await prisma.prestataire.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!prestataire) {
      res.status(404).json({ message: "Prestataire non trouvé" });
      return;
    }

    const where: any = { prestataireId: prestataire.id };
    if (statut) where.statut = statut;

    const [bookings, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              avatar: true,
              email: true,
              telephone: true,
            },
          },
        },
        orderBy: { dateEvenement: "desc" },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.reservation.count({ where }),
    ]);

    res.json({
      bookings,
      pagination: {
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
        currentPage: parseInt(page as string),
        limit: parseInt(limit as string),
      },
    });
  } catch (error) {
    console.error("Erreur bookings:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const updateBookingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const bookingId = req.params.bookingId as string;
    const { statut } = req.body;

    const booking = await prisma.reservation.findFirst({
      where: { id: bookingId, prestataire: { userId } },
    });

    if (!booking) {
      res.status(404).json({ message: "Réservation non trouvée ou non autorisée" });
      return;
    }

    const updatedBooking = await prisma.reservation.update({
      where: { id: bookingId },
      data: { statut },
      include: {
        client: {
          select: { id: true, nom: true, prenom: true, email: true, telephone: true },
        },
      },
    });

    res.json({ message: "Statut mis à jour avec succès", booking: updatedBooking });
  } catch (error) {
    console.error("Erreur update booking status:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============ AVIS ============
export const getPrestataireReviews = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = "1", limit = "10" } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const prestataire = await prisma.prestataire.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!prestataire) {
      res.status(404).json({ message: "Prestataire non trouvé" });
      return;
    }

    const [reviews, total, stats] = await Promise.all([
      prisma.avis.findMany({
        where: { prestataireId: prestataire.id },
        include: {
          auteur: { select: { id: true, nom: true, prenom: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.avis.count({ where: { prestataireId: prestataire.id } }),
      prisma.avis.aggregate({
        where: { prestataireId: prestataire.id },
        _avg: { note: true },
        _count: true,
      }),
    ]);

    const distribution = await getRatingDistribution(prestataire.id);

    res.json({
      reviews,
      stats: {
        averageRating: stats._avg.note || 0,
        totalReviews: stats._count,
        distribution,
      },
      pagination: {
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
        currentPage: parseInt(page as string),
        limit: parseInt(limit as string),
      },
    });
  } catch (error) {
    console.error("Erreur reviews:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

async function getRatingDistribution(prestataireId: string) {
  const distribution = await prisma.avis.groupBy({
    by: ["note"],
    where: { prestataireId },
    _count: true,
  });

  const result: { [key: number]: number } = {};
  for (let i = 1; i <= 5; i++) {
    const found = distribution.find((d) => d.note === i);
    result[i] = found ? found._count : 0;
  }
  return result;
}

// ============ ANALYTIQUES ============
export const getPrestataireAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { period = "month" } = req.query;

    const prestataire = await prisma.prestataire.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!prestataire) {
      res.status(404).json({ message: "Prestataire non trouvé" });
      return;
    }

    const startDate = new Date();
    if (period === "week") startDate.setDate(startDate.getDate() - 7);
    else if (period === "month") startDate.setMonth(startDate.getMonth() - 1);
    else if (period === "year") startDate.setFullYear(startDate.getFullYear() - 1);

    const [bookingsTrend, revenueTrend, clientRetention, peakHours] = await Promise.all([
      getBookingsTrend(prestataire.id, startDate),
      getRevenueTrend(prestataire.id, startDate),
      getClientRetention(prestataire.id),
      getPeakHours(prestataire.id),
    ]);

    res.json({ period, bookingsTrend, revenueTrend, clientRetention, peakHours });
  } catch (error) {
    console.error("Erreur analytics:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

async function getBookingsTrend(prestataireId: string, startDate: Date) {
  const bookings = await prisma.reservation.findMany({
    where: { prestataireId, dateEvenement: { gte: startDate } },
    select: { dateEvenement: true, statut: true },
    orderBy: { dateEvenement: "asc" },
  });

  const trend: { [key: string]: number } = {};
  bookings.forEach((booking) => {
    const dateKey = booking.dateEvenement.toISOString().split("T")[0];
    trend[dateKey] = (trend[dateKey] || 0) + 1;
  });

  return Object.entries(trend).map(([date, count]) => ({ date, count }));
}

async function getRevenueTrend(prestataireId: string, startDate: Date) {
  const revenue = await prisma.reservation.findMany({
    where: { prestataireId, dateEvenement: { gte: startDate }, statut: "TERMINEE" },
    select: { dateEvenement: true, budget: true },
    orderBy: { dateEvenement: "asc" },
  });

  const trend: { [key: string]: number } = {};
  revenue.forEach((item) => {
    const dateKey = item.dateEvenement.toISOString().split("T")[0];
    trend[dateKey] = (trend[dateKey] || 0) + (item.budget || 0);
  });

  return Object.entries(trend).map(([date, revenue]) => ({ date, revenue }));
}

async function getClientRetention(prestataireId: string) {
  const allClients = await prisma.reservation.groupBy({
    by: ["clientId"],
    where: { prestataireId },
  });

  const grouped = await prisma.reservation.groupBy({
    by: ["clientId"],
    where: { prestataireId },
    _count: true,
  });

  const returningClients = grouped.filter((g) => g._count >= 2);

  return {
    returningClients: returningClients.length,
    totalClients: allClients.length,
    retentionRate:
      allClients.length > 0 ? (returningClients.length / allClients.length) * 100 : 0,
  };
}

async function getPeakHours(prestataireId: string) {
  const bookings = await prisma.reservation.findMany({
    where: { prestataireId },
    select: { dateEvenement: true },
  });

  const hourCount: { [key: number]: number } = {};
  for (let i = 0; i < 24; i++) hourCount[i] = 0;

  bookings.forEach((booking) => {
    const hour = booking.dateEvenement.getHours();
    hourCount[hour] = (hourCount[hour] || 0) + 1;
  });

  return hourCount;
}

// ============ ROUTES PUBLIQUES ============
export const getPrestatairesPublic = async (req: Request, res: Response) => {
  try {
    const {
      categorie,
      tag,
      quartier,
      commune,
      ville,
      search,
      page = "1",
      limit = "12",
    } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    let ids: string[] | null = null;

    if (search) {
      // Recherche multi-mots : chaque mot doit matcher au moins un champ
      // (nom, description, quartier, commune, ville, catégorie ou tag).
      // Ex: "décoration cocody" => "décoration" matche la catégorie,
      // "cocody" matche la commune => intersection = décorateurs de Cocody
      const searchStr = search as string;

      // Quartiers en plusieurs mots ("zone 4", "deux plateaux") : on détecte
      // sur la phrase entière, on retire le motif et on garde la commune
      let resteRecherche = searchStr;
      const communesDetectees: string[] = [];
      for (const { motif, commune } of QUARTIERS_MULTIMOTS) {
        if (motif.test(resteRecherche)) {
          communesDetectees.push(commune);
          resteRecherche = resteRecherche.replace(motif, " ");
        }
      }

      const words = resteRecherche
        .trim()
        .split(/\s+/)
        .filter((w) => w.length >= 2);

      for (const word of words) {
        const pattern = "%" + word + "%";

        const matches = await prisma.$queryRaw<{ id: string }[]>`
          SELECT p.id FROM prestataires p
          LEFT JOIN categories c ON c.id = p."categorieId"
          WHERE p.actif = true AND (
            unaccent(lower(p."nomEntreprise")) LIKE unaccent(lower(${pattern})) OR
            unaccent(lower(COALESCE(p.description, ''))) LIKE unaccent(lower(${pattern})) OR
            unaccent(lower(p.quartier)) LIKE unaccent(lower(${pattern})) OR
            unaccent(lower(COALESCE(p.commune, ''))) LIKE unaccent(lower(${pattern})) OR
            unaccent(lower(p.ville)) LIKE unaccent(lower(${pattern})) OR
            unaccent(lower(c.nom)) LIKE unaccent(lower(${pattern}))
          )
        `;
        const wordIds = new Set(matches.map((m) => m.id));

        const tagsMatch = await prisma.tag.findMany({
          where: { nom: { contains: word, mode: "insensitive" } },
          select: { id: true },
        });
        if (tagsMatch.length > 0) {
          const prestatairesByTag = await prisma.prestataire.findMany({
            where: { tags: { some: { id: { in: tagsMatch.map((t) => t.id) } } } },
            select: { id: true },
          });
          prestatairesByTag.forEach((p) => wordIds.add(p.id));
        }

        // Connaissance locale : si le mot est un quartier connu d'Abidjan,
        // on élargit à toute sa commune (ex: "blockhaus" => tout Cocody)
        const communeDuQuartier = QUARTIERS_COMMUNES[normalizeStr(word)];
        if (communeDuQuartier) {
          const byCommune = await prisma.prestataire.findMany({
            where: {
              actif: true,
              commune: { equals: communeDuQuartier, mode: "insensitive" },
            },
            select: { id: true },
          });
          byCommune.forEach((p) => wordIds.add(p.id));
        }

        // Intersection : le prestataire doit matcher TOUS les mots
        ids = ids === null ? [...wordIds] : ids.filter((id) => wordIds.has(id));
        if (ids.length === 0) break;
      }

      // Quartiers multi-mots détectés : intersection avec leur commune
      for (const commune of communesDetectees) {
        const byCommune = await prisma.prestataire.findMany({
          where: {
            actif: true,
            OR: [
              { commune: { equals: commune, mode: "insensitive" } },
              { quartier: { contains: commune, mode: "insensitive" } },
            ],
          },
          select: { id: true },
        });
        const communeIds = new Set(byCommune.map((p) => p.id));
        ids = ids === null ? [...communeIds] : ids.filter((id) => communeIds.has(id));
      }
    }

    const where: any = { actif: true };
    if (categorie) where.categorie = { slug: categorie };
    if (tag) where.tags = { some: { slug: tag } };
    if (quartier) where.quartier = { contains: quartier as string, mode: "insensitive" };
    if (commune) where.commune = { contains: commune as string, mode: "insensitive" };
    if (ville) where.ville = { contains: ville as string, mode: "insensitive" };
    if (ids !== null) where.id = { in: ids };

    const [prestataires, total] = await Promise.all([
      prisma.prestataire.findMany({
        where,
        include: {
          categorie: true,
          user: { select: { id: true, nom: true, prenom: true, avatar: true } },
          _count: { select: { avis: true, reservations: true } },
        },
        orderBy: { notemoyenne: "desc" },
        skip,
        take,
      }),
      prisma.prestataire.count({ where }),
    ]);

    res.json({
      prestataires,
      pagination: {
        total,
        pages: Math.ceil(total / take),
        currentPage: parseInt(page as string),
        limit: take,
      },
    });
  } catch (error) {
    console.error("Erreur get prestataires:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============ RECHERCHE PAR PROXIMITÉ (Haversine) ============
export const getPrestatairesProximite = async (req: Request, res: Response) => {
  try {
    const { lat, lng, rayon = "10", categorie, limit = "50" } = req.query;

    const latitude = parseCoordinate(lat, "lat");
    const longitude = parseCoordinate(lng, "lng");

    if (latitude === null || longitude === null) {
      res.status(400).json({
        message: "Paramètres lat et lng requis et valides (ex: ?lat=5.3364&lng=-4.0267)",
      });
      return;
    }

    // Rayon en km, borné entre 0.5 et 100
    const rayonKm = Math.min(Math.max(parseFloat(rayon as string) || 10, 0.5), 100);
    const take = Math.min(parseInt(limit as string) || 50, 100);

    // Bounding box pour pré-filtrer via l'index [latitude, longitude]
    // 1° de latitude ≈ 111 km ; 1° de longitude ≈ 111 km * cos(lat)
    const latDelta = rayonKm / 111;
    const lngDelta = rayonKm / (111 * Math.cos((latitude * Math.PI) / 180));

    // Haversine en SQL — LEAST(1, ...) protège acos() des erreurs d'arrondi flottant
    // Sous-requête obligatoire : on ne peut pas filtrer sur un alias dans le même SELECT
    const results = await prisma.$queryRaw<{ id: string; distance: number }[]>`
      SELECT id, distance FROM (
        SELECT id,
          (6371 * acos(LEAST(1,
            cos(radians(${latitude})) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(latitude))
          ))) AS distance
        FROM prestataires
        WHERE actif = true
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND latitude BETWEEN ${latitude - latDelta} AND ${latitude + latDelta}
          AND longitude BETWEEN ${longitude - lngDelta} AND ${longitude + lngDelta}
      ) AS sub
      WHERE distance <= ${rayonKm}
      ORDER BY distance ASC
      LIMIT ${take}
    `;

    if (results.length === 0) {
      res.json({ prestataires: [], total: 0, rayon: rayonKm });
      return;
    }

    const distanceById = new Map(results.map((r) => [r.id, r.distance]));

    const where: any = { id: { in: results.map((r) => r.id) } };
    if (categorie) where.categorie = { slug: categorie };

    const prestataires = await prisma.prestataire.findMany({
      where,
      include: {
        categorie: true,
        user: { select: { id: true, nom: true, prenom: true, avatar: true } },
        _count: { select: { avis: true, reservations: true } },
      },
    });

    // Réinjecter la distance et retrier (findMany ne préserve pas l'ordre)
    const prestatairesAvecDistance = prestataires
      .map((p) => ({
        ...p,
        distance: Math.round((distanceById.get(p.id) || 0) * 10) / 10, // km, 1 décimale
      }))
      .sort((a, b) => a.distance - b.distance);

    res.json({
      prestataires: prestatairesAvecDistance,
      total: prestatairesAvecDistance.length,
      rayon: rayonKm,
    });
  } catch (error) {
    console.error("Erreur proximité:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const getPrestatairePublic = async (req: Request, res: Response) => {
  try {
    const prestataire = await prisma.prestataire.findUnique({
      where: { id: req.params.id as string },
      include: {
        categorie: true,
        user: { select: { id: true, nom: true, prenom: true, avatar: true } },
        _count: { select: { avis: true, reservations: true } },
      },
    });

    if (!prestataire || !prestataire.actif) {
      res.status(404).json({ message: "Prestataire non trouvé" });
      return;
    }

    const avis = await prisma.avis.findMany({
      where: { prestataireId: prestataire.id },
      include: {
        auteur: { select: { id: true, nom: true, prenom: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    res.json({ ...prestataire, avis });
  } catch (error) {
    console.error("Erreur get prestataire:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};