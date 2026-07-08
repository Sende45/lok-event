// src/hooks/useNotifications.ts
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { io, Socket } from "socket.io-client";
import { Notification } from "@/types/notification";

let socket: Socket | null = null;

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Connexion Socket.io
  useEffect(() => {
    if (!userId) return;

    // ⚠️ CORRECTION IMPORTANTE : NEXT_PUBLIC_API_URL contient "/api"
    // (ex: https://lok-event.onrender.com/api). Socket.io interpréterait
    // "/api" comme un namespace et la connexion échouerait silencieusement.
    // On retire donc le suffixe /api pour ne garder que le domaine.
    const socketUrl = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
    ).replace(/\/api\/?$/, "");

    socket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.emit("join", userId);
    // En cas de reconnexion (réseau instable), on rejoint à nouveau sa room
    socket.on("connect", () => {
      socket?.emit("join", userId);
    });

    socket.on("newNotification", (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [userId]);

  // Charger les notifications initiales
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const data = await api.get<Notification[]>("/notifications");
        const notifs = data || [];
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.isRead).length);
      } catch (err) {
        console.error("Erreur chargement notifications", err);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [userId]);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/notifications/mark-all", {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
}