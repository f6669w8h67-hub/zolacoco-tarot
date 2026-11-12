import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import vm from "node:vm";
import ts from "typescript";

// Execute real source modules with only external services/UI adapters stubbed.
// Each load has its own environment and module cache, so no secrets or network
// calls are needed, and import-time configuration is exercised for every case.
export async function loadTypescript(file, { env = {}, mocks = {} } = {}) {
  const root = resolve(import.meta.dirname, "../..");
  const context = vm.createContext({
    process: { env }, Response, URL, Date, console: { ...console, error() {} },
  });
  const cache = new Map();
  async function load(path) {
    if (cache.has(path)) return cache.get(path);
    const source = await readFile(path, "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
      fileName: path,
    });
    const sourceModule = new vm.SourceTextModule(outputText, { context, identifier: path });
    cache.set(path, sourceModule);
    await sourceModule.link(async (specifier) => {
      if (Object.hasOwn(mocks, specifier)) {
        const values = mocks[specifier];
        return new vm.SyntheticModule(Object.keys(values), function () {
          for (const [key, value] of Object.entries(values)) this.setExport(key, value);
        }, { context });
      }
      if (!specifier.startsWith(".") && !specifier.startsWith("@/")) throw new Error(`Unmocked import: ${specifier}`);
      let next = specifier.startsWith("@/") ? resolve(root, specifier.slice(2)) : resolve(dirname(path), specifier);
      if (!/\.[cm]?[jt]sx?$/.test(next)) next += ".ts";
      return load(next);
    });
    return sourceModule;
  }
  const sourceModule = await load(resolve(root, file));
  await sourceModule.evaluate();
  return sourceModule.namespace;
}
