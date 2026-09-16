import type { Language } from '../types';

export interface LanguageMeta {
  slug: string;
  name: string;
  version: string;
  description: string;
  fileTemplate: string;
  icon: 'c' | 'cpp' | 'python';
  accent: string;
}

export const LANGUAGE_FALLBACK: LanguageMeta = {
  slug: 'cpp',
  name: 'C++',
  version: '',
  description: 'G++ compiler',
  fileTemplate: 'main.cpp',
  icon: 'cpp',
  accent: '#2563eb',
};

export function getLanguageMeta(languages: Language[], slug: string): LanguageMeta {
  const lang = languages.find((l) => l.slug === slug);
  if (!lang) return LANGUAGE_FALLBACK;
  return {
    slug: lang.slug,
    name: lang.name,
    version: lang.version,
    description: lang.compile_command
      ? `${lang.compile_command} compiler`
      : `${lang.run_command} runtime`,
    fileTemplate: lang.filename_template ?? 'main.txt',
    icon: (lang.slug === 'python' ? 'python' : lang.slug === 'c' ? 'c' : 'cpp') as LanguageMeta['icon'],
    accent: lang.slug === 'python' ? '#fbbf24' : lang.slug === 'c' ? '#38bdf8' : lang.slug === 'cpp' ? '#2563eb' : '#94a3b8',
  };
}

const EXT_ACCEPTED: Record<string, string> = {
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  py: 'python',
  pyw: 'python',
};

/** The language known to map to a filename's extension, or null when the
 *  extension isn't a code one (e.g. `.txt`, `.json`) or there is none. */
export function detectLanguage(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return EXT_ACCEPTED[ext] ?? null;
}

export function languageFromFilename(filename: string): string {
  return detectLanguage(filename) ?? 'cpp';
}

export function iconForFile(filename: string): 'c' | 'cpp' | 'python' | 'file' {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return (EXT_ACCEPTED[ext] ?? 'file') as 'c' | 'cpp' | 'python' | 'file';
}