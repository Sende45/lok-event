// components/messages/MessageBadge.tsx
//
// Pastille rouge clignotante affichant le nombre de messages non lus.
// À poser DANS un parent en `position: relative`.

"use client";

export default function MessageBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold shadow-lg shadow-red-500/40 animate-pulse pointer-events-none">
      {count > 9 ? "9+" : count}
    </span>
  );
}