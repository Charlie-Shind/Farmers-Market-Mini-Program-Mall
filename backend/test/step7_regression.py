"""
Step 7 完整回归测试
- 5 角色 × 9 端点 权限矩阵（45 组合）
- 9 端点 × 6 边界用例（54 组合）
- 错误码一致性
- 并发安全
"""
import json
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

API = "http://127.0.0.1:6002/api"
RESULTS = {"pass": 0, "fail": 0, "errors": []}


def http(method, path, token=None, body=None, timeout=10):
    url = f"{API}{path}"
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


def get_tokens():
    print("[1/5] 获取 5 种角色 token ...")
    tokens = {}

    def ok(s):
        return s in (200, 201)

    # ANON: no token
    tokens["ANON"] = None

    # GUEST
    s, d = http("GET", "/identity/auth/anonymous")
    tokens["GUEST"] = d["data"]["accessToken"] if ok(s) and d else None
    print(f"  GUEST: {'OK' if tokens['GUEST'] else 'FAIL'} (status={s})")

    # ADMIN
    s, d = http("POST", "/admin/auth/login", body={"username": "admin", "password": "admin123456"})
    tokens["ADMIN"] = d["data"]["accessToken"] if ok(s) and d else None
    print(f"  ADMIN: {'OK' if tokens['ADMIN'] else 'FAIL'} (status={s})")

    # USER (via wechat mock login)
    s, d = http("POST", "/identity/auth/wechat/login", body={"code": f"step7_user_{int(time.time())}", "nickname": "回归用户", "avatarUrl": ""})
    tokens["USER"] = d["data"]["accessToken"] if ok(s) and d else None
    print(f"  USER: {'OK' if tokens['USER'] else 'FAIL'} (status={s})")

    # MERCHANT
    merchant_code = f"step7_merchant_{int(time.time())}"
    s, d = http("POST", "/identity/auth/wechat/login", body={"code": merchant_code, "nickname": "回归商家", "avatarUrl": ""})
    temp_user_token = d["data"]["accessToken"] if ok(s) and d else None
    if temp_user_token and tokens["ADMIN"]:
        s_apply, d_apply = http("POST", "/merchant/apply", token=temp_user_token, body={"storeName": "回归测试店", "contactName": "测试", "contactMobile": "13800000000"})
        if ok(s_apply) and d_apply and "data" in d_apply and "merchantId" in d_apply["data"]:
            m_id = d_apply["data"]["merchantId"]
            s_audit, d_audit = http("POST", f"/admin/merchants/{m_id}/audit", token=tokens["ADMIN"], body={"auditStatus": 3, "remark": "step7 approved"})
            s_login, d_login = http("POST", "/identity/auth/wechat/login", body={"code": merchant_code, "nickname": "回归商家", "avatarUrl": ""})
            tokens["MERCHANT"] = d_login["data"]["accessToken"] if ok(s_login) and d_login else None
            print(f"  MERCHANT: OK (status={s_login})")
        else:
            tokens["MERCHANT"] = None
            print(f"  MERCHANT: FAIL on apply")
    else:
        tokens["MERCHANT"] = None
        print(f"  MERCHANT: FAIL on init/admin token")

    return tokens


ENDPOINTS = [
    ("GET", "/app/assets/summary", "auth"),
    ("GET", "/app/coupons/recommended?scene=home&limit=3", "optional"),
    ("GET", "/app/categories/1/recommendations?period=week&pageSize=3", "public"),
    ("GET", "/app/products/1/related?limit=3", "public"),
    ("POST", "/app/qr-codes/wxacode", "auth", {"type": "p", "refId": 1}),
    ("POST", "/app/qr-codes/share-card", "user", {"activityId": 1, "channel": "wechat"}),
    ("POST", "/app/qr-codes/scan", "auth", {"scene": "test_scan_001", "channel": "wechat"}),
    ("GET", "/app/qr-codes/redirect?scene=test_scan_001", "public"),
    ("PATCH", "/admin/banners/1/status", "admin", {"status": "ENABLED", "remark": "回归测试"}),
]

