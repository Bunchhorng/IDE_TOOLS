import { Link } from 'react-router-dom';
import { buttonClass } from '../../components/ui/Button';
import { Icon, type IconName } from '../../components/ui/Icon';
import { LanguageIcon } from '../../components/LanguageIcon';
import { Logo } from '../../components/Logo';
import { InstallPWAButton } from '../../components/InstallPWAButton';
import { UsageStats } from '../../components/Dashboard/UsageStats';
import { useI18n } from '../../i18n';

const FEATURES: { icon: IconName; titleKey: keyof typeof import('../../i18n/translations').translations.en; bodyKey: keyof typeof import('../../i18n/translations').translations.en }[] = [
  {
    icon: 'lock',
    titleKey: 'home.sandbox_title',
    bodyKey: 'home.sandbox_desc',
  },
  {
    icon: 'zap',
    titleKey: 'home.runs_title',
    bodyKey: 'home.runs_desc',
  },
  {
    icon: 'smartphone',
    titleKey: 'home.offline_title',
    bodyKey: 'home.offline_desc',
  },
  {
    icon: 'terminal',
    titleKey: 'home.stdout_title',
    bodyKey: 'home.stdout_desc',
  },
];

function CodeWindow({ passedLabel }: { passedLabel: string }) {
  const lines = [
    { text: '#include <iostream>', cls: 'text-error' },
    { text: 'using namespace std;', cls: 'text-mute' },
    { text: '', cls: '' },
    { text: 'int main() {', cls: 'text-primary' },
    { text: '    cout << "Hello, ETEC STUDIO!" << endl;', cls: 'text-ink' },
    { text: '    return 0;', cls: 'text-primary' },
    { text: '}', cls: 'text-primary' },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-editor shadow-card">
      <div className="flex items-center gap-1.5 border-b border-edge px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-error/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/80" />
        <span className="ml-3 flex items-center gap-2 text-[11px] text-faint">
          <Icon name="fileText" size={12} />
          main.cpp <span className="hidden sm:inline">— C++</span>
        </span>
        <span className="ml-auto hidden items-center gap-1 rounded bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          {passedLabel}
        </span>
      </div>
      <div className="relative">
        <div className="absolute left-4 top-3 hidden flex-col gap-1 text-right font-mono text-[11px] leading-6 text-faint sm:flex">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
        <pre className="overflow-x-auto px-4 py-3 font-mono text-[12px] leading-6 sm:pl-12">
          {lines.map((line, i) =>
            line.text === '' ? <div key={i}>&nbsp;</div> : (
              <div key={i} className={i === 4 ? 'bg-success/10 -mx-4 px-4 sm:-mx-2 sm:px-2' : ''}>
                <code className={line.cls}>{line.text}</code>
              </div>
            ),
          )}
        </pre>
      </div>
    </div>
  );
}

export default function Home() {
  const { t } = useI18n();

  return (
    <div className="min-h-dvh">
      <main>
        <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <span className="relative mb-5 inline-flex items-center gap-2 rounded-full border border-edge bg-panel px-3 py-1 text-xs font-medium text-mute">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                </span>
                {t('home.banner_label')}
              </span>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
                {t('home.hero_heading_top')}
                <span className="block text-primary">{t('home.hero_heading_bottom')}</span>
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-mute sm:text-lg">
                {t('home.hero_desc')}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/dashboard" className={buttonClass('primary', 'lg')}>
                  <Icon name="zap" size={17} />
                  {t('home.cta_free')}
                </Link>
                <Link to="/login" className={buttonClass('secondary', 'lg')}>
                  {t('home.hero_sign_in')}
                </Link>
                <InstallPWAButton variant="outline" size="lg" />
              </div>
              <div className="mt-8 flex items-center gap-5">
                <div>
                  <p className="text-lg font-bold text-ink">{t('home.lang_list')}</p>
                  <p className="text-xs text-faint">{t('home.lang_subtitle')}</p>
                </div>
                <span className="h-8 w-px bg-edge" />
                <div>
                  <p className="text-lg font-bold text-ink">{t('home.infra_label')}</p>
                  <p className="text-xs text-faint">{t('home.infra_desc')}</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 -z-10 rounded-3xl bg-primary/5 blur-2xl" aria-hidden="true" />
              <CodeWindow passedLabel={t('status.success')} />
              <div className="mt-4 flex items-center rounded-lg border border-edge bg-panel px-4 py-2.5 text-xs text-mute">
                <div className="flex items-center gap-3">
                  <LanguageIcon lang="cpp" size="sm" />
                  <span className="font-medium text-ink">g++</span>
                  <span className="hidden sm:inline">main.cpp</span>
                </div>
                <span className="mx-3 h-3.5 w-px bg-edge" aria-hidden="true" />
                <span className="flex items-center gap-1.5 text-success">
                  <Icon name="checkCircle" size={14} />
                  {t('home.compiled_in', { time: '0.4s' })}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Live usage — how many students use the IDE */}
        <UsageStats />

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.titleKey}
                className="group rounded-xl border border-edge bg-panel p-5 transition-colors hover:border-primary/40"
              >
                <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <Icon name={f.icon} size={19} />
                </span>
                <h3 className="text-sm font-semibold text-ink">{t(f.titleKey)}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mute">{t(f.bodyKey)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-edge bg-panel/50">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-14 text-center sm:px-6">
            <Logo size="lg" />
            <p className="max-w-md text-sm leading-relaxed text-mute">
              {t('home.footer_tagline')}
            </p>
            <Link to="/dashboard" className={buttonClass('primary', 'lg')}>
              <Icon name="rocket" size={17} />
              {t('home.get_started')}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
