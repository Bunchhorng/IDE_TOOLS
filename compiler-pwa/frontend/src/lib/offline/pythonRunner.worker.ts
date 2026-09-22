/// <reference lib="webworker" />
importScripts('/pyodide/pyodide.js');

interface PyodideApi {
  setStdout(opts: { batched?: (s: string) => void }): void;
  setStderr(opts: { batched?: (s: string) => void }): void;
  setStdin(opts: { stdin?: () => string | null }): void;
  runPythonAsync(code: string): Promise<unknown>;
}

let loadPromise: Promise<PyodideApi> | null = null;

function getPyodide(): Promise<PyodideApi> {
  if (!loadPromise) {
    loadPromise = (self as unknown as { loadPyodide: (opts: { indexURL: string }) => Promise<PyodideApi> })
      .loadPyodide({ indexURL: '/pyodide/' });
  }
  return loadPromise;
}

self.onmessage = (ev: MessageEvent) => {
  const msg = ev.data;
  if (msg.type === 'init') {
    getPyodide()
      .then(() => self.postMessage({ type: 'ready' }))
      .catch((err: unknown) => self.postMessage({ type: 'error', message: String(err) }));
    return;
  }
  if (msg.type === 'run') {
    void (async () => {
      try {
        const py = await getPyodide();
        const stdout: string[] = [];
        const stderr: string[] = [];
        const stdinLeft = [...(msg.stdin as string[])];
        py.setStdout({ batched: (s) => stdout.push(s) });
        py.setStderr({ batched: (s) => stderr.push(s) });
        py.setStdin({ stdin: () => (stdinLeft.length ? `${stdinLeft.shift()}\n` : null) });
        await py.runPythonAsync(msg.code as string);
        self.postMessage({
          type: 'result',
          id: msg.id,
          status: 'success',
          stdout: stdout.join(''),
          stderr: stderr.join(''),
          exitCode: 0,
        });
      } catch (err) {
        const message = err instanceof Error ? (err.message ?? '') : String(err);
        self.postMessage({
          type: 'result',
          id: msg.id,
          status: 'runtime_error',
          stdout: '',
          stderr: `${message}\n`,
          exitCode: 1,
        });
      }
    })();
  }
};