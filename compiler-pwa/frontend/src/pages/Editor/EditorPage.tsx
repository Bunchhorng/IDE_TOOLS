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
import { LanguageIcon } from '../../components/LanguageIcon';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Icon } from '../../components/ui/Icon';
import { Spinner } from '../../components/ui/Button';
import { useResizable } from '../../hooks/useResizable';
import { useResizableX } from '../../hooks/useResizableX';
import { cn } from '../../lib/cn';
import { getTemplateContent } from '../../lib/templates';
import { languageFromFilename } from '../../lib/languages';
import { isInputStarved } from '../../lib/errorHints';
import { codeNeedsInput } from '../../lib/needsInput';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useI18n } from '../../i18n';
import { projectService } from '../../services/projectService';
import { fileService } from '../../services/fileService';
import { folderService } from '../../services/folderService';
import { executionService } from '../../services/executionService';
import { languageService } from '../../services/languageService';
import type { Project, File, Folder, Language, Execution } from '../../types';

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
  const [folders, setFolders] = useState<Folder[]>([]);
  /** Editor tabs (open files) in display order — closing a tab removes it here only. */
  const [openFileIds, setOpenFileIds] = useState<number[]>([]);
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
  /** Active interactive session: the sandbox id of the running program. */
  const [liveSessionId, setLiveSessionId] = useState<number | null>(null);
  /** Accumulated stdout of an interactive program between input deliveries. */
  const [liveOutput, setLiveOutput] = useState('');
  /** Mirror of liveOutput for the poll loop (avoid stale closures). */
  const liveOutputRef = useRef('');
  const [mobileTab, setMobileTab] = useState<MobileTab>('code');
  const [terminalTab, setTerminalTab] = useState<PanelTab>('terminal');
  const [moreOpen, setMoreOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'file' | 'folder'; item: File | Folder } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const editorRef = useRef<CodeEditorHandle>(null);
  const consoleRef = useRef<ConsoleInputHandle>(null);
  const terminalPanelRef = useRef<TerminalPanelHandle>(null);
  /** Always points at the latest handleRun (used by stale-safe callbacks). */
  const handleRunRef = useRef<(continueSession?: boolean) => Promise<void>>(async () => {});
  /** Mirror of isRunning for stale-safe callbacks (auto-run guard). */
  const isRunningRef = useRef(false);
  /** True when a run ended starved of input — the next committed line re-runs. */
  const awaitingInputRef = useRef(false);
  /** Mirror of `dirty` for the beforeunload guard. */
  const dirtyRef = useRef(false);
  /** True while an interactive session is in flight (used by cleanups). */
  const liveActiveRef = useRef(false);
  /** Interactive session id for the poll loop / submit / stop. */
  const liveSessionIdRef = useRef<number | null>(null);
  /** Mirror of the echoed input lines (used by the poll stop/finish finalizers). */
  const inputLinesRef = useRef<string[]>([]);
  /** Poll handle for live interactive sessions — cleared on finish/stop/unmount. */
  const pollTimerRef = useRef<number | null>(null);
  /** Bumped on every begin/abort so stale async finalizers can't clobber the
      terminal after a stop, file switch, or new run. */
  const sessionTokenRef = useRef(0);
  /** Mirror of interactive-eligible for the stale-safe auto-run guard. */
  const interactiveEligibleRef = useRef(false);
  const panel = useResizable({ initial: 240, min: 80 });
  const sidebar = useResizableX({ initial: 240, min: 140 });

  const pId = Number(projectId);
  const dirty =
    !!activeFile &&
    (activeFile.content !== savedContent || activeFile.language !== savedLanguage);
  /** The run ended because stdin ran dry — the code is fine, input was missing. */
  const inputStarved = useMemo(
    () => !!execution && !isRunning && isInputStarved(execution.stderr),
    [execution, isRunning],
  );
  const hasErrors = useMemo(
    () =>
      !!execution &&
      !inputStarved &&
      (['compile_error', 'runtime_error', 'timeout', 'memory_limit', 'system_error', 'failed'].includes(execution.status) ||
        !!execution.stderr),
    [execution, inputStarved],
  );

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  /** Open tabs in display order (project files still visible in the explorer). */
  const openFiles = useMemo(() => {
    const byId = new Map(files.map((f) => [f.id, f]));
    return openFileIds.map((id) => byId.get(id)).filter((f): f is File => !!f);
  }, [files, openFileIds]);

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
        setOpenFileIds([first.id]);
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

  const loadFolders = useCallback(async () => {
    if (!projectId) return;
    try {
      const response = await folderService.getByProject(Number(projectId));
      setFolders(response.data);
    } catch {
      /* folders are optional */
    }
  }, [projectId]);

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
    void loadFolders();
    void loadLanguages();
  }, [loadProject, loadFiles, loadFolders, loadLanguages]);

  const selectedLanguage = activeFile?.language ?? languages[0]?.slug ?? 'cpp';

  /** C/C++/Python programs that read input run live: the sandbox keeps running
   *  and each answer is delivered one line at a time, so menu loops work. */
  const interactiveEligible = useMemo(
    () =>
      (activeFile?.language === 'c' ||
        activeFile?.language === 'cpp' ||
        activeFile?.language === 'python') &&
      codeNeedsInput(activeFile?.content ?? '', activeFile?.language),
    [activeFile?.content, activeFile?.language],
  );

  useEffect(() => {
    interactiveEligibleRef.current = interactiveEligible;
  }, [interactiveEligible]);

  useEffect(() => {
    inputLinesRef.current = inputLines;
  }, [inputLines]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!isSaving) void handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isRunning && activeFile) void handleRun(false);
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

  /** Persist the active file. Returns false on failure so callers can stop a
   *  tab switch / close — otherwise unsaved edits would silently be dropped. */
  const handleSave = async (): Promise<boolean> => {
    if (!activeFile || !dirty) return true;
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
      return true;
    } catch (err) {
      console.error('Save failed', err);
      toast.error(t('toast.save_failed'), t('toast.check_connection'));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Sync committed console lines into the stdin buffer. The run is started by
   * the console itself (via onAllLinesCommitted) once the committed lines
   * cover every input the program asks for — nothing runs early here.
   */
  const handleInputLinesChange = useCallback((lines: string[]) => {
    inputLinesRef.current = lines;
    setInputLines(lines);
    setStdin(lines.join('\n'));
  }, []);

  /** End an interactive session and surface the final record. Called by the
   *  poll loop when the sandbox exits on its own (program finished). Ignored
   *  if a newer session/abort bumped the token (stale continuation). */
  const finishLive = (id: number, exec: Execution, token: number) => {
    if (id !== liveSessionIdRef.current || token !== sessionTokenRef.current) return;
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    const finished = {
      ...exec,
      interactive: true,
      stdin:
        inputLinesRef.current.length > 0 ? inputLinesRef.current.join('\n') : null,
    };
    liveActiveRef.current = false;
    liveSessionIdRef.current = null;
    setLiveSessionId(null);
    setLiveOutput('');
    liveOutputRef.current = '';
    setExecution(finished);
    isRunningRef.current = false;
    setIsRunning(false);
  };

  /** Begin a live interactive session: show live output and poll the sandbox
   *  until the program exits on its own. */
  const beginLive = (exec: Execution) => {
    const token = ++sessionTokenRef.current;
    liveSessionIdRef.current = exec.id;
    liveActiveRef.current = true;
    setLiveSessionId(exec.id);
    setExecution(null);
    setLiveOutput(exec.stdout ?? '');
    liveOutputRef.current = exec.stdout ?? '';
    const id = exec.id;
    pollTimerRef.current = window.setInterval(() => {
      void pollLoop(id, token);
    }, 500);
  };

  /** Poll the running session: refresh live output, finalize when it exits. */
  const pollLoop = async (id: number, token: number) => {
    if (!liveActiveRef.current || token !== sessionTokenRef.current) return;
    try {
      const res = await executionService.pollInteractive(id);
      if (!liveActiveRef.current || token !== sessionTokenRef.current) return;
      const exec = res.data;
      const out = exec.stdout ?? '';
      if (out !== liveOutputRef.current) {
        liveOutputRef.current = out;
      }
      setLiveOutput(out);
      if (exec.interactive_finished) finishLive(id, exec, token);
    } catch {
      /* transient network error — keep polling; the sandbox session cap ends it */
    }
  };

  /** Forward one typed line (Enter) to the running program. */
  const handleLiveSubmit = useCallback(async (line: string) => {
    const id = liveSessionIdRef.current;
    if (id == null || !liveActiveRef.current) return;
    const token = sessionTokenRef.current;
    try {
      const res = await executionService.sendInteractiveInput(id, { line });
      if (!liveActiveRef.current || token !== sessionTokenRef.current) return;
      const exec = res.data;
      setLiveOutput(exec.stdout ?? '');
      liveOutputRef.current = exec.stdout ?? '';
      if (exec.interactive_finished) finishLive(id, exec, token);
    } catch {
      /* ignore — polling continues the session */
    }
  }, []);

  /** Stop the live session. With finalize, the final record is surfaced from
   *  the sandbox's close response; abort mode (file switch / clear) only
   *  kills the sandbox and leaves the terminal to the caller. */
  const stopLiveSession = useCallback(
    (finalize = true) => {
      const token = ++sessionTokenRef.current;
      liveActiveRef.current = false;
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      const id = liveSessionIdRef.current;
      liveSessionIdRef.current = null;
      setLiveSessionId(null);
      setLiveOutput('');
      liveOutputRef.current = '';
      if (id == null) {
        if (isRunningRef.current) {
          isRunningRef.current = false;
          setIsRunning(false);
        }
        return;
      }
      if (!finalize) {
        void executionService
          .sendInteractiveInput(id, { close: true })
          .catch(() => undefined);
        if (isRunningRef.current) {
          isRunningRef.current = false;
          setIsRunning(false);
        }
        return;
      }
      void (async () => {
        try {
          const res = await executionService.sendInteractiveInput(id, { close: true });
          if (token !== sessionTokenRef.current || !isRunningRef.current) return;
          const exec = res.data;
          if (exec) {
            setExecution({
              ...exec,
              interactive: true,
              stdin:
                inputLinesRef.current.length > 0
                  ? inputLinesRef.current.join('\n')
                  : null,
            });
          }
          isRunningRef.current = false;
          setIsRunning(false);
        } catch {
          if (token !== sessionTokenRef.current || !isRunningRef.current) return;
          setExecution({
            id: id,
            user_id: project?.user_id ?? 0,
            project_id: project?.id ?? 0,
            file_id: activeFile?.id ?? 0,
            language_id: 0,
            status: 'system_error',
            source_code: '',
            stdin:
              inputLinesRef.current.length > 0
                ? inputLinesRef.current.join('\n')
                : null,
            stdout: '',
            stderr: t('toast.couldnt_run'),
            exit_code: null,
            execution_time: null,
            memory_usage: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          isRunningRef.current = false;
          setIsRunning(false);
        }
      })();
    },
    [project?.id, project?.user_id, activeFile?.id, t],
  );

  /** Stop the sandbox when the editor unmounts (never leave a container running). */
  useEffect(() => {
    const wasLive = liveActiveRef.current;
    const id = liveSessionIdRef.current;
    if (wasLive && id != null) {
      void executionService.sendInteractiveInput(id, { close: true }).catch(() => undefined);
    }
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * VS Code-style auto-run: fired by the console when the committed input
   * covers every detected prompt (the last Enter acts like the Run button).
   * Guarded against a run already in progress so Enter cannot double-fire.
   * If the previous run starved of input, this is a continuation — the
   * committed lines stay in the console and are all re-sent as stdin.
   */
  const handleAllLinesCommitted = useCallback(() => {
    window.setTimeout(() => {
      if (isRunningRef.current) return;
      // Interactive C/C++/Python programs take answers live (started via Run) —
      // the last typed line must NOT fire a batch run.
      if (interactiveEligibleRef.current) return;
      const continueSession = awaitingInputRef.current;
      awaitingInputRef.current = false;
      void handleRunRef.current(continueSession);
    }, 0);
  }, []);

  const handleRun = async (continueSession = false) => {
    if (!activeFile || !project) return;
    // Synchronous guard: Enter/Run can fire again while await handleSave()
    // yields, so the isRunningRef check alone is not enough.
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    // Any run invalidates in-flight live-session finalizers (e.g. a Stop
    // confirmation arriving after the user already reran or switched file).
    sessionTokenRef.current += 1;
    if (
      window.matchMedia('(max-width: 1023px)').matches &&
      (mobileTab === 'files' || mobileTab === 'more')
    ) {
      setMobileTab('code');
    }

    // Interactive C/C++/Python with input reads: keep the sandbox running and
    // send answers one line at a time, so menu loops and multi-step prompts work.
    if (interactiveEligible && !continueSession) {
      try {
        if (dirty) await handleSave();
        setIsRunning(true);
        setExecution(null);
        setLiveOutput('');
        const created = await executionService.execute({
          language: selectedLanguage,
          project_id: project.id,
          file_id: activeFile.id,
          code: activeFile.content,
          stdin: '',
          interactive: true,
        });
        const started = await executionService.startInteractive(created.data.id);
        const exec = started.data;
        if (!exec) throw new Error('Missing execution data');
        if (exec.interactive_finished) {
          // Finished instantly (e.g. a compile/syntax error) — surface the
          // result and release the running guard (we never entered a session).
          isRunningRef.current = false;
          setIsRunning(false);
          setExecution(exec);
          return;
        }
        beginLive(exec);
      } catch (err) {
        console.error('Interactive run failed, falling back to batch', err);
        // Release the guard, then degrade to the normal batch path.
        isRunningRef.current = false;
        setIsRunning(false);
        await handleRunRef.current(false);
      }
      return;
    }

    // Flush any uncommitted console input so the last typed line is included.
    const finalStdin = consoleRef.current?.flushPending() ?? stdin;
    if (finalStdin !== stdin) setStdin(finalStdin);
    if (!continueSession) {
      // Fresh session (Run button / auto-run): clear the console so the next
      // run asks for new input from the first prompt, like a new terminal.
      // Continuations of an input-starved session KEEP the lines — the program
      // restarts, and every answer so far is re-sent as stdin.
      setInputLines([]);
      setStdin('');
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
        stdin: finalStdin,
      });
      const result = await executionService.pollStatus(response.data.id);
      setExecution(result);
      // Input-starved runs are not failures: the terminal offers a fresh
      // prompt and committing another line re-runs automatically (below).
      if (result.status === 'runtime_error' && isInputStarved(result.stderr)) {
        awaitingInputRef.current = true;
      }
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
          stdin: finalStdin || null,
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
      isRunningRef.current = false;
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

  /** Wipe the terminal: past output, errors, and any typed input. */
  const handleClearTerminal = () => {
    stopLiveSession(false);
    setExecution(null);
    setStdin('');
    setInputLines([]);
    awaitingInputRef.current = false;
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
      // Don't switch away if the save fails — the edits would be lost.
      const saved = await handleSave();
      if (!saved) return;
    }
    setOpenFileIds((ids) => (ids.includes(file.id) ? ids : [...ids, file.id]));
    setActiveFile(file);
    setSavedContent(file.content);
    setSavedLanguage(file.language);
    stopLiveSession(false);
    setExecution(null);
    // Fresh console session for the new file.
    setInputLines([]);
    setStdin('');
  };

  /** Close an editor tab only — the file stays in the project (explorer). */
  const handleCloseTab = (file: File) => {
    void (async () => {
      // Flush unsaved edits for the closing file before it leaves the editor.
      if (file.id === activeFile?.id && dirty) {
        const saved = await handleSave();
        if (!saved) return;
      }
      const remaining = openFileIds.filter((id) => id !== file.id);
      setOpenFileIds(remaining);
      if (activeFile?.id === file.id) {
        const nextFile = files.find((f) => f.id === remaining[0]) ?? null;
        setActiveFile(nextFile);
        setSavedContent(nextFile ? nextFile.content : '');
        setSavedLanguage(nextFile ? nextFile.language : 'cpp');
        stopLiveSession(false);
        setExecution(null);
        setInputLines([]);
        setStdin('');
      }
    })();
  };

  const handleLanguageChange = (slug: string) => {
    if (!activeFile || slug === activeFile.language) return;
    setActiveFile((f) => (f ? { ...f, language: slug } : f));
    setFiles((fs) => fs.map((f) => (f.id === activeFile.id ? { ...f, language: slug } : f)));
  };

  const handleCreateFile = (filename: string, language: string, folderId: number | null = null, content?: string) => {
    void (async () => {
      try {
        if (activeFile && dirty) {
          const saved = await handleSave();
          if (!saved) return;
        }
        const response = await fileService.create(pId, {
          folder_id: folderId,
          filename,
          language,
          content: content ?? getTemplateContent(language, 'empty'),
        });
        setFiles((fs) => [...fs, response.data]);
        setOpenFileIds((ids) => [...ids, response.data.id]);
        setActiveFile(response.data);
        setSavedContent(response.data.content);
        setSavedLanguage(response.data.language);
        toast.success(t('toast.file_created'), filename);
      } catch {
        toast.error(t('toast.failed_create_file'));
      }
    })();
  };

  const handleCreateFolder = (name: string, parentId: number | null = null) => {
    void (async () => {
      try {
        const response = await folderService.create(pId, { name, parent_id: parentId });
        setFolders((fs) => [...fs, response.data]);
        toast.success(t('toast.folder_created'), name);
      } catch {
        toast.error(t('toast.failed_create_folder'));
      }
    })();
  };

  const handleDeleteFile = (file: File) => setDeleteTarget({ kind: 'file', item: file });

  const handleDeleteFolder = (folder: Folder) => setDeleteTarget({ kind: 'folder', item: folder });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { kind, item } = deleteTarget;
    try {
      if (kind === 'file') {
        await fileService.delete(item.id);
        const next = files.filter((f) => f.id !== item.id);
        setFiles(next);
        setOpenFileIds((ids) => ids.filter((id) => id !== item.id));
        if (activeFile?.id === item.id) activateHead(next);
        toast.success(t('toast.file_deleted'), (item as File).filename);
      } else {
        // Collect the folder and every descendant so the tree update mirrors
        // the server-side cascade delete.
        const removed = new Set<number>();
        const collect = (id: number) => {
          removed.add(id);
          for (const f of folders) if (f.parent_id === id) collect(f.id);
        };
        collect((item as Folder).id);
        await folderService.delete(item.id);
        setFolders((fs) => fs.filter((f) => !removed.has(f.id)));
        const nextFiles = files.filter((f) => !(f.folder_id !== null && removed.has(f.folder_id)));
        setFiles(nextFiles);
        if (activeFile?.id && activeFile.folder_id !== null && removed.has(activeFile.folder_id)) {
          activateHead(nextFiles);
        }
        toast.success(t('toast.folder_deleted'), (item as Folder).name);
      }
    } catch {
      toast.error(kind === 'file' ? t('toast.failed_delete_file') : t('toast.failed_delete_folder'));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const activateHead = (list: File[]) => {
    const head = list[0] ?? null;
    setActiveFile(head);
    setSavedContent(head ? head.content : '');
    setSavedLanguage(head ? head.language : 'cpp');
  };

  const handleRenameFile = (file: File, newName: string) => {
    void (async () => {
      try {
        // A rename that swaps the extension should switch the language too,
        // otherwise Run feeds the file to the wrong compiler.
        const desiredLanguage = languageFromFilename(newName);
        const response = await fileService.update(file.id, {
          filename: newName,
          ...(desiredLanguage !== file.language ? { language: desiredLanguage } : {}),
        });
        // Only take the fields the rename actually changed from the server so
        // unsaved local content/language edits are never clobbered.
        const patch = {
          filename: response.data.filename,
          language: response.data.language,
          updated_at: response.data.updated_at,
        };
        setFiles((fs) => fs.map((f) => (f.id === file.id ? { ...f, ...patch } : f)));
        setActiveFile((f) => (f?.id === file.id ? { ...f, ...patch } : f));
        if (activeFile?.id === file.id) setSavedLanguage(response.data.language);
        toast.success(t('toast.renamed'), newName);
      } catch {
        toast.error(t('toast.failed_rename_file'));
      }
    })();
  };

  const handleRenameFolder = (folder: Folder, newName: string) => {
    void (async () => {
      try {
        const response = await folderService.update(folder.id, { name: newName });
        const patch = { name: response.data.name, updated_at: response.data.updated_at };
        setFolders((fs) => fs.map((f) => (f.id === folder.id ? { ...f, ...patch } : f)));
        toast.success(t('toast.renamed'), newName);
      } catch {
        toast.error(t('toast.failed_rename_folder'));
      }
    })();
  };

  const handleMoveFile = (file: File, folderId: number | null) => {
    void (async () => {
      try {
        const response = await fileService.update(file.id, { folder_id: folderId });
        const patch = { folder_id: response.data.folder_id, updated_at: response.data.updated_at };
        setFiles((fs) => fs.map((f) => (f.id === file.id ? { ...f, ...patch } : f)));
        toast.success(t('toast.moved'), file.filename);
      } catch {
        toast.error(t('toast.failed_move_file'));
      }
    })();
  };

  const handleMoveFolder = (folder: Folder, parentId: number | null) => {
    void (async () => {
      try {
        const response = await folderService.update(folder.id, { parent_id: parentId });
        const patch = { parent_id: response.data.parent_id, updated_at: response.data.updated_at };
        setFolders((fs) => fs.map((f) => (f.id === folder.id ? { ...f, ...patch } : f)));
        toast.success(t('toast.moved'), folder.name);
      } catch {
        toast.error(t('toast.failed_move_folder'));
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
        fileName={activeFile?.filename}
        isSaving={isSaving}
        dirty={dirty}
        running={isRunning}
        canRun={!!activeFile}
        onSave={() => void handleSave()}
        onRun={() => void handleRun(false)}
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
            folders={folders}
            activeFileId={activeFile?.id ?? null}
            projectName={project?.name ?? 'Project'}
            onSelectFile={handleSelectFile}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeleteFile={handleDeleteFile}
            onDeleteFolder={handleDeleteFolder}
            onRenameFile={handleRenameFile}
            onRenameFolder={handleRenameFolder}
            onMoveFile={handleMoveFile}
            onMoveFolder={handleMoveFolder}
          />
<button
              type="button"
              onMouseDown={sidebar.onMouseDown}
              onTouchStart={sidebar.onTouchStart}
              onClick={sidebar.onClick}
              className="absolute inset-y-0 -right-1 z-10 w-2.5 cursor-col-resize touch-none transition-colors hover:bg-primary/40"
              aria-label="Resize sidebar"
            />
        </aside>

        {mobileTab === 'files' && (
          <div className="min-h-0 flex-1 bg-raised/50 lg:hidden">
            <FileExplorerSidebar
              files={files}
              folders={folders}
              activeFileId={activeFile?.id ?? null}
              projectName={project?.name ?? 'Project'}
              onSelectFile={(file) => {
                handleSelectFile(file);
                setMobileTab('code');
              }}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onDeleteFile={handleDeleteFile}
              onDeleteFolder={handleDeleteFolder}
              onRenameFile={handleRenameFile}
              onRenameFolder={handleRenameFolder}
              onMoveFile={handleMoveFile}
              onMoveFolder={handleMoveFolder}
            />
          </div>
        )}

        {(mobileTab === 'code' || mobileTab === 'more') && (
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <EditorTabs
              files={openFiles}
              activeFileId={activeFile?.id ?? null}
              dirtyIds={new Set(dirty && activeFile ? [activeFile.id] : [])}
              onSelect={handleSelectFile}
              onCloseTab={handleCloseTab}
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
                onTouchStart={panel.onTouchStart}
                onClick={panel.onClick}
                className="flex h-3 w-full shrink-0 cursor-row-resize touch-none items-center justify-center bg-edge/40 transition-colors hover:bg-primary/30"
                aria-label="Resize terminal"
              >
                <span className="h-0.5 w-8 rounded-full bg-faint/50 transition-colors group-hover/panel:bg-primary/70" />
              </button>
              <div className="min-h-0 flex-1 overflow-hidden">
                <TerminalPanel
                  ref={terminalPanelRef}
                  execution={execution}
                  isRunning={isRunning}
                  hasErrors={hasErrors}
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
                  onAllLinesCommitted={handleAllLinesCommitted}
                  onClear={handleClearTerminal}
                  liveOutput={liveOutput}
                  liveActive={liveSessionId !== null}
                  onLiveSubmit={handleLiveSubmit}
                  onLiveStop={() => stopLiveSession()}
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
              hasErrors={hasErrors}
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
              onAllLinesCommitted={handleAllLinesCommitted}
              onClear={handleClearTerminal}
              liveOutput={liveOutput}
              liveActive={liveSessionId !== null}
              onLiveSubmit={handleLiveSubmit}
              onLiveStop={() => stopLiveSession()}
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
          className="cr-btn-run fixed bottom-20 right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full text-white transition-all active:scale-95 disabled:opacity-60 lg:hidden"
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
          <div className="flex flex-col gap-1">
            {languages.map((lang) => {
              const active = lang.slug === selectedLanguage;
              const glyph =
                lang.slug === 'python' ? ('python' as const) : lang.slug === 'c' ? ('c' as const) : ('cpp' as const);
              return (
                <button
                  key={lang.id}
                  onClick={() => handleLanguageChange(lang.slug)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors',
                    active ? 'bg-primary/10' : 'hover:bg-raised',
                  )}
                >
                  <LanguageIcon lang={glyph} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-ink">{lang.name}</span>
                    <span className="block text-[11px] text-faint">
                      {lang.compile_command ? `${lang.compile_command} compiler` : `${lang.run_command} runtime`}
                    </span>
                  </span>
                  {active && <Icon name="check" size={16} className="shrink-0 text-primary" />}
                </button>
              );
            })}
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
        title={
          deleteTarget?.kind === 'folder'
            ? t('editor.delete_folder_confirm_title', { name: (deleteTarget.item as Folder).name })
            : t('editor.delete_confirm_title', { name: (deleteTarget?.item as File | undefined)?.filename ?? '' })
        }
        message={
          deleteTarget?.kind === 'folder'
            ? t('editor.delete_folder_confirm_msg')
            : t('editor.delete_confirm_msg')
        }
        confirmLabel={
          deleteTarget?.kind === 'folder' ? t('editor.delete_folder_confirm_btn') : t('editor.delete_confirm_btn')
        }
      />

      <div className="h-[calc(4rem+env(safe-area-inset-bottom))] lg:hidden" aria-hidden="true" />
    </div>
  );
}


