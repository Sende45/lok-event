// src/lib/api.ts
//
// Toutes les requêtes du site vers l'API.
// Session = cookie httpOnly posé par l'API (credentials: "include") :
// aucun token n'est lu ni stocké en JavaScript.
// L'en-tête "X-Client: web" sert de protection CSRF côté API.
import { estConnecte, oublierSession } from "./session";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Nettoyage unique : les anciennes versions du site gardaient le JWT ici
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("lokevent_token");
  } catch {
    /* navigation privée stricte : rien à nettoyer */
  }
}

// Évite de déclencher plusieurs redirections simultanées quand plusieurs
// appels API échouent en même temps (ex: Promise.all d'un dashboard)
let sessionExpiredHandled = false;

// Session expirée : on nettoie et on renvoie vers /login en mémorisant
// la page courante pour y revenir après reconnexion
function handleSessionExpired() {
  if (typeof window === "undefined") return;
  if (sessionExpiredHandled) return;

  // Jamais de redirection si on est déjà sur /login ou /register :
  // c'est LA protection anti-boucle
  const path = window.location.pathname;
  if (path.startsWith("/login") || path.startsWith("/register")) return;

  sessionExpiredHandled = true;
  oublierSession();
  const current = window.location.pathname + window.location.search;
  window.location.href = `/login?redirect=${encodeURIComponent(current)}&expired=1`;
}

/** En-têtes communs (à utiliser aussi pour les envois de fichiers) */
export const ENTETES_WEB = { "X-Client": "web" } as const;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include", // envoie le cookie httpOnly de session
    headers: {
      "Content-Type": "application/json",
      ...ENTETES_WEB,
      ...options.headers,
    },
  });

  const data = (await res.json().catch(() => ({}))) as { message?: string } & T;

  // Session invalide ou expirée : déconnexion propre + redirection avec retour.
  // Conditions : l'utilisateur se croyait connecté (sinon il navigue
  // simplement en visiteur) et ce n'est pas une route d'auth (sinon un
  // mauvais mot de passe au login déclencherait la redirection).
  if (res.status === 401 && estConnecte() && !endpoint.startsWith("/auth/")) {
    handleSessionExpired();
    throw new Error("Session expirée, veuillez vous reconnecter");
  }

  if (!res.ok) {
    throw new Error(data.message || "Une erreur est survenue");
  }

  return data as T;
}

/** Envoi d'un fichier (multipart) avec la session cookie */
export async function envoyerFichier<T = { url: string }>(endpoint: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    credentials: "include",
    headers: { ...ENTETES_WEB }, // pas de Content-Type : le navigateur gère le multipart
    body: formData,
  });
  const data = (await res.json().catch(() => ({}))) as { message?: string } & T;
  if (res.status === 401 && estConnecte()) {
    handleSessionExpired();
    throw new Error("Session expirée, veuillez vous reconnecter");
  }
  if (!res.ok) throw new Error(data.message || "Échec de l'envoi du fichier");
  return data as T;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: "GET" }),
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
  deleteWithBody: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "DELETE", body: JSON.stringify(body) }),
};