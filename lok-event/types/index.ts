// types/index.ts
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'provider' | 'client';
  token: string;
  avatar?: string;
  phone?: string;
  location?: string;
}

export interface Provider extends User {
  category: string;
  rating: number;
  totalReviews: number;
  verified: boolean;
  services: Service[];
}

export interface Service {
  id: number;
  name: string;
  price: number;
  duration: string;
  popular?: boolean;
}

export interface Booking {
  id: number;
  client: string;
  provider: string;
  event: string;
  date: string;
  time?: string;
  amount?: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  type?: string;
  location?: string;
}

export interface Client extends User {
  favorites: Favorite[];
  reservations: Booking[];
  stats: ClientStats;
}

export interface Favorite {
  name: string;
  rating: number;
  verified: boolean;
  category: string;
}

export interface ClientStats {
  totalSpent: string;
  eventsCompleted: number;
  rating: number;
  favoritesCount: number;
}

export interface AdminStats {
  totalUsers: number;
  totalProviders: number;
  totalBookings: number;
  totalRevenue: string;
  activeUsers: number;
  pendingProviders: number;
  todayBookings: number;
  conversionRate: string;
}

export interface ProviderStats {
  totalBookings: number;
  totalRevenue: string;
  pendingBookings: number;
  completedBookings: number;
  responseRate: string;
  averageRating: number;
}