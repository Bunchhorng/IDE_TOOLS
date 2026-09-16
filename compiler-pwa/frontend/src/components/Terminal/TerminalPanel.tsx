import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
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
  /** Live interactive session: accumulated stdout while the program waits for input. */
  liveOutput?: string;
  /** An interactive session is in flight — render live output + live input row. */
  liveActive?: boolean;
  /** Forward one typed line to the running program. */
  onLiveSubmit?: (line: string) => void;
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
}

export const TerminalPanel = forwardRef<TerminalPanelHandle, TerminalPanelProps>(
  function TerminalPanel({ execution, isRunning, hasErrors, tab: externalTab, onTabChange, activeLanguage, fileContent, onGoToLine, onApplyFix, inputLines, onInputLinesChange, consoleRef, onFocusConsole, onInputReady, onAllLinesCommitted, onClear, liveOutput, liveActive, onLiveSubmit, onLiveStop }, ref) {
  const internalConsoleRef = useRef<ConsoleInputHandle>(null);
  const consoleRefResolved = consoleRef ?? internalConsoleRef;
  const { t } = useI18n();
  const [internalTab, setInternalTab] = useState<PanelTab>('terminal');
  const tab = externalTab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;
  const [copied, setCopied] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      focusConsole: () => {
        setTab('terminal');
        window.setTimeout(() => {
          consoleRefResolved.current?.focus();
        }, 60);
      },
    }),
    [consoleRefResolved, setTab],
  );

  /** Live mode renders one continuous stream — program stdout interleaved
   *  with the echoed input right after each prompt, like a real terminal. */
  type LivePart = { text: string; kind: 'out' | 'in' };
  const [liveParts, setLiveParts] = useState<LivePart[]>([]);
  /** Amount of the latest liveOutput prop already replayed into liveParts. */
  const consumedLenRef = useRef(0);

  // Reset the transcript whenever a live session (re)starts.
  useEffect(() => {
    if (!liveActive) return;
    const initial = liveOutput ?? '';
    consumedLenRef.current = initial.length;
    setLiveParts(initial ? [{ text: initial, kind: 'out' }] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveActive]);

  // Append only the NEW stdout since the last poll/submit.
  useEffect(() => {
    if (!liveActive) return;
    const out = liveOutput ?? '';
    if (out.length > consumedLenRef.current) {
      const delta = out.slice(consumedLenRef.current);
      consumedLenRef.current = out.length;
      setLiveParts((prev) => (delta ? [...prev, { text: delta, kind: 'out' }] : prev));
    }
  }, [liveOutput, liveActive]);

  /** Forward a typed line to the running program and echo it inline. */
  const submitLive = (line: string) => {
    setLiveParts((prev) => [...prev, { text: line + '\n', kind: 'in' }]);
    onLiveSubmit?.(line);
  };

  /** Keep the caret visible: follow the stream as new output arrives. */
  const liveScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!liveActive) return;
    const el = liveScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [liveActive, liveParts]);

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

  // Like a real terminal: the moment the program waits for input,
  // the caret jumps to the prompt row.
  useEffect(() => {
    if (waitingForInput) {
      consoleRefResolved.current?.focus();
      onInputReady?.();
    }
  }, [waitingForInput, consoleRefResolved, onInputReady]);

  // Live interactive sessions: focus the console input right away and keep
  // it focused as output streams in, so the user can type without clicking.
  // onInputReady also pulls mobile back to a tab that shows the input row.
  useEffect(() => {
    if (!liveActive) return;
    const timer = window.setTimeout(() => {
      consoleRefResolved.current?.focus();
      onInputReady?.();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [liveActive, liveOutput, consoleRefResolved, onInputReady]);

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

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
      <div className="flex items-center justify-between border-b border-edge pr-1.5 lg:pr-2">
        <Tabs<PanelTab>
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
          <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Copy output">
            <Icon name={copied ? 'check' : 'copy'} size={15} />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'terminal' ? (
          <div className="flex h-full min-h-0 flex-col">
            <div ref={liveScrollRef} className="min-h-0 flex-1 overflow-auto bg-editor px-4 py-3.5 font-mono text-[15px] leading-relaxed scrollbar-thin lg:px-4 lg:py-3 lg:text-[13px]">
              {isRunning && !liveActive && (
                <div className="flex items-center gap-2 text-info">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-info border-t-transparent" />
                  <span>{t('terminal.compiling')}</span>
                </div>
              )}

              {liveActive ? (
                <div className="whitespace-pre-wrap text-ink">
                  {liveParts.map((part, i) => (
                    <span key={i}>{part.text}</span>
                  ))}
                  <span className="mt-2 block text-[10px] font-semibold uppercase tracking-wider text-faint">
                    {t('terminal.console_label')}
                  </span>
                  <ConsoleInput
                    key="live-console"
                    ref={consoleRef}
                    code={fileContent ?? ''}
                    language={activeLanguage ?? 'c'}
                    lines={inputLines}
                    onLinesChange={onInputLinesChange}
                    running={false}
                    disabled={false}
                    echoFrom={0}
                    live={onLiveSubmit ? { onSubmit: submitLive } : undefined}
                  />
                </div>
              ) : (
                <>
                  {session ? (
                    <TerminalSession segments={session} />
                  ) : (
                    stdout && <pre className="whitespace-pre-wrap text-ink">{stdout}</pre>
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
                </>
              )}
            </div>
          </div>
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
          <div ref={liveScrollRef} className="h-full overflow-auto bg-editor px-4 py-3 font-mono text-[15px] leading-relaxed scrollbar-thin lg:py-3 lg:text-[13px]">
            {isRunning && !liveActive && (
              <div className="flex items-center gap-2 text-info">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-info border-t-transparent" />
                <span>{t('terminal.compiling')}</span>
              </div>
            )}

            {liveActive ? (
              <div className="whitespace-pre-wrap text-ink">
                {liveParts.map((part, i) => (
                  <span key={i}>{part.text}</span>
                ))}
                <ConsoleInput
                  key="live-console"
                  ref={consoleRef}
                  code={fileContent ?? ''}
                  language={activeLanguage ?? 'c'}
                  lines={inputLines}
                  onLinesChange={onInputLinesChange}
                  running={false}
                  disabled={false}
                  echoFrom={0}
                  live={onLiveSubmit ? { onSubmit: submitLive } : undefined}
                />
              </div>
            ) : (
              <>
                {stdout && (
                  <pre className="whitespace-pre-wrap text-ink">{stdout}</pre>
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
              </>
            )}
            </div>
        )}
      </div>
    </div>
  );
});
