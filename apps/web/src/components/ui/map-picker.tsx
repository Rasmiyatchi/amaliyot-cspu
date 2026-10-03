import L from "leaflet";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import { Crosshair, Loader2, MapPin, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Leaflet marker icon fix (Vite asset URL'lari bilan)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl,
  shadowUrl,
});

type LatLng = { lat: number; lng: number };

type Props = {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
  /** Berilsa "joylashuvni olib tashlash" tugmasi chiqadi */
  onClear?: () => void;
  /** Geo-fence radiusi (metr) — xaritada doira bilan ko'rsatiladi */
  radiusM?: number | null;
  height?: number;
  defaultCenter?: LatLng;
  defaultZoom?: number;
};

// Uzbekiston markazi (Navoiy viloyati)
const DEFAULT_CENTER: LatLng = { lat: 41.3, lng: 64.6 };
const DEFAULT_ZOOM = 6;
/** Geo-fence doirasi rangi (xarita plitkalari ikkala mavzuda ham yorug') — indigo-600 */
const FENCE_COLOR = "#4f46e5";
/** Shundan yomon aniqlikda (metr) joylashuvni qo'lda tekshirish tavsiya qilinadi */
const LOW_ACCURACY_M = 100;

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

/** Nuqtaga (va radius bo'lsa — butun doiraga) xaritani qaratadi. */
function focusMap(map: L.Map, at: LatLng, radiusM: number | null | undefined) {
  if (radiusM && radiusM > 0) {
    map.fitBounds(L.latLng(at.lat, at.lng).toBounds(radiusM * 2), {
      padding: [24, 24],
      maxZoom: 17,
    });
  } else {
    map.setView([at.lat, at.lng], Math.max(map.getZoom(), 15));
  }
}

function MapClickHandler({ onChange }: { onChange: (v: LatLng) => void }) {
  useMapEvents({
    click: (e) => {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

type FocusRequest = LatLng & { radiusM: number | null; nonce: number };

/**
 * Xaritani qaratish: (1) birinchi qiymat paydo bo'lganda (tahrirlash ochilganda) bir marta;
 * (2) link yoki "Mening joylashuvim" orqali yangi nuqta berilganda. Xaritaga bosilganda
 * qaratilmaydi — nuqta allaqachon ko'rinib turibdi.
 */
function MapFocus({
  value,
  radiusM,
  request,
}: {
  value: LatLng | null;
  radiusM: number | null | undefined;
  request: FocusRequest | null;
}) {
  const map = useMap();
  const focusedInitial = useRef(false);

  useEffect(() => {
    if (!value || focusedInitial.current) return;
    focusedInitial.current = true;
    focusMap(map, value, radiusM);
  }, [map, value, radiusM]);

  useEffect(() => {
    if (request) focusMap(map, request, request.radiusM);
  }, [map, request]);

  return null;
}

/** Dialog animatsiyasi yoki o'lcham o'zgarganda Leaflet plitkalarini qayta hisoblaydi (kulrang joylar bo'lmasin). */
function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export function MapPicker({
  value,
  onChange,
  onClear,
  radiusM,
  height = 320,
  defaultCenter = DEFAULT_CENTER,
  defaultZoom = DEFAULT_ZOOM,
}: Props) {
  const { t } = useTranslation();
  const linkInputId = useId();
  const [linkInput, setLinkInput] = useState("");
  const [locating, setLocating] = useState(false);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);

  const initialCenter: [number, number] = value
    ? [value.lat, value.lng]
    : [defaultCenter.lat, defaultCenter.lng];
  const initialZoom = value ? 12 : defaultZoom;

  const setAndFocus = (v: LatLng) => {
    onChange(v);
    setFocusRequest((prev) => ({ ...v, radiusM: radiusM ?? null, nonce: (prev?.nonce ?? 0) + 1 }));
  };

  const locateMe = () => {
    if (!window.isSecureContext) {
      toast.error(t("uiMapPicker.geoInsecure"));
      return;
    }
    if (!("geolocation" in navigator)) {
      toast.error(t("uiMapPicker.geoUnsupported"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setAndFocus({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (pos.coords.accuracy > LOW_ACCURACY_M) {
          toast.warning(t("uiMapPicker.geoLowAccuracy", { m: Math.round(pos.coords.accuracy) }), {
            duration: 8000,
          });
        }
      },
      (err) => {
        setLocating(false);
        const key =
          err.code === err.PERMISSION_DENIED
            ? "uiMapPicker.geoDenied"
            : err.code === err.TIMEOUT
              ? "uiMapPicker.geoTimeout"
              : "uiMapPicker.geoUnavailable";
        toast.error(t(key), { duration: 8000 });
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  };

  const applyLink = () => {
    const parsed = parseLatLng(linkInput);
    if (parsed) {
      setAndFocus(parsed);
      setLinkInput("");
    } else {
      toast.error(t("uiMapPicker.parseError"));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <label htmlFor={linkInputId} className="sr-only">
          {t("uiMapPicker.linkPlaceholder")}
        </label>
        <Input
          id={linkInputId}
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
        className="isolate overflow-hidden rounded-lg border border-border"
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
          {value && radiusM ? (
            <Circle
              center={[value.lat, value.lng]}
              radius={radiusM}
              pathOptions={{ color: FENCE_COLOR, weight: 2, fillOpacity: 0.12 }}
            />
          ) : null}
          <MapClickHandler onChange={onChange} />
          <MapFocus value={value} radiusM={radiusM} request={focusRequest} />
          <InvalidateOnResize />
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        {value ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="font-mono text-xs">
              {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
            </span>
            {radiusM ? (
              <span className="text-xs">{t("uiMapPicker.radiusLegend", { m: radiusM })}</span>
            ) : null}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">{t("uiMapPicker.clickHint")}</div>
        )}
        <div className="flex flex-wrap gap-2">
          {value && onClear && (
            <Button type="button" size="sm" variant="ghost" onClick={onClear}>
              <X className="h-3.5 w-3.5" />
              {t("uiMapPicker.clearLocation")}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={locateMe}
            disabled={locating}
            title={t("uiMapPicker.myLocationTitle")}
          >
            {locating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Crosshair className="h-3.5 w-3.5" />
            )}
            {locating ? t("uiMapPicker.locating") : t("uiMapPicker.myLocation")}
          </Button>
        </div>
      </div>
    </div>
  );
}
