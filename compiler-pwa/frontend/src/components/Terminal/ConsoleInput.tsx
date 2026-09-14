import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';
import { detectPrompts, promptForLine, type PromptSpec } from '../../lib/prompts';
import { useI18n } from '../../i18n';

interface ConsoleInputProps {
  code: string;
  language: string;
  /** Committed lines that will be sent as stdin. */
  lines: string[];
  onLinesChange: (lines: string[]) => void;
  disabled?: boolean;
  running: boolean;
  /** Count of committed lines already rendered by the session transcript.
   *  Only lines *after* this index are echoed here, so input appears exactly
   *  once on screen (never duplicated with the transcript). */
  echoFrom?: number;
  /** Fired (at most once per completion) when every detected prompt has an answer. */
  onAllLinesCommitted?: () => void;
  /** Live interactive mode: Enter sends the line to the running program
   *  immediately (no auto-run, no static prompt preview — the prompts come
   *  from the program's real output). */
  live?: { onSubmit: (line: string) => void };
}

export interface ConsoleInputHandle {
  /** Commit any uncommitted draft and return the full stdin string. */
  flushPending: () => string;
  /** Focus the input field. */
  focus: () => void;
}

/**
 * VS Code-style inline console: the caret lives in the terminal itself,
 * right after the program's prompt. The prompts the program will print are
 * previewed above the caret row as soon as they are detected in the code —
 * before ever running — so the pre-run state looks exactly like the
 * post-run transcript. Enter commits a line; once every detected prompt has
 * an answer the run starts automatically, like pressing ▶ in VS Code.
 */
export const ConsoleInput = forwardRef<ConsoleInputHandle, ConsoleInputProps>(
  function ConsoleInput({ code, language, lines, onLinesChange, disabled = false, running, echoFrom = 0, onAllLinesCommitted, live }, ref) {
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  /** Guard the auto-run callback against double fires for the same state. */
  const autoRunFiredRef = useRef(false);
  /** Committed lines not already reflected in the session transcript. */
  const pendingLines = lines.slice(echoFrom);

  useImperativeHandle(
    ref,
    () => ({
      flushPending: () => {
        const all = draft.trim() !== '' ? [...lines, draft] : lines;
        if (all !== lines) {
          onLinesChange(all);
          setDraft('');
        }
        return all.join('\n');
      },
      focus: () => inputRef.current?.focus(),
    }),
    [draft, lines, onLinesChange],
  );

  const prompts = useMemo<PromptSpec[]>(() => detectPrompts(code, language), [code, language]);
  const nextPrompt = promptForLine(prompts, lines.length);
  /** Total values the program expects — a `a, b = input().split()` prompt
   *  consumes 2 input lines, so auto-run must wait for sum(spec.count). */
  const expectedCount = useMemo(
    () => prompts.reduce((sum, p) => sum + Math.max(1, p.count), 0),
    [prompts],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  useEffect(() => {
    if (running) inputRef.current?.focus();
  }, [running]);

  /** Fire the auto-run when the committed lines cover every expected value
   *  (a `a, b = input().split()` prompt counts as 2 lines). Live sessions
   *  never auto-run — lines go straight to the running program. */
  const fireIfComplete = (next: string[]) => {
    if (live) return;
    const complete = expectedCount > 0 && next.length >= expectedCount;
    if (complete && !autoRunFiredRef.current) {
      autoRunFiredRef.current = true;
      onAllLinesCommitted?.();
    }
  };

  const commit = () => {
    if (disabled) return;
    const value = draft;
    if (value.trim() === '') return;
    const next = [...lines, value];
    onLinesChange(next);
    setDraft('');
    if (live) {
      live.onSubmit(value);
      return;
    }

    // VS Code behavior: the moment the last expected input is entered,
    // the run fires — no need to reach for the Run button.
    fireIfComplete(next);
  };

  /** Re-arm auto-run whenever the input set shrinks (line removed / cleared). */
  useEffect(() => {
    if (!live && lines.length < expectedCount) autoRunFiredRef.current = false;
  }, [lines.length, expectedCount, live]);

  // A new run started — reset the guard so the next complete input re-runs.
  useEffect(() => {
    if (running) autoRunFiredRef.current = false;
  }, [running]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && draft === '' && lines.length > 0 && !live) {
      e.preventDefault();
      onLinesChange(lines.slice(0, -1));
    }
  };

  /** Multi-line paste: each pasted line becomes a committed input line.
   *  In live mode every line is forwarded to the running program. */
  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\n')) return; // single-line paste → default behavior
    e.preventDefault();
    const pastedLines = text.replace(/\n$/, '').split('\n');
    const [first, ...rest] = pastedLines;
    const merged = [...lines, ...(draft ? [draft + first, ...rest] : pastedLines)];
    onLinesChange(merged);
    setDraft('');
    if (live) {
      merged.slice(lines.length).forEach((l) => {
        if (l.trim() !== '') live.onSubmit(l);
      });
      return;
    }
    fireIfComplete(merged);
  };

  /** Live mode: render ONLY the inline caret input. The transcript (program
   *  output + echoed answers) lives in TerminalPanel; this input flows right
   *  after it on the same line, exactly like a real terminal caret. Width
   *  grows with the draft so the caret never jumps to an implicit box edge. */
  if (live) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        className="inline-block bg-transparent font-mono text-ink caret-primary focus:outline-none"
        style={{ width: `calc(${draft.length}ch + 2px)` }}
        aria-label={t('terminal.console_label')}
      />
    );
  }

  return (
    <div>
      {/* Committed lines: prompt + typed value, exactly as the run transcript
          will render them. Before a run they preview the session. During a
          live session they are echoed inline in the transcript instead. */}
      {!live && pendingLines.length > 0 && (
        <div ref={scrollRef} className="max-h-24 overflow-y-auto scrollbar-thin">
          {pendingLines.map((line, idx) => {
            const prompt = live ? undefined : promptForLine(prompts, echoFrom + idx);
            return (
              <div key={echoFrom + idx} className="flex items-start gap-0 whitespace-pre-wrap">
                {prompt && <span className="shrink-0 text-ink">{prettierPrompt(prompt)}</span>}
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-all font-semibold text-primary">
                  {line}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* The terminal prompt line itself — prompt text + live caret.
          Live sessions have no static prompt: the program's own output
          provides it above the caret. */}
      <div className="flex items-center gap-0 whitespace-pre-wrap rounded-md py-1.5 lg:py-0.5">
        {!live && nextPrompt && (
          <span className="shrink-0 text-ink">{prettierPrompt(nextPrompt)}</span>
        )}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          placeholder={nextPrompt ? '' : undefined}
          className="min-w-0 flex-1 bg-transparent font-mono text-ink caret-primary placeholder:text-faint/60 focus:outline-none"
          aria-label={t('terminal.console_label')}
        />
        {draft.trim() !== '' && (
          <button
            type="button"
            onClick={commit}
            disabled={disabled}
            className="ml-1.5 shrink-0 self-center rounded-lg p-2 text-faint transition-colors hover:bg-raised hover:text-ink lg:p-1"
            aria-label={t('terminal.commit_line')}
            title={t('terminal.commit_line')}
          >
            <Icon name="send" size={16} />
          </button>
        )}
      </div>
    </div>
  );
});

/** Terminal prompts end with ":" — keep that spacing for the inline caret. */
function prettierPrompt(prompt: string): string {
  if (!prompt) return '';
  return /[.!?:]$/.test(prompt) ? prompt + ' ' : prompt;
}
