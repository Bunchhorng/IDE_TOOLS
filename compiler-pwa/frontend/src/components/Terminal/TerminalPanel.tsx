import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { ConsoleInput, type ConsoleInputHandle } from './ConsoleInput';
import { Tabs } from '../ui/Tabs';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { explainError, isInputStarved } from '../../lib/errorHints';
import { buildSession, detectPrompts } from '../../lib/prompts';
import { formatExecutionTime } from '../../lib/format';
import { TerminalSession } from './TerminalSession';
import { useI18n } from '../../i18n';
import { translations, type TranslationKey } from '../../i18n/translations';
import { useTheme } from '../../context/ThemeContext';
import type { Execution, ExecutionStatus } from '../../types';

interface TerminalPanelProps {
  execution: Execution | null;
  isRunning: boolean;
  hasErrors: boolean;
  tab?: PanelTab;
  onTabChange?: (tab: PanelTab) => void;
  /** Language of the active file (improves error pattern matching). */
  activeLanguage?: string;
  /** Current unsaved content of the active file (used to render the offending line and build fixes). */
  fileContent?: string;
  /** Jump the editor to a source line. */
  onGoToLine?: (line: number) => void;
  /** Apply a one-click fix: receives the line and the content transformer. */
  onApplyFix?: (line: number, apply: (code: string) => string) => void;
  /** Committed console lines (stdin). Shared with the Input tab. */
  inputLines: string[];
  onInputLinesChange: (lines: string[]) => void;
  /** Ref that lets the parent flush the uncommitted draft line before a run. */
  consoleRef?: React.RefObject<ConsoleInputHandle | null>;
  /** Focus the console input row (used by error-hint action buttons). */
  onFocusConsole?: () => void;
  /** Fires when the program starts waiting for input (mobile can switch tabs). */
  onInputReady?: () => void;
  /** Fired when every detected prompt has an answer — the parent starts the run (VS Code-style auto-run). */
  onAllLinesCommitted?: () => void;
  /** Clear the terminal output and console history. */
  onClear?: () => void;
  /** Live interactive session: the raw PTY stream as base64 (output_b64). */
  liveOutputB64?: string;
  /** True when the sandbox capped stdout/stderr during the live session. */
  liveTruncated?: boolean;
  /** An interactive session is in flight — render the xterm canvas. */
  liveActive?: boolean;
  /** Forward raw terminal bytes (base64) to the running program. */
  onRawInput?: (chunk: string) => void;
  /** Resize the sandbox PTY (rows, cols). */
  onResize?: (rows: number, cols: number) => void;
  /** Stop the live session (kills the sandbox). */
  onLiveStop?: () => void;
}

export type PanelTab = 'terminal' | 'output' | 'errors';

/** Statuses that get a bilingual (English + Khmer) error heading. */
const ERROR_TITLE_KEYS: Partial<Record<ExecutionStatus, TranslationKey>> = {
  compile_error: 'status.compile_error',
  runtime_error: 'status.runtime_error',
  timeout: 'status.timeout',
  memory_limit: 'status.memory_limit',
  system_error: 'status.system_error',
  failed: 'status.failed',
};

/** Status heading: English label, Khmer label underneath, line chip. */
function BilingualErrorTitle({
  status,
  line,
  onGoToLine,
}: {
  status: ExecutionStatus | null | undefined;
  line?: number;
  onGoToLine?: (line: number) => void;
}) {
  const { t } = useI18n();
  const key = status ? ERROR_TITLE_KEYS[status] : undefined;
  if (!key) return null;
  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <div>
        <p className="text-[15px] font-semibold leading-tight text-error lg:text-[13px]">{translations.en[key] ?? key}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-error/60 lg:text-[11px]">{translations.km[key] ?? translations.en[key]}</p>
      </div>
      {line !== undefined && (
        <button
          type="button"
          onClick={() => onGoToLine?.(line)}
          title={t('terminal.go_to_line')}
          className="inline-flex items-center gap-1 rounded bg-error/10 px-2 py-1 text-[11px] font-medium text-error/80 transition-colors hover:bg-error/20 hover:text-error lg:px-1.5 lg:py-0.5 lg:text-[10px]"
        >
          <Icon name="arrowRight" size={11} />
          line {line}
        </button>
      )}
    </div>
  );
}

