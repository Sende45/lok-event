// components/notifications/NotificationBell.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Check } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { Notification } from "@/types/notification";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function NotificationBell({ userId }: { userId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId);

  // Fermer le dropdown en cliquant dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
    // Tu peux rediriger selon le type ici
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 rounded-full hover:bg-white/10 active:bg-white/15 transition-colors focus:outline-none"
      >
        <Bell className="w-5 h-5 text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-80 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="max-h-[60vh] sm:max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                Aucune notification pour le moment
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 border-b border-white/10 hover:bg-white/5 active:bg-white/10 cursor-pointer transition-colors ${
                    !notif.isRead ? "bg-teal-400/5" : ""
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <p className="font-medium text-sm">{notif.title}</p>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap flex-shrink-0">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">{notif.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}