import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';
import { cn } from '../../lib/cn';
import { TEMPLATES, getTemplateContent, type TemplateId } from '../../lib/templates';
import { LanguageIcon } from '../../components/LanguageIcon';
import { offlineService } from '../../lib/offline/service';
import { useToast } from '../../context/ToastContext';
import { useI18n, type TranslationKey } from '../../i18n';

const LANG_EXTS: Record<string, { ext: string; glyph: 'c' | 'cpp' | 'python' }> = {
  c: { ext: 'main.c', glyph: 'c' },
  cpp: { ext: 'main.cpp', glyph: 'cpp' },
  python: { ext: 'main.py', glyph: 'python' },
};

const TEMPLATE_KEYS: Record<TemplateId, { label: TranslationKey; desc: TranslationKey }> = {
  empty: { label: 'template.empty', desc: 'template.empty_desc' },
  hello: { label: 'template.hello_world', desc: 'template.hello_world_desc' },
  basic: { label: 'template.basic', desc: 'template.basic_desc' },
  competitive: { label: 'template.competitive', desc: 'template.competitive_desc' },
};

export function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [template, setTemplate] = useState<TemplateId>('hello');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filename = LANG_EXTS[language]?.ext ?? 'main.cpp';

  const preview = useMemo(
    () => (template === 'empty' ? '// Start typing your code…' : getTemplateContent(language, template)),
    [language, template],
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('new_project.name_required'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const projectResponse = await offlineService.createProject({ name: name.trim(), description: description.trim() || undefined });
      const project = projectResponse.data;
      const content = getTemplateContent(language, template);
      try {
        await offlineService.createFile(project.slug, { filename, language, content });
      } catch {
        /* file creation is optional; keep project only */
      }
      toast.success(t('toast.project_created'), `${project.name}`);
      onClose();
      navigate(`/editor/${projectResponse.data.slug}`);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('new_project.create_failed'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('new_project.title')}
      description={t('new_project.desc')}
      size="md"
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Input
          label={t('new_project.name_label')}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          placeholder={t('new_project.name_placeholder')}
          autoFocus
          error={error}
        />
        <Input
          label={t('new_project.desc_label')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('new_project.desc_placeholder')}
        />

        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink">{t('new_project.lang_label')}</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(LANG_EXTS).map(([slug, info]) => {
              const active = language === slug;
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => setLanguage(slug)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-edge bg-panel text-mute hover:border-edge-strong hover:text-ink',
                  )}
                >
                  <LanguageIcon lang={info.glyph} size="md" />
                  {slug === 'python' ? 'Python' : info.glyph === 'c' ? 'C' : 'C++'}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink">{t('new_project.template_label')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {TEMPLATES.map((tpl) => {
              const active = template === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setTemplate(tpl.id)}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-left transition-colors',
                    active
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-edge bg-panel hover:border-edge-strong',
                  )}
                >
                  <span className={cn('block text-[13px] font-medium', active ? 'text-primary' : 'text-ink')}>
                    {t(TEMPLATE_KEYS[tpl.id].label)}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-mute">{t(TEMPLATE_KEYS[tpl.id].desc)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-ink">
            <Icon name="code" size={14} className="text-faint" />
            {filename}
          </p>
          <pre className="max-h-28 overflow-hidden rounded-lg border border-edge bg-editor p-3 font-mono text-[11px] leading-relaxed text-mute">
            {preview}
          </pre>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            {t('new_project.cancel')}
          </Button>
          <Button type="submit" loading={submitting}>
            <Icon name="rocket" size={15} />
            {t('new_project.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}