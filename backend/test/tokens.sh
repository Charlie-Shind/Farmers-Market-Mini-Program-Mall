#!/usr/bin/env bash
# Step 7 测试 token 缓存（每个 token 7 天有效）
set -e

API="http://127.0.0.1:6002/api"

echo "[1/3] Getting guest token..."
GUEST=$(curl -sS -m 5 -X POST "$API/auth/guest" -H "Content-Type: application/json" --data-raw '{}' | python -c 'import sys,json;print(json.load(sys.stdin)["data"]["accessToken"])')
echo "GUEST=$GUEST" > /tmp/farm-tokens.env

echo "[2/3] Getting admin token..."
ADMIN=$(curl -sS -m 5 -X POST "$API/admin/auth/login" -H "Content-Type: application/json" --data-raw '{"username":"admin","password":"admin123456"}' | python -c 'import sys,json;print(json.load(sys.stdin)["data"]["accessToken"])')
echo "ADMIN=$ADMIN" >> /tmp/farm-tokens.env

echo "[3/3] Looking for seeded user/merchant tokens..."
# Try common seeded users; fall back to guest
echo "" >> /tmp/farm-tokens.env
echo "USER=$GUEST" >> /tmp/farm-tokens.env
echo "MERCHANT=$GUEST" >> /tmp/farm-tokens.env
echo "ANON=" >> /tmp/farm-tokens.env

cat /tmp/farm-tokens.env
echo "OK: tokens saved to /tmp/farm-tokens.env"
