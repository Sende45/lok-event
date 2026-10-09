export type Role = "CLIENT" | "PRESTATAIRE" | "ADMIN";

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: Role;
  avatar?: string;
}

export interface AuthResponse {
  /** Absent pour le site web : la session est dans un cookie httpOnly. Présent pour l'app mobile. */
  token?: string;
  user: User;
}