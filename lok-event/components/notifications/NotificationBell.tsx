// components/notifications/NotificationBell.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Check, Trash2, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { Notification } from "@/types/notification";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function NotificationBell({ userId }: { userId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotifications(userId);

  // Fermer le dropdown en cliquant dehors (desktop) / sur le fond (mobile)
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

  const handleDeleteAll = () => {
    if (!window.confirm("Supprimer toutes les notifications ?")) return;
    deleteAllNotifications();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 rounded-full hover:bg-white/10 active:bg-white/15 transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Voile de fond — mobile uniquement (met le panneau en avant et
              permet de fermer d'un tap n'importe où) */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Panneau :
              - MOBILE  (< sm) : position FIXE, pleine largeur avec marges,
                ancré sous le header — jamais coupé par le bord de l'écran,
                quel que soit l'emplacement de la cloche.
              - DESKTOP (>= sm) : dropdown classique ancré à la cloche. */}
          <div
            className="fixed left-3 right-3 top-16 z-50 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 md:w-96 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span className="hidden sm:inline">Tout marquer lu</span>
                    <span className="sm:hidden">Tout lu</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleDeleteAll}
                    title="Tout supprimer"
                    className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Vider
                  </button>
                )}
                {/* Fermeture explicite — mobile uniquement (pas de "clic
                    dehors" évident quand le panneau occupe tout l'écran) */}
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Fermer"
                  className="p-1.5 -mr-1 rounded-full text-gray-400 hover:bg-white/10 active:bg-white/15 transition-colors sm:hidden"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Hauteur : dvh sur mobile (tient compte de la barre d'adresse
                des navigateurs mobiles), hauteur fixe raisonnable en desktop */}
            <div className="max-h-[calc(100dvh-9rem)] sm:max-h-[420px] overflow-y-auto overscroll-contain">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  Aucune notification pour le moment
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`group p-4 border-b border-white/10 hover:bg-white/5 active:bg-white/10 cursor-pointer transition-colors ${
                      !notif.isRead ? "bg-teal-400/5" : ""
                    }`}
                  >
                    <div className="flex justify-between gap-2">
                      <p className="font-medium text-sm flex items-center gap-2 min-w-0">
                        <span className="truncate">{notif.title}</span>
                        {!notif.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                        )}
                      </p>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap flex-shrink-0">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2 flex-1 break-words">
                        {notif.message}
                      </p>
                      {/* Poubelle : zone tactile 44px sur mobile (toujours
                          visible), apparition au survol sur desktop */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // ne pas déclencher markAsRead/fermeture
                          deleteNotification(notif.id);
                        }}
                        title="Supprimer"
                        className="p-2.5 sm:p-1.5 -m-1 sm:m-0 rounded-lg text-gray-600 hover:text-red-400 active:text-red-400 hover:bg-white/5 sm:opacity-0 sm:group-hover:opacity-100 transition-all shrink-0"
                      >
                        <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}