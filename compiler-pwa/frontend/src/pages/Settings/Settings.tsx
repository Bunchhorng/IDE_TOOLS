import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Toggle } from '../../components/ui/Toggle';
import { Button, buttonClass } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { cn } from '../../lib/cn';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-faint">{title}</h2>
      {children}
    </section>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { theme, setMode } = useTheme();
  const { prefs, updatePrefs } = usePreferences();
  const toast = useToast();

  const [fontPreview, setFontPreview] = useState('int n = 42;\nstd::cout << "hi";');

  const fontSizeOptions = [12, 13, 14, 15, 16, 18, 20];
  const tabSizeOptions = [2, 4, 8];

  const setFontSize = (size: number) => {
    updatePrefs({ fontSize: size });
    toast.success('Font size updated', `${size}px`);
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-8 flex items-center gap-4">
        <Avatar name={user?.name ?? '?'} size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight text-ink">{user?.name}</h1>
            {user?.is_guest && <Badge tone="warning">Guest</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-mute">
            {user?.email ?? (user?.is_guest ? 'No email — guest account' : 'No email')}
          </p>
        </div>
      </header>

      {user?.is_guest && (
        <div className="mb-8 flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-semibold text-ink">You're coding as a guest</p>
            <p className="mt-0.5 text-mute">
              Your work is saved on this device. Create an account to keep it everywhere.
            </p>
          </div>
          <Link to="/register" className={buttonClass('outline', 'md')}>
            <Icon name="user" size={15} />
            Save your account
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-8">
        <Section title="Appearance">
          <Card className="p-5">
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { value: 'dark', label: 'Dark', icon: 'moon' },
                  { value: 'light', label: 'Light', icon: 'sun' },
                ] as const
              ).map((opt) => {
                const active = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setMode(opt.value)}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-edge bg-panel text-mute hover:border-edge-strong hover:text-ink',
                    )}
                  >
                    <Icon name={opt.icon} size={17} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-faint">
              Theme is applied instantly and synced with the editor.
            </p>
          </Card>
        </Section>

        <Section title="Editor">
          <Card className="flex flex-col gap-5 p-5">
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Font size</p>
              <div className="flex flex-wrap items-center gap-2">
                {fontSizeOptions.map((size) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={cn(
                      'h-9 w-9 rounded-md border text-sm font-medium transition-colors',
                      prefs.fontSize === size
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-edge bg-panel text-mute hover:border-edge-strong hover:text-ink',
                    )}
                    aria-pressed={prefs.fontSize === size}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-ink">Tab size</p>
              <div className="flex items-center gap-2">
                {tabSizeOptions.map((size) => (
                  <button
                    key={size}
                    onClick={() => updatePrefs({ tabSize: size })}
                    className={cn(
                      'h-9 rounded-md border px-3 text-sm font-medium transition-colors',
                      prefs.tabSize === size
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-edge bg-panel text-mute hover:border-edge-strong hover:text-ink',
                    )}
                    aria-pressed={prefs.tabSize === size}
                  >
                    {size} spaces
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                checked={prefs.wordWrap}
                onChange={(v) => updatePrefs({ wordWrap: v })}
                label="Word wrap"
                description="Wrap long lines to fit the editor width."
              />
              <Toggle
                checked={prefs.minimap}
                onChange={(v) => updatePrefs({ minimap: v })}
                label="Minimap"
                description="Show the code overview strip."
              />
              <Toggle
                checked={prefs.fontLigatures}
                onChange={(v) => updatePrefs({ fontLigatures: v })}
                label="Font ligatures"
                description="Fira-code style joins (e.g. =>, !=, ::)."
              />
              <Toggle
                checked={prefs.autoSave}
                onChange={(v) => {
                  updatePrefs({ autoSave: v });
                  toast.info(v ? 'Auto-save on' : 'Auto-save off', v ? 'Changes save automatically.' : 'Manual save (Ctrl+S) enabled.');
                }}
                label="Auto-save"
                description="Persist your file after each edit."
              />
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink">
                <Icon name="wand" size={14} className="text-faint" />
                Live preview
              </p>
              <textarea
                value={fontPreview}
                onChange={(e) => setFontPreview(e.target.value)}
                rows={3}
                spellCheck={false}
                className="w-full resize-y rounded-lg border border-edge bg-editor px-3.5 py-3 font-mono text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                style={{ fontSize: prefs.fontSize, tabSize: prefs.tabSize }}
              />
            </div>
          </Card>
        </Section>

        <Section title="Account">
          <Card className="flex flex-col gap-1 p-2">
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-sm text-mute">Member since</span>
              <span className="text-sm font-medium text-ink">
                {user ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-sm text-mute">Workspace</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                <Icon name="database" size={15} className="text-success" />
                Cloud sandbox
              </span>
            </div>
          </Card>
        </Section>

        <Button
          variant="outline"
          onClick={() => toast.info('All set ✔', 'Your preferences are saved locally on this device.')}
        >
          <Icon name="check" size={15} />
          Preferences are saved automatically
        </Button>
      </div>
    </main>
  );
}