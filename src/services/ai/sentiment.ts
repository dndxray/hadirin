export type SentimentLabel = 'negatif' | 'netral' | 'positif';

export type SentimentModel = {
  schema_version: number;
  status: string;
  algorithm: string;
  labels: SentimentLabel[];
  aliases: Record<string, string>;
  vocabulary: Record<string, number>;
  idf: number[];
  weights: number[][];
  bias: number[];
  preprocessing: string;
};

export type SentimentPrediction = {
  label: SentimentLabel | null;
  status: 'predicted' | 'unknown_vocabulary' | 'empty_input';
  scores: number[] | null;
  scoreType: 'decision_margin' | 'log_score' | 'none';
  experimental: boolean;
};

const SUPPORTED_PREPROCESSING = [
  'ascii_lowercase_words_unigram_bigram_sublinear_tf_l2_v1',
  'unicode_nfkd_ascii_words_unigram_bigram_sublinear_tf_l2_v1',
];

const owns = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

export function createSentimentClassifier(model: SentimentModel) {
  if (model.schema_version !== 1 || !SUPPORTED_PREPROCESSING.includes(model.preprocessing)) {
    throw new Error('Unsupported sentiment model format');
  }

  return function classify(text: string): SentimentPrediction {
    if (typeof text !== 'string') throw new TypeError('text must be a string');

    const normalized = model.preprocessing.startsWith('unicode_')
      ? text
          .replace(/<[^>]*>/g, ' ')
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
      : text.toLowerCase();

    const words = (normalized.match(/[a-z0-9]+/g) || []).map((word) =>
      owns(model.aliases, word) ? model.aliases[word] : word
    );
    const grams = words.concat(words.slice(1).map((word, index) => `${words[index]} ${word}`));
    const counts = new Map<number, number>();

    for (const gram of grams) {
      if (owns(model.vocabulary, gram)) {
        const index = model.vocabulary[gram];
        counts.set(index, (counts.get(index) || 0) + 1);
      }
    }

    if (counts.size === 0) {
      return {
        label: null,
        status: words.length ? 'unknown_vocabulary' : 'empty_input',
        scores: null,
        scoreType: 'none',
        experimental: true,
      };
    }

    const values = Array.from(counts, ([index, count]) => [
      index,
      (1 + Math.log(count)) * model.idf[index],
    ]);
    const norm = Math.sqrt(values.reduce((sum, pair) => sum + pair[1] ** 2, 0));
    const scores = model.weights.map((weights, classIndex) =>
      values.reduce(
        (score, [index, value]) => score + weights[index] * (value / norm),
        model.bias[classIndex]
      )
    );
    const best = scores.indexOf(Math.max(...scores));

    return {
      label: model.labels[best],
      status: 'predicted',
      scores,
      scoreType: model.algorithm === 'LinearSVC' ? 'decision_margin' : 'log_score',
      experimental: model.status !== 'production',
    };
  };
}
