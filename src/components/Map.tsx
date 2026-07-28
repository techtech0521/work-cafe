"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import type { Cafe } from "@/types/cafe";

const markerIcon = L.divIcon({
  className: "custom-marker",
  html: '<span aria-hidden="true">●</span>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

export default function Map({ cafes }: { cafes: readonly Cafe[] }) {
  return (
    <MapContainer center={[34.6937, 135.5023]} zoom={13} scrollWheelZoom className="map-canvas">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {cafes.map((cafe) => (
        <Marker key={cafe.id} position={[cafe.latitude, cafe.longitude]} icon={markerIcon}>
          <Popup><strong>{cafe.name}</strong><br />{cafe.area}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
