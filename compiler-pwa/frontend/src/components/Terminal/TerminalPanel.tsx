import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ConsoleInput, type ConsoleInputHandle } from './ConsoleInput';
import { Tabs } from '../ui/Tabs';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { formatExecutionTime, formatMemory } from '../../lib/format';
import { explainError, isInputStarved } from '../../lib/errorHints';
import { buildSession, detectPrompts } from '../../lib/prompts';
import { TerminalSession } from './TerminalSession';
import { useI18n } from '../../i18n';
import { translations, type TranslationKey } from '../../i18n/translations';
import type { Execution, ExecutionStatus } from '../../types';

interface TerminalPanelProps {
  execution: Execution | null;
  isRunning: boolean;
  stdin: string;
  hasErrors: boolean;
  needsStdin?: boolean;
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
        <p className="text-[13px] font-semibold text-error">{translations.en[key] ?? key}</p>
        <p className="text-[11px] leading-snug text-error/60">{translations.km[key] ?? translations.en[key]}</p>
      </div>
      {line !== undefined && (
        <button
          type="button"
          onClick={() => onGoToLine?.(line)}
          title={t('terminal.go_to_line')}
          className="inline-flex items-center gap-1 rounded bg-error/10 px-1.5 py-0.5 text-[10px] font-medium text-error/80 transition-colors hover:bg-error/20 hover:text-error"
        >
          <Icon name="arrowRight" size={10} />
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
            <div className="min-w-0 flex-1 text-[12px] leading-relaxed">
              <p className="text-ink">{hint.en}</p>
              <p className="mt-0.5 text-mute">{hint.km}</p>

              {srcLine !== undefined && srcLine.trim() !== '' && (
                <pre className="mt-2 overflow-x-auto rounded border border-edge bg-editor px-2.5 py-1.5 text-[12px] text-ink">
                  <span className="mr-2 select-none text-error/70">{errLine} │</span>
                  {srcLine}
                </pre>
              )}

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {errLine !== undefined && onGoToLine && (
                  <button
                    type="button"
                    onClick={() => onGoToLine(errLine)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-raised px-2.5 py-1 text-[11px] font-medium text-mute transition-colors hover:text-ink"
                  >
                    <Icon name="arrowRight" size={12} />
                    {translations.en['terminal.go_to_line']}
                  </button>
                )}
                {hint.action === 'focus-input' && (
                  <button
                    type="button"
                    onClick={() => onFocusConsole?.()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-info/40 bg-info/10 px-2.5 py-1 text-[11px] font-medium text-info transition-colors hover:bg-info/20"
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
                      className="inline-flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success transition-colors hover:bg-success/20"
                    >
                      <Icon name="wand" size={12} />
                      {translations.en['terminal.quick_fix']} · {hint.fix.en}
                    </button>
                    <p className="w-full text-[10px] leading-snug text-mute/80">{hint.fix.km}</p>
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
  function TerminalPanel({ execution, isRunning, stdin, hasErrors, needsStdin = false, tab: externalTab, onTabChange, activeLanguage, fileContent, onGoToLine, onApplyFix, inputLines, onInputLinesChange, consoleRef, onFocusConsole, onInputReady }, ref) {
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

  const stdout = execution?.stdout ?? '';
  const stderr = execution?.stderr ?? '';
  const sentStdin = execution?.stdin?.trim() ?? '';

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

  const outputEmpty = !isRunning && !execution && !stdout && !stderr;
  const hasStdin = stdin.trim().length > 0;

  /** The code is fine — the program just ran before input was provided. */
  const waitingForInput = !!execution && !isRunning && isInputStarved(execution.stderr);
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

  /** All prompts the program will print, in order. */
  const allPrompts = useMemo(
    () => detectPrompts(fileContent ?? '', activeLanguage),
    [fileContent, activeLanguage],
  );

  /** Prompts shown in the transcript. The pending one (the next line the user
   *  will type) is excluded — the inline caret row renders it itself, so it
   *  appears exactly once, right where you type. */
  const transcriptPrompts = useMemo(
    () => (isRunning ? allPrompts : allPrompts.filter((_, i) => i !== inputLines.length)),
    [isRunning, allPrompts, inputLines.length],
  );

  // Terminal-style transcript: interleave stdout with echoed input.
  const session = useMemo(() => {
    if (!execution || isRunning) return null;
    return buildSession(
      stdout,
      sentStdin ? execution.stdin!.split('\n') : [],
      transcriptPrompts,
    );
  }, [execution, isRunning, stdout, sentStdin, transcriptPrompts]);

  /** Once a pure-output program finished (nothing to type, ever), the caret
   *  row is noise — hide it like a terminal that exited. Programs that read
   *  input keep the prompt row so you can edit input and run again. */
  const consoleHidden =
    !!execution && !isRunning && !waitingForInput && allPrompts.length === 0 && inputLines.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
      <div className="flex items-center justify-between border-b border-edge pr-2">
        <Tabs<PanelTab>
          tabs={[
            { value: 'output', label: t('terminal.output'), icon: 'terminal' },
            { value: 'errors', label: t('terminal.errors'), icon: 'alertCircle', badge: hasErrors ? 1 : 0 },
            { value: 'terminal', label: t('terminal.terminal'), icon: 'terminal' },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div className="flex items-center gap-1">
          {execution && (
            <StatusBadge status={execution.status} className="mr-1 hidden sm:inline-flex" />
          )}
          <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Copy output">
            <Icon name={copied ? 'check' : 'copy'} size={15} />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'terminal' ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-auto bg-editor px-4 py-3 font-mono text-[13px] leading-relaxed scrollbar-thin">
              {isRunning && (
                <div className="flex items-center gap-2 text-info">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-info border-t-transparent" />
                  <span>{t('terminal.compiling')}</span>
                </div>
              )}

              {outputEmpty && (
                <p className="text-faint">{t('terminal.press_run', { key: 'Run' })}</p>
              )}

              {session ? (
                <TerminalSession segments={session} />
              ) : (
                stdout && <pre className="whitespace-pre-wrap text-ink">{stdout}</pre>
              )}

              {stderr && !waitingForInput && (
                <div className="mt-2">
                  <BilingualErrorTitle
                    status={execution?.status}
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

              {waitingForInput && (
                <div className="mt-2 flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-3 py-2.5">
                  <Icon name="keyboard" size={15} className="mt-0.5 shrink-0 text-info" />
                  <div className="min-w-0 text-[12px] leading-relaxed">
                    <p className="font-semibold text-ink">{t('terminal.waiting_for_input')}</p>
                    <p className="mt-0.5 text-mute">{t('terminal.waiting_for_input_desc')}</p>
                  </div>
                </div>
              )}

              {execution && !isRunning && (execution.execution_time !== null || execution.memory_usage !== null || execution.exit_code !== null) && (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-edge pt-2.5 text-xs text-mute">
                  {execution.execution_time !== null && (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="clock" size={13} />
                      {formatExecutionTime(execution.execution_time)}
                    </span>
                  )}
                  {execution.memory_usage !== null && (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="cpu" size={13} />
                      {formatMemory(execution.memory_usage)}
                    </span>
                  )}
                  {execution.exit_code !== null && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-semibold text-faint">{t('terminal.exit')}</span>
                      <code className="rounded bg-raised px-1.5 py-0.5 text-[11px] text-ink">{execution.exit_code}</code>
                    </span>
                  )}
                  {execution.exit_code !== null && execution.exit_code === 0 && (
                    <span className="inline-flex items-center gap-1.5 text-success">
                      <Icon name="checkCircle" size={13} />
                      {t('terminal.completed')}
                    </span>
                  )}
                </div>
              )}

              {/* Inline prompt: type right here in the terminal, like VS Code. */}
              {!consoleHidden && (
                <ConsoleInput
                  ref={consoleRef}
                  code={fileContent ?? ''}
                  language={activeLanguage ?? 'python'}
                  lines={inputLines}
                  onLinesChange={onInputLinesChange}
                  running={isRunning}
                  disabled={isRunning}
                  showEcho={!session}
                />
              )}
            </div>
          </div>
        ) : tab === 'errors' ? (
          <div className="h-full overflow-auto bg-editor px-4 py-3 font-mono text-[13px] leading-relaxed scrollbar-thin">
            {isRunning && (
              <div className="flex items-center gap-2 text-info">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-info border-t-transparent" />
                <span>{t('terminal.compiling')}</span>
              </div>
            )}

            {!stderr && !isRunning && !hasErrors && (
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

            {stderr && (
              <div className="flex items-start gap-2">
                <Icon name="alertTriangle" size={14} className="mt-0.5 shrink-0 text-error" />
                <div className="min-w-0 flex-1">
                  <BilingualErrorTitle
                    status={execution?.status}
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
          <div className="h-full overflow-auto bg-editor px-4 py-3 font-mono text-[13px] leading-relaxed scrollbar-thin">
            {isRunning && (
              <div className="flex items-center gap-2 text-info">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-info border-t-transparent" />
                <span>{t('terminal.compiling')}</span>
              </div>
            )}

            {outputEmpty && (
              needsStdin && !hasStdin ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5">
                    <Icon name="alertTriangle" size={15} className="mt-0.5 shrink-0 text-warning" />
                    <div className="text-[12px] leading-relaxed text-mute">
                      <span className="font-semibold text-ink">{t('terminal.stdin_warning')}</span>
                      {' '}{t('terminal.add_input', { key: 'Run' })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onFocusConsole?.()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-raised px-2.5 py-1.5 text-[12px] text-mute transition-colors hover:text-ink"
                  >
                    <Icon name="keyboard" size={13} />
                    {t('terminal.write_input')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-faint">{t('terminal.press_run_results', { key: 'Run' })}</p>
                  {hasStdin && (
                    <button
                      type="button"
                      onClick={() => onFocusConsole?.()}
                      className="flex items-center gap-1.5 rounded-md border border-edge bg-raised px-2.5 py-1.5 text-[12px] text-mute transition-colors hover:text-ink"
                    >
                      <Icon name="keyboard" size={13} />
                      {t('terminal.input_review')}
                    </button>
                  )}
                </div>
              )
            )}

            {stdout && (
              <pre className="whitespace-pre-wrap text-ink">{stdout}</pre>
            )}            {execution && !isRunning && sentStdin && (
              <div className="mt-3 rounded-md border border-edge bg-raised/60 px-3 py-2 text-[12px] text-mute">
                <span className="font-semibold text-faint">{t('terminal.input_label')}</span>
                <span className="font-mono text-ink">{execution.stdin}</span>
              </div>
            )}

            {execution && !isRunning && !sentStdin && needsStdin && (
              <div className="mt-3 rounded-md border border-error/30 bg-error/10 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <Icon name="alertTriangle" size={15} className="mt-0.5 shrink-0 text-error" />
                  <div className="text-[12px] leading-relaxed text-mute">
                    <span className="font-semibold text-ink">{t('terminal.no_input')}</span>
                    {' '}{t('terminal.add_input_tab')}
                  </div>
                </div>
              </div>
            )}

            {execution && !isRunning && (execution.execution_time !== null || execution.memory_usage !== null || execution.exit_code !== null) && (
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-edge pt-2.5 text-xs text-mute">
                {execution.execution_time !== null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="clock" size={13} />
                    {formatExecutionTime(execution.execution_time)}
                  </span>
                )}
                {execution.memory_usage !== null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="cpu" size={13} />
                    {formatMemory(execution.memory_usage)}
                  </span>
                )}
                {execution.exit_code !== null && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-semibold text-faint">{t('terminal.exit')}</span>
                    <code className="rounded bg-raised px-1.5 py-0.5 text-[11px] text-ink">{execution.exit_code}</code>
                  </span>
                )}
                {execution.exit_code !== null && execution.exit_code === 0 && (
                  <span className="inline-flex items-center gap-1.5 text-success">
                    <Icon name="checkCircle" size={13} />
                    {t('terminal.completed')}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
