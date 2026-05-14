/**
 * AR Utilities — pure math, no RN imports, easy to unit-test.
 */

/** Great-circle distance in metres (Haversine formula). */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Compass bearing from (lat1,lon1) → (lat2,lon2) in degrees [0–360).
 * 0 = North, 90 = East, 180 = South, 270 = West.
 */
export function bearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.cos(toRad(lon2 - lon1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Normalise an angle difference to [-180, 180].
 * Positive = place is to the right of device heading.
 */
export function normaliseBearing(angleDiff: number): number {
  return ((angleDiff + 540) % 360) - 180;
}

/**
 * Map a horizontal angle diff (degrees) to a screen X position.
 * @param angleDiff   normalised bearing diff in degrees
 * @param hFov        horizontal field of view in degrees
 * @param screenWidth device screen width in px
 */
export function angleToScreenX(
  angleDiff: number,
  hFov: number,
  screenWidth: number,
): number {
  return (0.5 + angleDiff / hFov) * screenWidth;
}

/**
 * Map an elevation angle and device pitch to a screen Y position.
 * screenY = 0 at the top edge, screenHeight at the bottom edge.
 *
 * @param elevAngleDeg   angle above horizon to the target (positive = above)
 * @param devicePitchDeg how far up the device is tilted (positive = phone tilted up)
 * @param vFov           vertical field of view in degrees
 * @param screenHeight   device screen height in px
 */
export function angleToScreenY(
  elevAngleDeg: number,
  devicePitchDeg: number,
  vFov: number,
  screenHeight: number,
): number {
  // net angle: positive → overlay goes above screen centre (smaller Y value)
  const netAngle = elevAngleDeg - devicePitchDeg;
  return (0.5 - netAngle / vFov) * screenHeight;
}

/**
 * Elevation angle in degrees from observer to target.
 * @param distMetres    horizontal distance in metres
 * @param altDiffMetres target altitude minus observer altitude (positive = target higher)
 */
export function elevationAngle(
  distMetres: number,
  altDiffMetres: number,
): number {
  if (distMetres <= 0) return 0;
  return Math.atan2(altDiffMetres, distMetres) * (180 / Math.PI);
}

/**
 * Opacity and scale by distance (logarithmic scaling so far-away places
 * stay visible while near ones remain prominent).
 *
 * ≤ 100 m   → opacity 1.0, scale 1.0
 * maxDistMetres → opacity 0.4, scale 0.65
 */
export function distanceStyle(
  distanceMetres: number,
  maxDistMetres = 200_000,
): { opacity: number; scale: number } {
  if (distanceMetres <= 0) return { opacity: 1, scale: 1 };
  const logDist = Math.log10(Math.max(distanceMetres, 1));
  const logRef = Math.log10(100); // baseline at 100 m
  const logMax = Math.log10(maxDistMetres);
  const ratio = Math.min(
    Math.max((logDist - logRef) / (logMax - logRef), 0),
    1,
  );
  return {
    opacity: 1 - ratio * 0.6, // 1.0 → 0.4
    scale: 1 - ratio * 0.35, // 1.0 → 0.65
  };
}

/** Human-readable distance string. */
export function formatDistance(metres: number): string {
  if (metres < 1_000) return `${Math.round(metres)} m`;
  return `${(metres / 1_000).toFixed(1)} km`;
}

/**
 * Logarithmic scale factor from physical distance.
 * 30 m  → ~1.0 (nearest, biggest)
 * 500 m → ~0.42 (farthest, smallest)
 *
 * Uses log10 so the drop from 30→100 m feels similar to 100→500 m.
 */
export function sizeFromDistance(
  distanceMeters: number,
  minScale = 0.42,
  maxScale = 1.0,
): number {
  const clamped = Math.max(10, Math.min(distanceMeters, 600));
  const t = Math.log10(clamped / 10) / Math.log10(60); // 0 at 10m, 1 at 600m
  return Math.max(
    minScale,
    Math.min(maxScale, maxScale - (maxScale - minScale) * t),
  );
}
