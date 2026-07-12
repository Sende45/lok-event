// backend/src/controllers/parametre.controller.ts
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

const CLE_PAIEMENT = "paiement_mobile_money";
const OPERATEURS = ["WAVE", "ORANGE_MONEY", "MTN"] as const;

// Valeurs par défaut tant que l'admin n'a rien configuré
const DEFAUTS = {
  numeros: {
    WAVE: "+225 07 00 00 00 00",
    ORANGE_MONEY: "+225 07 00 00 00 00",
    MTN: "+225 05 00 00 00 00",
  } as Record<string, string>,
  nomCompte: "LOKEVENT",
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /parametres/paiement — PUBLIC
// Utilisé par la page /premium pour afficher le bon numéro selon l'opérateur.
// ─────────────────────────────────────────────────────────────────────────────
export const getParametresPaiement = async (_req: Request, res: Response) => {
  try {
    const param = await prisma.parametre.findUnique({
      where: { cle: CLE_PAIEMENT },
    });

    const valeur = (param?.valeur as {
      numeros?: Record<string, string>;
      nomCompte?: string;
    }) || {};

    res.json({
      numeros: { ...DEFAUTS.numeros, ...(valeur.numeros || {}) },
      nomCompte: valeur.nomCompte || DEFAUTS.nomCompte,
    });
  } catch (error) {
    console.error("Erreur lecture paramètres paiement:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /parametres/paiement — [ADMIN]
// Body : { numeros: { WAVE?, ORANGE_MONEY?, MTN? }, nomCompte? }
// ─────────────────────────────────────────────────────────────────────────────
export const updateParametresPaiement = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "ADMIN") {
      res.status(403).json({ message: "Réservé aux administrateurs" });
      return;
    }

    const { numeros, nomCompte } = req.body as {
      numeros?: Record<string, unknown>;
      nomCompte?: unknown;
    };

    // Validation : on n'accepte que les opérateurs connus, en chaînes raisonnables
    const numerosValides: Record<string, string> = {};
    if (numeros && typeof numeros === "object") {
      for (const op of OPERATEURS) {
        const val = numeros[op];
        if (typeof val === "string" && val.trim()) {
          if (val.trim().length > 30) {
            res.status(400).json({ message: `Numéro ${op} trop long (30 caractères max)` });
            return;
          }
          numerosValides[op] = val.trim();
        }
      }
    }

    let nomCompteValide: string | undefined;
    if (nomCompte !== undefined) {
      if (typeof nomCompte !== "string" || nomCompte.trim().length > 60) {
        res.status(400).json({ message: "Nom de compte invalide (60 caractères max)" });
        return;
      }
      nomCompteValide = nomCompte.trim() || DEFAUTS.nomCompte;
    }

    // Fusion avec l'existant pour ne pas écraser un numéro non envoyé
    const existant = await prisma.parametre.findUnique({ where: { cle: CLE_PAIEMENT } });
    const valeurExistante = (existant?.valeur as {
      numeros?: Record<string, string>;
      nomCompte?: string;
    }) || {};

    const nouvelleValeur = {
      numeros: { ...DEFAUTS.numeros, ...(valeurExistante.numeros || {}), ...numerosValides },
      nomCompte: nomCompteValide ?? valeurExistante.nomCompte ?? DEFAUTS.nomCompte,
    };

    await prisma.parametre.upsert({
      where: { cle: CLE_PAIEMENT },
      update: { valeur: nouvelleValeur },
      create: { cle: CLE_PAIEMENT, valeur: nouvelleValeur },
    });

    res.json(nouvelleValeur);
  } catch (error) {
    console.error("Erreur mise à jour paramètres paiement:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};