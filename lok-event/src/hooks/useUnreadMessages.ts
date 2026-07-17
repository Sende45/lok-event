// frontend/src/hooks/useUnreadMessages.ts
//
// Compteur de messages non lus, partagé entre l'accueil (SearchBar) et les
// dashboards client / prestataire. Même philosophie que useNotifications :
//   - chargement initial via l'API
//   - temps réel via le socket partagé (événement "newMessage" émis par le
//     backend vers la room du destinataire dans sendMessage)
//   - polling léger toutes les 30s en filet de sécurité si le socket tombe
//   - resynchronisation à chaque changement de page : en quittant /messages,
//     les messages lus (getMessages passe lu=true) font retomber le badge.

"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";

export function useUnreadMessages(enabled: boolean = true) {
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await api.get<{ unreadCount: number }>("/messages/unread-count");
      setUnreadCount(res.unreadCount);
    } catch {
      /* silencieux : le badge n'est pas critique */
    }
  }, [enabled]);

  // Chargement initial + resynchronisation à chaque navigation
  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  // Polling filet de sécurité
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh, enabled]);

  // Temps réel : incrément instantané à la réception d'un message
  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    if (!socket) return;

    const onNewMessage = () => {
      // Déjà sur la messagerie : le message sera lu immédiatement
      if (pathname?.startsWith("/messages")) return;
      setUnreadCount((c) => c + 1);
    };

    socket.on("newMessage", onNewMessage);
    return () => {
      socket.off("newMessage", onNewMessage);
    };
  }, [enabled, pathname]);

  return unreadCount;
}