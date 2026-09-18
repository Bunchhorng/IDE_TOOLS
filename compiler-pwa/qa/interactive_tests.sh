#!/usr/bin/env bash
# CodeRunner QA — interactive (live) session tests via real API
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

REG=$(curl -s -m 15 -X POST "$API/auth/register" -H 'Content-Type: application/json' -d '{"name":"QA Live","email":"live'"$RANDOM"'@test.local","password":"password123","password_confirmation":"password123"}')
TOKEN=$(echo "$REG" | jqget "['data']['token']")
AUTH="Authorization: Bearer $TOKEN"
PID=$(curl -s -m 15 -X POST "$API/projects" -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"Live"}' | jqget "['data']['id']")

make_exec() { # $1=code -> echoes exec id (queued, interactive: like the UI does)
  sleep 13
  local FID EID
  FID=$(curl -s -m 15 -X POST "$API/projects/$PID/files" -H "$AUTH" -H 'Content-Type: application/json' -d "{\"filename\":\"live$RANDOM.py\",\"language\":\"python\",\"content\":\"print(1)\"}" | jqget "['data']['id']")
  EID=$(curl -s -m 15 -X POST "$API/execute" -H "$AUTH" -H 'Content-Type: application/json' --data-binary "$(python3 - "$PID" "$FID" "$1" <<'PYEOF'
import sys, json
pid, fid, code = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
print(json.dumps({"language": "python", "project_id": pid, "file_id": fid, "code": code, "stdin": "", "interactive": True}))
PYEOF
)" | jqget "['data']['id']")
  echo "$EID"
}

poll_once() { curl -s -m 10 "$API/executions/$1/interactive" -H "$AUTH"; }

# ===== Test 1: two-input Python program, real stdin =====
EID=$(make_exec 'name = input("Enter name: ")
age = input("Enter age: ")
print("Name:", name)
print("Age:", age)')
curl -s -m 20 -X POST "$API/executions/$EID/interactive/start" -H "$AUTH" > /dev/null
sleep 2
# line 1
curl -s -m 20 -X POST "$API/executions/$EID/interactive/input" -H "$AUTH" -H 'Content-Type: application/json' \
  --data-binary '{"line":"Bunchhorng"}' > /dev/null
sleep 1.5
# line 2
curl -s -m 20 -X POST "$API/executions/$EID/interactive/input" -H "$AUTH" -H 'Content-Type: application/json' \
  --data-binary '{"line":"20"}' > /dev/null
# poll until terminal
FINAL=""
for i in $(seq 1 40); do
  sleep 1
  J=$(poll_once "$EID")
  ST=$(echo "$J" | jqget "['data']['status']")
  case "$ST" in success|runtime_error|timeout|system_error|failed) FINAL="$J"; break;; esac
done
check "live: two-input status" "success" "$(echo "$FINAL" | jqget "['data']['status']")"
# output is base64 PTY stream; decode and verify both prompts AND typed values echoed
OUT=$(echo "$FINAL" | jqget "['data']['output_b64']" | python3 -c "import sys,base64;print(base64.b64decode(sys.stdin.read()).decode('utf-8','replace'))" 2>/dev/null)
echo "$OUT" | grep -q "Enter name:" && echo "$OUT" | grep -q "Bunchhorng" && R1=ok || R1=no
check "live: prompt+echo in stream" "ok" "$R1"
echo "$OUT" | grep -q "Name: Bunchhorng" && echo "$OUT" | grep -q "Age: 20" && R2=ok || R2=no
check "live: program consumed real stdin" "ok" "$R2"

