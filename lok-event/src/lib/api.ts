// src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("lokevent_token");
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
  localStorage.removeItem("lokevent_token");
  localStorage.removeItem("lokevent_user");
  const current = window.location.pathname + window.location.search;
  window.location.href = `/login?redirect=${encodeURIComponent(current)}&expired=1`;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = (await res.json()) as { message?: string } & T;

  // Token invalide ou expiré : déconnexion propre + redirection avec retour.
  // Conditions : un token existait (sinon l'utilisateur navigue simplement
  // sans être connecté) et ce n'est pas une route d'auth (sinon un mauvais
  // mot de passe au login déclencherait la redirection).
  if (res.status === 401 && token && !endpoint.startsWith("/auth/")) {
    handleSessionExpired();
    throw new Error("Session expirée, veuillez vous reconnecter");
  }

  if (!res.ok) {
    throw new Error(data.message || "Une erreur est survenue");
  }

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