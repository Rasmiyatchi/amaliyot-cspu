import L from "leaflet";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PracticeAssignment } from "@/lib/api/types";
import {
  acquirePosition,
  geoErrorTexts,
  getGeoPermissionState,
  toGeoError,
  type GeoErrorCode,
  type GeoFix,
} from "@/lib/geolocation";
import { distanceM, isWithinFence, type LatLng } from "@/lib/geo-distance";
import { cn } from "@/lib/utils";

// Leaflet marker icon fix (Vite asset URL'lari bilan) — map-picker bilan bir xil
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: iconRetina, iconUrl, shadowUrl });

/** Geo-fence doirasi — indigo-600 (plitkalar ikkala mavzuda ham yorug') */
const FENCE_COLOR = "#4f46e5";
const INSIDE_COLOR = "#059669";
const OUTSIDE_COLOR = "#dc2626";
/** Ikkala nuqta (tashkilot va talaba) ko'rinadigan qilib qaratadi. */
function FitBounds({ org, me, radiusM }: { org: LatLng; me: LatLng | null; radiusM: number }) {
  const map = useMap();
  useEffect(() => {
    const fence = L.latLng(org.lat, org.lng).toBounds(radiusM * 2 + 40);
    const bounds = me ? fence.extend(L.latLng(me.lat, me.lng)) : fence;
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 18 });
  }, [map, org.lat, org.lng, me, radiusM]);
  return null;
}

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

type Props = { assignment: PracticeAssignment };

type GeoState =
  | { phase: "idle" }
  | { phase: "acquiring"; bestAccuracy: number | null }
  | { phase: "ok"; fix: GeoFix }
  | { phase: "failed"; code: GeoErrorCode };

/**
 * Talaba kabineti: amaliyot obyekti xaritada (marker + geo-fence doirasi) va talabaning hozirgi
 * joylashuvi. "Keldim" ishlamayotganda talaba qayerda turganini va binoga qancha yaqin borishi
 * kerakligini ko'radi. Hudud (area) amaliyotida ko'rsatilmaydi (joylashuv tekshirilmaydi).
 */
export function PracticeMapCard({ assignment }: Props) {
  const { t } = useTranslation();
  const org = useMemo<LatLng | null>(
    () =>
      assignment.organization_geo_lat != null && assignment.organization_geo_lng != null
        ? {
            lat: Number(assignment.organization_geo_lat),
            lng: Number(assignment.organization_geo_lng),
          }
        : null,
    [assignment.organization_geo_lat, assignment.organization_geo_lng],
  );
  const radiusM = assignment.organization_geo_radius_m ?? 100;
  const [geo, setGeo] = useState<GeoState>({ phase: "idle" });

  const locate = async () => {
    setGeo({ phase: "acquiring", bestAccuracy: null });
    try {
      const fix = await acquirePosition({
        onProgress: (best) => setGeo({ phase: "acquiring", bestAccuracy: best.accuracy }),
      });
      setGeo({ phase: "ok", fix });
    } catch (err) {
      setGeo({ phase: "failed", code: toGeoError(err).code });
    }
  };

  // Ruxsat avval berilgan bo'lsa — so'ramasdan darhol ko'rsatiladi
  useEffect(() => {
    let cancelled = false;
    void getGeoPermissionState().then((state) => {
      if (!cancelled && state === "granted") void locate();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!org) return null;

  const me = geo.phase === "ok" ? { lat: geo.fix.lat, lng: geo.fix.lng } : null;
  const distance = me ? distanceM(org, me) : null;
  const within =
    me && distance !== null
      ? isWithinFence(distance, radiusM, geo.phase === "ok" ? geo.fix.accuracy : 0)
      : null;
  const meColor = within === null ? FENCE_COLOR : within ? INSIDE_COLOR : OUTSIDE_COLOR;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${org.lat},${org.lng}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4 text-primary" />
          {t("practiceMap.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          <div className="font-medium">{assignment.organization_name}</div>
          {assignment.organization_address && (
            <div className="text-xs text-muted-foreground">{assignment.organization_address}</div>
          )}
          <div className="text-xs text-muted-foreground">
            {t("practiceMap.radius", { m: radiusM })}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border" style={{ height: 260 }}>
          <MapContainer
            center={[org.lat, org.lng]}
            zoom={16}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[org.lat, org.lng]} />
            <Circle
              center={[org.lat, org.lng]}
              radius={radiusM}
              pathOptions={{
                color: FENCE_COLOR,
                fillColor: FENCE_COLOR,
                fillOpacity: 0.12,
                weight: 2,
              }}
            />
            {me && geo.phase === "ok" && (
              <>
                {/* GPS aniqligi doirasi */}
                <Circle
                  center={[me.lat, me.lng]}
                  radius={Math.max(5, geo.fix.accuracy)}
                  pathOptions={{
                    color: meColor,
                    fillColor: meColor,
                    fillOpacity: 0.08,
                    weight: 1,
                    dashArray: "4 4",
                  }}
                />
                <CircleMarker
                  center={[me.lat, me.lng]}
                  radius={8}
                  pathOptions={{ color: "#ffffff", fillColor: meColor, fillOpacity: 1, weight: 2 }}
                />
                <Polyline
                  positions={[
                    [org.lat, org.lng],
                    [me.lat, me.lng],
                  ]}
                  pathOptions={{ color: meColor, weight: 2, dashArray: "6 6" }}
                />
              </>
            )}
            <FitBounds org={org} me={me} radiusM={radiusM} />
            <InvalidateOnResize />
          </MapContainer>
        </div>

        {geo.phase === "ok" && distance !== null && (
          <div
            className={cn(
              "flex items-start gap-2 rounded-lg border p-3 text-sm",
              within
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                : "border-destructive/30 bg-destructive/10 text-destructive",
            )}
            role="status"
          >
            {within ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div className="space-y-0.5">
              <div className="font-medium">
                {within ? t("practiceMap.inside") : t("practiceMap.outside")}
              </div>
              <div className="text-xs opacity-90">
                {t("practiceMap.distance", {
                  d: Math.round(distance),
                  r: radiusM,
                  acc: Math.round(geo.fix.accuracy),
                })}
              </div>
              {!within && (
                <div className="text-xs opacity-90">
                  {t("practiceMap.outsideHint", {
                    d: Math.max(0, Math.round(distance - radiusM)),
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {geo.phase === "failed" && (
          <Alert variant="warning">
            <AlertDescription className="space-y-1">
              <p>{geoErrorTexts(geo.code).message}</p>
              <p className="whitespace-pre-line text-xs opacity-90">
                {geoErrorTexts(geo.code).help}
              </p>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void locate()}
            disabled={geo.phase === "acquiring"}
          >
            {geo.phase === "acquiring" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            {geo.phase === "acquiring"
              ? geo.bestAccuracy !== null
                ? t("practiceMap.acquiringAcc", { m: Math.round(geo.bestAccuracy) })
                : t("practiceMap.acquiring")
              : geo.phase === "ok"
                ? t("practiceMap.refresh")
                : t("practiceMap.locateMe")}
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              <Navigation className="h-4 w-4" />
              {t("practiceMap.directions")}
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("practiceMap.tip")}</p>
      </CardContent>
    </Card>
  );
}
