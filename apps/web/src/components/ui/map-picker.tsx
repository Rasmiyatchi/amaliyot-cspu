import L from "leaflet";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import { Crosshair, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

/**
 * Google Maps link yoki "lat, lng" matnidan koordinatani ajratadi.
 * Qo'llab-quvvatlanadi:
 *  - "41.311081, 69.279729" yoki "41.311 69.279"
 *  - https://www.google.com/maps/@41.311,69.279,15z
 *  - https://www.google.com/maps/place/.../@41.311,69.279,17z/data=...!3d41.311!4d69.279
 *  - ...?q=41.311,69.279  /  &ll=41.311,69.279  /  &query=41.311,69.279
 * Qisqartirilgan linklar (maps.app.goo.gl) brauzerda ochilmaydi — to'liq link kerak.
 */
export function parseLatLng(raw: string): LatLng | null {
  const s = raw.trim();
  if (!s) return null;

  const inRange = (lat: number, lng: number): LatLng | null =>
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { lat, lng } : null;

  // 1) Oddiy "lat,lng" yoki "lat lng"
  const plain = s.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if (plain) return inRange(Number(plain[1]), Number(plain[2]));

  // 2) !3dLAT!4dLNG (place data segmenti — eng aniq)
  const data = s.match(/!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/);
  if (data) return inRange(Number(data[1]), Number(data[2]));

  // 3) q= / query= / ll= / destination= parametrlari
  const param = s.match(/[?&](?:q|query|ll|destination)=(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/i);
  if (param) return inRange(Number(param[1]), Number(param[2]));

  // 4) @lat,lng (xarita markazi)
  const at = s.match(/@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
  if (at) return inRange(Number(at[1]), Number(at[2]));

  return null;
}

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

  const { t } = useTranslation();
  const [linkInput, setLinkInput] = useState("");

  const useGeolocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        /* foydalanuvchi rad etdi yoki xato */
      },
    );
  };

  const applyLink = () => {
    const parsed = parseLatLng(linkInput);
    if (parsed) {
      onChange(parsed);
      setLinkInput("");
    } else {
      toast.error(t("uiMapPicker.parseError"));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder={t("uiMapPicker.linkPlaceholder")}
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyLink();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={applyLink} disabled={!linkInput.trim()}>
          {t("uiMapPicker.apply")}
        </Button>
      </div>
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
            {t("uiMapPicker.clickHint")}
          </div>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={useGeolocation}
          title={t("uiMapPicker.myLocationTitle")}
        >
          <Crosshair className="h-3.5 w-3.5" />
          {t("uiMapPicker.myLocation")}
        </Button>
      </div>
    </div>
  );
}
