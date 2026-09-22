import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, '..', 'node_modules', 'pyodide');
const dest = join(root, '..', 'public', 'pyodide');
mkdirSync(dest, { recursive: true });
for (const f of ['pyodide.js', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']) {
  cpSync(join(src, f), join(dest, f));
}