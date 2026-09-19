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
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Icon } from '../../components/ui/Icon';
import { LanguageIcon, type LangGlyph } from '../../components/LanguageIcon';
import { InstallPWAButton } from '../../components/InstallPWAButton';
import { timeAgo, formatExecutionTime } from '../../lib/format';
import { projectService } from '../../services/projectService';
import { executionService } from '../../services/executionService';
import { useI18n } from '../../i18n';
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
  const { t } = useI18n();

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
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
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
      toast.error(t('toast.failed_load_projects'));
    } finally {
      setLoadingProjects(false);
    }
  }, [toast, t]);

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
      await projectService.delete(deleteTarget.slug);
      setProjects((ps) => ps.filter((p) => p.id !== deleteTarget.id));
      setTotal((t) => Math.max(0, t - 1));
      toast.success(t('toast.project_deleted'), deleteTarget.name);
    } catch {
      toast.error(t('toast.failed_delete_project'));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const openRename = (project: Project) => {
    setRenameTarget(project);
    setRenameValue(project.name);
    setRenaming(false);
  };

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setRenaming(true);
    try {
      const response = await projectService.update(renameTarget.slug, { name: renameValue.trim() });
      const patch = response.data;
      setProjects((ps) => ps.map((p) => (p.id === patch.id ? { ...p, ...patch } : p)));
      toast.success(t('toast.project_renamed'), patch.name);
      setRenameTarget(null);
    } catch {
      toast.error(t('toast.failed_rename_project'));
    } finally {
      setRenaming(false);
    }
  };

  const stats = [
    {
      label: t('dashboard.projects'),
      value: total,
      icon: 'layers' as const,
      tint: 'text-info',
      bg: 'bg-info/10',
    },
    {
      label: t('dashboard.executions'),
      value: loadingHistory ? '…' : executionTotal,
      icon: 'zap' as const,
      tint: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: t('dashboard.files'),
      value: projects.reduce((n, p) => n + (p.files?.length ?? 0), 0),
      icon: 'fileText' as const,
      tint: 'text-success',
      bg: 'bg-success/10',
    },
  ];

  const hour = new Date().getHours();
  const greetingKey =
    hour < 5 ? 'format.night' : hour < 12 ? 'format.morning' : hour < 18 ? 'format.afternoon' : 'format.evening';

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {t(greetingKey)},{user?.name.split(' ')[0] ?? t('dashboard.there')}.
          </h1>
          <p className="mt-1 text-sm text-mute">{t('dashboard.subheading')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <InstallPWAButton variant="secondary" size="lg" />
          <Button size="lg" onClick={() => setShowNew(true)}>
            <Icon name="plus" size={17} />
            {t('dashboard.new_project')}
          </Button>
        </div>
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
          <h2 className="text-base font-semibold text-ink">{t('dashboard.projects')}</h2>
          <div className="w-full max-w-56">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('dashboard.search_projects')}
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
              title={query ? t('dashboard.no_matching') : t('dashboard.no_projects')}
              message={
                query
                  ? t('dashboard.try_different')
                  : t('dashboard.create_first')
              }
              action={
                !query && (
                  <Button onClick={() => setShowNew(true)}>
                    <Icon name="plus" size={15} />
                    {t('dashboard.new_project')}
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
                <Card key={project.id} className="group">
                  <button
                    onClick={() => navigate(`/editor/${project.slug}`)}
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
                          aria-label={fav ? t('dashboard.fav_remove') : t('dashboard.fav_add')}
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
                              label: t('dashboard.open'),
                              icon: 'external',
                              onSelect: () => navigate(`/editor/${project.slug}`),
                            },
                            {
                              key: 'home',
                              label: t('dashboard.view_history'),
                              icon: 'clock',
                              onSelect: () => navigate('/history'),
                            },
                            {
                              key: 'rename',
                              label: t('dashboard.rename'),
                              icon: 'pencil',
                              onSelect: () => openRename(project),
                            },
                            {
                              key: 'delete',
                              label: t('dashboard.delete'),
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
                      {project.description || t('dashboard.no_description')}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-faint">
                      <span className="inline-flex items-center gap-1">
                        <Icon name="fileText" size={12} />
                        {project.files?.length ?? 0} {(project.files?.length ?? 0) === 1 ? t('dashboard.file') : t('dashboard.files_suffix')}
                      </span>
                      <span>{timeAgo(project.updated_at, t)}</span>
                    </div>
                  </button>
                  {glyphs.length > 0 && (
                    <div className="flex items-center gap-1.5 border-t border-edge px-4 py-2.5">
                      {glyphs.map((g) => (
                        <LanguageIcon key={g} lang={langGlyphFor(g)} size="sm" />
                      ))}
                      <span className="ml-auto">
                        <Link
                          to={`/editor/${project.slug}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                        >
                          {t('dashboard.open_editor')}
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
              {t('dashboard.load_more')}
            </Button>
          </div>
        )}
      </div>

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Icon name="clock" size={16} className="text-faint" />
            {t('dashboard.recent_executions')}
          </h2>
          <Link
            to="/history"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
          >
            {t('dashboard.view_all')}
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
              title={t('dashboard.no_ran_yet')}
              message={t('dashboard.run_first')}
            />
          </Card>
        ) : (
          <Card className="mt-3 divide-y divide-edge overflow-hidden">
            {executions.slice(0, 5).map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <LanguageIcon lang="file" size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {e.filename ?? t('dashboard.untitled')}
                  </p>
                  <p className="text-[11px] text-faint">{timeAgo(e.created_at, t)}</p>
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

      <Modal
        open={!!renameTarget}
        onClose={() => !renaming && setRenameTarget(null)}
        title={t('dashboard.rename_title')}
        description={t('dashboard.rename_desc')}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRenameTarget(null)}
              disabled={renaming}
            >
              {t('dialog.cancel')}
            </Button>
            <Button
              onClick={() => void handleRename()}
              loading={renaming}
              disabled={!renameValue.trim()}
            >
              <Icon name="check" size={15} />
              {t('dashboard.rename_save')}
            </Button>
          </>
        }
      >
        <Input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleRename();
          }}
          placeholder={t('dashboard.rename_placeholder')}
          autoFocus
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        loading={deleting}
        title={t('dashboard.delete_title', { name: deleteTarget?.name ?? '' })}
        message={t('dashboard.delete_msg')}
        confirmLabel={t('dashboard.delete_btn')}
      />
    </main>
  );
}