// components/map/ProvidersMap.tsx
"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";

// ============ TYPES ============
// Adapte cette interface si ton type Prestataire existe déjà ailleurs
// (ex: import { Prestataire } from "@/types") — dans ce cas supprime celle-ci
export interface PrestataireMapItem {
  id: string;
  nomEntreprise: string;
  quartier: string;
  commune?: string | null;
  ville: string;
  latitude?: number | null;
  longitude?: number | null;
  photos: string[];
  notemoyenne: number;
  totalAvis: number;
  prixMin?: number | null;
  distance?: number; // renvoyé par /proximite uniquement
  categorie?: {
    nom: string;
    couleur?: string | null;
  };
}

interface ProvidersMapProps {
  prestataires: PrestataireMapItem[];
  /** Centre par défaut : Plateau, Abidjan */
  center?: [number, number];
  zoom?: number;
  /** Hauteur CSS de la carte */
  height?: string;
  /** Préfixe du lien vers la fiche prestataire — adapte si ta route est différente */
  detailPathPrefix?: string;
}

// ============ ICÔNE PERSONNALISÉE ============
// Les icônes par défaut de Leaflet sont cassées avec les bundlers (Webpack/Turbopack),
// on utilise un divIcon en CSS pur pour éviter tout problème d'images
const createMarkerIcon = (couleur?: string | null) =>
  L.divIcon({
    className: "",
    html: `
      <div style="
        width: 32px; height: 32px;
        background: ${couleur || "#0ea5e9"};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      "></div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

// ============ COMPOSANT ============
export default function ProvidersMap({
  prestataires,
  center = [5.3364, -4.0267], // Plateau, Abidjan
  zoom = 12,
  height = "600px",
  detailPathPrefix = "/prestataires",
}: ProvidersMapProps) {
  // On n'affiche que les prestataires géolocalisés
  const geolocalises = prestataires.filter(
    (p) => p.latitude != null && p.longitude != null
  );

  return (
    <div style={{ height }} className="w-full rounded-xl overflow-hidden shadow-md relative z-0">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {geolocalises.map((p) => (
          <Marker
            key={p.id}
            position={[p.latitude!, p.longitude!]}
            icon={createMarkerIcon(p.categorie?.couleur)}
          >
            <Popup>
              <div className="w-52">
                {p.photos?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.photos[0]}
                    alt={p.nomEntreprise}
                    className="w-full h-24 object-cover rounded-md mb-2"
                  />
                )}
                <p className="font-semibold text-sm mb-0.5">{p.nomEntreprise}</p>
                {p.categorie && (
                  <p className="text-xs text-gray-500 mb-1">{p.categorie.nom}</p>
                )}
                <p className="text-xs text-gray-600 mb-1">
                  📍 {p.quartier}
                  {p.commune ? `, ${p.commune}` : ""} — {p.ville}
                  {p.distance != null && (
                    <span className="font-medium"> · {p.distance} km</span>
                  )}
                </p>
                <p className="text-xs mb-2">
                  ⭐ {p.notemoyenne.toFixed(1)} ({p.totalAvis} avis)
                  {p.prixMin != null && (
                    <span className="text-gray-600">
                      {" "}
                      · dès {p.prixMin.toLocaleString("fr-FR")} FCFA
                    </span>
                  )}
                </p>
                <Link
                  href={`${detailPathPrefix}/${p.id}`}
                  className="inline-block text-xs font-medium text-sky-600 hover:text-sky-800"
                >
                  Voir la fiche →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}