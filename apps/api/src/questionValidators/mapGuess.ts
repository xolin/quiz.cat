import type { MapGuessAnswer } from "@quizcat/shared";

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// given: { lat, lng } · truth: { lat, lng, toleranceKm }
export function mapGuess(given: any, truth: MapGuessAnswer): boolean {
  if (typeof given?.lat !== "number" || typeof given?.lng !== "number") return false;
  return haversineKm(given.lat, given.lng, truth.lat, truth.lng) <= truth.toleranceKm;
}