# ===== Test 2: empty line input =====
EID=$(make_exec 'a = input("A:")
b = input("B:")
print("lenA", len(a))
print("lenB", len(b))')
curl -s -m 20 -X POST "$API/executions/$EID/interactive/start" -H "$AUTH" > /dev/null
sleep 2
curl -s -m 20 -X POST "$API/executions/$EID/interactive/input" -H "$AUTH" -H 'Content-Type: application/json' --data-binary '{"line":""}' > /dev/null
sleep 1.5
curl -s -m 20 -X POST "$API/executions/$EID/interactive/input" -H "$AUTH" -H 'Content-Type: application/json' --data-binary '{"line":"ok"}' > /dev/null
FINAL=""
for i in $(seq 1 40); do
  sleep 1
  J=$(poll_once "$EID")
  ST=$(echo "$J" | jqget "['data']['status']")
  case "$ST" in success|runtime_error|timeout|system_error|failed) FINAL="$J"; break;; esac
done
OUT=$(echo "$FINAL" | jqget "['data']['output_b64']" | python3 -c "import sys,base64;print(base64.b64decode(sys.stdin.read()).decode('utf-8','replace'))" 2>/dev/null)
echo "$OUT" | grep -q "lenA 0" && echo "$OUT" | grep -q "lenB 2" && R3=ok || R3=no
check "live: empty line reaches program" "ok" "$R3"

# ===== Test 3: Ctrl+C stops infinite loop; terminal recovers =====
EID=$(make_exec 'while True:
    pass')
curl -s -m 20 -X POST "$API/executions/$EID/interactive/start" -H "$AUTH" > /dev/null
sleep 3
curl -s -m 20 -X POST "$API/executions/$EID/interactive/signal" -H "$AUTH" -H 'Content-Type: application/json' --data-binary '{"signal":"SIGINT"}' > /dev/null
FINAL=""
for i in $(seq 1 30); do
  sleep 1
  J=$(poll_once "$EID")
  ST=$(echo "$J" | jqget "['data']['status']")
  case "$ST" in timeout|stopped|failed|system_error) FINAL="$J"; break;; esac
done
ST3=$(echo "$FINAL" | jqget "['data']['status']")
check "live: SIGINT terminates loop" "ok" "$(case "$ST3" in timeout|stopped) echo ok;; *) echo "got:$ST3";; esac)"
# container gone?
NAME="coderunner-$EID"
docker inspect "$NAME" > /dev/null 2>&1 && C3=still-there || C3=gone
check "live: container cleaned up after stop" "gone" "$C3"

# ===== Test 4: repeated runs, fresh session each time =====
EID1=$(make_exec 'print("first")')
curl -s -m 20 -X POST "$API/executions/$EID1/interactive/start" -H "$AUTH" > /dev/null
for i in $(seq 1 30); do sleep 1; J=$(poll_once "$EID1"); ST=$(echo "$J" | jqget "['data']['status']"); case "$ST" in success) break;; esac; done
O1=$(echo "$J" | jqget "['data']['output_b64']" | python3 -c "import sys,base64;print(base64.b64decode(sys.stdin.read()).decode('utf-8','replace'))" 2>/dev/null)
EID2=$(make_exec 'print("second")')
curl -s -m 20 -X POST "$API/executions/$EID2/interactive/start" -H "$AUTH" > /dev/null
for i in $(seq 1 30); do sleep 1; J=$(poll_once "$EID2"); ST=$(echo "$J" | jqget "['data']['status']"); case "$ST" in success) break;; esac; done
O2=$(echo "$J" | jqget "['data']['output_b64']" | python3 -c "import sys,base64;print(base64.b64decode(sys.stdin.read()).decode('utf-8','replace'))" 2>/dev/null)
echo "$O1" | grep -q "first" && ! echo "$O1" | grep -q "second" && R4=ok || R4=no
echo "$O2" | grep -q "second" && ! echo "$O2" | grep -q "first" && R4b=ok || R4b=no
check "live: session1 isolated" "ok" "$R4"
check "live: session2 isolated" "ok" "$R4b"

curl -s -m 15 -X DELETE "$API/projects/$PID" -H "$AUTH" > /dev/null
echo "
================ RESULTS ================"
echo -e "$RESULTS"
echo "PASS=$PASS FAIL=$FAIL"
