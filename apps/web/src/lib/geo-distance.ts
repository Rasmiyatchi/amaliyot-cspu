/** Geo-fence hisoblari — backend `attendance._evaluate_geo` bilan bir xil qoidalar. */

export type LatLng = { lat: number; lng: number };

/** Backend bilan bir xil: GPS aniqligi hisobiga radiusga qo'shiladigan maksimal yengillik */
export const ACCURACY_ALLOWANCE_MAX_M = 150;

/** Ikki nuqta orasidagi masofa (metr) — backend `haversine_m` bilan bir xil formula. */
export function distanceM(a: LatLng, b: LatLng): number {
  const r = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(s));
}

/** Server qoidasi: masofa ≤ radius + min(aniqlik, 150 m) bo'lsa — hududda. */
export function isWithinFence(distance: number, radiusM: number, accuracyM: number): boolean {
  return distance <= radiusM + Math.min(Math.max(accuracyM, 0), ACCURACY_ALLOWANCE_MAX_M);
}
