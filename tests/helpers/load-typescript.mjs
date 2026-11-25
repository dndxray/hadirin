import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
export function loadTypescript(path, overrides = {}, cache = new Map()) {
  if (cache.has(path)) return cache.get(path);
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  cache.set(path, module.exports);
  const localRequire = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith('@/')) return loadTypescript(`src/${name.slice(2)}.ts`, overrides, cache);
    return require(name);
  };
  new Function('require', 'exports', 'module', output)(localRequire, module.exports, module);
  cache.set(path, module.exports);
  return module.exports;
}
