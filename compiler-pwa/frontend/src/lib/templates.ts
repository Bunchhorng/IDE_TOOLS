export type TemplateId = 'empty' | 'hello' | 'basic' | 'competitive';

export interface Template {
  id: TemplateId;
  label: string;
  description: string;
}

export const TEMPLATES: Template[] = [
  {
    id: 'empty',
    label: 'Empty',
    description: 'Start from a blank file',
  },
  {
    id: 'hello',
    label: 'Hello World',
    description: 'Classic first program',
  },
  {
    id: 'basic',
    label: 'Basic Program',
    description: 'Read input & print output',
  },
  {
    id: 'competitive',
    label: 'Competitive Programming',
    description: 'Fast IO + problem skeleton',
  },
];

const TEMPLATE_CONTENT: Record<string, Record<TemplateId, string>> = {
  c: {
    empty: '',
    hello:
      '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
    basic:
      '#include <stdio.h>\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    printf("You entered: %d\\n", n);\n    return 0;\n}\n',
    competitive:
      '#include <stdio.h>\n\nint main(void) {\n    int t;\n    scanf("%d", &t);\n    while (t--) {\n        // TODO: solve each test case\n    }\n    return 0;\n}\n',
  },
  cpp: {
    empty: '',
    hello:
      '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n',
    basic:
      '#include <iostream>\n\nint main() {\n    int n;\n    std::cin >> n;\n    std::cout << "You entered: " << n << std::endl;\n    return 0;\n}\n',
    competitive:
      '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    int t;\n    cin >> t;\n    while (t--) {\n        // TODO: solve each test case\n    }\n    return 0;\n}\n',
  },
  python: {
    empty: '',
    hello: 'print("Hello, World!")\n',
    basic: 'n = int(input())\nprint(f"You entered: {n}")\n',
    competitive:
      'import sys\n\n\ndef solve() -> None:\n    data = sys.stdin.buffer.read().split()\n    # TODO: solve the problem\n\n\nif __name__ == "__main__":\n    solve()\n',
  },
};

export function getTemplateContent(language: string, template: TemplateId): string {
  return TEMPLATE_CONTENT[language]?.[template] ?? '';
}