/** Friendly bilingual explanation, the offending source line, actions + the raw error underneath. */
function ErrorDetails({
  execution,
  activeLanguage,
  fileContent,
  onGoToLine,
  onApplyFix,
  onFocusConsole,
}: {
  execution: Execution | null;
  activeLanguage?: string;
  fileContent?: string;
  onGoToLine?: (line: number) => void;
  onApplyFix?: (line: number, apply: (code: string) => string) => void;
  onFocusConsole?: () => void;
}) {
  if (!execution?.stderr) return null;
  const hint = explainError(execution.stderr, execution.status, activeLanguage ?? execution.language?.slug);
  const errLine = hint?.line;
  const srcLine =
    errLine !== undefined && fileContent
      ? (fileContent.split('\n')[errLine - 1] ?? '').trimEnd()
      : undefined;

  return (
    <div className="space-y-2.5">
      {hint && (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <Icon name="alertTriangle" size={15} className="mt-0.5 shrink-0 text-warning" />
            <div className="min-w-0 flex-1 text-[13px] leading-relaxed lg:text-[12px]">
              <p className="text-ink">{hint.en}</p>
              <p className="mt-0.5 text-mute">{hint.km}</p>

              {srcLine !== undefined && srcLine.trim() !== '' && (
                <pre className="mt-2 overflow-x-auto rounded border border-edge bg-editor px-2.5 py-1.5 text-[13px] text-ink lg:text-[12px]">
                  <span className="mr-2 select-none text-error/70">{errLine} │</span>
                  {srcLine}
                </pre>
              )}

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {errLine !== undefined && onGoToLine && (
                  <button
                    type="button"
                    onClick={() => onGoToLine(errLine)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-raised px-3 py-1.5 text-[12px] font-medium text-mute transition-colors hover:text-ink lg:px-2.5 lg:py-1 lg:text-[11px]"
                  >
                    <Icon name="arrowRight" size={12} />
                    {translations.en['terminal.go_to_line']}
                  </button>
                )}
                {hint.action === 'focus-input' && (
                  <button
                    type="button"
                    onClick={() => onFocusConsole?.()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-info/40 bg-info/10 px-3 py-1.5 text-[12px] font-medium text-info transition-colors hover:bg-info/20 lg:px-2.5 lg:py-1 lg:text-[11px]"
                  >
                    <Icon name="keyboard" size={12} />
                    {translations.en['terminal.type_input_now']}
                  </button>
                )}
                {hint.fix && errLine !== undefined && onApplyFix && (
                  <>
                    <button
                      type="button"
                      onClick={() => onApplyFix(hint.fix!.line, hint.fix!.apply)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-3 py-1.5 text-[12px] font-medium text-success transition-colors hover:bg-success/20 lg:px-2.5 lg:py-1 lg:text-[11px]"
                    >
                      <Icon name="wand" size={12} />
                      {translations.en['terminal.quick_fix']} · {hint.fix.en}
                    </button>
                    <p className="w-full text-[11px] leading-snug text-mute/80 lg:text-[10px]">{hint.fix.km}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-faint">
          {translations.en['terminal.raw_error']} · {translations.km['terminal.raw_error']}
        </p>
        <pre className="whitespace-pre-wrap text-error/90">{execution.stderr}</pre>
      </div>
    </div>
  );
}

export interface TerminalPanelHandle {
  /** Focus the console input row (Terminal tab) if it is rendered. */
  focusConsole: () => void;
  /** Clear the live terminal canvas (like Ctrl+L) without stopping the program. */
  clearLive: () => void;
}

/** Pad the xterm canvas to the app's editor palette. */
const DARK_THEME = {
  background: '#0d1424',
  foreground: '#e6eaf2',
  cursor: '#e6eaf2',
  cursorAccent: '#0d1424',
  selectionBackground: '#33415f',
  black: '#0c1222',
  red: '#f87171',
  green: '#4ade80',
  yellow: '#facc15',
  blue: '#60a5fa',
  magenta: '#c084fc',
  cyan: '#22d3ee',
  white: '#e6eaf2',
  brightBlack: '#6d7a93',
  brightRed: '#f87171',
  brightGreen: '#4ade80',
  brightYellow: '#facc15',
  brightBlue: '#60a5fa',
  brightMagenta: '#c084fc',
  brightCyan: '#22d3ee',
  brightWhite: '#ffffff',
};

const LIGHT_THEME = {
  background: '#ffffff',
  foreground: '#0c1222',
  cursor: '#0c1222',
  cursorAccent: '#ffffff',
  selectionBackground: '#d9e0ea',
  black: '#0c1222',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#ca8a04',
  blue: '#2563eb',
  magenta: '#9333ea',
  cyan: '#0891b2',
  white: '#4a5772',
  brightBlack: '#7e8da5',
  brightRed: '#dc2626',
  brightGreen: '#16a34a',
  brightYellow: '#ca8a04',
  brightBlue: '#2563eb',
  brightMagenta: '#9333ea',
  brightCyan: '#0891b2',
  brightWhite: '#0c1222',
};

/** Number of decoded bytes a base64 string represents. */
function byteCountOfB64(b64: string): number {
  const s = b64.replace(/=+$/, '');
  return Math.floor((s.length * 3) / 4);
}

/** The byte tail of a base64 stream starting at `startByte`, aligned to a
 *  3-byte boundary (base64 always encodes whole 3-byte groups). */
function tailBytesOfB64(b64: string, startByte: number): Uint8Array {
  const safeStart = startByte - (startByte % 3);
  const tail = atob(b64.slice((safeStart * 4) / 3));
  const bytes = new Uint8Array(tail.length);
  for (let i = 0; i < tail.length; i++) bytes[i] = tail.charCodeAt(i);
  return startByte - safeStart > 0 ? bytes.subarray(startByte - safeStart) : bytes;
}

/** UTF-8-safe base64 for terminal input (xterm may pass non-Latin1 text). */
function utf8Base64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export const TerminalPanel = forwardRef<TerminalPanelHandle, TerminalPanelProps>(
  function TerminalPanel({ execution, isRunning, hasErrors, tab: externalTab, onTabChange, activeLanguage, fileContent, onGoToLine, onApplyFix, inputLines, onInputLinesChange, consoleRef, onFocusConsole, onInputReady, onAllLinesCommitted, onClear, liveOutputB64, liveTruncated, liveActive, onRawInput, onResize, onLiveStop }, ref) {
  const internalConsoleRef = useRef<ConsoleInputHandle>(null);
  const consoleRefResolved = consoleRef ?? internalConsoleRef;
  const { t } = useI18n();
  const { theme } = useTheme();
  const [internalTab, setInternalTab] = useState<PanelTab>('terminal');
  const tab = externalTab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;
  const [copied, setCopied] = useState(false);

  /** xterm instance + fit addon, created/owned while a live session runs. */
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const termHostRef = useRef<HTMLDivElement | null>(null);
  const pendingDisposablesRef = useRef<{ dispose(): void }[]>([]);
  /** Number of stream bytes already written to the canvas. */
  const consumedBytesRef = useRef(0);
  /** Latest full stream (bytes Base64) — read by callbacks that must not
   *  depend on the poll prop (clear / reopen). */
  const liveStreamRef = useRef('');
  /** Coalesced keystroke buffer flushed to onRawInput on a short timer. */
  const pendingInputRef = useRef('');
  const inputFlushTimerRef = useRef<number | null>(null);
  const rawInputRef = useRef(onRawInput);
  const resizeRef = useRef(onResize);
  const resizeTimerRef = useRef<number | null>(null);
  rawInputRef.current = onRawInput;
  resizeRef.current = onResize;
  liveStreamRef.current = liveOutputB64 ?? '';

  const disposeTerminal = useCallback(() => {
    if (inputFlushTimerRef.current != null) window.clearTimeout(inputFlushTimerRef.current);
    if (resizeTimerRef.current != null) window.clearTimeout(resizeTimerRef.current);
    inputFlushTimerRef.current = null;
    resizeTimerRef.current = null;
    pendingDisposablesRef.current.forEach((d) => d.dispose());
    pendingDisposablesRef.current = [];
    fitRef.current?.dispose();
    fitRef.current = null;
    termRef.current?.dispose();
    termRef.current = null;
  }, []);

  /** Create the terminal when a live session starts (or the tab hosting it
   *  changes) and dispose it when the session ends. A fresh terminal always
   *  replays the full accumulated stream.
   *
   *  Two panels can be mounted (desktop + mobile output tab) but only one is
   *  visible — the host may be zero-sized. We never open xterm into a hidden
   *  host: creation is visibility-gated, and a ResizeObserver both keeps the
   *  canvas sized (fit) and lazily creates the terminal the moment the host
   *  actually becomes visible. */
  useEffect(() => {
    if (!liveActive) return;
    const host = termHostRef.current;
    if (!host) return;

    const isVisible = () => host.clientWidth > 0 && host.clientHeight > 0;
    const createTerminal = () => {
      if (termRef.current || !isVisible()) return;
      const dark = document.documentElement.classList.contains('dark');
      const term = new Terminal({
        allowProposedApi: true,
        cursorBlink: true,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: 13,
        lineHeight: 1.4,
        scrollback: 5000,
        theme: dark ? DARK_THEME : LIGHT_THEME,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(host);
      try {
        fit.fit();
      } catch {
        /* hidden / zero-sized host */
      }
      termRef.current = term;
      fitRef.current = fit;

      // Replay everything accumulated so far into the fresh canvas.
      const stream = liveStreamRef.current;
      if (stream) {
        try {
          term.write(tailBytesOfB64(stream, 0));
        } catch {
          /* malformed stream — wait for the next poll */
        }
        consumedBytesRef.current = byteCountOfB64(stream);
      } else {
        consumedBytesRef.current = 0;
      }

      const flushInput = () => {
        inputFlushTimerRef.current = null;
        const data = pendingInputRef.current;
        if (!data) return;
        pendingInputRef.current = '';
        rawInputRef.current?.(utf8Base64(data));
      };
      const dataDisposable = term.onData((data) => {
        pendingInputRef.current += data;
        if (inputFlushTimerRef.current == null) {
          inputFlushTimerRef.current = window.setTimeout(flushInput, 90);
        }
      });
      const resizeDisposable = term.onResize(({ rows, cols }) => {
        if (resizeTimerRef.current != null) window.clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = window.setTimeout(() => resizeRef.current?.(rows, cols), 150);
      });
      pendingDisposablesRef.current = [dataDisposable, resizeDisposable];
    };

    const ro = new ResizeObserver(() => {
      if (termRef.current) {
        try {
          fitRef.current?.fit();
        } catch {
          /* hidden / zero-sized host */
        }
      } else {
        createTerminal();
      }
    });
    ro.observe(host);
    createTerminal();

    return () => {
      ro.disconnect();
      disposeTerminal();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveActive, tab, theme]);

  /** Stream only the NEW bytes from each poll into the canvas. */
  useEffect(() => {
    if (!liveActive) return;
    const stream = liveStreamRef.current;
    if (!stream) return;
    const total = byteCountOfB64(stream);
    const term = termRef.current;
    if (!term) return;
    if (total < consumedBytesRef.current) {
      // Stream shrank (new session on a reused canvas) — redraw from zero.
      consumedBytesRef.current = 0;
      term.reset();
    }
    if (total > consumedBytesRef.current) {
      try {
        term.write(tailBytesOfB64(stream, consumedBytesRef.current));
      } catch {
        /* ignore a malformed slice — next poll will resync */
      }
      consumedBytesRef.current = total;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveOutputB64, liveActive]);

  useImperativeHandle(
    ref,
    () => ({
      focusConsole: () => {
        setTab('terminal');
        window.setTimeout(() => {
          consoleRefResolved.current?.focus();
        }, 60);
      },
      clearLive: () => {
        termRef.current?.reset();
        consumedBytesRef.current = byteCountOfB64(liveStreamRef.current);
      },
    }),
    [consoleRefResolved, setTab],
  );

  const stdout = execution?.stdout ?? '';
  const stderr = execution?.stderr ?? '';
  const sentStdin = execution?.stdin?.trim() ?? '';
  /** Something to wipe: a past run, output, errors, or typed input. */
  const canClear = !!execution || stderr !== '' || inputLines.length > 0;

  const handleCopy = async () => {
    const input = execution?.stdin?.trim() ? `[input]\n${execution.stdin}\n` : '';
    const text = [input, stdout, stderr ? `\n[stderr]\n${stderr}` : ''].join('').trim();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  /** The code is fine — the program just ran before input was provided. */
  const waitingForInput = !!execution && !isRunning && isInputStarved(execution.stderr);
  /** An input-starved run is a prompt, not a failure: never render it as an
   *  error (badge stays hidden / Errors tab shows success). */
  const effectiveStatus: ExecutionStatus | null =
    execution && waitingForInput ? null : execution?.status ?? null;
  /** Errors tab still shows the raw EOFError detail if the user wants it. */
  const errorDetailsExecution = waitingForInput ? null : execution;

  // Like a real terminal: the moment a past run waits for input, the caret
  // jumps to the prompt row.
  useEffect(() => {
    if (waitingForInput) {
      consoleRefResolved.current?.focus();
      onInputReady?.();
    }
  }, [waitingForInput, consoleRefResolved, onInputReady]);

  // Live sessions: grab the xterm focus (the canvas itself is the input). Ask
  // the parent to surface the terminal exactly once per session — not on every
  // poll tick, or mobile would be trapped on the terminal tab.
  const inputReadyFiredRef = useRef(false);
  useEffect(() => {
    if (!liveActive) {
      inputReadyFiredRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      termRef.current?.focus();
      if (!inputReadyFiredRef.current) {
        inputReadyFiredRef.current = true;
        onInputReady?.();
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [liveActive, onInputReady]);

  /** All prompts the program will print, in order. */
  const allPrompts = useMemo(
    () => detectPrompts(fileContent ?? '', activeLanguage),
    [fileContent, activeLanguage],
  );

  // Terminal-style transcript: interleave stdout with echoed input.
  // The truncate index counts the prompts ANSWERED by the run (lines in the
  // run's stdin), not the live console lines — the console resets for the
  // next run while the transcript stays intact.
  const session = useMemo(() => {
    if (!execution || isRunning) return null;
    const answered = sentStdin ? execution.stdin!.split('\n').length : 0;
    return buildSession(
      stdout,
      sentStdin ? execution.stdin!.split('\n') : [],
      allPrompts,
      // The next unanswered prompt stays live in the caret row below — cut
      // it from the transcript so it renders exactly once (never duplicated).
      allPrompts[answered]?.text,
    );
  }, [execution, isRunning, stdout, sentStdin, allPrompts]);

  /** Input lines already rendered by the run's transcript — the console echo
   *  only shows typed lines beyond these, so nothing is duplicated. */
  const answeredCount = sentStdin ? (execution?.stdin?.split('\n').length ?? 0) : 0;

  /** Once a pure-output program finished (nothing to type, ever), the caret
   *  row is noise — hide it like a terminal that exited. Programs that read
   *  input keep the prompt row so you can edit input and run again. */
  const consoleHidden =
    !!execution && !isRunning && !waitingForInput && allPrompts.length === 0 && inputLines.length === 0;

  /** Footer shown after a finished run: OK / exit code / elapsed time. */
  const runSummary = execution && !isRunning ? (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-edge pt-2.5 text-[12px]">
      {effectiveStatus === 'success' && (
        <span className="inline-flex items-center gap-1.5 font-medium text-success">
          <Icon name="checkCircle" size={14} />
          {t('terminal.finished_message')}
        </span>
      )}
      {execution.exit_code !== null && (
        <span className="inline-flex items-center gap-1.5 text-mute">
          {t('terminal.exit_code', { code: execution.exit_code })}
        </span>
      )}
      {execution.execution_time !== null && (
        <span className="inline-flex items-center gap-1.5 text-mute">
          {t('terminal.execution_time', { time: formatExecutionTime(execution.execution_time) })}
        </span>
      )}
    </div>
  ) : null;

  /** Live frame used by the Terminal and Output tabs: the xterm canvas.
   *  Only one tab is mounted at a time, so the shared host ref points at the
   *  visible one and the open-effect re-runs on tab switches. */
  const liveFrame = (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={termHostRef} className="min-h-0 flex-1 overflow-hidden bg-editor px-3 py-3" />
      {(liveTruncated || execution?.truncated) && (
        <div className="m-3 mt-0 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] leading-snug text-mute">
          <span className="flex items-start gap-1.5">
            <Icon name="alertTriangle" size={14} className="mt-0.5 shrink-0 text-warning" />
            <span>{t('terminal.truncated')}</span>
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
      <div className="flex min-w-0 items-center justify-between border-b border-edge pr-1 lg:pr-2">
        <Tabs<PanelTab>
          className="min-w-0 flex-1"
          tabs={[
            { value: 'output', label: t('terminal.output'), icon: 'terminal' },
            { value: 'errors', label: t('terminal.errors'), icon: 'alertCircle', badge: hasErrors ? 1 : 0 },
            { value: 'terminal', label: t('terminal.terminal'), icon: 'terminal' },
          ]}
          value={tab}
          onChange={setTab}
        />

        <div className="flex shrink-0 items-center gap-1">
          {effectiveStatus && (
            <StatusBadge status={effectiveStatus} className="mr-1 hidden sm:inline-flex" />
          )}
          {liveActive && onLiveStop && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onLiveStop}
              aria-label={t('terminal.stop_run')}
              title={t('terminal.stop_run')}
              className="text-error transition-colors hover:bg-error/10"
            >
              <Icon name="stop" size={15} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            disabled={!canClear}
            aria-label={t('terminal.clear')}
            title={t('terminal.clear')}
          >
            <Icon name="trash" size={15} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleCopy} aria-label={t('terminal.copy_output')}>
            <Icon name={copied ? 'check' : 'copy'} size={15} />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'terminal' ? (
          liveActive ? (
            liveFrame
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <div className="min-h-0 flex-1 overflow-auto bg-editor px-4 py-3.5 font-mono text-[15px] leading-relaxed scrollbar-thin lg:px-4 lg:py-3 lg:text-[13px]">
                {isRunning && (
                  <div className="flex items-center gap-2 text-info">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-info border-t-transparent" />
                    <span>{t('terminal.compiling')}</span>
                  </div>
                )}

                {session ? (
                  <TerminalSession segments={session} />
                ) : (
                  stdout && <pre className="whitespace-pre-wrap text-ink">{stdout}</pre>
                )}

                {execution?.truncated && (
                  <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] leading-snug text-mute">
                    <span className="flex items-start gap-1.5">
                      <Icon name="alertTriangle" size={14} className="mt-0.5 shrink-0 text-warning" />
                      <span>{t('terminal.truncated')}</span>
                    </span>
                  </div>
                )}

                {stderr && !waitingForInput && (
                  <div className="mt-2">
                    <BilingualErrorTitle
                      status={effectiveStatus}
                      line={explainError(stderr, execution?.status, activeLanguage ?? execution?.language?.slug)?.line}
                      onGoToLine={onGoToLine}
                    />
                    <ErrorDetails
                      execution={errorDetailsExecution}
                      activeLanguage={activeLanguage}
                      fileContent={fileContent}
                      onGoToLine={onGoToLine}
                      onApplyFix={onApplyFix}
                      onFocusConsole={onFocusConsole}
                    />
                  </div>
                )}

                {/* Inline prompt: type right here in the terminal, like VS Code.
                    The console stays empty until a run happens — the prompt row
                    only appears once the program has run (and asks for input).
                    Hidden while a run is in flight — only the spinner shows. */}
                {!consoleHidden && !isRunning && !!execution && (
                  <div className="mt-2.5">
                    <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-mute">
                      <Icon name="keyboard" size={12} className="text-faint" />
                      {t('terminal.console_label')}
                    </label>
                    <ConsoleInput
                      key="session-console"
                      ref={consoleRef}
                      code={fileContent ?? ''}
                      language={activeLanguage ?? 'python'}
                      lines={inputLines}
                      onLinesChange={onInputLinesChange}
                      running={isRunning}
                      disabled={isRunning}
                      echoFrom={session && !waitingForInput ? answeredCount : 0}
                      onAllLinesCommitted={onAllLinesCommitted}
                    />
                  </div>
                )}
                {runSummary}
              </div>
            </div>
          )
        ) : tab === 'errors' ? (
          <div className="h-full overflow-auto bg-editor px-4 py-3 font-mono text-[15px] leading-relaxed scrollbar-thin lg:py-3 lg:text-[13px]">
            {isRunning && (
              <div className="flex items-center gap-2 text-info">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-info border-t-transparent" />
                <span>{t('terminal.compiling')}</span>
              </div>
            )}

            {(!stderr || waitingForInput) && !isRunning && !hasErrors && (
              <p className="text-success">
                <span className="flex items-center gap-1.5">
                  <Icon name="checkCircle" size={14} />
                  {t('terminal.no_errors')}
                </span>
              </p>
            )}

            {!stderr && !isRunning && hasErrors && (
              <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5 text-[12px] leading-relaxed text-mute">
                {explainError(null, execution?.status)?.en}
                <p className="mt-0.5">{explainError(null, execution?.status)?.km}</p>
              </div>
            )}

            {stderr && !waitingForInput && (
              <div className="flex items-start gap-2">
                <Icon name="alertTriangle" size={14} className="mt-0.5 shrink-0 text-error" />
                <div className="min-w-0 flex-1">
                  <BilingualErrorTitle
                    status={effectiveStatus}
                    line={explainError(stderr, execution?.status, activeLanguage ?? execution?.language?.slug)?.line}
                    onGoToLine={onGoToLine}
                  />
                  <ErrorDetails
                    execution={execution}
                    activeLanguage={activeLanguage}
                    fileContent={fileContent}
                    onGoToLine={onGoToLine}
                    onApplyFix={onApplyFix}
                    onFocusConsole={onFocusConsole}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          liveActive ? (
            liveFrame
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <div className="min-h-0 flex-1 overflow-auto bg-editor px-4 py-3 font-mono text-[15px] leading-relaxed scrollbar-thin lg:py-3 lg:text-[13px]">
                {isRunning && (
                  <div className="flex items-center gap-2 text-info">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-info border-t-transparent" />
                    <span>{t('terminal.compiling')}</span>
                  </div>
                )}

                {stdout && (
                  <pre className="whitespace-pre-wrap text-ink">{stdout}</pre>
                )}
                {execution?.truncated && (
                  <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] leading-snug text-mute">
                    <span className="flex items-start gap-1.5">
                      <Icon name="alertTriangle" size={14} className="mt-0.5 shrink-0 text-warning" />
                      <span>{t('terminal.truncated')}</span>
                    </span>
                  </div>
                )}
                {execution && !isRunning && sentStdin && (
                  <div className="mt-3 rounded-md border border-edge bg-raised/60 px-3 py-2 text-[12px] text-mute">
                    <span className="font-semibold text-faint">{t('terminal.input_label')}</span>
                    <span className="font-mono text-ink">{execution.stdin}</span>
                  </div>
                )}

                {execution && !isRunning && !sentStdin && allPrompts.length > 0 && (
                  <div className="mt-3 rounded-md border border-info/30 bg-info/10 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <Icon name="keyboard" size={15} className="mt-0.5 shrink-0 text-info" />
                      <div className="text-[12px] leading-relaxed text-mute">
                        <span className="font-semibold text-ink">{t('terminal.no_input')}</span>
                        {' '}{t('terminal.add_input_tab')}
                      </div>
                    </div>
                  </div>
                )}

                {runSummary}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
});