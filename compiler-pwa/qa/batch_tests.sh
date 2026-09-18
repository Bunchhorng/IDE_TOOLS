#!/usr/bin/env bash
# CodeRunner QA suite — batch execution tests via real API
set -u
API="http://localhost:80/api"
PASS=0; FAIL=0
RESULTS=""

jqget() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)" 2>/dev/null; }

check() {
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); RESULTS="$RESULTS
PASS  $1";
  else FAIL=$((FAIL+1)); RESULTS="$RESULTS
FAIL  $1 (expected [$2] got [$3])"; fi
}

# ---------- auth ----------
REG=$(curl -s -m 15 -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d '{"name":"QA Suite","email":"qa'"$RANDOM$RANDOM"'@test.local","password":"password123","password_confirmation":"password123"}')
TOKEN=$(echo "$REG" | jqget "['data']['token']")
check "auth: token acquired" "ok" "$([ -n "$TOKEN" ] && echo ok || echo missing)"
AUTH="Authorization: Bearer $TOKEN"

# ---------- project ----------
PROJ=$(curl -s -m 15 -X POST "$API/projects" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"QA Suite Project","description":"qa"}')
PID=$(echo "$PROJ" | jqget "['data']['id']")
check "project: created" "ok" "$([ -n "$PID" ] && echo ok || echo missing)"

# helper: create file, then execute with explicit language+code (documented contract)
# Rate-limit aware: backend allows 5 executions/min per user, so pace requests
# and retry once on 429.
run_program() { # $1=lang $2=filename $3=code $4=stdin -> echoes exec_id
  local FID EXECRESP EID
  sleep 13
  FID=$(curl -s -m 15 -X POST "$API/projects/$PID/files" -H "$AUTH" -H 'Content-Type: application/json' \
    --data-binary "$(python3 - "$2" "$1" "$3" <<'PYEOF'
import sys, json
fname, lang, code = sys.argv[1], sys.argv[2], sys.argv[3]
print(json.dumps({"filename": fname, "language": lang, "content": code}))
PYEOF
)" | jqget "['data']['id']")
  if [ -z "$FID" ]; then echo ""; return; fi
  EXECRESP=$(curl -s -m 15 -X POST "$API/execute" -H "$AUTH" -H 'Content-Type: application/json' \
    --data-binary "$(python3 - "$1" "$PID" "$FID" "$3" "$4" <<'PYEOF'
import sys, json
lang, pid, fid, code, stdin = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5]
print(json.dumps({"language": lang, "project_id": pid, "file_id": fid, "code": code, "stdin": stdin}))
PYEOF
)")
  EID=$(echo "$EXECRESP" | jqget "['data']['id']")
  if [ -z "$EID" ] && echo "$EXECRESP" | grep -q 'Too many'; then
    sleep 45
    EXECRESP=$(curl -s -m 15 -X POST "$API/execute" -H "$AUTH" -H 'Content-Type: application/json' \
      --data-binary "$(python3 - "$1" "$PID" "$FID" "$3" "$4" <<'PYEOF'
import sys, json
lang, pid, fid, code, stdin = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5]
print(json.dumps({"language": lang, "project_id": pid, "file_id": fid, "code": code, "stdin": stdin}))
PYEOF
)")
    EID=$(echo "$EXECRESP" | jqget "['data']['id']")
  fi
  echo "$EID"
}

poll() { # $1=exec_id $2=timeout_s -> echoes data json
  local n=0 ST J
  if [ -z "$1" ]; then echo ""; return 1; fi
  while [ $n -lt $(($2 * 2)) ]; do
    J=$(curl -s -m 10 "$API/executions/$1" -H "$AUTH")
    ST=$(echo "$J" | jqget "['data']['status']")
    case "$ST" in
      success|compile_error|runtime_error|timeout|memory_limit|system_error|failed|stopped)
        echo "$J"; return 0;;
    esac
    sleep 0.5; n=$((n+1))
  done
  echo ""
  return 1
}

field() { echo "$1" | jqget "['data']['$2']"; }

