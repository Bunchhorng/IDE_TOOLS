import type { ExecutionStatus } from '../types';

export interface ErrorFix {
  /** 1-based source line the fix applies to. */
  line: number;
  /** Short English label describing what the fix does. */
  en: string;
  /** Khmer translation of the fix label. */
  km: string;
  /** Applies the fix to file content and returns the new content. */
  apply: (code: string) => string;
}

export interface ErrorExplanation {
  /** Plain-language English explanation of the most likely cause. */
  en: string;
  /** Khmer translation of the same explanation. */
  km: string;
  /** Source line the error points at, when it can be parsed from stderr. */
  line?: number;
  /** One-click fix, when the error is trivially fixable. */
  fix?: ErrorFix;
  /** Suggested follow-up action the UI can offer (e.g. focus the input row). */
  action?: 'focus-input';
}

interface Pattern {
  re: RegExp;
  en: string;
  km: string;
  /** Builds a one-click fix once the error line is known. */
  fix?: (line: number) => ErrorFix;
  /** Suggested follow-up action for the UI. */
  action?: 'focus-input';
}

/* ---------- comment-aware line editing helpers ---------- */

/** Index of a top-level `#` comment start, or -1. Quote-aware. */
function pyCommentIndex(line: string): number {
  let q: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '\\') i++;
      else if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'") q = c;
    else if (c === '#') return i;
  }
  return -1;
}

/** Index of a top-level `//` comment start, or -1. Quote-aware. */
function ccCommentIndex(line: string): number {
  let q: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '\\') i++;
      else if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'") q = c;
    else if (c === '/' && line[i + 1] === '/') return i;
  }
  return -1;
}

/** Append `suffix` to the code part of `line`, preserving any trailing comment. */
function makeSuffixFix(
  line: number,
  suffix: string,
  en: string,
  km: string,
  commentOf: (l: string) => number,
  skip: (codePart: string) => boolean,
): ErrorFix {
  return {
    line,
    en,
    km,
    apply: (code) => {
      const lines = code.split('\n');
      if (line < 1 || line > lines.length) return code;
      const raw = lines[line - 1];
      const ci = commentOf(raw);
      const codePart = (ci === -1 ? raw : raw.slice(0, ci)).trimEnd();
      const comment = ci === -1 ? '' : raw.slice(ci);
      if (!codePart.trim() || skip(codePart)) return code;
      lines[line - 1] = codePart + suffix + (comment ? ' ' + comment : '');
      return lines.join('\n');
    },
  };
}

const colonFix = (line: number) =>
  makeSuffixFix(
    line,
    ':',
    'Add the missing colon at the end of this line',
    'បន្ថែមសញ្ញា (:) ដែលបាត់នៅចុងបន្ទាត់នេះ',
    pyCommentIndex,
    (c) => c.endsWith(':'),
  );

const semicolonFix = (line: number) =>
  makeSuffixFix(
    line,
    ';',
    'Add the missing semicolon at the end of this line',
    'បន្ថែមសញ្ញា (;) ដែលបាត់នៅចុងបន្ទាត់នេះ',
    ccCommentIndex,
    (c) => /[;{}]$/.test(c) || c.startsWith('#'),
  );

const indentedBlockFix = (line: number): ErrorFix => ({
  line,
  en: 'Insert an indented `pass` block after this line',
  km: 'បញ្ចូល block `pass` ដែលចូលបន្ទាត់បន្ទាប់ពីបន្ទាត់នេះ',
  apply: (code) => {
    const lines = code.split('\n');
    if (line < 1 || line > lines.length) return code;
    const indent = lines[line - 1].match(/^\s*/)?.[0] ?? '';
    lines.splice(line, 0, `${indent}    pass`);
    return lines.join('\n');
  },
});

const smartQuoteFix: ErrorFix = {
  line: 0, // replaced by the detected line when built
  en: 'Replace curly “smart quotes” with straight quotes everywhere',
  km: 'បំលែងសញ្ញាសម្រង់កោង («smart quotes») ទៅជាសញ្ញាសម្រង់ត្រងងារទាំងអស់',
  apply: (code) =>
    code.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'"),
};

const smartQuoteFixAt = (line: number): ErrorFix => ({ ...smartQuoteFix, line });

