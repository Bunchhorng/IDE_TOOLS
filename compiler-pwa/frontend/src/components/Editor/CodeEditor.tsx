import Editor from '@monaco-editor/react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { BeforeMount, OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';

interface CodeEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  autoFocus?: boolean;
  /** Live cursor position (1-based line & column) for the status bar. */
  onCursorChange?: (line: number, column: number) => void;
}

const LANGUAGE_MAP: Record<string, string> = {
  c: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  py: 'python',
  python: 'python',
};

function defineThemes(monaco: Parameters<BeforeMount>[0]) {
  /* Dark palette — cool midnight blues */
  const darkRules = [
    { token: 'comment', foreground: '5c6c8a', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'c792ea' },
    { token: 'keyword.control', foreground: 'c792ea' },
    { token: 'type', foreground: '7cb6ff' },
    { token: 'type.identifier', foreground: 'e5c07b' },
    { token: 'identifier', foreground: 'd4d4d4' },
    { token: 'number', foreground: 'f78c6c' },
    { token: 'string', foreground: 'a5e075' },
    { token: 'string.escape', foreground: 'ffd866' },
    { token: 'operator', foreground: '89ddff' },
    { token: 'delimiter', foreground: 'd4d4d4' },
    { token: 'delimiter.bracket', foreground: 'd4d4d4' },
    { token: 'delimiter.parenthesis', foreground: '89ddff' },
    { token: 'function', foreground: '61afef' },
    { token: 'function.definition', foreground: '61afef' },
    { token: 'variable', foreground: 'd4d4d4' },
    { token: 'variable.predefined', foreground: 'ff5370' },
    { token: 'namespace', foreground: '89ddff' },
    { token: 'constant', foreground: 'f78c6c' },
    { token: 'preprocessor', foreground: 'c586c0' },
    { token: 'macro', foreground: 'c586c0' },
    { token: 'attribute.name', foreground: 'f07178' },
    { token: 'parameter', foreground: 'eeffff' },
  ];

  /* Light palette — high-contrast warm tones on white */
  const lightRules = [
    { token: 'comment', foreground: '7c8da6', fontStyle: 'italic' },
    { token: 'keyword', foreground: '8839ef' },
    { token: 'keyword.control', foreground: '8839ef' },
    { token: 'type', foreground: '1a6ddb' },
    { token: 'type.identifier', foreground: 'b35309' },
    { token: 'identifier', foreground: '1c2128' },
    { token: 'number', foreground: 'd94615' },
    { token: 'string', foreground: '1a7f37' },
    { token: 'string.escape', foreground: '953800' },
    { token: 'operator', foreground: '1a6ddb' },
    { token: 'delimiter', foreground: '4a5568' },
    { token: 'delimiter.bracket', foreground: '4a5568' },
    { token: 'delimiter.parenthesis', foreground: '1a6ddb' },
    { token: 'function', foreground: '0550ae' },
    { token: 'function.definition', foreground: '0550ae' },
    { token: 'variable', foreground: '1c2128' },
    { token: 'variable.predefined', foreground: 'cf222e' },
    { token: 'namespace', foreground: '1a6ddb' },
    { token: 'constant', foreground: 'd94615' },
    { token: 'preprocessor', foreground: '8250df' },
    { token: 'macro', foreground: '8250df' },
    { token: 'attribute.name', foreground: 'cf222e' },
    { token: 'parameter', foreground: '1c2128' },
  ];

  monaco.editor.defineTheme('coderunner-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: darkRules,
    colors: {
      'editor.background': '#0d1424',
      'editor.foreground': '#dbe4f0',
      'editorLineNumber.foreground': '#3b4a63',
      'editorLineNumber.activeForeground': '#a8b3cf',
      'editor.lineHighlightBackground': '#131c31',
      'editor.selectionBackground': '#2f5fb29a',
      'editor.inactiveSelectionBackground': '#2f5fb24d',
      'editorCursor.foreground': '#7ab1ff',
      'editorIndentGuide.background1': '#18223c',
      'editorIndentGuide.activeBackground1': '#33415f',
      'editorGutter.background': '#0b1120',
      'editorWidget.background': '#111a2e',
      'editorWidget.border': '#1e2a4a',
      'editorBracketMatch.background': '#2563eb33',
      'editorBracketMatch.border': '#60a5fa99',
      'editorOverviewRuler.border': '#00000000',
      'editorOverviewRuler.errorForeground': '#ef444466',
      'editorOverviewRuler.warningForeground': '#f59e0b66',
      'scrollbarSlider.background': '#ffffff14',
      'scrollbarSlider.hoverBackground': '#ffffff26',
      'scrollbarSlider.activeBackground': '#ffffff33',
      'editor.wordHighlightBackground': '#fbbf241f',
      'editor.findMatchBackground': '#fbbf2430',
      'editorError.border': '#00000000',
    },
  });

  monaco.editor.defineTheme('coderunner-light', {
    base: 'vs',
    inherit: true,
    rules: lightRules,
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1c2128',
      'editorLineNumber.foreground': '#b0b8c5',
      'editorLineNumber.activeForeground': '#4a5772',
      'editor.lineHighlightBackground': '#f0f3f9',
      'editor.selectionBackground': '#b6d0ff',
      'editor.inactiveSelectionBackground': '#d6e4ff',
      'editorCursor.foreground': '#0550ae',
      'editorIndentGuide.background1': '#e4e9f0',
      'editorIndentGuide.activeBackground1': '#c0c9d8',
      'editorGutter.background': '#f7f9fc',
      'editorWidget.background': '#ffffff',
      'editorWidget.border': '#d9e0ea',
      'editorBracketMatch.background': '#2563eb22',
      'editorBracketMatch.border': '#2563eb66',
      'editorOverviewRuler.border': '#00000000',
      'editorOverviewRuler.errorForeground': '#cf222e88',
      'editorOverviewRuler.warningForeground': '#d9461588',
      'scrollbarSlider.background': '#4a577226',
      'scrollbarSlider.hoverBackground': '#4a577240',
      'scrollbarSlider.activeBackground': '#4a577259',
      'editor.wordHighlightBackground': '#1a6ddb18',
      'editor.findMatchBackground': '#fbbf2444',
    },
  });
}

