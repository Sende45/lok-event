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
  token: string;
  user: User;
}