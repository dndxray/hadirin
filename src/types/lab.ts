// Bentuk data lab di Firestore: koleksi `labs/{labId}`.
// Batas nilai yang valid: name 1-120 karakter, latitude -90..90,
// longitude -180..180, radiusMeters 1..1000.
export type Lab = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
};