export interface CodeEditorHandle {
  /** Scroll the error line into view and place the cursor there. */
  revealLine: (line: number) => void;
}

const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditorInner({ value, language, onChange, readOnly = false, autoFocus = false, onCursorChange }, ref) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { theme } = useTheme();
  const { prefs } = usePreferences();
  const monacoLanguage = LANGUAGE_MAP[language] || 'plaintext';
  const monacoTheme = theme === 'dark' ? 'coderunner-dark' : 'coderunner-light';
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleBeforeMount: BeforeMount = (monaco) => {
    defineThemes(monaco);
  };

  useImperativeHandle(
    ref,
    () => ({
      revealLine: (line: number) => {
        const ed = editorRef.current;
        if (!ed) return;
        ed.revealLineInCenter(line);
        ed.setPosition({ lineNumber: line, column: 1 });
        ed.focus();
      },
    }),
    [],
  );

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) onCursorChange(e.position.lineNumber, e.position.column);
    });
    if (autoFocus) {
      editor.focus();
      editor.setPosition({ lineNumber: 1, column: 1 });
    }
  };

  return (
    <Editor
      height="100%"
      language={monacoLanguage}
      value={value}
      theme={monacoTheme}
      beforeMount={handleBeforeMount}
      onChange={(val) => onChange(val || '')}
      onMount={handleEditorMount}
      loading={
        <div className={theme === 'dark' ? 'text-[#3b4a63]' : 'text-mute'}>Loading…</div>
      }
      options={{
        readOnly,
        minimap: { enabled: prefs.minimap && !isMobile },
        mouseWheelZoom: true,
        fontSize: prefs.fontSize,
        fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
        fontLigatures: prefs.fontLigatures,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: prefs.tabSize,
        insertSpaces: true,
        wordWrap: prefs.wordWrap ? 'on' : 'off',
        folding: true,
        bracketPairColorization: { enabled: true },
        renderLineHighlight: 'all',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        padding: { top: 12, bottom: 12 },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      }}
    />
  );
});

export default CodeEditor;