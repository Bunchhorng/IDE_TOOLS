export function codeNeedsInput(code: string, language: string | null | undefined): boolean {
  if (!code) return false;

  const lang = language ?? '';

  if (lang === 'python') {
    return /\binput\s*\(/.test(code) || /\breadline\s*\(/.test(code);
  }

  if (lang === 'c' || lang === 'cpp') {
    return (
      /\bscanf\s*\(/.test(code) ||
      /\bgets\s*\(/.test(code) ||
      /\bgets_s\s*\(/.test(code) ||
      /\bfgets\s*\(/.test(code) ||
      /\bcin\b\s*>>/.test(code) ||
      /\bgetline\s*\(/.test(code) ||
      /\bgetchar\s*\(/.test(code) ||
      /\bgetc\s*\(/.test(code)
    );
  }

  return false;
}