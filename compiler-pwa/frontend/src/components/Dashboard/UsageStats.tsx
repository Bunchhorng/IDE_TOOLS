import { useEffect, useMemo, useState } from 'react';
import { statsService } from '../../services/statsService';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';
import { useI18n } from '../../i18n';
import type { UsageStats } from '../../types';

/**
 * Live platform usage analytics: how many people use the IDE, when they run
 * code, and what they run. Aggregate-only data — safe to show publicly
 * (rendered on the Home landing page, no per-user information returned).
 */
export function UsageStats() {
  const { t } = useI18n();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = () => {
      statsService
        .overview()
        .then((r) => {
          if (alive) {
            setStats(r.data);
            setFailed(false);
          }
        })
        .catch(() => {
          // Keep the last good numbers on screen; only hide the section if
          // we never got data at all.
          if (alive) setFailed((f) => f && true);
        });
    };

    load();
    // Dynamic: refresh while the page stays open so the numbers follow the
    // live database (a running classroom visibly moves the counters).
    const timer = window.setInterval(load, 30_000);
    // And immediately when the user comes back to the tab.
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const maxTrend = useMemo(
    () => Math.max(1, ...(stats?.trend ?? []).map((d) => d.count)),
    [stats],
  );
  const langTotal = useMemo(
    () => (stats?.languages ?? []).reduce((n, l) => n + l.count, 0),
    [stats],
  );
  const statusTotal = useMemo(
    () => (stats?.statuses ?? []).reduce((n, s) => n + s.count, 0),
    [stats],
  );

  if (failed) return null;

  const statusTint = (status: string): string => {
    switch (status) {
      case 'success':
        return 'bg-success';
      case 'compile_error':
      case 'runtime_error':
      case 'system_error':
      case 'failed':
        return 'bg-error';
      case 'timeout':
      case 'memory_limit':
        return 'bg-warning';
      default:
        return 'bg-info';
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-ink">
            <Icon name="grid" size={18} className="text-primary" />
            {t('stats.heading')}
          </h2>
          <p className="mt-1 text-sm text-mute">{t('stats.subheading')}</p>
        </div>
        {stats && (
          <span className="flex items-center gap-1.5 text-xs text-faint">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            {t('stats.live_note')}
          </span>
        )}
      </div>

      {!stats ? (
        <Card className="mt-3">
          <EmptyState compact icon="database" title={t('stats.unavailable')} message="" />
        </Card>
      ) : (
        <>
          {/* User + run summary cards */}
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="flex items-center gap-3.5 rounded-xl border border-edge bg-panel p-4 shadow-card">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name="user" size={19} />
              </span>
              <div>
                <p className="text-xl font-bold leading-tight text-ink">{stats.users.total}</p>
                <p className="text-[13px] text-mute">{t('stats.total_users')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-xl border border-edge bg-panel p-4 shadow-card">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                <Icon name="zap" size={19} />
              </span>
              <div>
                <p className="text-xl font-bold leading-tight text-ink">{stats.users.active_week}</p>
                <p className="text-[13px] text-mute">{t('stats.active_week')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-xl border border-edge bg-panel p-4 shadow-card">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
                <Icon name="clock" size={19} />
              </span>
              <div>
                <p className="text-xl font-bold leading-tight text-ink">{stats.users.active_today}</p>
                <p className="text-[13px] text-mute">{t('stats.active_today')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-xl border border-edge bg-panel p-4 shadow-card">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <Icon name="rocket" size={19} />
              </span>
              <div>
                <p className="text-xl font-bold leading-tight text-ink">{stats.executions.today}</p>
                <p className="text-[13px] text-mute">{t('stats.runs_today')}</p>
              </div>
            </div>
          </div>

          {/* Registered vs guests + peak day */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-edge bg-panel px-4 py-3 text-[13px] text-mute shadow-card">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {t('stats.registered')}: <b className="text-ink">{stats.users.registered}</b>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-warning" />
              {t('stats.guests')}: <b className="text-ink">{stats.users.guests}</b>
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="zap" size={12} className="text-faint" />
              {t('stats.total_runs')}: <b className="text-ink">{stats.executions.total}</b>
            </span>
            {stats.executions.peak_day && (
              <span className="flex items-center gap-1.5">
                <Icon name="star" size={12} className="text-faint" />
                {t('stats.peak')}:{' '}
                <b className="text-ink">
                  {stats.executions.peak_day} · {stats.executions.peak_count}
                </b>
              </span>
            )}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {/* 14-day activity trend */}
            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">{t('stats.trend_title')}</p>
              <div className="mt-4 flex h-28 items-end gap-1.5">
                {stats.trend.map((d) => (
                  <div key={d.date} className="group relative flex h-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-sm bg-primary/70 transition-colors group-hover:bg-primary"
                      style={{ height: `${Math.max(4, (d.count / maxTrend) * 100)}%` }}
                    />
                    <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[10px] text-page group-hover:block">
                      {d.date.slice(5)} · {d.count}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-faint">
                <span>{stats.trend[0]?.date.slice(5)}</span>
                <span>{t('stats.trend_today')}</span>
              </div>
            </Card>

            {/* Language popularity */}
            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink">{t('stats.languages_title')}</p>
              {langTotal === 0 ? (
                <p className="mt-4 text-[13px] text-faint">{t('stats.no_data')}</p>
              ) : (
                <div className="mt-4 flex flex-col gap-2.5">
                  {stats.languages.map((l) => (
                    <div key={l.slug} className="flex items-center gap-3">
                      <span className="w-14 shrink-0 text-[12px] font-medium text-mute">{l.name}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-edge">
                        <div
                          className="h-full rounded-full bg-primary/80"
                          style={{ width: `${(l.count / Math.max(1, langTotal)) * 100}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right font-mono text-[11px] text-faint">
                        {l.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Status breakdown */}
          {statusTotal > 0 && (
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-edge">
              <div className="flex h-full">
                {stats.statuses.map((s) => (
                  <div
                    key={s.status}
                    className={`h-full ${statusTint(s.status)}`}
                    style={{ width: `${(s.count / statusTotal) * 100}%` }}
                    title={`${s.status}: ${s.count}`}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
