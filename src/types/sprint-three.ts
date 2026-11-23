export type Lab = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

export type DevicePosition = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
  mocked?: boolean;
};

export type AttendanceQr = {
  type: 'hadirin.attendance';
  version: 1;
  sessionId: string;
  token: string;
};

export type CheckInEvidence = {
  position: DevicePosition;
  method: 'location' | 'qr';
  qr?: AttendanceQr;
};
