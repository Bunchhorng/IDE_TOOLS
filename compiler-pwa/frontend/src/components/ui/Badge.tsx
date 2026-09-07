import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import type { ExecutionStatus } from '../../types';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-mute/10 text-mute',
  info: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-error/10 text-error',
};

const DOTS: Record<Tone, string> = {
  neutral: 'bg-mute',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-error',
};

export function Badge({
  tone = 'neutral',
  dot = false,
  pulse = false,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  pulse?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
        TONES[tone],
        className,
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', DOTS[tone])} />
          )}
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', DOTS[tone])} />
        </span>
      )}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<ExecutionStatus, Tone> = {
  queued: 'neutral',
  running: 'info',
  success: 'success',
  compile_error: 'danger',
  runtime_error: 'danger',
  timeout: 'warning',
  memory_limit: 'warning',
  system_error: 'danger',
  failed: 'danger',
};

const STATUS_LABEL: Record<ExecutionStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  success: 'Passed',
  compile_error: 'Compile Error',
  runtime_error: 'Runtime Error',
  timeout: 'Timeout',
  memory_limit: 'Memory Limit',
  system_error: 'System Error',
  failed: 'Failed',
};

export function StatusBadge({ status, className }: { status: ExecutionStatus; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot pulse={status === 'running' || status === 'queued'} className={className}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function statusTone(status: ExecutionStatus): Tone {
  return STATUS_TONE[status];
}

export function statusLabel(status: ExecutionStatus): string {
  return STATUS_LABEL[status];
}