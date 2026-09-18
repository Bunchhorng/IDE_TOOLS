#!/usr/bin/env bash
set -u
API="http://localhost:80/api"
jqget() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)" 2>/dev/null; }
REG=$(curl -s -m 15 -X POST "$API/auth/register" -H 'Content-Type: application/json' -d '{"name":"FIO","email":"fio'"$RANDOM"'@test.local","password":"password123","password_confirmation":"password123"}')
TOKEN=$(echo "$REG" | jqget "['data']['token']")
AUTH="Authorization: Bearer $TOKEN"
PID=$(curl -s -m 15 -X POST "$API/projects" -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"F"}' | jqget "['data']['id']")
FID=$(curl -s -m 15 -X POST "$API/projects/$PID/files" -H "$AUTH" -H 'Content-Type: application/json' -d '{"filename":"f.c","language":"c","content":"#include <stdio.h>\nint main() { FILE *f = fopen(\"out.txt\", \"w\"); if (!f) { printf(\"NOFILE\"); return 1; } fprintf(f, \"data123\"); fclose(f); f = fopen(\"out.txt\", \"r\"); char buf[32] = {0}; fread(buf, 1, 31, f); fclose(f); printf(\"READ:%s\", buf); remove(\"out.txt\"); return 0; }"}' | jqget "['data']['id']")
EID=$(curl -s -m 15 -X POST "$API/execute" -H "$AUTH" -H 'Content-Type: application/json' -d "{\"language\":\"c\",\"project_id\":$PID,\"file_id\":$FID,\"code\":\"#include <stdio.h>\\nint main() { FILE *f = fopen(\\\"out.txt\\\", \\\"w\\\"); if (!f) { printf(\\\"NOFILE\\\"); return 1; } fprintf(f, \\\"data123\\\"); fclose(f); f = fopen(\\\"out.txt\\\", \\\"r\\\"); char buf[32] = {0}; fread(buf, 1, 31, f); fclose(f); printf(\\\"READ:%s\\\", buf); remove(\\\"out.txt\\\"); return 0; }\",\"stdin\":\"\"}" | jqget "['data']['id']")
for i in $(seq 1 60); do sleep 1; J=$(curl -s -m 10 "$API/executions/$EID" -H "$AUTH"); ST=$(echo "$J" | jqget "['data']['status']"); case "$ST" in success|*error*|timeout|failed) echo "status=$ST stdout=$(echo "$J" | jqget "['data']['stdout']")"; break;; esac; done
curl -s -m 15 -X DELETE "$API/projects/$PID" -H "$AUTH" > /dev/null
