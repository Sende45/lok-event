"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("lokevent_theme", next ? "light" : "dark");
  };

  return (
    <button
      onClick={toggle}
      title="Changer de thème"
      className="p-2.5 rounded-full text-gray-400 hover:text-teal-400 hover:bg-white/10 active:bg-white/15 transition-colors"
    >
      {light ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
    </button>
  );
}