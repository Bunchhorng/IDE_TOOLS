import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CodeEditor from '../../components/Editor/CodeEditor';
import { EditorTabs } from '../../components/Editor/EditorTabs';
import { EditorTopBar } from '../../components/Editor/EditorTopBar';
import { StatusBar } from '../../components/Editor/StatusBar';
import { FileExplorerSidebar } from '../../components/FileExplorer/FileExplorerSidebar';
import { TerminalPanel } from '../../components/Terminal/TerminalPanel';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import LanguageSelector from '../../components/LanguageSelector/LanguageSelector';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Icon } from '../../components/ui/Icon';
import { Spinner } from '../../components/ui/Button';
import { cn } from '../../lib/cn';
import { getTemplateContent } from '../../lib/templates';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { usePreferences } from '../../context/PreferencesContext';
import { projectService } from '../../services/projectService';
import { fileService } from '../../services/fileService';
import { executionService } from '../../services/executionService';
import { languageService } from '../../services/languageService';
import type { Project, File, Language, Execution } from '../../types';

type MobileTab = 'code' | 'files' | 'output' | 'more';

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const { prefs } = usePreferences();

  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [savedContent, setSavedContent] = useState('');
  const [savedLanguage, setSavedLanguage] = useState('cpp');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [stdin, setStdin] = useState('');
  const [execution, setExecution] = useState<Execution | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [mobileTab, setMobileTab] = useState<MobileTab>('code');
  const [moreOpen, setMoreOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<File | null>(null);
  const [deleting, setDeleting] = useState(false);

  const pId = Number(projectId);
  const dirty =
    !!activeFile &&
    (activeFile.content !== savedContent || activeFile.language !== savedLanguage);
  const hasErrors = useMemo(
    () => (execution?.status ?? '') !== '' && !!execution?.stderr,
    [execution],
  );

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    try {
      const response = await projectService.getById(Number(projectId));
      setProject(response.data);
    } catch {
      toast.error('Project not found');
      navigate('/dashboard');
    }
  }, [projectId, navigate, toast]);

  const loadFiles = useCallback(async () => {
    if (!projectId) return;
    try {
      const response = await fileService.getByProject(Number(projectId));
      setFiles(response.data);
      if (response.data.length > 0) {
        const first = response.data[0];
        setActiveFile(first);
        setSavedContent(first.content);
        setSavedLanguage(first.language);
      }
    } catch {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  const loadLanguages = useCallback(async () => {
    try {
      const response = await languageService.getAll();
      setLanguages(response.data);
    } catch {
      /* languages optional */
    }
  }, []);

  useEffect(() => {
    void loadProject();
    void loadFiles();
    void loadLanguages();
  }, [loadProject, loadFiles, loadLanguages]);

  const selectedLanguage = activeFile?.language ?? languages[0]?.slug ?? 'cpp';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleRun();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, selectedLanguage, stdin, project]);

  useEffect(() => {
    if (!prefs.autoSave || !activeFile || !dirty) return;
    const timer = window.setTimeout(() => void handleSave({ silent: true }), 1500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile?.content, activeFile?.language, prefs.autoSave, dirty]);

  const handleSave = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!activeFile || !dirty) {
      if (activeFile && !silent) toast.info('No changes to save');
      return;
    }
    setIsSaving(true);
    try {
      const response = await fileService.update(activeFile.id, {
        content: activeFile.content,
        language: activeFile.language,
      });
      setActiveFile({ ...activeFile, content: response.data.content, language: response.data.language, updated_at: response.data.updated_at });
      setFiles((fs) => fs.map((f) => (f.id === activeFile.id ? { ...f, content: response.data.content, language: response.data.language, updated_at: response.data.updated_at } : f)));
      setSavedContent(response.data.content);
      setSavedLanguage(response.data.language);
      if (!silent) toast.success('Saved', `${activeFile.filename} is up to date`);
    } catch {
      toast.error('Save failed', 'Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRun = async () => {
    if (!activeFile || !project) return;
    if (
      window.matchMedia('(max-width: 1023px)').matches &&
      (mobileTab === 'files' || mobileTab === 'more')
    ) {
      setMobileTab('code');
    }
    if (dirty) await handleSave();
    setIsRunning(true);
    setExecution(null);
    try {
      const response = await executionService.execute({
        language: selectedLanguage,
        project_id: project.id,
        file_id: activeFile.id,
        code: activeFile.content,
        stdin,
      });
      const result = await executionService.pollStatus(response.data.id);
      setExecution(result);
      if (result.status === 'success') {
        toast.success('Execution passed', `Finished in ${formatTime(result.execution_time)}`);
      } else {
        toast.warning(statusToLabel(result.status), firstErrorLine(result.stderr));
      }
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { data?: Execution } } })?.response?.data?.data;
      setExecution(data ?? null);
      toast.error('Execution failed', "Couldn't run your code right now.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleCodeChange = (value: string) => {
    if (!activeFile) return;
    setActiveFile((f) => (f ? { ...f, content: value } : f));
  };

  const handleSelectFile = async (file: File) => {
    if (activeFile && activeFile.id !== file.id && dirty) {
      await handleSave({ silent: true });
    }
    setActiveFile(file);
    setSavedContent(file.content);
    setSavedLanguage(file.language);
    setExecution(null);
  };

  const handleLanguageChange = (slug: string) => {
    if (!activeFile || slug === activeFile.language) return;
    setActiveFile((f) => (f ? { ...f, language: slug } : f));
    setFiles((fs) => fs.map((f) => (f.id === activeFile.id ? { ...f, language: slug } : f)));
  };

  const handleCreateFile = (filename: string, language: string, content?: string) => {
    void (async () => {
      try {
        if (activeFile && dirty) await handleSave({ silent: true });
        const response = await fileService.create(pId, {
          filename,
          language,
          content: content ?? getTemplateContent(language, 'empty'),
        });
        setFiles((fs) => [...fs, response.data]);
        setActiveFile(response.data);
        setSavedContent(response.data.content);
        setSavedLanguage(response.data.language);
        toast.success('File created', filename);
      } catch {
        toast.error('Failed to create file');
      }
    })();
  };

  const handleDeleteFile = (file: File) => setDeleteTarget(file);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fileService.delete(deleteTarget.id);
      const next = files.filter((f) => f.id !== deleteTarget.id);
      setFiles(next);
      if (activeFile?.id === deleteTarget.id) {
        const head = next[0] ?? null;
        setActiveFile(head);
        setSavedContent(head ? head.content : '');
        setSavedLanguage(head ? head.language : 'cpp');
      }
      toast.success('File deleted', deleteTarget.filename);
    } catch {
      toast.error('Failed to delete file');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleRenameFile = (file: File, newName: string) => {
    void (async () => {
      try {
        const response = await fileService.update(file.id, { filename: newName });
        setFiles((fs) => fs.map((f) => (f.id === file.id ? response.data : f)));
        setActiveFile((f) => (f?.id === file.id ? response.data : f));
        toast.success('Renamed', newName);
      } catch {
        toast.error('Failed to rename file');
      }
    })();
  };

  const handleDownload = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded', activeFile.filename);
  };

  const handleShare = async () => {
    if (!activeFile) return;
    const shareData: ShareData = {
      title: `${project?.name ?? 'CodeRunner'} — ${activeFile.filename}`,
      text: `Check out this ${activeFile.filename} on CodeRunner:\n\n${activeFile.content}`,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.text ?? '');
        toast.success('Copied to clipboard', `${activeFile.filename} is ready to paste.`);
      }
    } catch {
      /* user cancelled the share sheet */
    }
  };

  const mobileNav: { key: MobileTab; label: string; icon: 'folder' | 'code' | 'terminal' | 'moreV' }[] = [
    { key: 'files', label: 'Files', icon: 'folder' },
    { key: 'code', label: 'Code', icon: 'code' },
    { key: 'output', label: 'Output', icon: 'terminal' },
    { key: 'more', label: 'More', icon: 'moreV' },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-page">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-page text-ink">
      <EditorTopBar
        projectName={project?.name ?? null}
        isSaving={isSaving}
        dirty={dirty}
        running={isRunning}
        canRun={!!activeFile}
        onSave={() => void handleSave()}
        onRun={() => void handleRun()}
        onShare={() => void handleShare()}
        onDownload={handleDownload}
        onToggleSidebar={() => setSidebarVisible((v) => !v)}
        sidebarVisible={sidebarVisible}
      />

      <div className="flex min-h-0 flex-1">
        {/* Desktop + Files tab (mobile) */}
        <aside
          className={cn(
            'border-r border-edge bg-raised/50',
            'hidden lg:block lg:w-60 lg:shrink-0',
            sidebarVisible ? 'lg:block' : 'lg:hidden',
          )}
        >
          <FileExplorerSidebar
            files={files}
            activeFileId={activeFile?.id ?? null}
            projectName={project?.name ?? 'Project'}
            onSelectFile={handleSelectFile}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
          />
        </aside>

        {mobileTab === 'files' && (
          <div className="min-h-0 flex-1 bg-raised/50 lg:hidden">
            <FileExplorerSidebar
              files={files}
              activeFileId={activeFile?.id ?? null}
              projectName={project?.name ?? 'Project'}
              onSelectFile={(file) => {
                handleSelectFile(file);
                setMobileTab('code');
              }}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
              onRenameFile={handleRenameFile}
            />
          </div>
        )}

        {(mobileTab === 'code' || mobileTab === 'more') && (
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <EditorTabs
              files={files}
              activeFileId={activeFile?.id ?? null}
              dirtyIds={new Set(dirty && activeFile ? [activeFile.id] : [])}
              onSelect={handleSelectFile}
              onCloseTab={setDeleteTarget}
            />

            <div className="flex min-h-0 flex-1">
              {activeFile ? (
                <CodeEditor
                  value={activeFile.content}
                  language={selectedLanguage}
                  onChange={handleCodeChange}
                />
              ) : (
                <div className="flex flex-1 items-center justify-center bg-editor">
                  <EmptyState
                    icon="fileText"
                    title="No file open"
                    message="Select a file from the explorer or create a new one."
                    action={
                      <Button size="sm" onClick={() => handleCreateFile('main.cpp', 'cpp')}>
                        <Icon name="filePlus" size={15} />
                        Create main.cpp
                      </Button>
                    }
                  />
                </div>
              )}
            </div>

            <div className="h-44 shrink-0 border-t border-edge sm:h-52 lg:h-60">
              <TerminalPanel
                execution={execution}
                isRunning={isRunning}
                stdin={stdin}
                onStdinChange={setStdin}
                hasErrors={hasErrors}
              />
            </div>
          </main>
        )}

        {mobileTab === 'output' && (
          <main className="flex min-h-0 flex-1 flex-col pt-px lg:hidden">
            <TerminalPanel
              execution={execution}
              isRunning={isRunning}
              stdin={stdin}
              onStdinChange={setStdin}
              hasErrors={hasErrors}
            />
          </main>
        )}
      </div>

      <div className="hidden lg:block">
        <StatusBar
          languages={languages}
          selectedLanguage={selectedLanguage}
          onLanguageChange={handleLanguageChange}
          fileCount={files.length}
          fileName={activeFile?.filename}
        />
      </div>

      {/* Mobile Run FAB */}
      {(mobileTab === 'code' || mobileTab === 'output') && activeFile && (
        <button
          onClick={() => void handleRun()}
          disabled={isRunning}
          className="fixed bottom-20 right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-primary text-white shadow-fab transition-all hover:bg-primary-hover active:scale-95 disabled:opacity-60 lg:hidden"
          aria-label="Run code"
        >
          {isRunning ? (
            <Spinner size="sm" className="text-white" />
          ) : (
            <Icon name="play" size={22} className="ml-0.5 fill-current" />
          )}
        </button>
      )}

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex min-h-16 items-stretch border-t border-edge bg-page/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Mobile navigation"
      >
        {mobileNav.map((item) => {
          const active = mobileTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                if (item.key === 'more') {
                  setMoreOpen(true);
                  return;
                }
                setMobileTab(item.key);
              }}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                active ? 'text-primary' : 'text-mute hover:text-ink',
              )}
            >
              <Icon name={item.icon} size={19} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Mobile More sheet */}
      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Options">
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Language</p>
          <div className="rounded-lg border border-edge p-1">
            <LanguageSelector
              languages={languages}
              selected={selectedLanguage}
              onChange={handleLanguageChange}
              align="right"
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => void handleSave()} disabled={!activeFile}>
              <Icon name="save" size={15} />
              Save
            </Button>
            <Button variant="secondary" onClick={toggle}>
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
              {theme === 'dark' ? 'Light' : 'Dark'} mode
            </Button>
            <Button variant="secondary" onClick={handleDownload} disabled={!activeFile}>
              <Icon name="download" size={15} />
              Download file
            </Button>
            <Button variant="secondary" onClick={() => void handleShare()} disabled={!activeFile}>
              <Icon name="share" size={15} />
              Share file
            </Button>
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        loading={deleting}
        title={`Delete ${deleteTarget?.filename}?`}
        message="This file and its execution history will be permanently deleted. This can't be undone."
        confirmLabel="Delete file"
      />

      <div className="h-[calc(4rem+env(safe-area-inset-bottom))] lg:hidden" aria-hidden="true" />
    </div>
  );
}

function statusToLabel(status: string): string {
  const map: Record<string, string> = {
    compile_error: 'Compilation error',
    runtime_error: 'Runtime error',
    timeout: 'Timed out',
    memory_limit: 'Memory limit exceeded',
    system_error: 'System error',
    failed: 'Execution failed',
  };
  return map[status] ?? 'Execution warning';
}

function firstErrorLine(stderr: string | null): string {
  const first = stderr?.split('\n').find((l) => l.trim()) ?? '';
  return first.slice(0, 120) || "Check the Errors tab for details.";
}

function formatTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '0 ms';
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  return `${seconds.toFixed(2)} s`;
}