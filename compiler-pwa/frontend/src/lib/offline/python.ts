import PythonRunnerWorker from './pythonRunner.worker.ts?worker';

export type OfflinePythonStatus = 'success' | 'runtime_error' | 'timeout' | 'system_error';

export interface OfflinePythonResult {
  status: OfflinePythonStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

const RUN_TIMEOUT_MS = 15_000;

let worker: Worker | null = null;
let initPromise: Promise<void> | null = null;
let runSeq = 0;

function getWorker(): Worker {
  if (!worker) worker = new PythonRunnerWorker();
  return worker;
}

export function ensurePythonWorker(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = new Promise<void>((resolve, reject) => {
    const w = getWorker();
    const onReady = (ev: MessageEvent) => {
      if (ev.data?.type === 'ready') {
        w.removeEventListener('message', onReady);
        resolve();
      } else if (ev.data?.type === 'error') {
        w.removeEventListener('message', onReady);
        reject(new Error(ev.data.message));
      }
    };
    w.addEventListener('message', onReady);
    w.postMessage({ type: 'init' });
  });
  return initPromise;
}

export async function preparePython(): Promise<void> {
  await ensurePythonWorker();
}

export function pythonReady(): Promise<boolean> {
  return ensurePythonWorker()
    .then(() => true)
    .catch(() => false);
}

function splitStdin(stdin: string): string[] {
  if (!stdin) return [];
  const lines = stdin.split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

export function runPython(code: string, stdin: string): Promise<OfflinePythonResult> {
  return ensurePythonWorker().then(() => {
    return new Promise<OfflinePythonResult>((resolve) => {
      const w = getWorker();
      const id = ++runSeq;
      const onMsg = (ev: MessageEvent) => {
        const d = ev.data;
        if (d?.type === 'result' && d.id === id) {
          w.removeEventListener('message', onMsg);
          window.clearTimeout(timer);
          resolve({
            status: d.status as OfflinePythonStatus,
            stdout: d.stdout ?? '',
            stderr: d.stderr ?? '',
            exitCode: d.exitCode,
          });
        }
      };
      w.addEventListener('message', onMsg);
      const timer = window.setTimeout(() => {
        w.removeEventListener('message', onMsg);
        w.terminate();
        worker = null;
        initPromise = null;
        resolve({ status: 'timeout', stdout: '', stderr: '', exitCode: null });
      }, RUN_TIMEOUT_MS);
      w.postMessage({ type: 'run', id, code, stdin: splitStdin(stdin) });
    });
  });
}