"use client";

import Link from "next/link";
import { Home, Briefcase } from "lucide-react";
import SearchBar from "./SearchBar";

export default function NavbarMain() {
  return (
    <nav className="sticky top-0 z-50 bg-[var(--color-background)]/90 backdrop-blur-2xl border-b border-white/5 transition-all duration-500">
      <div className="max-w-[1600px] mx-auto px-6 md:px-8 py-4 flex items-center gap-6">
        <SearchBar />
      </div>
    </nav>
  );
}