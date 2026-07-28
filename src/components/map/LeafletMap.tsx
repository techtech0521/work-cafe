"use client";

import Link from "next/link";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { CafeMapProps } from "./CafeMap";

const OSAKA_CENTER: L.LatLngExpression = [34.6937, 135.5023];

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src,
  iconUrl: markerIcon.src,
  shadowUrl: markerShadow.src,
});

const defaultMarkerIcon = new L.Icon.Default();
const selectedMarkerIcon = new L.Icon.Default({ className: "cafe-marker-selected" });

function hasCoordinates(cafe: CafeMapProps["cafes"][number]): cafe is typeof cafe & { latitude: number; longitude: number } {
  return Number.isFinite(cafe.latitude) && Number.isFinite(cafe.longitude);
}

export default function LeafletMap({ cafes, selectedCafeId, onSelectCafe }: CafeMapProps) {
  const mappedCafes = cafes.filter(hasCoordinates);

  return (
    <MapContainer center={OSAKA_CENTER} zoom={13} scrollWheelZoom className="map-canvas">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {mappedCafes.map((cafe) => (
        <Marker
          key={cafe.id}
          position={[cafe.latitude, cafe.longitude]}
          eventHandlers={{ click: () => onSelectCafe?.(cafe.id), mouseover: () => onSelectCafe?.(cafe.id) }}
          icon={selectedCafeId === cafe.id ? selectedMarkerIcon : defaultMarkerIcon}
        >
          <Popup>
            <strong>{cafe.name}</strong><br />{cafe.area}<br />
            <Link className="map-popup-link" href={`/cafes/${cafe.id}`}>詳細を見る</Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
