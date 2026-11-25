export type Lab = { id: string; name: string; lat: number; lng: number };

export const LABS: Lab[] = [
  { id: 'lab-1', name: 'Lab 1', lat: -7.0, lng: 110.4 },
  { id: 'lab-2', name: 'Lab 2', lat: -7.0, lng: 110.4 },
];

export const RADIUS_OPTIONS = [25, 50, 100, 200];

export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function isWithinLab(
  user: { lat: number; lng: number },
  labId: string,
  radiusM: number,
) {
  const lab = LABS.find((l) => l.id === labId);
  if (!lab) return false;
  return distanceMeters(user.lat, user.lng, lab.lat, lab.lng) <= radiusM;
}