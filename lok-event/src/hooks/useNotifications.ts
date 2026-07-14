// frontend/src/hooks/useNotifications.ts
//
// ⚠️ C'est ICI que vivait le bug "e.filter is not a function" :
// l'ancienne API renvoyait un TABLEAU de notifications, la nouvelle renvoie
// un OBJET { notifications, unreadCount, pagination }. Ce hook consomme le
// nouveau format et expose en plus la suppression (une / toutes).

"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Notification } from "@/types/notification";

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  pagination: { total: number; pages: number; currentPage: number; limit: number };
}

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // ---- Chargement initial (nouveau format : objet, plus un tableau) ----
  const refresh = useCallback(async () => {
    try {
      const data = await api.get<NotificationsResponse>("/notifications?limit=20");
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error("Erreur chargement notifications", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, userId]);

  // ---- Polling léger du badge (filet de sécurité si le socket tombe) ----
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get<{ unreadCount: number }>("/notifications/unread-count");
        setUnreadCount(res.unreadCount);
      } catch {
        /* silencieux */
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // ---- Temps réel : abonnement au socket PARTAGÉ ----
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNewNotification = (notif: Notification) => {
      setUnreadCount((c) => c + 1);
      setNotifications((prev) => [notif, ...prev].slice(0, 20));
    };

    // "newNotification" = événement émis par sendNotification côté backend
    socket.on("newNotification", onNewNotification);
    // Annonces Premium diffusées à la room premium (même affichage)
    socket.on("notification:premium", onNewNotification);

    return () => {
      socket.off("newNotification", onNewNotification);
      socket.off("notification:premium", onNewNotification);
    };
  }, []);

  // ---- Actions (mises à jour optimistes : l'UI réagit immédiatement) ----
  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => {
      const cible = prev.find((n) => n.id === id);
      if (cible && !cible.isRead) setUnreadCount((c) => Math.max(0, c - 1));
      return prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    });
    try {
      await api.patch(`/notifications/${id}/read`, {});
    } catch {
      /* silencieux */
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await api.patch("/notifications/read-all", {});
    } catch {
      /* silencieux */
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    setNotifications((prev) => {
      const cible = prev.find((n) => n.id === id);
      if (cible && !cible.isRead) setUnreadCount((c) => Math.max(0, c - 1));
      return prev.filter((n) => n.id !== id);
    });
    try {
      await api.deleteWithBody(`/notifications/${id}`, {});
    } catch {
      /* silencieux */
    }
  }, []);

  const deleteAllNotifications = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    try {
      await api.deleteWithBody("/notifications", {});
    } catch {
      /* silencieux */
    }
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  };
}