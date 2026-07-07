// components/map/ProvidersMapWrapper.tsx
"use client";

import dynamic from "next/dynamic";
import type { PrestataireMapItem } from "./ProvidersMap";

// ⚠️ OBLIGATOIRE : Leaflet accède à `window`, donc le composant carte
// ne doit JAMAIS être rendu côté serveur. C'est ce wrapper qu'il faut
// importer partout, jamais ProvidersMap directement.
const ProvidersMap = dynamic(() => import("./ProvidersMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
      <p className="text-gray-400 text-sm">Chargement de la carte...</p>
    </div>
  ),
});

interface ProvidersMapWrapperProps {
  prestataires: PrestataireMapItem[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  detailPathPrefix?: string;
}

export default function ProvidersMapWrapper(props: ProvidersMapWrapperProps) {
  return <ProvidersMap {...props} />;
}