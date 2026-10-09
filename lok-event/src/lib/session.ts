// src/lib/session.ts — session du site web (cookie httpOnly)
//
// Le JWT n'est PLUS stocké dans le navigateur : l'API le place dans un cookie
// httpOnly que le JavaScript ne peut pas lire (protection contre le vol de
// session par XSS). Le navigateur l'envoie tout seul avec chaque requête.
//
// On garde seulement "lokevent_user" (nom, prénom, rôle — rien de secret)
// pour l'affichage immédiat du menu et des redirections.
import { disconnectSocket } from "./socket";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface UtilisateurSession {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  avatar?: string;
}

/** Profil affiché (non secret). null si personne n'est connecté. */
export function utilisateurSession(): UtilisateurSession | null {
  if (typeof window === "undefined") return null;
  try {
    const brut = localStorage.getItem("lokevent_user");
    return brut ? (JSON.parse(brut) as UtilisateurSession) : null;
  } catch {
    return null;
  }
}

export function estConnecte(): boolean {
  return utilisateurSession() !== null;
}

/** Après login / inscription : on mémorise le profil (le token est déjà dans le cookie) */
export function enregistrerSession(user: UtilisateurSession) {
  localStorage.setItem("lokevent_user", JSON.stringify(user));
  localStorage.removeItem("lokevent_token"); // ancien stockage, plus utilisé
}

/** Oublie la session côté navigateur (sans appeler l'API) */
export function oublierSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("lokevent_user");
  localStorage.removeItem("lokevent_token");
}

/**
 * Déconnexion complète : coupe le temps réel, demande à l'API d'effacer le
 * cookie httpOnly (le JavaScript ne peut pas le faire lui-même), puis redirige.
 */
export function deconnecter(redirection = "/") {
  disconnectSocket();
  oublierSession();
  fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
    keepalive: true, // la requête part même si la page change tout de suite
    headers: { "X-Client": "web" },
  })
    .catch(() => {})
    .finally(() => {
      window.location.href = redirection;
    });
}