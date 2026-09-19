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
// monaco-editor >= 0.56 exports-map: import via the bare "*/..." subpaths,
// NOT the old "esm/vs/..." paths (they no longer resolve).
import workerEditor from 'monaco-editor/editor/editor.worker.js?worker';
import workerJson from 'monaco-editor/language/json/json.worker.js?worker';
import workerCss from 'monaco-editor/language/css/css.worker.js?worker';
import workerHtml from 'monaco-editor/language/html/html.worker.js?worker';
import workerTs from 'monaco-editor/language/typescript/ts.worker.js?worker';

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
