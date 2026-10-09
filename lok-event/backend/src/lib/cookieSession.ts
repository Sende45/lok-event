// backend/src/lib/cookieSession.ts
//
// Session du SITE WEB dans un cookie httpOnly (point 9 de l'audit de sécurité).
// - Le JWT n'est plus lisible par le JavaScript de la page : une faille XSS
//   ne permet plus de le voler (avant, il était dans localStorage).
// - L'APPLICATION MOBILE continue d'envoyer "Authorization: Bearer <token>" :
//   les deux modes sont acceptés partout (lireToken).
//
// ⚠️ Le site et l'API doivent être sur le MÊME SITE (même domaine racine) pour
// que le navigateur envoie le cookie : lokevent.eden-group.co ↔
// api.lokevent.eden-group.co. Avec l'URL Railway (*.up.railway.app), le cookie
// serait "tiers" et bloqué par les navigateurs.
import { Request, Response, NextFunction, CookieOptions } from "express";

export const NOM_COOKIE = "lokevent_session";
const DUREE_MS = 7 * 24 * 60 * 60 * 1000; // = expiration du JWT (7 jours)

function options(): CookieOptions {
  return {
    httpOnly: true, // invisible pour document.cookie / le JavaScript de la page
    secure: process.env.NODE_ENV === "production", // HTTPS uniquement en prod
    sameSite: "lax", // jamais envoyé par un formulaire d'un AUTRE site (anti-CSRF)
    path: "/",
    // Optionnel : ".lokevent.eden-group.co" pour partager le cookie entre
    // sous-domaines. Par défaut : uniquement le domaine de l'API (plus strict).
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  };
}

export function poserCookieSession(res: Response, token: string) {
  res.cookie(NOM_COOKIE, token, { ...options(), maxAge: DUREE_MS });
}

export function effacerCookieSession(res: Response) {
  res.clearCookie(NOM_COOKIE, options());
}

/** Lit un cookie dans l'en-tête brut (évite la dépendance cookie-parser) */
export function lireCookie(enTete: string | undefined, nom: string): string | null {
  if (!enTete) return null;
  for (const morceau of enTete.split(";")) {
    const i = morceau.indexOf("=");
    if (i === -1) continue;
    if (morceau.slice(0, i).trim() === nom) {
      try {
        return decodeURIComponent(morceau.slice(i + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Token de la requête : en-tête Authorization (mobile) OU cookie (site web) */
export function lireToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  return lireCookie(req.headers.cookie, NOM_COOKIE);
}

/** Le site web s'identifie avec cet en-tête : il ne reçoit alors jamais le token en JSON */
export function estClientWeb(req: Request): boolean {
  return req.headers["x-client"] === "web";
}

/**
 * Protection CSRF : une requête qui MODIFIE des données et qui s'authentifie
 * par le cookie doit porter l'en-tête "X-Client: web". Un autre site ne peut
 * pas ajouter cet en-tête sans l'accord de notre CORS (il déclenche un
 * "preflight" que nous refusons). Les requêtes Bearer (mobile) ne sont pas
 * concernées : un autre site ne peut pas connaître leur token.
 */
export function protectionCsrf(req: Request, res: Response, next: NextFunction) {
  const lecture = ["GET", "HEAD", "OPTIONS"].includes(req.method);
  const viaCookie =
    !req.headers.authorization && !!lireCookie(req.headers.cookie, NOM_COOKIE);
  if (!lecture && viaCookie && !estClientWeb(req)) {
    res.status(403).json({ message: "Requête refusée (protection CSRF)." });
    return;
  }
  next();
}