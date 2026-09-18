#!/usr/bin/env bash
# Manual SIGINT reproduction with verbose state dump
set -u
API="http://localhost:80/api"
jqget() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)" 2>/dev/null; }
REG=$(curl -s -m 15 -X POST "$API/auth/register" -H 'Content-Type: application/json' -d '{"name":"Sig","email":"sig'"$RANDOM"'@test.local","password":"password123","password_confirmation":"password123"}')
TOKEN=$(echo "$REG" | jqget "['data']['token']")
AUTH="Authorization: Bearer $TOKEN"
PID=$(curl -s -m 15 -X POST "$API/projects" -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"S"}' | jqget "['data']['id']")
FID=$(curl -s -m 15 -X POST "$API/projects/$PID/files" -H "$AUTH" -H 'Content-Type: application/json' -d '{"filename":"s.py","language":"python","content":"print(1)"}' | jqget "['data']['id']")
sleep 13
CODE='while True:
    pass'
EID=$(curl -s -m 15 -X POST "$API/execute" -H "$AUTH" -H 'Content-Type: application/json' --data-binary "$(python3 - "$PID" "$FID" "$CODE" <<'PYEOF'
import sys, json
pid, fid, code = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
print(json.dumps({"language": "python", "project_id": pid, "file_id": fid, "code": code, "stdin": "", "interactive": True}))
PYEOF
)" | jqget "['data']['id']")
echo "EID=$EID"
curl -s -m 20 -X POST "$API/executions/$EID/interactive/start" -H "$AUTH" > /dev/null
sleep 3
NAME="coderunner-$EID"
echo "--- container state before signal:"
docker ps --filter "name=$NAME" --format '{{.Names}} {{.Status}}'
curl -s -m 20 -X POST "$API/executions/$EID/interactive/signal" -H "$AUTH" -H 'Content-Type: application/json' --data-binary '{"signal":"SIGINT"}' -o sig.json
echo "--- signal response status:"
python3 -c "import json;d=json.load(open('sig.json'));dd=d.get('data') or {};print(dd.get('status'), dd.get('interactive_finished'), (dd.get('stderr') or '')[:120])"
sleep 3
echo "--- container state after signal:"
docker ps --filter "name=$NAME" --format '{{.Names}} {{.Status}}' ; docker ps -a --filter "name=$NAME" --format '{{.Names}} {{.Status}}'
echo "--- final poll:"
curl -s -m 10 "$API/executions/$EID/interactive" -H "$AUTH" -o final.json
python3 -c "import json,base64;d=json.load(open('final.json'));dd=d.get('data') or {};print('status:',dd.get('status'));print('finished:',dd.get('interactive_finished'));print('stream tail:',base64.b64decode(dd.get('output_b64') or '').decode('utf-8','replace')[-200:])"
echo "KEEP_CONTAINER=1 — probe manually now"
# docker ps -a --filter "name=$NAME" --format '{{.Names}} {{.Status}}' | grep -q . && docker rm -f "$NAME" > /dev/null 2>&1
curl -s -m 15 -X DELETE "$API/projects/$PID" -H "$AUTH" > /dev/null
