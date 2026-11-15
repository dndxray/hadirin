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

export function classifyReasonWith(
  reason: string,
  predict: Predictor,
  timeoutMs = 5000
): Promise<AiClassification> {
  return withTimeout(
    Promise.resolve().then(() => predict(reason)),
    timeoutMs
  )
    .then((prediction): AiClassification => {
      if (!prediction.label) {
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
