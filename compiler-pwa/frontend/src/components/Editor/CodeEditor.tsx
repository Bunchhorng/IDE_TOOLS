import Editor from '@monaco-editor/react';
import { useEffect, useState } from 'react';
import type { BeforeMount, OnMount } from '@monaco-editor/react';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';

interface CodeEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  autoFocus?: boolean;
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
  const sharedRules = [
    { token: 'comment', foreground: '5f6b85', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'c792ea' },
    { token: 'keyword.control', foreground: 'c792ea' },
    { token: 'type', foreground: '7cb6ff' },
    { token: 'type.identifier', foreground: '4ec9b0' },
    { token: 'identifier', foreground: 'd4d4d4' },
    { token: 'number', foreground: 'f78c6c' },
    { token: 'string', foreground: 'a5e075' },
    { token: 'string.escape', foreground: 'ffd866' },
    { token: 'operator', foreground: '89ddff' },
    { token: 'delimiter', foreground: 'd4d4d4' },
    { token: 'delimiter.bracket', foreground: 'd4d4d4' },
    { token: 'delimiter.parenthesis', foreground: '89ddff' },
    { token: 'function', foreground: '82aaff' },
    { token: 'function.definition', foreground: '82aaff' },
    { token: 'variable', foreground: 'd4d4d4' },
    { token: 'variable.predefined', foreground: 'ff5370' },
    { token: 'namespace', foreground: '89ddff' },
    { token: 'constant', foreground: 'f78c6c' },
    { token: 'preprocessor', foreground: 'c586c0' },
    { token: 'macro', foreground: 'c586c0' },
    { token: 'attribute.name', foreground: 'f07178' },
    { token: 'parameter', foreground: 'eeffff' },
  ];

  monaco.editor.defineTheme('coderunner-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: sharedRules,
    colors: {
      'editor.background': '#0d1424',
      'editor.foreground': '#dbe4f0',
      'editorLineNumber.foreground': '#3b4a63',
      'editorLineNumber.activeForeground': '#a8b3cf',
      'editor.lineHighlightBackground': '#131c31',
      'editor.selectionBackground': '#2563eb4d',
      'editor.inactiveSelectionBackground': '#2563eb2e',
      'editorCursor.foreground': '#60a5fa',
      'editorIndentGuide.background1': '#1a2440',
      'editorIndentGuide.activeBackground1': '#2c3a5c',
      'editorGutter.background': '#0b1120',
      'editorWidget.background': '#111a2e',
      'editorWidget.border': '#1e2a4a',
      'editorBracketMatch.background': '#2563eb33',
      'editorBracketMatch.border': '#60a5fa99',
      'editorOverviewRuler.border': '#00000000',
      'scrollbarSlider.background': '#ffffff14',
      'scrollbarSlider.hoverBackground': '#ffffff26',
      'scrollbarSlider.activeBackground': '#ffffff33',
      'editor.wordHighlightBackground': '#fbbf241f',
      'editorError.border': '#00000000',
    },
  });

  monaco.editor.defineTheme('coderunner-light', {
    base: 'vs',
    inherit: true,
    rules: sharedRules.map((r) =>
      r.token === 'comment' ? { ...r, foreground: '94a3b8' } : r,
    ),
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1f2733',
      'editorLineNumber.foreground': '#cbd5e1',
      'editorLineNumber.activeForeground': '#64748b',
      'editor.lineHighlightBackground': '#f1f5f9',
      'editor.selectionBackground': '#2563eb29',
      'editor.inactiveSelectionBackground': '#2563eb1f',
      'editorCursor.foreground': '#2563eb',
      'editorIndentGuide.background1': '#e2e8f0',
      'editorIndentGuide.activeBackground1': '#cbd5e1',
      'editorGutter.background': '#f8fafc',
      'editorWidget.background': '#ffffff',
      'editorWidget.border': '#e2e8f0',
      'editorBracketMatch.background': '#2563eb26',
      'editorBracketMatch.border': '#2563eb80',
      'scrollbarSlider.background': '#64748b2e',
      'scrollbarSlider.hoverBackground': '#64748b45',
      'scrollbarSlider.activeBackground': '#64748b59',
    },
  });
}

export default function CodeEditor({
  value,
  language,
  onChange,
  readOnly = false,
  autoFocus = false,
}: CodeEditorProps) {
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

  const handleEditorMount: OnMount = (editor) => {
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
}