import { MAX_LAB_RADIUS_METERS } from '@/utils/attendance-location';

export const LAB_NAME_MAX_LENGTH = 120;

// Isi form berupa teks, karena itu yang diketik pengguna.
export type LabFormValues = {
  name: string;
  latitude: string;
  longitude: string;
  radiusMeters: string;
};

export type LabFormErrors = Partial<Record<keyof LabFormValues, string>>;

// Data lab yang disimpan ke Firestore (koleksi `labs`).
export type LabInput = {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

// Menerima koma maupun titik sebagai pemisah desimal, karena keyboard HP
// berbahasa Indonesia sering mengeluarkan koma.
function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseInteger(text: string): number | null {
  const normalized = text.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isSafeInteger(value) ? value : null;
}

// Aturan ini sejalan dengan fungsi validLab di firestore.rules.
export function validateLabForm(values: LabFormValues): {
  input: LabInput | null;
  errors: LabFormErrors;
} {
  const errors: LabFormErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = 'Nama laboratorium wajib diisi.';
  else if (name.length > LAB_NAME_MAX_LENGTH) {
    errors.name = `Nama laboratorium maksimal ${LAB_NAME_MAX_LENGTH} karakter.`;
  }

  const latitude = parseDecimal(values.latitude);
  if (!values.latitude.trim()) errors.latitude = 'Latitude wajib diisi.';
  else if (latitude === null) {
    errors.latitude = 'Latitude harus berupa angka, misalnya -7.0505.';
  } else if (latitude < -90 || latitude > 90) {
    errors.latitude = 'Latitude harus antara -90 dan 90.';
  }

  const longitude = parseDecimal(values.longitude);
  if (!values.longitude.trim()) errors.longitude = 'Longitude wajib diisi.';
  else if (longitude === null) {
    errors.longitude = 'Longitude harus berupa angka, misalnya 110.441.';
  } else if (longitude < -180 || longitude > 180) {
    errors.longitude = 'Longitude harus antara -180 dan 180.';
  }

  const radiusMeters = parseInteger(values.radiusMeters);
  if (!values.radiusMeters.trim()) errors.radiusMeters = 'Radius wajib diisi.';
  else if (radiusMeters === null) {
    errors.radiusMeters = 'Radius harus berupa bilangan bulat dalam meter.';
  } else if (radiusMeters < 1 || radiusMeters > MAX_LAB_RADIUS_METERS) {
    errors.radiusMeters = `Radius harus antara 1 dan ${MAX_LAB_RADIUS_METERS.toLocaleString('id-ID')} meter.`;
  }

  if (Object.keys(errors).length > 0) return { input: null, errors };
  return {
    input: {
      name,
      latitude: latitude as number,
      longitude: longitude as number,
      radiusMeters: radiusMeters as number,
    },
    errors,
  };
}
