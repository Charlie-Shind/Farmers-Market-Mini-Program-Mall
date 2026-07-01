import json
import urllib.request


def http(method, path, token=None, body=None):
    url = f"http://127.0.0.1:6002/api{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode() or "null")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "null")
        except Exception:
            return e.code, None


# Get guest
s, d = http("POST", "/auth/guest", body={})
print(f"[1] guest login: status={s}")
print(f"    data.data keys: {list(d.get('data', {}).keys()) if isinstance(d, dict) else d}")
token = d["data"]["accessToken"]
print(f"    token len: {len(token)}")
print(f"    token[:30]: {token[:30]}")

# Now use the token
print(f"\n[2] use token on assets/summary")
s2, d2 = http("GET", "/app/assets/summary", token=token)
print(f"    status={s2}")
print(f"    body: {json.dumps(d2)[:200] if d2 else 'None'}")
