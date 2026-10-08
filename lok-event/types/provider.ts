export interface Provider {
  id: string;
  name: string;
  image?: string;
  rating: number;
  location: string;
  price: number;
  whatsapp?: string;
  telephone?: string;
  /** Catégorie (affichée sur la carte floutée) */
  categorie?: string;
  /** true = prestataire non Premium : carte floutée, sans nom ni contact */
  masque?: boolean;
  /** Fiche masquée : photo à afficher floutée */
  photoFloue?: string;
  /** true = abonnement Premium actif */
  premium?: boolean;
}