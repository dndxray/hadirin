import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

const model = JSON.parse(readFileSync('src/services/ai/model-edom.json', 'utf8'));

function loadModule(file, resolve) {
  const output = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', 'module', output)(resolve, module.exports, module);
  return module.exports;
}

const sentiment = loadModule('src/services/ai/sentiment.ts', () => {
  throw new Error('sentiment.ts should not require external modules');
});

const classifier = loadModule('src/services/ai/classifier.ts', (name) => {
  if (name === './model-edom.json') return model;
  if (name === './sentiment') return sentiment;
  throw new Error(`Unexpected require: ${name}`);
});

const prediction = (label) => ({
  label,
  status: label ? 'predicted' : 'empty_input',
  scores: null,
  scoreType: 'none',
  experimental: true,
});

test('alasan positif diklasifikasikan sebagai positif', async () => {
  assert.deepEqual(
    await classifier.classifyReason('Asisten menjelaskan materi dengan sangat baik dan jelas.'),
    { status: 'success', category: 'positif' }
  );
});

test('alasan negatif diklasifikasikan sebagai negatif', async () => {
  assert.deepEqual(
    await classifier.classifyReason('Saya sakit dan tidak bisa hadir karena demam.'),
    { status: 'success', category: 'negatif' }
  );
});

test('input kosong dan kata tak dikenal disimpan sebagai kegagalan', async () => {
  assert.deepEqual(await classifier.classifyReason(''), {
    status: 'failed',
    error: 'empty_input',
  });
  assert.deepEqual(await classifier.classifyReason('zzzz qqqq'), {
    status: 'failed',
    error: 'unknown_vocabulary',
  });
});

test('timeout disimpan sebagai status gagal tanpa melempar error', async () => {
  const slowPredictor = () =>
    new Promise((resolve) => setTimeout(() => resolve(prediction('netral')), 50));

  assert.deepEqual(await classifier.classifyReasonWith('contoh', slowPredictor, 5), {
    status: 'failed',
    error: 'timeout',
  });
});