# ---------- 1. C Hello World ----------
EID=$(run_program "c" "hello.c" '#include <stdio.h>
int main() { printf("Hello C\n"); return 0; }' "")
J=$(poll "$EID" 60)
check "C: hello status" "success" "$(field "$J" status)"
check "C: hello stdout" "Hello C" "$(field "$J" stdout)"
check "C: hello exit_code" "0" "$(field "$J" exit_code)"

# ---------- 2. C variables ----------
EID=$(run_program "c" "vars.c" '#include <stdio.h>
int main() { int a = 10; int b = 20; printf("Sum = %d\n", a + b); return 0; }' "")
J=$(poll "$EID" 60)
check "C: variables" "Sum = 30" "$(field "$J" stdout)"

# ---------- 3. C stdin (fgets + scanf) ----------
EID=$(run_program "c" "stdin.c" '#include <stdio.h>
int main() {
  char name[100]; int age;
  printf("Enter name: ");
  fgets(name, sizeof(name), stdin);
  printf("Enter age: ");
  scanf("%d", &age);
  printf("Name: %sAge: %d\n", name, age);
  return 0;
}' "Bunchhorng
20
")
J=$(poll "$EID" 60)
check "C: stdin status" "success" "$(field "$J" status)"
check "C: stdin output" "Enter name: Enter age: Name: Bunchhorng
Age: 20" "$(field "$J" stdout)"

# ---------- 4. C compile error ----------
EID=$(run_program "c" "broken.c" '#include <stdio.h>
int main() {
  printf("Hello")
  return 0;
}' "")
J=$(poll "$EID" 60)
check "C: compile error status" "compile_error" "$(field "$J" status)"
check "C: compile error mentions expected" "ok" "$(field "$J" stderr | grep -q "expected" && echo ok || echo no)"

# ---------- 5. C runtime error (div by zero) ----------
EID=$(run_program "c" "divzero.c" '#include <stdio.h>
int main() { int x = 0; printf("%d\n", 10 / x); return 0; }' "")
J=$(poll "$EID" 60)
check "C: runtime error status" "runtime_error" "$(field "$J" status)"

# ---------- 6. C infinite loop + timeout ----------
EID=$(run_program "c" "loop.c" '#include <stdio.h>
int main() { while (1) { } return 0; }' "")
J=$(poll "$EID" 90)
check "C: timeout status" "timeout" "$(field "$J" status)"

# ---------- 7. C file I/O inside sandbox ----------
EID=$(run_program "c" "fileio.c" '#include <stdio.h>
int main() {
  FILE *f = fopen("out.txt", "w");
  if (!f) { printf("NOFILE\n"); return 1; }
  fprintf(f, "data123");
  fclose(f);
  f = fopen("out.txt", "r");
  char buf[32] = {0};
  fread(buf, 1, 31, f);
  fclose(f);
  printf("READ:%s\n", buf);
  remove("out.txt");
  return 0;
}' "")
J=$(poll "$EID" 60)
check "C: file io" "READ:data123" "$(field "$J" stdout)"

# ---------- 8. C++ hello ----------
EID=$(run_program "cpp" "hello.cpp" '#include <iostream>
int main() { std::cout << "Hello C++" << std::endl; return 0; }' "")
J=$(poll "$EID" 60)
check "C++: hello" "Hello C++" "$(field "$J" stdout)"

# ---------- 9. C++ getline + cin ----------
EID=$(run_program "cpp" "getl.cpp" '#include <iostream>
#include <string>
int main() {
  std::string name; int age;
  std::cout << "Enter name: ";
  std::getline(std::cin, name);
  std::cout << "Enter age: ";
  std::cin >> age;
  std::cout << "Name: " << name << std::endl;
  std::cout << "Age: " << age << std::endl;
  return 0;
}' "Bunchhorng
20
")
J=$(poll "$EID" 60)
check "C++: getline+cin status" "success" "$(field "$J" status)"
check "C++: getline+cin output" "Enter name: Enter age: Name: Bunchhorng
Age: 20" "$(field "$J" stdout)"

# ---------- 10. C++ runtime error ----------
EID=$(run_program "cpp" "throw.cpp" '#include <iostream>
int main() { throw 42; }' "")
J=$(poll "$EID" 60)
check "C++: runtime error" "runtime_error" "$(field "$J" status)"

# ---------- 11. Python hello ----------
EID=$(run_program "python" "hello.py" 'print("Hello Python")' "")
J=$(poll "$EID" 60)
check "Py: hello" "Hello Python" "$(field "$J" stdout)"

# ---------- 12. Python stdin ----------
EID=$(run_program "python" "stdin.py" 'name = input("Enter name: ")
age = input("Enter age: ")
print("Name:", name)
print("Age:", age)' "Bunchhorng
20
")
J=$(poll "$EID" 60)
check "Py: stdin" "Enter name: Enter age: Name: Bunchhorng
Age: 20" "$(field "$J" stdout)"

# ---------- 13. Python large output ----------
EID=$(run_program "python" "large.py" 'for i in range(30000):
    print("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")' "")
J=$(poll "$EID" 90)
ST=$(field "$J" status)
check "Py: large output status" "ok" "$(case "$ST" in success|failed) echo ok;; *) echo "got:$ST";; esac)"
OUT=$(field "$J" stdout)
LEN=$(echo -n "$OUT" | wc -c)
check "Py: large output capped<=1MB" "ok" "$([ "$LEN" -le 1000000 ] && echo ok || echo "len:$LEN")"

# ---------- 14. Python runtime error ----------
EID=$(run_program "python" "div.py" 'print(10 / 0)' "")
J=$(poll "$EID" 60)
check "Py: runtime error" "runtime_error" "$(field "$J" status)"

# ---------- 15. Python syntax error ----------
EID=$(run_program "python" "syn.py" 'if True
    print("Hello")' "")
J=$(poll "$EID" 60)
check "Py: syntax error" "compile_error" "$(field "$J" status)"

# ---------- 16. Python Unicode/Khmer ----------
EID=$(run_program "python" "khmer.py" 'print("សួស្តី CodeRunner 😀")' "")
J=$(poll "$EID" 60)
check "Py: khmer+emoji roundtrip" "សួស្តី CodeRunner 😀" "$(field "$J" stdout)"

# ---------- 17. Trailing newline preservation (Bug-1 regression) ----------
EID=$(run_program "python" "trail.py" 'import sys
data = sys.stdin.buffer.read()
print("LEN", len(data))' "ab
cd
")
J=$(poll "$EID" 60)
check "Py: trailing newline kept (5+1)" "LEN 6" "$(field "$J" stdout)"

# ---------- 18. Python memory limit ----------
EID=$(run_program "python" "mem.py" 'x = bytearray(300 * 1024 * 1024)
print("allocated")' "")
J=$(poll "$EID" 90)
check "Py: memory limit" "memory_limit" "$(field "$J" status)"

# ---------- cleanup project ----------
curl -s -m 15 -X DELETE "$API/projects/$PID" -H "$AUTH" > /dev/null

echo "
================ RESULTS ================"
echo -e "$RESULTS"
echo "PASS=$PASS FAIL=$FAIL"
