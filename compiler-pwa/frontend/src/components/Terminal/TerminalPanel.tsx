import { useState } from 'react';
import { Tabs } from '../ui/Tabs';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { formatExecutionTime, formatMemory } from '../../lib/format';
import type { Execution } from '../../types';

interface TerminalPanelProps {
  execution: Execution | null;
  isRunning: boolean;
  stdin: string;
  onStdinChange: (value: string) => void;
  hasErrors: boolean;
}

type PanelTab = 'output' | 'errors' | 'input';

export function TerminalPanel({ execution, isRunning, stdin, onStdinChange, hasErrors }: TerminalPanelProps) {
  const [tab, setTab] = useState<PanelTab>('output');
  const [copied, setCopied] = useState(false);

  const stdout = execution?.stdout ?? '';
  const stderr = execution?.stderr ?? '';

  const handleCopy = async () => {
    const text = [stdout, stderr ? `\n[stderr]\n${stderr}` : ''].join('').trim();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const outputEmpty = !isRunning && !execution && !stdout && !stderr;

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
      <div className="flex items-center justify-between border-b border-edge pr-2">
        <Tabs<PanelTab>
          tabs={[
            { value: 'output', label: 'Output', icon: 'terminal' },
            { value: 'errors', label: 'Errors', icon: 'alertCircle', badge: hasErrors ? 1 : 0 },
            { value: 'input', label: 'Input', icon: 'keyboard' },
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
        {tab === 'input' ? (
          <textarea
            value={stdin}
            onChange={(e) => onStdinChange(e.target.value)}
            placeholder="Standard input passed to your program…"
            spellCheck={false}
            className="h-full w-full resize-none bg-editor px-4 py-3 font-mono text-[13px] leading-relaxed text-ink placeholder:text-faint focus:outline-none"
          />
        ) : tab === 'errors' ? (
          <div className="h-full overflow-auto bg-editor px-4 py-3 font-mono text-[13px] leading-relaxed scrollbar-thin">
            {isRunning && (
              <div className="flex items-center gap-2 text-info">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-info border-t-transparent" />
                <span>Compiling &amp; running…</span>
              </div>
            )}

            {!stderr && !isRunning && (
              <p className="text-success">
                <span className="flex items-center gap-1.5">
                  <Icon name="checkCircle" size={14} />
                  No errors. Compilation and execution completed successfully.
                </span>
              </p>
            )}

            {stderr && (
              <div className="flex items-start gap-2">
                <Icon name="alertTriangle" size={14} className="mt-0.5 shrink-0 text-error" />
                <pre className="whitespace-pre-wrap text-error/90">{stderr}</pre>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full overflow-auto bg-editor px-4 py-3 font-mono text-[13px] leading-relaxed scrollbar-thin">
            {isRunning && (
              <div className="flex items-center gap-2 text-info">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-info border-t-transparent" />
                <span>Compiling &amp; running…</span>
              </div>
            )}

            {outputEmpty && (
              <p className="text-faint">Press <kbd className="rounded border border-edge bg-raised px-1.5 py-0.5 text-[11px] text-mute">Run</kbd> to execute your code. Results appear here.</p>
            )}

            {stdout && (
              <pre className="whitespace-pre-wrap text-ink">{stdout}</pre>
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
                    <span className="font-semibold text-faint">exit</span>
                    <code className="rounded bg-raised px-1.5 py-0.5 text-[11px] text-ink">{execution.exit_code}</code>
                  </span>
                )}
                {execution.exit_code !== null && execution.exit_code === 0 && (
                  <span className="inline-flex items-center gap-1.5 text-success">
                    <Icon name="checkCircle" size={13} />
                    Completed
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}