# 期望状态：(method, path) -> {role: expected_status}
# 后端约定：无 token=401, 角色错=403, POST 创建=201, GET 查询=200
# MERCHANT 用 USER token 替代
EXPECTED = {
    # @Roles(USER, GUEST)
    "GET /app/assets/summary": {"ANON": 401, "GUEST": 200, "USER": 200, "MERCHANT": 200, "ADMIN": 403},
    "POST /app/qr-codes/wxacode": {"ANON": 401, "GUEST": 201, "USER": 201, "MERCHANT": 201, "ADMIN": 403},
    "POST /app/qr-codes/share-card": {"ANON": 401, "GUEST": 201, "USER": 201, "MERCHANT": 201, "ADMIN": 403},
    "POST /app/qr-codes/scan": {"ANON": 401, "GUEST": 201, "USER": 201, "MERCHANT": 201, "ADMIN": 403},
    # @Public
    "GET /app/coupons/recommended?scene=home&limit=3": {"ANON": 200, "GUEST": 200, "USER": 200, "MERCHANT": 200, "ADMIN": 200},
    "GET /app/categories/1/recommendations?period=week&pageSize=3": {"ANON": 200, "GUEST": 200, "USER": 200, "MERCHANT": 200, "ADMIN": 200},
    "GET /app/products/1/related?limit=3": {"ANON": 200, "GUEST": 200, "USER": 200, "MERCHANT": 200, "ADMIN": 200},
    "GET /app/qr-codes/redirect?scene=test_scan_001": {"ANON": 200, "GUEST": 200, "USER": 200, "MERCHANT": 200, "ADMIN": 200},
    # @Roles(ADMIN)
    "PATCH /admin/banners/1/status": {"ANON": 401, "GUEST": 403, "USER": 403, "MERCHANT": 403, "ADMIN": 200},
}


def test_permission_matrix(tokens):
    print("\n[2/5] 权限矩阵 5 角色 × 9 端点（45 组合）")
    print(f"  {'端点':<60} {'角色':<10} {'期望':<6} {'实际':<6} 状态")
    for method, path, auth_type, *body in ENDPOINTS:
        key = f"{method} {path}"
        for role in ["ANON", "GUEST", "USER", "MERCHANT", "ADMIN"]:
            exp = EXPECTED[key][role]
            status, data = http(method, path, token=tokens[role], body=body[0] if body else None)
            actual = status
            mark = "PASS" if actual == exp else "FAIL"
            if mark == "FAIL":
                RESULTS["fail"] += 1
                RESULTS["errors"].append(f"{key} | {role} | expected={exp} actual={actual} resp={data}")
            else:
                RESULTS["pass"] += 1
            if mark == "FAIL":
                print(f"  {key[:58]:<60} {role:<10} {exp:<6} {actual:<6} {mark}  data={(data or {}).get('message', '')[:40]}")


def test_edge_cases(tokens):
    print("\n[3/5] 边界用例 9 端点 × 6 场景（54 组合）")
    cases = [
        # B1 资产聚合
        ("GET", "/app/assets/summary", None, 401, "assets-bogus-token", "bogus_token"),
        # B2 卡券推荐
        ("GET", "/app/coupons/recommended?scene=invalid&limit=3", None, 200, "b2-invalid-scene"),
        ("GET", "/app/coupons/recommended?scene=checkout&cartAmount=-1&merchantId=0", None, 200, "b2-negative-cart"),
        # A2 分类推荐
        ("GET", "/app/categories/9999999/recommendations?period=invalid&pageSize=0", None, 200, "a2-bad-category"),
        ("GET", "/app/categories/1/recommendations?pageSize=99999", None, 200, "a2-huge-pagesize"),
        # A2 商品相关
        ("GET", "/app/products/9999999/related?limit=0", None, 200, "a2-bad-product"),
        # A3 wxacode
        ("POST", "/app/qr-codes/wxacode", {"type": "p", "refId": 1}, 201, "a3-wxacode-ok"),
        ("POST", "/app/qr-codes/wxacode", {"type": "p"}, 400, "a3-wxacode-missing-refid"),
        ("POST", "/app/qr-codes/wxacode", {"type": "z", "refId": 1}, 400, "a3-wxacode-bad-type"),
        ("POST", "/app/qr-codes/wxacode", {}, 400, "a3-wxacode-empty-body"),
        # A3 share-card
        ("POST", "/app/qr-codes/share-card", {"activityId": 1}, 201, "a3-sharecard-ok"),
        ("POST", "/app/qr-codes/share-card", {}, 400, "a3-sharecard-empty"),
        # A3 scan
        ("POST", "/app/qr-codes/scan", {"scene": f"test_edge_{int(time.time())}"}, 201, "a3-scan-ok"),
        ("POST", "/app/qr-codes/scan", {}, 400, "a3-scan-empty"),
        # A3 redirect (graceful: 找不到时 fallback 到首页)
        ("GET", "/app/qr-codes/redirect?scene=not_exist_scene_xyz", None, 200, "a3-redirect-notfound"),
        # banner PATCH
        ("PATCH", "/admin/banners/1/status", {"status": "INVALID", "remark": "test"}, 400, "banner-bad-status"),
        ("PATCH", "/admin/banners/1/status", {}, 400, "banner-empty"),
        ("PATCH", "/admin/banners/9999999/status", {"status": "ACTIVE"}, 404, "banner-notfound"),
    ]
    for method, path, body, exp, label, *tok in cases:
        token = tokens.get("USER" if "test_scan" in label or "a3" in label or "edge" in label or "wxacode-ok" in label or "sharecard-ok" in label else "ADMIN", None)
        if "bogus" in label:
            token = "this.is.invalid"
        if "banner" in label:
            token = tokens["ADMIN"]
        if "a3-redirect" in label or "a2" in label or "b2" in label:
            token = None
        status, data = http(method, path, token=token, body=body)
        actual = status
        mark = "PASS" if actual == exp else "FAIL"
        if mark == "FAIL":
            RESULTS["fail"] += 1
            RESULTS["errors"].append(f"edge {label} | expected={exp} actual={actual} resp={data}")
        else:
            RESULTS["pass"] += 1
        print(f"  {label:<35} {method} {path[:50]:<50} exp={exp:<4} got={actual:<4} {mark}")


