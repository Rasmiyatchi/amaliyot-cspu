import L from "leaflet";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import { Crosshair, MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

import { Button } from "@/components/ui/button";

// Leaflet marker icon fix (Vite asset URL'lari bilan)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl,
  shadowUrl,
});

type LatLng = { lat: number; lng: number };

type Props = {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
  height?: number;
  defaultCenter?: LatLng;
  defaultZoom?: number;
};

// Uzbekiston markazi (Navoiy viloyati)
const DEFAULT_CENTER: LatLng = { lat: 41.3, lng: 64.6 };
const DEFAULT_ZOOM = 6;

function MapClickHandler({ onChange }: { onChange: (v: LatLng) => void }) {
  useMapEvents({
    click: (e) => {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/** value o'zgarsa xaritani markerga qaratadi (tahrirlashda mavjud pointni ko'rsatish uchun) */
function CenterOnValue({ value }: { value: LatLng | null }) {
  const map = useMap();
  const lastValue = useRef<LatLng | null>(null);

  useEffect(() => {
    if (value && value !== lastValue.current) {
      // Faqat birinchi marta (tahrirlash ochilganda) — user klik qilganda re-center qilmaymiz
      if (!lastValue.current) {
        map.setView([value.lat, value.lng], Math.max(map.getZoom(), 12));
      }
      lastValue.current = value;
    }
  }, [value, map]);

  return null;
}

export function MapPicker({
  value,
  onChange,
  height = 320,
  defaultCenter = DEFAULT_CENTER,
  defaultZoom = DEFAULT_ZOOM,
}: Props) {
  const initialCenter: [number, number] = value
    ? [value.lat, value.lng]
    : [defaultCenter.lat, defaultCenter.lng];
  const initialZoom = value ? 12 : defaultZoom;

  const useGeolocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        /* foydalanuvchi rad etdi yoki xato */
      },
    );
  };

  return (
    <div className="space-y-2">
      <div
        className="overflow-hidden rounded-lg border border-border"
        style={{ height: `${height}px` }}
      >
        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {value && <Marker position={[value.lat, value.lng]} />}
          <MapClickHandler onChange={onChange} />
          <CenterOnValue value={value} />
        </MapContainer>
      </div>

      <div className="flex items-center justify-between text-sm">
        {value ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="font-mono text-xs">
              {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
            </span>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Xaritaga bosib joyni belgilang
          </div>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={useGeolocation}
          title="Mening joylashuvim"
        >
          <Crosshair className="h-3.5 w-3.5" />
          Joyim
        </Button>
      </div>
    </div>
  );
}
