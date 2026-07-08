"use client";

import SearchBar from "./SearchBar";
import NotificationBell from "./notifications/NotificationBell";
import { useAuth } from "@/hooks/useAuth";

export default function NavbarMain() {
  const { user } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-[var(--color-background)]/90 backdrop-blur-2xl border-b border-white/5 transition-all duration-500">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-8 py-2.5 md:py-4 flex items-center gap-3 md:gap-6">
        <SearchBar />

        {/* Notification ajoutée ici */}
        {user && <NotificationBell userId={user.id} />}
      </div>
    </nav>
  );
}