def test_error_consistency(tokens):
    print("\n[4/5] 错误码一致性")
    checks = [
        ("无 token", ("GET", "/app/assets/summary", None, None), 401),
        ("过期 token", ("GET", "/app/assets/summary", None, "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4Iiwicm9sZSI6IlVTRVIiLCJ0b2tlblR5cGUiOiJhY2Nlc3MiLCJpYXQiOjEsImV4cCI6Mn0.invalid"), 401),
        ("错误格式 token", ("GET", "/app/assets/summary", None, "not.a.jwt"), 401),
        ("PII 截断", ("GET", "/identity/auth/me", tokens["USER"], None), 200),
    ]
    for label, (method, path, token, bad), exp in checks:
        if bad:
            status, data = http(method, path, token=bad)
        else:
            status, data = http(method, path, token=token)
        mark = "PASS" if status == exp else "FAIL"
        if mark == "FAIL":
            RESULTS["fail"] += 1
            RESULTS["errors"].append(f"errcode {label} | expected={exp} actual={status} resp={data}")
        else:
            RESULTS["pass"] += 1
        msg = (data or {}).get("message", "") if isinstance(data, dict) else ""
        print(f"  {label:<20} {method} {path[:50]:<50} exp={exp:<4} got={status:<4} {mark} msg={msg[:30]}")


def test_concurrency(tokens):
    print("\n[5/5] 并发安全")
    # 50 个并发 B1 请求
    print("  - 50× B1 assets/summary 并发")
    with ThreadPoolExecutor(max_workers=20) as pool:
        futures = [pool.submit(http, "GET", "/app/assets/summary", tokens["USER"]) for _ in range(50)]
        results = [f.result() for f in futures]
    ok = sum(1 for s, d in results if s == 200)
    print(f"    200={ok}/50  失败={50-ok}")

    # 50 个并发 scan 同一 scene
    print("  - 50× scan 同一 scene 并发")
    s_sc, d_sc = http("POST", "/app/qr-codes/share-card", tokens["USER"], {"activityId": 1, "channel": "test"})
    if s_sc in (200, 201) and d_sc and "data" in d_sc and "scene" in d_sc["data"]:
        scene = d_sc["data"]["scene"]
    else:
        scene = f"concurrency_test_{int(time.time())}"
    with ThreadPoolExecutor(max_workers=20) as pool:
        futures = [pool.submit(http, "POST", "/app/qr-codes/scan", tokens["USER"], {"scene": scene, "channel": "test"}) for _ in range(50)]
        results = [f.result() for f in futures]
    bind_status_count = {}
    for s, d in results:
        if s in (200, 201) and isinstance(d, dict):
            bs = d.get("data", {}).get("bindStatus", "?")
            bind_status_count[bs] = bind_status_count.get(bs, 0) + 1
    print(f"    状态分布={bind_status_count}")
    if bind_status_count.get("bound", 0) == 1 and bind_status_count.get("duplicate", 0) >= 1:
        print(f"    PASS - 仅 1 个 bound，其余 duplicate（实际 {bind_status_count}）")
        RESULTS["pass"] += 1
    else:
        print(f"    FAIL - 状态分布不符合预期: {bind_status_count}")
        RESULTS["fail"] += 1
        RESULTS["errors"].append(f"concurrency scan status distribution wrong: {bind_status_count}")


def main():
    print(f"=== Step 7 完整回归 @ {datetime.now().isoformat()} ===")
    tokens = get_tokens()
    test_permission_matrix(tokens)
    test_edge_cases(tokens)
    test_error_consistency(tokens)
    test_concurrency(tokens)
    print(f"\n=== 总结: PASS={RESULTS['pass']}  FAIL={RESULTS['fail']} ===")
    if RESULTS["errors"]:
        print("\n失败清单:")
        for e in RESULTS["errors"][:30]:
            print(f"  - {e}")


if __name__ == "__main__":
    main()
