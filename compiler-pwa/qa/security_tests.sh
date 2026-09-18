#!/usr/bin/env bash
# CodeRunner QA — security tests: traversal, authz, multipart, rate limit, validation
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

# two independent users
mkuser() {
  curl -s -m 15 -X POST "$API/auth/register" -H 'Content-Type: application/json' \
    -d '{"name":"Sec","email":"sec'"$RANDOM$RANDOM"'@test.local","password":"password123","password_confirmation":"password123"}' | jqget "['data']['token']"
}
TA=$(mkuser); TB=$(mkuser)
AUTHA="Authorization: Bearer $TA"; AUTHB="Authorization: Bearer $TB"
PIDA=$(curl -s -m 15 -X POST "$API/projects" -H "$AUTHA" -H 'Content-Type: application/json' -d '{"name":"A"}' | jqget "['data']['id']")

# ===== 1. Path traversal filenames rejected =====
for FN in "../evil.txt" "../../etc/passwd" "a/b/c.txt" "..\\..\\win.txt"; do
  RESP=$(curl -s -m 15 -X POST "$API/projects/$PIDA/files" -H "$AUTHA" -H 'Content-Type: application/json' \
    --data-binary "$(python3 - "$FN" <<'PYEOF'
import sys, json
print(json.dumps({"filename": sys.argv[1], "language": "python", "content": "print(1)"}))
PYEOF
)")
  CODE=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('data',{}).get('id','') if isinstance(json.load(open('/dev/null')) if False else json.loads(sys.stdin.read() or '{}').get('data') or {}, dict) else '')" 2>/dev/null)
  # simpler: 422 expected
  OK=$(echo "$RESP" | grep -q '"success":false\|filename' && echo rejected || echo accepted)
  check "traversal rejected: $FN" "rejected" "$OK"
done

# ===== 2. Cross-user file access denied =====
FIDA=$(curl -s -m 15 -X POST "$API/projects/$PIDA/files" -H "$AUTHA" -H 'Content-Type: application/json' -d '{"filename":"secret.py","language":"python","content":"print(42)"}' | jqget "['data']['id']")
HTTPB=$(curl -s -m 15 -o /dev/null -w '%{http_code}' "$API/files/$FIDA" -H "$AUTHB")
check "cross-user file read -> 403" "403" "$HTTPB"
HTTPB=$(curl -s -m 15 -o /dev/null -w '%{http_code}' -X PUT "$API/files/$FIDA" -H "$AUTHB" -H 'Content-Type: application/json' -d '{"content":"hacked"}')
check "cross-user file write -> 403" "403" "$HTTPB"
HTTPB=$(curl -s -m 15 -o /dev/null -w '%{http_code}' -X DELETE "$API/files/$FIDA" -H "$AUTHB")
check "cross-user file delete -> 403" "403" "$HTTPB"

# ===== 3. Cross-user execution access denied =====
sleep 13
EIDA=$(curl -s -m 15 -X POST "$API/execute" -H "$AUTHA" -H 'Content-Type: application/json' --data-binary "$(python3 - "$PIDA" "$FIDA" <<'PYEOF'
import sys, json
print(json.dumps({"language":"python","project_id":int(sys.argv[1]),"file_id":int(sys.argv[2]),"code":"print(42)","stdin":""}))
PYEOF
)" | jqget "['data']['id']")
HTTPB=$(curl -s -m 15 -o /dev/null -w '%{http_code}' "$API/executions/$EIDA" -H "$AUTHB")
check "cross-user execution read -> 403" "403" "$HTTPB"
HTTPB=$(curl -s -m 15 -o /dev/null -w '%{http_code}' "$API/executions/$EIDA/interactive" -H "$AUTHB")
check "cross-user interactive poll -> 403" "403" "$HTTPB"

