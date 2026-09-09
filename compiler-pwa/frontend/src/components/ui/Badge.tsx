import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { useI18n } from '../../i18n';
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
  queued: 'status.queued',
  running: 'status.running',
  success: 'status.success',
  compile_error: 'status.compile_error',
  runtime_error: 'status.runtime_error',
  timeout: 'status.timeout',
  memory_limit: 'status.memory_limit',
  system_error: 'status.system_error',
  failed: 'status.failed',
};

export function StatusBadge({ status, className }: { status: ExecutionStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <Badge tone={STATUS_TONE[status]} dot pulse={status === 'running' || status === 'queued'} className={className}>
      {t(STATUS_LABEL[status])}
    </Badge>
  );
}

export function statusTone(status: ExecutionStatus): Tone {
  return STATUS_TONE[status];
}