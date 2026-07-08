// src/types/notification.ts
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: { reservationId?: string } | null;
  isRead: boolean;
  createdAt: string;
}