const closingBraceFix = (line: number): ErrorFix => ({
  line,
  en: 'Append the missing closing brace `}` at the end of the file',
  km: 'បន្ថែមសញ្ញាបិទ } ដែលបាត់នៅចុងឯកសារ',
  apply: (code) => {
    const opens = (code.match(/\{/g) ?? []).length;
    const closes = (code.match(/\}/g) ?? []).length;
    if (opens <= closes) return code;
    return `${code.trimEnd()}\n}`;
  },
});

/* ---------- line detection ---------- */

function detectFamily(text: string, language?: string | null): 'python' | 'cc' | null {
  if (language === 'python' || /\.py\b/.test(text) || /File\s+"/.test(text)) return 'python';
  if (language === 'c' || language === 'cpp' || /^[^\s:]+:\d+:\d+:/m.test(text)) return 'cc';
  return null;
}

function findLine(text: string, family: 'python' | 'cc' | null): number | undefined {
  if (family !== 'cc') {
    const py = text.match(/File\s+"[^"]*",\s*line\s+(\d+)/);
    if (py) return Number(py[1]);
  }
  if (family !== 'python') {
    const cc = text.match(/^[^\s:]+:(\d+):\d+:/m);
    if (cc) return Number(cc[1]);
  }
  return undefined;
}

/** Insert $1, $2… capture groups into a hint template. */
function fill(template: string, match: RegExpMatchArray): string {
  return template.replace(/\$(\d)/g, (_, d: string) => match[Number(d)] ?? '');
}

/* ---------- patterns (more specific first; generic ones are fallbacks) ---------- */

const PYTHON_PATTERNS: Pattern[] = [
  {
    re: /SyntaxError:\s*expected ':'/,
    en: 'Missing a colon (`:`) — Python requires it at the end of `if`, `for`, `while`, `def` and `class` lines.',
    km: 'បាត់សញ្ញា (`:`) — Python តម្រូវឱ្យមានវានៅចុងបន្ទាត់ `if`, `for`, `while`, `def` និង `class`។',
    fix: colonFix,
  },
  {
    re: /SyntaxError:\s*unterminated string literal/,
    en: 'A string was left open — a closing quote is missing.',
    km: 'មាន string ដែលមិនទាន់បិទ — បាត់សញ្ញាសម្រង់បិទ។',
  },
  {
    re: /SyntaxError:\s*'(.+?)' was never closed/,
    en: 'The `$1` opened earlier was never closed.',
    km: '`$1` ដែលបានបើកពីមុនមិនទាន់បិទទេ។',
  },
  {
    re: /SyntaxError:\s*unexpected EOF while parsing/,
    en: 'The file ended earlier than expected — a bracket, quote or indented block is still open above this point.',
    km: 'ឯកសារបញ្ចប់មុនពេលកំណត់ — មាន bracket, សញ្ញាសម្រង់ ឬ block ដែលមិនទាន់បិទនៅខាងលើ។',
  },
  {
    re: /IndentationError:\s*expected an indented block/,
    en: 'After an `if`, `for`, `while`, `def` or `class` line, the next line must be indented (usually 4 spaces).',
    km: 'បន្ទាត់បន្ទាប់ពី `if`, `for`, `while`, `def` ឬ `class` ត្រូវចូលបន្ទាត់ (ជាទូទៅ 4 ដកឃ្លា)។',
    fix: indentedBlockFix,
  },
  {
    re: /SyntaxError:\s*invalid character '.{0,3}' \(U\+201[89CD]\)/,
    en: 'Curly “smart quotes” were used instead of straight quotes " \u0027. This usually happens when code is copied from a website or chat app.',
    km: 'បានប្រើសញ្ញាសម្រង់កោង ជំនួសសញ្ញាសម្រង់ត្រងងារ " \u0027 ។ ភាគច្រើនកើតឡើងពេល copy កូដពី website ឬ chat។',
    fix: smartQuoteFixAt,
  },
  {
    re: /SyntaxError:\s*expected '(.+?)'/,
    en: 'Missing `$1` near the marked position.',
    km: 'បាត់ `$1` នៅជិតតំណែងដែលសម្គាល់។',
  },
  {
    re: /SyntaxError:\s*invalid syntax/,
    en: "This line does not match Python's grammar. Look for a missing or extra symbol (`:`, `(`, `)`, `,`) on or just above this line.",
    km: 'បន្ទាត់នេះមិនត្រឹមត្រូវតាមក្បួន Python ទេ។ សូមរកមើលសញ្ញាដែលបាត់ឬលើស (`:`, `(`, `)`, `,`) នៅលើបន្ទាត់នេះឬពីមុនវា។',
  },
  {
    re: /IndentationError|TabError/,
    en: 'Indentation problem — all lines in the same block must start with the same number of spaces (usually 4), and tabs must not be mixed with spaces.',
    km: 'បញ្ហាការចូលបន្ទាត់ — រាល់បន្ទាត់ក្នុង block ដូចគ្នាត្រូវចាប់ផ្តើមដោយចំនួនដកឃ្លាដូចគ្នា (ជាទូទៅ 4) ហើយកុំលាយ tab ជាមួយដកឃ្លា។',
  },
  {
    re: /NameError:\s*name '(.+?)' is not defined/,
    en: 'The name `$1` is not defined. Check the spelling, or create/define it before this line.',
    km: 'ឈ្មោះ `$1` មិនទាន់ត្រូវបានកំណត់ទេ។ សូមពិនិត្យអក្ខរាវិរុទ្ធ ឬបង្កើត/កំណត់វាមុនបន្ទាត់នេះ។',
  },
  {
    re: /(?:ModuleNotFoundError|ImportError):\s*No module named '(.+?)'/,
    en: "Module `$1` is not available in the sandbox. Only Python's standard library can be used — external packages cannot be installed.",
    km: 'Module `$1` មិនមានក្នុង sandbox ទេ។ អាចប្រើតែ standard library របស់ Python — មិនអាចដំឡើង package ខាងក្រៅបានទេ។',
  },
  {
    re: /ZeroDivisionError/,
    en: 'The program divided by zero. Check the divisor before dividing.',
    km: 'កម្មវិធីបានចែកដោយសូន្យ។ សូមពិនិត្យចំនួនបែងមុនពេលចែក។',
  },
  {
    re: /IndexError/,
    en: "A list index was out of range — the program accessed a position beyond the list's length. Remember indexes start at 0.",
    km: 'Index លើសពីចំនួនក្នុង list — កម្មវិធីបានចូលប្រើតំណែងដែលលើសពីប្រវែង list។ ចាំថា index ចាប់ផ្តើមពី 0។',
  },
  {
    re: /KeyError:\s*'(.+?)'/,
    en: 'No key `$1` exists in the dictionary. Check the key names with .keys() or use .get().',
    km: 'មិនមាន key `$1` នៅក្នុង dictionary ទេ។ សូមពិនិត្យឈ្មោះ key ដោយ .keys() ឬប្រើ .get()។',
  },
  {
    re: /TypeError/,
    en: 'Values of incompatible types were mixed (e.g. text + number). Convert types explicitly with str(), int() or float().',
    km: 'បានលាយប្រភេទតម្លៃដែលមិនឆបគ្នា (ឧ. អត្ថបទ + លេខ)។ សូមបំលែងប្រភេទច្បាស់លាស់ដោយ str(), int() ឬ float()។',
  },
  {
    re: /ValueError/,
    en: 'The type was right but the value is invalid — e.g. int("abc").',
    km: 'ប្រភេទត្រូវ តែតម្លៃមិនត្រឹមត្រូវ — ឧ. int("abc")។',
  },
  {
    re: /RecursionError/,
    en: 'A function called itself too many times — check that the stop condition works.',
    km: 'Function បានហៅខ្លួនឯងច្រើនពេក — សូមពិនិត្យលក្ខខណ្ឌឈប់ឱ្យដំណើរការត្រឹមត្រូវ។',
  },
  {
    re: /EOFError/,
    en: 'The program waited for input but no input was provided. Type it in the input row below (❯) and press Enter, then run again.',
    km: 'កម្មវិធីបានរង់ចាំទិន្នន័យបញ្ចូល តែមិនមានទិន្នន័យទេ។ សូមសរសេរវាក្នុងជួរបញ្ចូលខាងក្រោម (❯) រួចចុច Enter បន្ទាប់មកដំណើរការម្តងទៀត។',
    action: 'focus-input',
  },
  {
    re: /AttributeError:\s*'(.+?)' object has no attribute '(.+?)'/,
    en: '`$1` has no attribute `$2` — check the type of the object or the spelling.',
    km: '`$1` មិនមាន attribute `$2` ទេ — សូមពិនិត្យប្រភេទ object ឬអក្ខរាវិរុទ្ធ។',
  },
];

const CC_PATTERNS: Pattern[] = [
  {
    re: /expected ';'/,
    en: 'Missing semicolon (`;`) — statements must end with one. Check the end of the line above the marked position.',
    km: 'បាត់សញ្ញា (`;`) — statement ត្រូវបញ្ចប់ដោយសញ្ញានេះ។ សូមពិនិត្យចុងបន្ទាត់ខាងលើតំណែងដែលសម្គាល់។',
    fix: semicolonFix,
  },
  {
    re: /'(\w+)' was not declared in this scope/,
    en: '`$1` is not declared in this scope — check the spelling, or declare it (variable/function) before use.',
    km: '`$1` មិនទាន់ត្រូវបានប្រកាស (declare) ក្នុង scope នេះទេ — សូមពិនិត្យអក្ខរាវិរុទ្ធ ឬប្រកាសវា (variable/function) មុនពេលប្រើ។',
  },
  {
    re: /'(\w+)': undeclared identifier/,
    en: '`$1` is not declared — check the spelling, or declare it before use.',
    km: '`$1` មិនទាន់ត្រូវបានប្រកាស (declare) — សូមពិនិត្យអក្ខរាវិរុទ្ធ ឬប្រកាសវាមុនពេលប្រើ។',
  },
  {
    re: /undefined reference to [`']main['`]?/,
    en: 'No `main` function was found — every C/C++ program must define `int main()`.',
    km: 'រកមិនឃើញ function `main` — កម្មវិធី C/C++ ទាំងអស់ត្រូវមាន `int main()`។',
  },
  {
    re: /undefined reference to [`']?([\w:]+)['`]?/,
    en: '`$1` is used but never defined — implement the function body.',
    km: '`$1` ត្រូវបានប្រើ ប៉ុន្តែមិនទាន់មានអត្ថន័យ (implement) — សូមសរសេរស្គេល function នេះ។',
  },
  {
    re: /No such file or directory/,
    en: 'A header file was not found — check the `#include` name and spelling. Only standard library headers are available in the sandbox.',
    km: 'រកមិនឃើញ header file — សូមពិនិត្យឈ្មោះ `#include` និងអក្ខរាវិរុទ្ធ។ Sandbox មានតែ standard library headers ប៉ុណ្ណោះ។',
  },
  {
    re: /division by zero/,
    en: 'The program divides by zero — check the divisor.',
    km: 'កម្មវិធីចែកដោយសូន្យ — សូមពិនិត្យចំនួនបែង។',
  },
  {
    re: /'(.+?)' has no member named '(.+?)'/,
    en: '`$1` has no member `$2` — check the field/method name and the type of `$1`.',
    km: '`$1` មិនមាន member `$2` ទេ — សូមពិនិត្យឈ្មោះ field/method និងប្រភេទរបស់ `$1`។',
  },
  {
    re: /expected '\}' at end of input/,
    en: 'A closing brace `}` is missing — an opening `{` was never closed.',
    km: 'បាត់សញ្ញាបិទ } — សញ្ញាបើក { មិនទាន់ត្រូវបានបិទទេ។',
    fix: closingBraceFix,
  },
  {
    re: /expected (?:primary-)?expression/,
    en: 'An expression was expected here — the statement above may be incomplete.',
    km: 'ត្រូវការ expression នៅទីនេះ — statement ពីមុនអាចមិនពេញលេញ។',
  },
  {
    re: /expected '(.+?)'/,
    en: 'Missing `$1` near the marked position.',
    km: 'បាត់ `$1` នៅជិតតំណែងដែលសម្គាល់។',
  },
];

/**
 * Detect "program starved for input" failures (currently Python's EOFError).
 * The code itself is fine — it just ran before input was provided.
 */
export function isInputStarved(stderr: string | null | undefined): boolean {
  if (!stderr) return false;
  return /EOFError|EOF when reading a line|input\(\): lost sys\.(stdin|stderr)/.test(stderr);
}

/** Fallback hints keyed by execution status (used when stderr is empty or unrecognized). */
const STATUS_HINTS: Partial<Record<ExecutionStatus, { en: string; km: string }>> = {
  timeout: {
    en: 'The program exceeded the time limit (5 s). Look for an infinite loop, or input the program is waiting for that was never provided.',
    km: 'កម្មវិធីហួសពេលកំណត់ (5 វិនាទី)។ សូមរកមើល loop ដែលមិនចប់ ឬការរង់ចាំទិន្នន័យបញ្ចូលដែលមិនបានផ្តល់។',
  },
  memory_limit: {
    en: 'The program used more memory than allowed (128 MB). Avoid very large arrays, strings or unbounded growth.',
    km: 'កម្មវិធីប្រើអង្គចងចាំលើសពីកម្រិតកំណត់ (128 MB)។ សូមចៀសវាង array ឬ string ធំពេក។',
  },
  system_error: {
    en: 'The sandbox failed to run the program. Please try again — if it keeps failing, the runtime may be temporarily unavailable.',
    km: 'Sandbox មិនអាចដំណើរការកម្មវិធីបានទេ។ សូមព្យាយាមម្តងទៀត — បើនៅតែបរាជ័យ ប្រព័ន្ធអាចមិនអាចប្រើបានបណ្តោះអាសន្ន។',
  },
  compile_error: {
    en: 'The compiler found a problem before the program could run. Fix the first error — later errors often disappear once the first one is fixed.',
    km: 'Compiler រកឃើញបញ្ហាមុនពេលដំណើរការ។ សូមកែកំហុសដំបូងសិន — កំហុសបន្ទាប់ភាគច្រើនបាត់ទៅវិញពេលកំហុសដំបូងត្រូវបានកែរួច។',
  },
  runtime_error: {
    en: 'The program crashed while running. See the raw error below for the exact cause.',
    km: 'កម្មវិធីគាំងពេលដំណើរការ។ សូមមើលកំហុសដើមខាងក្រោមសម្រាប់មូលហេតុពិតប្រាកដ។',
  },
  failed: {
    en: 'The run failed. See the raw error below for details.',
    km: 'ការដំណើរការបានបរាជ័យ។ សូមមើលកំហុសដើមខាងក្រោមសម្រាប់ព័ត៌មានលម្អិត។',
  },
};

/**
 * Turn raw compiler/runtime stderr into a friendly bilingual explanation,
 * with the error line and (when possible) a one-click fix.
 * Returns null when there is nothing useful to explain (e.g. success).
 */
export function explainError(
  stderr: string | null | undefined,
  status: ExecutionStatus | null | undefined,
  language?: string | null,
): ErrorExplanation | null {
  const text = stderr ?? '';
  const family = detectFamily(text, language);

  if (text.trim()) {
    const patterns =
      family === 'python'
        ? PYTHON_PATTERNS
        : family === 'cc'
          ? CC_PATTERNS
          : [...PYTHON_PATTERNS, ...CC_PATTERNS];
    for (const p of patterns) {
      const m = text.match(p.re);
      if (m) {
        const line = findLine(text, family);
        return {
          en: fill(p.en, m),
          km: fill(p.km, m),
          line,
          fix: p.fix && line ? p.fix(line) : undefined,
          action: p.action,
        };
      }
    }
  }

  // Stderr may be empty for segfaults — detect via message or exit code.
  if (/Segmentation fault|SIGSEGV/.test(text) || status === 'runtime_error') {
    const segfault = /Segmentation fault|SIGSEGV/.test(text);
    if (segfault) {
      const line = findLine(text, family);
      return {
        en: 'Segmentation fault — the program accessed memory it was not allowed to. Typical causes: an out-of-range array/list index, a null or uninitialized pointer, or writing past the end of a buffer.',
        km: 'Segmentation fault — កម្មវិធីបានចូលប្រើអង្គចងចាំដែលមិនអនុញ្ញាត។ មូលហេតុទូទៅ៖ index លើសពីចំនួន array/list, pointer null ឬមិនទាន់កំណត់, ឬសរសេរលើសពីប្រវែង buffer។',
        line,
      };
    }
  }

  const statusHint = status ? STATUS_HINTS[status] : undefined;
  if (statusHint) {
    return {
      en: statusHint.en,
      km: statusHint.km,
      line: text.trim() ? findLine(text, family) : undefined,
    };
  }
  return null;
}
