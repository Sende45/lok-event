// backend/src/middlewares/visibilite.middleware.ts
//
// Visibilité des prestataires selon leur abonnement :
// - Prestataire PREMIUM actif  → fiche complète, visible par tous.
// - Prestataire GRATUIT        → fiche "masquée" : on montre qu'il existe
//   (catégorie, commune, note, photo destinée à être floutée) mais son nom,
//   sa description, ses contacts, ses prestations et ses avis sont cachés.
//
// Le propriétaire de la fiche et les admins voient toujours la fiche complète
// (utile pour "Voir ma fiche publique").
//
// Branché sur les routes publiques GET /prestataires, /prestataires/proximite
// et /prestataires/:id. Il intercepte res.json : les contrôleurs existants
// n'ont pas besoin d'être modifiés.
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { premiumEstActif } from "../lib/socket";

type PrestataireJson = Record<string, any> & { id: string; userId?: string; user?: Record<string, any> };

/** Lit le token s'il y en a un, sans bloquer la requête s'il est absent ou invalide */
function lecteurOptionnel(req: Request): { id: string; role: string } | null {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id?: string; role?: string };
    return decoded.id ? { id: decoded.id, role: decoded.role || "CLIENT" } : null;
  } catch {
    return null;
  }
}

function userIdDe(p: PrestataireJson): string | undefined {
  return p.userId || p.user?.id;
}

/** Version publique d'un prestataire non Premium. Même forme que l'original pour ne casser aucun écran. */
function masquer(p: PrestataireJson): PrestataireJson {
  return {
    id: p.id,
    masque: true,
    premium: false,
    nomEntreprise: "Prestataire LOKEVENT",
    description: null,
    categorieId: p.categorieId,
    categorie: p.categorie,
    quartier: "",
    commune: p.commune ?? null,
    ville: p.ville,
    latitude: null,
    longitude: null,
    telephone: null,
    whatsapp: null,
    email: null,
    siteWeb: null,
    // Pas de photo nette : seule la première, que l'app affiche floutée
    photos: [],
    photoFloue: Array.isArray(p.photos) && p.photos.length > 0 ? p.photos[0] : null,
    prixMin: p.prixMin ?? null,
    prixMax: p.prixMax ?? null,
    notemoyenne: p.notemoyenne ?? 0,
    totalAvis: p.totalAvis ?? 0,
    verifie: p.verifie ?? false,
    actif: p.actif ?? true,
    userId: "",
    user: { id: "", nom: "", prenom: "", avatar: null },
    services: [],
    avis: [],
    _count: p._count ?? { avis: 0, reservations: 0 },
    ...(p.distance !== undefined ? { distance: p.distance } : {}),
  };
}

export const masquerNonPremium = (req: Request, res: Response, next: NextFunction) => {
  const jsonOriginal = res.json.bind(res);

  res.json = ((body: any) => {
    // Erreurs (4xx/5xx) ou réponse inattendue : on ne touche à rien
    if (res.statusCode >= 400 || !body || typeof body !== "object") {
      return jsonOriginal(body);
    }

    const liste: PrestataireJson[] | null = Array.isArray(body.prestataires)
      ? body.prestataires
      : null;
    const unSeul: PrestataireJson | null =
      !liste && typeof body.id === "string" && "nomEntreprise" in body ? body : null;

    const cibles = liste ?? (unSeul ? [unSeul] : []);
    if (cibles.length === 0) return jsonOriginal(body);

    const lecteur = lecteurOptionnel(req);
    const ids = [...new Set(cibles.map(userIdDe).filter(Boolean))] as string[];

    prisma.user
      .findMany({
        where: { id: { in: ids } },
        select: { id: true, estPremium: true, premiumJusquau: true },
      })
      .then((users: { id: string; estPremium: boolean; premiumJusquau: Date | null }[]) => {
        const premiumParUser = new Map(users.map((u) => [u.id, premiumEstActif(u)]));

        const transformer = (p: PrestataireJson): PrestataireJson => {
          const proprietaire = userIdDe(p);
          const premium = proprietaire ? premiumParUser.get(proprietaire) === true : false;
          const voitTout =
            lecteur?.role === "ADMIN" || (lecteur && proprietaire && lecteur.id === proprietaire);
          if (premium) return { ...p, masque: false, premium: true };
          if (voitTout) return { ...p, masque: false, premium: false };
          return masquer(p);
        };

        if (liste) {
          const transformes = liste.map(transformer);
          // Les fiches visibles d'abord, en gardant l'ordre d'origine
          transformes.sort((a, b) => Number(a.masque) - Number(b.masque));
          jsonOriginal({ ...body, prestataires: transformes });
        } else {
          jsonOriginal(transformer(unSeul!));
        }
      })
      .catch((err: unknown) => {
        console.error("Erreur masquage prestataires:", err);
        // En cas d'erreur, on masque tout plutôt que de tout exposer
        if (liste) jsonOriginal({ ...body, prestataires: liste.map(masquer) });
        else jsonOriginal(masquer(unSeul!));
      });

    return res;
  }) as Response["json"];

  next();
};