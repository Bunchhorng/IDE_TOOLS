import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CodeEditor, { type CodeEditorHandle } from '../../components/Editor/CodeEditor';
import type { ConsoleInputHandle } from '../../components/Terminal/ConsoleInput';
import type { TerminalPanelHandle } from '../../components/Terminal/TerminalPanel';
import { EditorTabs } from '../../components/Editor/EditorTabs';
import { EditorTopBar } from '../../components/Editor/EditorTopBar';
import { StatusBar } from '../../components/Editor/StatusBar';
import { FileExplorerSidebar } from '../../components/FileExplorer/FileExplorerSidebar';
import { TerminalPanel } from '../../components/Terminal/TerminalPanel';
import type { PanelTab } from '../../components/Terminal/TerminalPanel';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import LanguageSelector from '../../components/LanguageSelector/LanguageSelector';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Icon } from '../../components/ui/Icon';
import { Spinner } from '../../components/ui/Button';
import { useResizable } from '../../hooks/useResizable';
import { useResizableX } from '../../hooks/useResizableX';
import { cn } from '../../lib/cn';
import { getTemplateContent } from '../../lib/templates';
import { codeNeedsInput } from '../../lib/needsInput';
import { isInputStarved } from '../../lib/errorHints';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useI18n } from '../../i18n';
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
  const { t } = useI18n();

  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [savedContent, setSavedContent] = useState('');
  const [savedLanguage, setSavedLanguage] = useState('cpp');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [stdin, setStdin] = useState('');
  const [inputLines, setInputLines] = useState<string[]>([]);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('code');
  const [terminalTab, setTerminalTab] = useState<PanelTab>('terminal');
  const [moreOpen, setMoreOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<File | null>(null);
  const [deleting, setDeleting] = useState(false);
  const editorRef = useRef<CodeEditorHandle>(null);
  const consoleRef = useRef<ConsoleInputHandle>(null);
  const terminalPanelRef = useRef<TerminalPanelHandle>(null);
  /** True after a run ends with the program starved of input (EOFError). */
  const awaitingInputRef = useRef(false);
  /** Always points at the latest handleRun (used by stale-safe callbacks). */
  const handleRunRef = useRef<() => Promise<void>>(async () => {});
  const panel = useResizable({ initial: 240, min: 80 });
  const sidebar = useResizableX({ initial: 240, min: 140 });

  const pId = Number(projectId);
  const dirty =
    !!activeFile &&
    (activeFile.content !== savedContent || activeFile.language !== savedLanguage);
  const hasErrors = useMemo(
    () =>
      !!execution &&
      (['compile_error', 'runtime_error', 'timeout', 'memory_limit', 'system_error', 'failed'].includes(execution.status) ||
        !!execution.stderr),
    [execution],
  );
  const needsStdin = useMemo(
    () => codeNeedsInput(activeFile?.content ?? '', activeFile?.language),
    [activeFile?.content, activeFile?.language],
  );

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    try {
      const response = await projectService.getById(Number(projectId));
      setProject(response.data);
    } catch {
      toast.error(t('toast.project_not_found'));
      navigate('/dashboard');
    }
  }, [projectId, navigate, toast, t]);

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
      toast.error(t('toast.failed_load_files'));
    } finally {
      setLoading(false);
    }
  }, [projectId, toast, t]);

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
        if (!isSaving) void handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isRunning && activeFile) void handleRun();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        panel.toggle();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        sidebar.toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, selectedLanguage, stdin, project, isRunning, isSaving, panel.toggle, sidebar.toggle]);

  useEffect(() => {
    if (!prefs.autoSave || !activeFile || !dirty) return;
    const timer = window.setTimeout(() => void handleSave(), 1500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile?.content, activeFile?.language, prefs.autoSave, dirty]);

  const handleSave = async () => {
    if (!activeFile || !dirty) return;
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
    } catch (err) {
      // No popup: the top bar keeps showing "Unsaved changes" as the signal.
      console.error('Save failed', err);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Sync committed console lines into the stdin buffer. When the program
   * starved for input (EOFError) and the user commits another line,
   * re-run automatically — like a real interactive terminal.
   */
  const handleInputLinesChange = useCallback(
    (lines: string[]) => {
      setInputLines((prev) => {
        const grew = lines.length > prev.length;
        if (grew && awaitingInputRef.current) {
          awaitingInputRef.current = false;
          window.setTimeout(() => void handleRunRef.current(), 0);
        }
        return lines;
      });
      setStdin(lines.join('\n'));
    },
    // handleRun is stable enough for this usage; called via setTimeout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleRun = async () => {
    if (!activeFile || !project) return;
    if (
      window.matchMedia('(max-width: 1023px)').matches &&
      (mobileTab === 'files' || mobileTab === 'more')
    ) {
      setMobileTab('code');
    }
    // Flush any uncommitted console input so the last typed line is included.
    const finalStdin = consoleRef.current?.flushPending() ?? stdin;
    if (finalStdin !== stdin) setStdin(finalStdin);
    if (dirty) await handleSave();
    setIsRunning(true);
    setExecution(null);
    try {
      const response = await executionService.execute({
        language: selectedLanguage,
        project_id: project.id,
        file_id: activeFile.id,
        code: activeFile.content,
        stdin: finalStdin,
      });
      const result = await executionService.pollStatus(response.data.id);
      setExecution(result);
      // Program starved of input? Arm auto-rerun so the next committed line
      // in the console row re-runs with the new stdin.
      awaitingInputRef.current =
        result.status === 'runtime_error' && isInputStarved(result.stderr);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { data?: Execution } } })?.response?.data?.data;
      if (data) {
        setExecution(data);
      } else {
        // No execution record (network/queue failure) — surface it in the
        // terminal instead of a popup alert.
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('toast.couldnt_run');
        setExecution({
          id: 0,
          user_id: project?.user_id ?? 0,
          project_id: project?.id ?? 0,
          file_id: activeFile.id,
          language_id: 0,
          status: 'system_error',
          source_code: '',
          stdin: stdin || null,
          stdout: '',
          stderr: message,
          exit_code: null,
          execution_time: null,
          memory_usage: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } finally {
      setIsRunning(false);
    }
  };
  handleRunRef.current = handleRun;

  const handleCodeChange = (value: string) => {
    if (!activeFile) return;
    setActiveFile((f) => (f ? { ...f, content: value } : f));
  };

  /** Jump the Monaco cursor to the error line and reveal it. */
  const handleGoToErrorLine = (line: number) => {
    if (mobileTab === 'output') setMobileTab('code');
    editorRef.current?.revealLine(line);
  };

  /** Focus the console input row (also switches mobile tabs if needed). */
  const handleFocusConsole = () => {
    if (mobileTab === 'files' || mobileTab === 'more') setMobileTab('code');
    terminalPanelRef.current?.focusConsole();
  };

  /** Program is waiting for input — make sure the console is visible. */
  const handleInputReady = useCallback(() => {
    // On mobile, jump out of Files/More so the console row is on screen.
    setMobileTab((t) => (t === 'files' || t === 'more' ? 'code' : t));
  }, []);

  /** Apply a one-click fix suggestion to the active file content. */
  const handleApplyFix = (line: number, apply: (code: string) => string) => {
    if (!activeFile) return;
    const next = apply(activeFile.content);
    if (next === activeFile.content) return; // fix was a no-op
    setActiveFile((f) => (f ? { ...f, content: next } : f));
    if (mobileTab === 'output') setMobileTab('code');
    // Let state settle before revealing the edited line.
    window.setTimeout(() => editorRef.current?.revealLine(line), 50);
  };

  const handleSelectFile = async (file: File) => {
    if (activeFile && activeFile.id !== file.id && dirty) {
      await handleSave();
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
        if (activeFile && dirty) await handleSave();
        const response = await fileService.create(pId, {
          filename,
          language,
          content: content ?? getTemplateContent(language, 'empty'),
        });
        setFiles((fs) => [...fs, response.data]);
        setActiveFile(response.data);
        setSavedContent(response.data.content);
        setSavedLanguage(response.data.language);
        toast.success(t('toast.file_created'), filename);
      } catch {
        toast.error(t('toast.failed_create_file'));
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
      toast.success(t('toast.file_deleted'), deleteTarget.filename);
    } catch {
      toast.error(t('toast.failed_delete_file'));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleRenameFile = (file: File, newName: string) => {
    void (async () => {
      try {
        const response = await fileService.update(file.id, { filename: newName });
        // Only take the fields the rename actually changed from the server so
        // unsaved local content/language edits are never clobbered.
        const patch = { filename: response.data.filename, updated_at: response.data.updated_at };
        setFiles((fs) => fs.map((f) => (f.id === file.id ? { ...f, ...patch } : f)));
        setActiveFile((f) => (f?.id === file.id ? { ...f, ...patch } : f));
        toast.success(t('toast.renamed'), newName);
      } catch {
        toast.error(t('toast.failed_rename_file'));
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
    toast.success(t('toast.downloaded'), activeFile.filename);
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
        toast.success(t('toast.copied_clipboard'), t('toast.ready_to_paste', { name: activeFile.filename }));
      }
    } catch {
      /* user cancelled the share sheet */
    }
  };

  const mobileNav: { key: MobileTab; label: string; icon: 'folder' | 'code' | 'terminal' | 'moreV' }[] = [
    { key: 'files', label: t('nav.files'), icon: 'folder' },
    { key: 'code', label: t('nav.code'), icon: 'code' },
    { key: 'output', label: t('nav.output'), icon: 'terminal' },
    { key: 'more', label: t('nav.more'), icon: 'moreV' },
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
        onToggleSidebar={sidebar.toggle}
        sidebarVisible={!sidebar.collapsed}
      />

      <div className="flex min-h-0 flex-1">
        {/* Desktop + Files tab (mobile) */}
        <aside
          className={cn(
            'group/sb relative border-r border-edge bg-raised/50 hidden lg:block lg:shrink-0',
            sidebar.collapsed ? 'lg:hidden' : '',
          )}
          style={{ width: sidebar.collapsed ? 0 : sidebar.size }}
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
          <button
            type="button"
            onMouseDown={sidebar.onMouseDown}
            onClick={sidebar.toggle}
            className="absolute inset-y-0 -right-1 z-10 w-2.5 cursor-col-resize transition-colors hover:bg-primary/40"
            aria-label="Resize sidebar"
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
                  ref={editorRef}
                  value={activeFile.content}
                  language={selectedLanguage}
                  onChange={handleCodeChange}
                />
              ) : (
                <div className="flex flex-1 items-center justify-center bg-editor">
                  <EmptyState
                    icon="fileText"
                    title={t('editor.no_file')}
                    message={t('editor.select_file')}
                    action={
                      <Button size="sm" onClick={() => handleCreateFile('main.cpp', 'cpp')}>
                        <Icon name="filePlus" size={15} />
                        {t('editor.create_main')}
                      </Button>
                    }
                  />
                </div>
              )}
            </div>

            <div
              className="group/panel flex shrink-0 flex-col border-t border-edge"
              style={{ height: panel.collapsed ? 0 : panel.size }}
            >
              <button
                type="button"
                onMouseDown={panel.onMouseDown}
                onClick={panel.toggle}
                className="flex h-3 w-full shrink-0 cursor-row-resize items-center justify-center bg-edge/40 transition-colors hover:bg-primary/30"
                aria-label="Resize terminal"
              >
                <span className="h-0.5 w-8 rounded-full bg-faint/50 transition-colors group-hover/panel:bg-primary/70" />
              </button>
              <div className="min-h-0 flex-1 overflow-hidden">
                <TerminalPanel
                  ref={terminalPanelRef}
                  execution={execution}
                  isRunning={isRunning}
                  stdin={stdin}
                  hasErrors={hasErrors}
                  needsStdin={needsStdin}
                  tab={terminalTab}
                  onTabChange={setTerminalTab}
                  activeLanguage={activeFile?.language}
                  fileContent={activeFile?.content}
                  onGoToLine={handleGoToErrorLine}
                  onApplyFix={handleApplyFix}
                  inputLines={inputLines}
                  onInputLinesChange={handleInputLinesChange}
                  consoleRef={consoleRef}
                  onFocusConsole={handleFocusConsole}
                  onInputReady={handleInputReady}
                />
              </div>
            </div>
          </main>
        )}

        {mobileTab === 'output' && (
          <main className="flex min-h-0 flex-1 flex-col pt-px lg:hidden">
            <TerminalPanel
              ref={terminalPanelRef}
              execution={execution}
              isRunning={isRunning}
              stdin={stdin}
              hasErrors={hasErrors}
              needsStdin={needsStdin}
              tab={terminalTab}
              onTabChange={setTerminalTab}
              activeLanguage={activeFile?.language}
              fileContent={activeFile?.content}
              onGoToLine={handleGoToErrorLine}
              onApplyFix={handleApplyFix}
              inputLines={inputLines}
              onInputLinesChange={handleInputLinesChange}
              consoleRef={consoleRef}
              onFocusConsole={handleFocusConsole}
              onInputReady={handleInputReady}
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
      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title={t('editor.options')}>
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">{t('editor.language')}</p>
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
              {t('editor.save')}
            </Button>
            <Button variant="secondary" onClick={toggle}>
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
              {theme === 'dark' ? t('editor.light_mode') : t('editor.dark_mode')}
            </Button>
            <Button variant="secondary" onClick={handleDownload} disabled={!activeFile}>
              <Icon name="download" size={15} />
              {t('editor.download_file')}
            </Button>
            <Button variant="secondary" onClick={() => void handleShare()} disabled={!activeFile}>
              <Icon name="share" size={15} />
              {t('editor.share_file')}
            </Button>
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        loading={deleting}
        title={t('editor.delete_confirm_title', { name: deleteTarget?.filename ?? '' })}
        message={t('editor.delete_confirm_msg')}
        confirmLabel={t('editor.delete_confirm_btn')}
      />

      <div className="h-[calc(4rem+env(safe-area-inset-bottom))] lg:hidden" aria-hidden="true" />
    </div>
  );
}


