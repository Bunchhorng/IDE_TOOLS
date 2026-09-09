export interface PromptSpec {
  /** Prompt text as the program would print it (no trailing space). */
  text: string;
  /** Number of values the input() call expects on this line. */
  count: number;
}

/**
 * Best-effort static detection of Python `input()` prompts.
 * Understands:
 *   name = input("Enter name: ")
 *   a, b = input().split()
 *   n = int(input("N: "))
 *   input()                       → no prompt
 */
export function pythonPrompts(code: string): PromptSpec[] {
  const specs: PromptSpec[] = [];
  const inputCall = /input\s*\(/g;

  for (const match of code.matchAll(inputCall)) {
    // Balance parens from the match to find the full argument list.
    let depth = 1;
    let i = match.index + match[0].length;
    while (i < code.length && depth > 0) {
      const c = code[i];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      if (depth > 0) i++;
    }
    const args = code.slice(match.index + match[0].length, i);

    // Prompt = first string literal, if any.
    const str = args.match(/(["'])(.*?)\1/);
    const text = str ? str[2] : '';

    // Count expected values: a, b = input().split() → 2
    const lineStart = code.lastIndexOf('\n', match.index) + 1;
    const lhs = code.slice(lineStart, match.index);
    const assign = lhs.match(/=\s*$/); // simple single assignment
    let count = 1;
    if (assign && /,\s*[^,]+/.test(lhs.slice(0, assign.index))) {
      count = lhs.slice(0, assign.index).split(',').filter(Boolean).length;
    }
    specs.push({ text, count });
  }
  return specs;
}

/**
 * Best-effort static detection of C `printf`/`scanf` prompts.
 * Every `scanf` consumes one or more values; the nearest preceding
 * `printf` (same line or earlier) is treated as its prompt.
 */
export function cPrompts(code: string): PromptSpec[] {
  const specs: PromptSpec[] = [];
  // Strip comments so we don't scan commented-out code.
  const src = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  const scanfs = [...src.matchAll(/\bscanf\s*\(/g)].map((m) => {
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < src.length && depth > 0) {
      const c = src[i];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      if (depth > 0) i++;
    }
    const args = src.slice(m.index + m[0].length, i);
    // %d %f %s %lf %c … count format specifiers in the format string.
    const fmt = args.match(/(["'])(.*?)\1/)?.[2] ?? '';
    const count = Math.max(1, (fmt.match(/%[a-zA-Z]/g) ?? []).length);
    // Prompt: nearest printf string literal before this scanf.
    const before = src.slice(0, m.index);
    const printfMatch = [...before.matchAll(/printf\s*\(\s*("(?:[^"\\]|\\.)*")/g)].pop();
    const text = printfMatch ? unescapeC(printfMatch[1]) : '';
    return { text, count };
  });
  specs.push(...scanfs);
  return specs;
}

/**
 * Best-effort static detection of C++ `cout` prompts and `cin` reads.
 */
export function cppPrompts(code: string): PromptSpec[] {
  const specs: PromptSpec[] = [];
  const src = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  const cins = [...src.matchAll(/\bcin\s*>>/g)].map((m) => {
    // Count variables read in this statement: cin >> a >> b;
    const stmt = src.slice(m.index, src.indexOf(';', m.index) === -1 ? m.index + 60 : src.indexOf(';', m.index));
    const count = Math.max(1, (stmt.match(/>>/g) ?? []).length);
    // Prompt: nearest cout << "..." before this cin.
    const before = src.slice(0, m.index);
    const coutMatch = [...before.matchAll(/cout\s*<<\s*"((?:[^"\\]|\\.)*)"/g)].pop();
    const text = coutMatch ? unescapeC(coutMatch[1]) : '';
    return { text, count };
  });
  specs.push(...cins);
  return specs;
}

function unescapeC(literal: string): string {
  // literal includes surrounding quotes
  const body = literal.slice(1, -1);
  return body
    .replace(/\\n/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')
    .trim();
}

/**
 * Extract expected input prompts for a program, in encounter order.
 * Returns an empty list when no reads are detected.
 */
export function detectPrompts(code: string, language: string | null | undefined): PromptSpec[] {
  if (!code) return [];
  if (language === 'python') return pythonPrompts(code);
  if (language === 'c') return cPrompts(code);
  if (language === 'cpp') return cppPrompts(code);
  return [];
}

export interface SessionSegment {
  /** 'out' = program output (may end with a prompt), 'in' = user-typed value. */
  type: 'out' | 'in';
  text: string;
}

/**
 * Interleave program stdout with the user's typed input to build a
 * terminal-style transcript: each detected prompt found in stdout is
 * followed by the corresponding input value, echoed inline — exactly
 * how a real terminal renders a session.
 */
export function buildSession(
  stdout: string,
  inputs: string[],
  prompts: PromptSpec[],
): SessionSegment[] {
  const parts: SessionSegment[] = [];
  let rest = stdout;

  inputs.forEach((input, i) => {
    const prompt = prompts[i]?.text ?? '';
    const idx = prompt ? rest.indexOf(prompt) : -1;
    if (idx >= 0) {
      // Everything up to and including the prompt is program output.
      // Pad with a space so the echoed input doesn't glue onto the prompt.
      const head = rest.slice(0, idx + prompt.length);
      parts.push({ type: 'out', text: /\s$/.test(head) ? head : `${head} ` });
      rest = rest.slice(idx + prompt.length);
    } else if (prompt) {
      // Prompt expected but not found in stdout (e.g. buffered/absent):
      // flush what we have and render the detected prompt ourselves.
      if (rest) {
        parts.push({ type: 'out', text: rest });
        rest = '';
      }
      parts.push({ type: 'out', text: `${prompt} ` });
    }
    parts.push({ type: 'in', text: input });
  });

  if (rest) parts.push({ type: 'out', text: rest });
  return parts;
}
