import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';
import { cn } from '../../lib/cn';
import { TEMPLATES, getTemplateContent, type TemplateId } from '../../lib/templates';
import { LanguageIcon } from '../../components/LanguageIcon';
import { projectService } from '../../services/projectService';
import { fileService } from '../../services/fileService';
import { useToast } from '../../context/ToastContext';

const LANG_EXTS: Record<string, { ext: string; glyph: 'c' | 'cpp' | 'python' }> = {
  c: { ext: 'main.c', glyph: 'c' },
  cpp: { ext: 'main.cpp', glyph: 'cpp' },
  python: { ext: 'main.py', glyph: 'python' },
};

export function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();

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
      setError('Give your project a name.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const projectResponse = await projectService.create({ name: name.trim(), description: description.trim() || undefined });
      const project = projectResponse.data;
      const content = getTemplateContent(language, template);
      try {
        await fileService.create(project.id, { filename, language, content });
      } catch {
        /* file creation is optional; keep project only */
      }
      toast.success('Project created', `${project.name}`);
      onClose();
      navigate(`/editor/${project.id}`);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not create the project.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New project"
      description="Scaffold a project with a starter file and template."
      size="md"
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Input
          label="Project name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          placeholder="My project"
          autoFocus
          error={error}
        />
        <Input
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What are you building?"
        />

        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink">Language</p>
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
          <p className="mb-1.5 text-[13px] font-medium text-ink">Template</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {TEMPLATES.map((t) => {
              const active = template === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-left transition-colors',
                    active
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-edge bg-panel hover:border-edge-strong',
                  )}
                >
                  <span className={cn('block text-[13px] font-medium', active ? 'text-primary' : 'text-ink')}>
                    {t.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-mute">{t.description}</span>
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
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            <Icon name="rocket" size={15} />
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
}