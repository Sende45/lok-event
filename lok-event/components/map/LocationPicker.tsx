// components/map/LocationPicker.tsx
"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ⚠️ Comme ProvidersMap, ce composant doit être importé via next/dynamic
// avec ssr: false (voir exemple d'intégration dans le message)

interface LocationPickerProps {
  /** Position initiale (ex: position déjà enregistrée du prestataire) */
  initialPosition?: { latitude: number; longitude: number } | null;
  /** Appelé à chaque changement de position */
  onChange: (position: { latitude: number; longitude: number }) => void;
  height?: string;
}

const pickerIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 36px; height: 36px;
      background: #ef4444;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    "></div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

// Capte les clics sur la carte
function ClickHandler({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Permet de recentrer la carte quand la position change (bouton géolocalisation)
function RecenterMap({ position }: { position: [number, number] | null }) {
  const map = useMap();
  if (position) {
    map.setView(position, Math.max(map.getZoom(), 15));
  }
  return null;
}

export default function LocationPicker({
  initialPosition,
  onChange,
  height = "400px",
}: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialPosition ? [initialPosition.latitude, initialPosition.longitude] : null
  );
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const defaultCenter: [number, number] = position || [5.3364, -4.0267]; // Plateau, Abidjan

  const handleSelect = (lat: number, lng: number) => {
    const rounded: [number, number] = [
      Math.round(lat * 1e6) / 1e6,
      Math.round(lng * 1e6) / 1e6,
    ];
    setPosition(rounded);
    onChange({ latitude: rounded[0], longitude: rounded[1] });
  };

  const useMyPosition = () => {
    if (!navigator.geolocation) {
      setGeoError("La géolocalisation n'est pas supportée par ce navigateur");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleSelect(pos.coords.latitude, pos.coords.longitude);
        setGeoLoading(false);
      },
      () => {
        setGeoError(
          "Impossible d'obtenir votre position (autorisation refusée ?)"
        );
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-gray-600">
          Cliquez sur la carte pour placer votre position exacte
        </p>
        <button
          type="button"
          onClick={useMyPosition}
          disabled={geoLoading}
          className="text-sm px-3 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 transition"
        >
          {geoLoading ? "Localisation..." : "📍 Utiliser ma position"}
        </button>
      </div>

      {geoError && <p className="text-sm text-red-600">{geoError}</p>}

      <div
        style={{ height }}
        className="w-full rounded-xl overflow-hidden shadow-md relative z-0"
      >
        <MapContainer
          center={defaultCenter}
          zoom={position ? 15 : 12}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onSelect={handleSelect} />
          <RecenterMap position={position} />
          {position && <Marker position={position} icon={pickerIcon} />}
        </MapContainer>
      </div>

      {position && (
        <p className="text-xs text-gray-500">
          Position sélectionnée : {position[0].toFixed(6)}, {position[1].toFixed(6)}
        </p>
      )}
    </div>
  );
}