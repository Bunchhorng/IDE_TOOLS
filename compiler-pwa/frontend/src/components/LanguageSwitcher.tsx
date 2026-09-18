import { useI18n } from '../i18n';
import { cn } from '../lib/cn';

export function LanguageSwitcher({ className, block = false }: { className?: string; block?: boolean }) {
  const { locale, setLocale, t } = useI18n();

  const options = [
    { value: 'en' as const, label: 'EN', name: t('language.english') },
    { value: 'km' as const, label: 'ខ្មែរ', name: t('language.khmer') },
  ];

  return (
    <div
      role="group"
      aria-label={t('language.switch')}
      className={cn(
        'inline-flex items-center rounded-lg border border-edge bg-panel p-0.5 text-[12px] font-semibold',
        block && 'flex w-full',
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setLocale(opt.value)}
          aria-pressed={locale === opt.value}
          title={opt.name}
          className={cn(
            'rounded-md px-2.5 py-1.5 transition-colors',
            block && 'flex-1',
            locale === opt.value ? 'bg-primary/10 text-primary' : 'text-mute hover:text-ink',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
