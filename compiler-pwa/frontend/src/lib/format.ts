export type TimeAgoT = (key: string, vars?: Record<string, string | number>) => string;

export function timeAgo(date: string | Date, t?: TimeAgoT): string {
  const then = new Date(date).getTime();
  const diff = Date.now() - then;
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return t?.('format.just_now') ?? 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return t ? t('format.min_ago', { n: min }) : `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return t ? t('format.hr_ago', { n: hr }) : `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return t ? t('format.day_ago', { n: day }) : `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return t ? t('format.wk_ago', { n: wk }) : `${wk}w ago`;
  return new Date(date).toLocaleDateString();
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatExecutionTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  return `${seconds.toFixed(2)} s`;
}

export function formatMemory(memoryBytes: number | null): string {
  if (memoryBytes === null || memoryBytes === undefined) return '—';
  if (memoryBytes < 1024 * 1024) {
    return `${(memoryBytes / 1024).toFixed(1)} KB`;
  }
  return `${(memoryBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Working late';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}