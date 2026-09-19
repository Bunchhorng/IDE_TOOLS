import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './i18n';

// Monaco Editor worker setup for Vite
import workerEditor from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import workerJson from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import workerCss from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import workerHtml from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import workerTs from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new workerJson();
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new workerCss();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new workerHtml();
    }
    if (label === 'typescript' || label === 'javascript') {
      return new workerTs();
    }
    return new workerEditor();
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <PreferencesProvider>
          <ToastProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ToastProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>,
);
