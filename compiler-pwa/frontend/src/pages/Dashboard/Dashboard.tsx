import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { NewProjectModal } from './NewProjectModal';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Dropdown } from '../../components/ui/Dropdown';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Icon } from '../../components/ui/Icon';
import { LanguageIcon, type LangGlyph } from '../../components/LanguageIcon';
import { greeting, timeAgo, formatExecutionTime } from '../../lib/format';
import { projectService } from '../../services/projectService';
import { executionService } from '../../services/executionService';
import type { Project, Execution } from '../../types';

function langGlyphFor(lang: string): LangGlyph {
  if (lang === 'python') return 'python';
  if (lang === 'c') return 'c';
  return 'cpp';
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [page, setPage] = useState(1);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [query, setQuery] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [executionTotal, setExecutionTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [favorites, setFavorites] = useLocalStorage<number[]>('coderunner-favorites', []);

  const loadProjects = useCallback(async (p: number, append = false) => {
    setLoadingProjects(true);
    try {
      const response = await projectService.getAll(p);
      const data = response.data;
      setProjects((prev) => (append ? [...prev, ...data.data] : data.data));
      setTotal(data.total);
      setLastPage(data.last_page);
      setPage(data.current_page);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  }, [toast]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const response = await executionService.getAll(1);
      setExecutions(response.data.data);
      setExecutionTotal(response.data.total);
    } catch {
      /* history optional */
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects(1);
    void loadHistory();
  }, [loadProjects, loadHistory]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q),
    );
  }, [projects, query]);

  const favoritesFirst = useMemo(() => {
    const fav = filtered.filter((p) => favorites.includes(p.id));
    const rest = filtered.filter((p) => !favorites.includes(p.id));
    return [...fav, ...rest];
  }, [filtered, favorites]);

  const toggleFavorite = (id: number) => {
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await projectService.delete(deleteTarget.id);
      setProjects((ps) => ps.filter((p) => p.id !== deleteTarget.id));
      setTotal((t) => Math.max(0, t - 1));
      toast.success('Project deleted', deleteTarget.name);
    } catch {
      toast.error('Failed to delete project');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const stats = [
    {
      label: 'Projects',
      value: total,
      icon: 'layers' as const,
      tint: 'text-info',
      bg: 'bg-info/10',
    },
    {
      label: 'Executions',
      value: loadingHistory ? '…' : executionTotal,
      icon: 'zap' as const,
      tint: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Files',
      value: projects.reduce((n, p) => n + (p.files?.length ?? 0), 0),
      icon: 'fileText' as const,
      tint: 'text-success',
      bg: 'bg-success/10',
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {greeting()},{user?.name.split(' ')[0] ?? 'there'}.
          </h1>
          <p className="mt-1 text-sm text-mute">Pick up where you left off or start something new.</p>
        </div>
        <Button size="lg" onClick={() => setShowNew(true)}>
          <Icon name="plus" size={17} />
          New project
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3.5 rounded-xl border border-edge bg-panel p-4 shadow-card">
            <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.bg} ${s.tint}`}>
              <Icon name={s.icon} size={19} />
            </span>
            <div>
              <p className="text-xl font-bold leading-tight text-ink">{s.value}</p>
              <p className="text-[13px] text-mute">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">Projects</h2>
          <div className="w-full max-w-56">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
              leftIcon="search"
            />
          </div>
        </div>

        {loadingProjects ? (
          <div className="flex justify-center py-16">
            <Spinner size="md" className="text-primary" />
          </div>
        ) : favoritesFirst.length === 0 ? (
          <Card className="mt-4">
            <EmptyState
              icon="folder"
              title={query ? 'No matching projects' : 'No projects yet'}
              message={
                query
                  ? 'Try a different search term.'
                  : 'Create your first project to start running code instantly.'
              }
              action={
                !query && (
                  <Button onClick={() => setShowNew(true)}>
                    <Icon name="plus" size={15} />
                    New project
                  </Button>
                )
              }
            />
          </Card>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favoritesFirst.map((project) => {
              const glyphs = Array.from(
                new Set((project.files ?? []).map((f) => f.language)),
              ).slice(0, 3);
              const fav = favorites.includes(project.id);
              return (
                <Card key={project.id} className="group overflow-hidden">
                  <button
                    onClick={() => navigate(`/editor/${project.id}`)}
                    className="block w-full p-4 text-left"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon name="folder" size={17} />
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(project.id);
                          }}
                          className="rounded-md p-1.5 transition-colors hover:bg-raised"
                          aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Icon
                            name="star"
                            size={15}
                            className={fav ? 'text-warning fill-current' : 'text-faint'}
                          />
                        </button>
                        <Dropdown
                          align="right"
                          trigger={
                            <span className="rounded-md p-1.5 text-faint transition-colors hover:bg-raised hover:text-ink">
                              <Icon name="moreV" size={15} />
                            </span>
                          }
                          items={[
                            {
                              key: 'open',
                              label: 'Open',
                              icon: 'external',
                              onSelect: () => navigate(`/editor/${project.id}`),
                            },
                            {
                              key: 'home',
                              label: 'View history',
                              icon: 'clock',
                              onSelect: () => navigate('/history'),
                            },
                            {
                              key: 'delete',
                              label: 'Delete',
                              icon: 'trash',
                              danger: true,
                              onSelect: () => setDeleteTarget(project),
                            },
                          ]}
                        />
                      </div>
                    </div>
                    <h3 className="truncate text-sm font-semibold text-ink">{project.name}</h3>
                    <p className="mt-0.5 line-clamp-2 min-h-8 text-[13px] text-mute">
                      {project.description || 'No description'}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-faint">
                      <span className="inline-flex items-center gap-1">
                        <Icon name="fileText" size={12} />
                        {project.files?.length ?? 0} file{(project.files?.length ?? 0) === 1 ? '' : 's'}
                      </span>
                      <span>{timeAgo(project.updated_at)}</span>
                    </div>
                  </button>
                  {glyphs.length > 0 && (
                    <div className="flex items-center gap-1.5 border-t border-edge px-4 py-2.5">
                      {glyphs.map((g) => (
                        <LanguageIcon key={g} lang={langGlyphFor(g)} size="sm" />
                      ))}
                      <span className="ml-auto">
                        <Link
                          to={`/editor/${project.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                        >
                          Open editor
                          <Icon name="arrowRight" size={12} />
                        </Link>
                      </span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {page < lastPage && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="secondary"
              onClick={() => void loadProjects(page + 1, true)}
              disabled={loadingProjects}
            >
              <Icon name="chevronDown" size={15} />
              Load more
            </Button>
          </div>
        )}
      </div>

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Icon name="clock" size={16} className="text-faint" />
            Recent executions
          </h2>
          <Link
            to="/history"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
          >
            View all
            <Icon name="arrowRight" size={14} />
          </Link>
        </div>

        {loadingHistory ? (
          <div className="flex justify-center py-10">
            <Spinner size="sm" className="text-primary" />
          </div>
        ) : executions.length === 0 ? (
          <Card className="mt-3">
            <EmptyState
              compact
              icon="terminal"
              title="Nothing ran yet"
              message="Run your first program and it will show up here."
            />
          </Card>
        ) : (
          <Card className="mt-3 divide-y divide-edge overflow-hidden">
            {executions.slice(0, 5).map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <LanguageIcon lang="file" size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {e.filename ?? 'Untitled file'}
                  </p>
                  <p className="text-[11px] text-faint">{timeAgo(e.created_at)}</p>
                </div>
                {e.execution_time !== null && (
                  <span className="hidden font-mono text-[11px] text-mute sm:block">
                    {formatExecutionTime(e.execution_time)}
                  </span>
                )}
                <StatusBadge status={e.status} />
              </div>
            ))}
          </Card>
        )}
      </section>

      <NewProjectModal open={showNew} onClose={() => setShowNew(false)} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        loading={deleting}
        title={`Delete ${deleteTarget?.name}?`}
        message="All files and execution history for this project will be permanently deleted."
        confirmLabel="Delete project"
      />
    </main>
  );
}