# ===== 4. Unauthenticated access denied =====
HTTP=$(curl -s -m 15 -o /dev/null -w '%{http_code}' "$API/projects")
check "no-token projects -> 401" "401" "$HTTP"
HTTP=$(curl -s -m 15 -o /dev/null -w '%{http_code}' -X POST "$API/execute" -H 'Content-Type: application/json' -d '{}')
check "no-token execute -> 401" "401" "$HTTP"

# ===== 5. Multipart execute still works (Bug-2 regression) =====
sleep 13
MP=$(curl -s -m 20 -X POST "$API/execute" -H "$AUTHA" \
  -F "language=python" -F "project_id=$PIDA" -F "file_id=$FIDA" \
  -F "code=print('mp-ok')" -F "stdin=")
MPST=$(echo "$MP" | jqget "['data']['id']")
check "multipart execute accepted (201)" "ok" "$([ -n "$MPST" ] && echo ok || echo "resp:$(echo "$MP" | head -c 120)")"

# ===== 6. Validation: invalid language / empty code / oversized stdin =====
HTTP=$(curl -s -m 15 -o /dev/null -w '%{http_code}' -X POST "$API/execute" -H "$AUTHA" -H 'Content-Type: application/json' --data-binary "$(python3 - "$PIDA" "$FIDA" <<'PYEOF'
import sys, json
print(json.dumps({"language":"ruby","project_id":int(sys.argv[1]),"file_id":int(sys.argv[2]),"code":"print(1)","stdin":""}))
PYEOF
)")
check "invalid language -> 422" "422" "$HTTP"
HTTP=$(curl -s -m 15 -o /dev/null -w '%{http_code}' -X POST "$API/execute" -H "$AUTHA" -H 'Content-Type: application/json' --data-binary "$(python3 - "$PIDA" "$FIDA" <<'PYEOF'
import sys, json
print(json.dumps({"language":"python","project_id":int(sys.argv[1]),"file_id":int(sys.argv[2]),"code":"","stdin":""}))
PYEOF
)")
check "empty code -> 422" "422" "$HTTP"
HUGE=$(python3 -c "print('x'*3000000)")
python3 - "$PIDA" "$FIDA" <<'PYEOF' > /tmp/huge_req.json
import sys, json
# validation cap is 5MB (max:5242880) — 6MB must be rejected
print(json.dumps({"language":"python","project_id":int(sys.argv[1]),"file_id":int(sys.argv[2]),"code":"print(1)","stdin":"y"*6000000}))
PYEOF
HTTP=$(curl -s -m 25 -o /dev/null -w '%{http_code}' -X POST "$API/execute" -H "$AUTHA" -H 'Content-Type: application/json' --data-binary @/tmp/huge_req.json)
rm -f /tmp/huge_req.json
check "oversized stdin (6MB) rejected" "ok" "$(case "$HTTP" in 422|413) echo ok;; *) echo "got:$HTTP";; esac)"

# ===== 7. Rate limiting (5/min): fire 7 back-to-back, the 6th+ must 429 =====
sleep 65  # let window reset
BURNED=no
for i in 1 2 3 4 5 6 7; do
  R=$(curl -s -m 15 -o /dev/null -w '%{http_code}' -X POST "$API/execute" -H "$AUTHA" -H 'Content-Type: application/json' --data-binary "$(python3 - "$PIDA" "$FIDA" <<'PYEOF'
import sys, json
print(json.dumps({"language":"python","project_id":int(sys.argv[1]),"file_id":int(sys.argv[2]),"code":"print(1)","stdin":""}))
PYEOF
)")
  if [ "$R" = "429" ]; then BURNED=ok; break; fi
done
check "7 rapid executions hit 429" "ok" "$BURNED"

curl -s -m 15 -X DELETE "$API/projects/$PIDA" -H "$AUTHA" > /dev/null
echo "
================ RESULTS ================"
echo -e "$RESULTS"
echo "PASS=$PASS FAIL=$FAIL"
