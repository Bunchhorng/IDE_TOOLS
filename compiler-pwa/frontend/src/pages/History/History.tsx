import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { executionService } from '../../services/executionService';
import { languageService } from '../../services/languageService';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Select } from '../../components/ui/Select';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LanguageIcon, type LangGlyph } from '../../components/LanguageIcon';
import { formatExecutionTime, timeAgo, formatMemory } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import type { Execution, ExecutionStatus, Language } from '../../types';

function glyphFor(status: string): LangGlyph {
  return status === 'python' ? 'python' : status === 'c' ? 'c' : 'cpp';
}

export default function History() {
  const toast = useToast();

  const [executions, setExecutions] = useState<Execution[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | 'all'>('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Execution | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await executionService.getAll(page);
      setExecutions(response.data.data);
      setTotal(response.data.total);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void languageService.getAll().then((r) => setLanguages(r.data)).catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === 'all' && languageFilter === 'all') return executions;
    return executions.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (languageFilter !== 'all' && e.language?.slug !== languageFilter) return false;
      return true;
    });
  }, [executions, statusFilter, languageFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await executionService.delete(deleteTarget.id);
      setExecutions((es) => es.filter((e) => e.id !== deleteTarget.id));
      setTotal((t) => Math.max(0, t - 1));
      toast.success('Execution deleted');
    } catch {
      toast.error('Failed to delete execution');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Execution history</h1>
          <p className="mt-1 text-sm text-mute">
            {total} run{total === 1 ? '' : 's'} across all your projects
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ExecutionStatus | 'all')}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'success', label: 'Passed' },
                { value: 'compile_error', label: 'Compile error' },
                { value: 'runtime_error', label: 'Runtime error' },
                { value: 'timeout', label: 'Timeout' },
                { value: 'memory_limit', label: 'Memory limit' },
              ]}
            />
          </div>
          <div className="w-full sm:w-40">
            <Select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All languages' },
                ...languages.map((l) => ({ value: l.slug, label: l.name })),
              ]}
            />
          </div>
          <Button variant="secondary" size="md" onClick={() => { setStatusFilter('all'); setLanguageFilter('all'); if (page !== 1) setPage(1); }}>
            <Icon name="refresh" size={14} />
            Reset
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="md" className="text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            icon="clock"
            title={executions.length === 0 ? 'No executions yet' : 'No matches'}
            message={
              executions.length === 0
                ? 'Run code from the editor and it will appear here with full output and stats.'
                : 'Try adjusting your filters.'
            }
          />
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {filtered.map((e) => {
            const isOpen = expanded === e.id;
            return (
              <Card key={e.id} className="overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <LanguageIcon
                    lang={glyphFor(e.language?.slug ?? 'cpp')}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-ink">
                        {e.filename ?? `execution-${e.id}`}
                      </p>
                      {e.language && (
                        <span className="hidden text-[11px] text-faint sm:inline">
                          · {e.language.name}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-faint">
                      <span>{timeAgo(e.created_at)}</span>
{e.execution_time !== null && (
                          <>
                            <span className="text-faint">·</span>
                            <span className="font-mono">{formatExecutionTime(e.execution_time)}</span>
                          </>
                        )}
                      {e.memory_usage !== null && (
                        <>
                          <span className="text-faint">·</span>
                          <span className="font-mono">{formatMemory(e.memory_usage)}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="hidden sm:block">
                    <StatusBadge status={e.status} />
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpanded(isOpen ? null : e.id)}
                      className="rounded-md p-1.5 text-mute transition-colors hover:bg-raised hover:text-ink"
                      aria-label={isOpen ? 'Collapse' : 'Expand'}
                    >
                      <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(e)}
                      className="rounded-md p-1.5 text-mute transition-colors hover:bg-error/10 hover:text-error"
                      aria-label="Delete execution"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-edge bg-raised/40 px-4 py-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-success">
                          <Icon name="terminal" size={12} />
                          Output
                        </p>
                        <pre className="max-h-52 overflow-auto rounded-lg border border-edge bg-editor p-3 font-mono text-[12px] leading-relaxed text-ink">
                          {e.stdout || <span className="text-faint">—</span>}
                        </pre>
                      </div>
                      <div>
                        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-error">
                          <Icon name="alertTriangle" size={12} />
                          Errors
                        </p>
                        <pre className="max-h-52 overflow-auto rounded-lg border border-error/30 bg-editor p-3 font-mono text-[12px] leading-relaxed text-error/90">
                          {e.stderr || <span className="text-faint">—</span>}
                        </pre>
                      </div>
                    </div>
                    {e.project_id && (
                      <div className="mt-3 flex justify-end">
                        <Link
                          to={`/editor/${e.project_id}`}
                          className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
                        >
                          Open in editor
                          <Icon name="arrowRight" size={13} />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          {filtered.length < total && (
            <div className="mt-2 flex justify-center">
              <Button
                variant="secondary"
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
              >
                <Icon name="chevronDown" size={15} />
                Load more
              </Button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        loading={deleting}
        title="Delete this execution?"
        message="This removes the run from your history. The source file is not affected."
        confirmLabel="Delete execution"
      />
    </main>
  );
}