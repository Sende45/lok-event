// components/map/ProviderMiniMap.tsx
"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import { MapPin, Navigation } from "lucide-react";
import "leaflet/dist/leaflet.css";

// ⚠️ Comme les autres composants carte, à importer via next/dynamic avec ssr: false

interface ProviderMiniMapProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  nomEntreprise: string;
  quartier: string;
  commune?: string | null;
  ville: string;
  /** Couleur du marker (couleur de la catégorie par ex.) */
  couleur?: string | null;
  height?: string;
}

const miniMapIcon = (couleur?: string | null) =>
  L.divIcon({
    className: "",
    html: `
      <div style="
        width: 36px; height: 36px;
        background: ${couleur || "#14b8a6"};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });

export default function ProviderMiniMap({
  latitude,
  longitude,
  nomEntreprise,
  quartier,
  commune,
  ville,
  couleur,
  height = "280px",
}: ProviderMiniMapProps) {
  const adresse = `${quartier}${commune ? `, ${commune}` : ""} — ${ville}`;

  // Prestataire non géolocalisé : on affiche quand même l'adresse textuelle
  if (latitude == null || longitude == null) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-white">
          <MapPin className="w-4 h-4 text-teal-400" />
          Localisation
        </h3>
        <p className="text-sm text-gray-400">{adresse}</p>
        <p className="text-xs text-gray-600 mt-2">
          Position exacte non renseignée par ce prestataire.
        </p>
      </div>
    );
  }

  const itineraireUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-semibold flex items-center gap-2 text-white">
          <MapPin className="w-4 h-4 text-teal-400" />
          Localisation
        </h3>
        <a
          href={itineraireUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-400 text-black text-xs font-medium rounded-lg hover:bg-teal-300 transition-colors"
        >
          <Navigation className="w-3 h-3" />
          Itinéraire
        </a>
      </div>

      <p className="text-sm text-gray-400 mb-3">{adresse}</p>

      <div
        style={{ height }}
        className="w-full rounded-xl overflow-hidden relative z-0"
      >
        <MapContainer
          center={[latitude, longitude]}
          zoom={15}
          scrollWheelZoom={false}
          dragging={true}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={[latitude, longitude]}
            icon={miniMapIcon(couleur)}
            title={nomEntreprise}
          />
        </MapContainer>
      </div>

      <p className="text-[10px] text-gray-600 mt-2">
        La position est indicative, fournie par le prestataire.
      </p>
    </div>
  );
}