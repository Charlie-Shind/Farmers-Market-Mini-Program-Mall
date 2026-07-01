import json
import urllib.request
import urllib.error


def http(method, path, token=None, body=None, timeout=10):
    url = f"http://127.0.0.1:6002/api{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode() or "null")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "null")
        except Exception:
            return e.code, None
    except Exception as e:
        return 0, {"_transport_error": str(e)}


print("=== Get guest token ===")
s, d = http("POST", "/auth/guest", body={})
print(f"status={s}")
print(f"data keys: {list(d.keys()) if isinstance(d, dict) else type(d)}")
if isinstance(d, dict) and "data" in d:
    print(f"data.data keys: {list(d['data'].keys())}")
    print(f"token: {d['data'].get('accessToken', 'MISSING')[:50]}")
    TOKEN = d["data"]["accessToken"]
    print()
    print("=== Use guest token on assets/summary ===")
    s2, d2 = http("GET", "/app/assets/summary", token=TOKEN)
    print(f"status={s2}")
    print(f"body: {json.dumps(d2)[:300]}")
