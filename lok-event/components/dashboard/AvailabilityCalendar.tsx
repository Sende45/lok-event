// components/dashboard/AvailabilityCalendar.tsx
"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, CalendarOff } from "lucide-react";
import { api } from "@/lib/api";

interface Indisponibilite {
  id: string;
  date: string; // ISO
  motif: string | null;
}

const JOURS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function cleJour(annee: number, mois: number, jour: number): string {
  return `${annee}-${String(mois + 1).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

export default function AvailabilityCalendar() {
  const maintenant = new Date();
  const [annee, setAnnee] = useState(maintenant.getFullYear());
  const [mois, setMois] = useState(maintenant.getMonth());
  const [datesBloquees, setDatesBloquees] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [togglingDate, setTogglingDate] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Indisponibilite[]>("/disponibilites/me");
        setDatesBloquees(
          new Set(data.map((b) => b.date.split("T")[0]))
        );
      } catch (err) {
        console.error("Erreur chargement disponibilités:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const moisPrecedent = () => {
    if (mois === 0) {
      setMois(11);
      setAnnee(annee - 1);
    } else {
      setMois(mois - 1);
    }
  };

  const moisSuivant = () => {
    if (mois === 11) {
      setMois(0);
      setAnnee(annee + 1);
    } else {
      setMois(mois + 1);
    }
  };

  const toggleJour = async (jour: number) => {
    const cle = cleJour(annee, mois, jour);
    const dateJour = new Date(annee, mois, jour);
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    if (dateJour < aujourdhui) return; // pas de blocage dans le passé

    setTogglingDate(cle);
    try {
      if (datesBloquees.has(cle)) {
        await api.delete(`/disponibilites/${cle}`);
        setDatesBloquees((prev) => {
          const next = new Set(prev);
          next.delete(cle);
          return next;
        });
      } else {
        await api.post("/disponibilites", { date: cle });
        setDatesBloquees((prev) => new Set(prev).add(cle));
      }
    } catch (err) {
      console.error("Erreur blocage/déblocage:", err);
      alert(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    } finally {
      setTogglingDate(null);
    }
  };

  // Construction de la grille du mois (lundi en premier)
  const premierDuMois = new Date(annee, mois, 1);
  const nbJours = new Date(annee, mois + 1, 0).getDate();
  const decalage = (premierDuMois.getDay() + 6) % 7; // Dim(0) -> 6, Lun(1) -> 0
  const cases: (number | null)[] = [
    ...Array(decalage).fill(null),
    ...Array.from({ length: nbJours }, (_, i) => i + 1),
  ];

  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <CalendarOff className="w-5 h-5 text-teal-400" />
          Mes disponibilités
        </h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Touchez un jour pour le bloquer (rouge = indisponible). Les clients ne
        pourront pas réserver ces dates. Les dates de vos réservations
        confirmées sont bloquées automatiquement.
      </p>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={moisPrecedent}
              className="p-2 rounded-full hover:bg-white/10 active:bg-white/15 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
            <p className="font-semibold text-sm md:text-base">
              {MOIS[mois]} {annee}
            </p>
            <button
              onClick={moisSuivant}
              className="p-2 rounded-full hover:bg-white/10 active:bg-white/15 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {JOURS.map((j) => (
              <div key={j} className="text-center text-[10px] uppercase tracking-wider text-gray-500 py-1">
                {j}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cases.map((jour, i) => {
              if (jour === null) return <div key={`v-${i}`} />;
              const cle = cleJour(annee, mois, jour);
              const bloque = datesBloquees.has(cle);
              const estPasse = new Date(annee, mois, jour) < aujourdhui;
              const estAujourdhui =
                new Date(annee, mois, jour).toDateString() === new Date().toDateString();

              return (
                <button
                  key={cle}
                  onClick={() => toggleJour(jour)}
                  disabled={estPasse || togglingDate === cle}
                  className={`aspect-square rounded-lg text-xs md:text-sm font-medium transition-colors relative
                    ${estPasse
                      ? "text-gray-700 cursor-not-allowed"
                      : bloque
                      ? "bg-red-500/25 text-red-400 border border-red-500/40 hover:bg-red-500/35"
                      : "bg-white/5 text-gray-300 hover:bg-teal-400/15 hover:text-teal-400 active:bg-teal-400/25"
                    }
                    ${estAujourdhui ? "ring-1 ring-teal-400/60" : ""}
                    ${togglingDate === cle ? "opacity-50" : ""}
                  `}
                >
                  {jour}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-white/10 inline-block" /> Disponible
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-500/30 border border-red-500/40 inline-block" /> Bloqué
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded ring-1 ring-teal-400/60 inline-block" /> Aujourd'hui
            </span>
          </div>
        </>
      )}
    </div>
  );
}