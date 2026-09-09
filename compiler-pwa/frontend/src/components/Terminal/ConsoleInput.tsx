import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';
import { detectPrompts, type PromptSpec } from '../../lib/prompts';
import { useI18n } from '../../i18n';

interface ConsoleInputProps {
  code: string;
  language: string;
  /** Committed lines that will be sent as stdin. */
  lines: string[];
  onLinesChange: (lines: string[]) => void;
  disabled?: boolean;
  running: boolean;
  /** Hide the echoed-input block (the transcript above already shows it). */
  showEcho?: boolean;
}

export interface ConsoleInputHandle {
  /** Commit any uncommitted draft and return the full stdin string. */
  flushPending: () => string;
  /** Focus the input field. */
  focus: () => void;
}

/**
 * VS Code-style inline console: the caret lives in the terminal itself,
 * right after the program's prompt. Enter commits a line; the app re-runs.
 */
export const ConsoleInput = forwardRef<ConsoleInputHandle, ConsoleInputProps>(
  function ConsoleInput({ code, language, lines, onLinesChange, disabled = false, running, showEcho = true }, ref) {
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
  const nextPrompt = prompts[lines.length]?.text ?? '';

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  useEffect(() => {
    if (running) inputRef.current?.focus();
  }, [running]);

  const commit = () => {
    if (disabled) return;
    const value = draft;
    if (value.trim() === '') return;
    onLinesChange([...lines, value]);
    setDraft('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && draft === '' && lines.length > 0) {
      e.preventDefault();
      onLinesChange(lines.slice(0, -1));
    }
  };

  /** Multi-line paste: each pasted line becomes a committed input line. */
  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\n')) return; // single-line paste → default behavior
    e.preventDefault();
    const pastedLines = text.replace(/\n$/, '').split('\n');
    const [first, ...rest] = pastedLines;
    const merged = [...lines, ...(draft ? [draft + first, ...rest] : pastedLines)];
    onLinesChange(merged);
    setDraft('');
  };

  return (
    <div>
      {showEcho && lines.length > 0 && (
        <div ref={scrollRef} className="max-h-24 overflow-y-auto scrollbar-thin">
          {lines.map((line, idx) => {
            const prompt = prompts[idx]?.text ?? '';
            return (
              <div key={idx} className="group flex items-start gap-2">
                {prompt && <span className="shrink-0 text-info/80">{prettierPrompt(prompt)}</span>}
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-all font-semibold text-primary">{line}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* The terminal prompt line itself — prompt text + live caret. */}
      <div className="flex items-center gap-0 whitespace-pre-wrap">
        {nextPrompt && (
          <span className="text-ink">{prettierPrompt(nextPrompt)}</span>
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
          placeholder={nextPrompt ? '' : t('terminal.console_placeholder')}
          className="min-w-0 flex-1 bg-transparent font-mono text-ink caret-primary placeholder:text-faint/60 focus:outline-none"
          aria-label={t('terminal.console_label')}
        />
        {draft.trim() !== '' && (
          <button
            type="button"
            onClick={commit}
            disabled={disabled}
            className="ml-1 shrink-0 self-center rounded-md p-1 text-faint transition-colors hover:bg-raised hover:text-ink"
            aria-label={t('terminal.commit_line')}
            title={t('terminal.commit_line')}
          >
            <Icon name="send" size={15} />
          </button>
        )}
      </div>
    </div>
  );
});

/** Terminal prompts end with ": " — keep that spacing for the inline caret. */
function prettierPrompt(prompt: string): string {
  if (!prompt) return '';
  return /[.!?:]$/.test(prompt) ? prompt + ' ' : prompt;
}
