import modelJson from './model-edom.json';
import {
  createSentimentClassifier,
  type SentimentLabel,
  type SentimentModel,
  type SentimentPrediction,
} from './sentiment';

export type AiClassification =
  | { status: 'success'; category: SentimentLabel }
  | { status: 'failed'; error: string };

const model = modelJson as unknown as SentimentModel;
const classify = createSentimentClassifier(model);

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

type Predictor = (text: string) => SentimentPrediction | Promise<SentimentPrediction>;

function detectStrongDomainSignal(reason: string): SentimentLabel | null {
  const text = reason.toLowerCase();

  // 1. Prestasi / Lomba / Tugas Kampus / Akademik -> 'positif'
  if (/(lomba|kompetisi|delegasi|seminar|konferensi|beasiswa|juara|prestasi|pelatihan|workshop|dinas)/.test(text)) {
    return 'positif';
  }

  // 2. Halangan kesehatan / kondisi medis / musibah -> 'negatif'
  if (/(sakit|demam|flu|batuk|pusing|mual|muntah|opname|rawat|rs|rumah sakit|dokter|kecelakaan|musibah|duka|meninggal|operasi|terpapar|lemas|tipes|tifus|kurang enak badan|drop|istirahat|bedrest)/.test(text)) {
    return 'negatif';
  }

  // 3. Acara / urusan keluarga / kendala logistik -> 'netral'
  if (/(keluarga|acara|urusan|kendala|kendaraan|hujan|banjir|macet|kereta|pesawat|perjalanan|keperluan|pernikahan|nikahan)/.test(text)) {
    return 'netral';
  }

  return null;
}

function inferPermissionDomainFallback(reason: string): SentimentLabel | null {
  const signal = detectStrongDomainSignal(reason);
  if (signal) return signal;

  const text = reason.toLowerCase();
  // Jika ada kata izin umum dengan panjang kalimat memadai
  if (text.trim().length >= 10 && /(ijin|izin|halangan|tidak bisa|berhalangan)/.test(text)) {
    return 'netral';
  }

  return null;
}

export function classifyReasonWith(
  reason: string,
  predict: Predictor,
  timeoutMs = 5000
): Promise<AiClassification> {
  if (!reason || !reason.trim()) {
    return Promise.resolve({ status: 'failed', error: 'empty_input' });
  }

  // Prioritaskan kata kunci domain izin (agar konsisten untuk lomba, sakit, acara keluarga)
  const strongSignal = detectStrongDomainSignal(reason);
  if (strongSignal) {
    return Promise.resolve({ status: 'success', category: strongSignal });
  }

  return withTimeout(
    Promise.resolve().then(() => predict(reason)),
    timeoutMs
  )
    .then((prediction): AiClassification => {
      if (!prediction.label) {
        const fallback = inferPermissionDomainFallback(reason);
        if (fallback) {
          return { status: 'success', category: fallback };
        }
        return { status: 'failed', error: prediction.status };
      }
      return { status: 'success', category: prediction.label };
    })
    .catch((error): AiClassification => {
      const message = error instanceof Error ? error.message : 'classification_error';
      return {
        status: 'failed',
        error: message === 'timeout' ? 'timeout' : 'classification_error',
      };
    });
}

export function classifyReason(reason: string, timeoutMs = 5000): Promise<AiClassification> {
  return classifyReasonWith(reason, classify, timeoutMs);
}
