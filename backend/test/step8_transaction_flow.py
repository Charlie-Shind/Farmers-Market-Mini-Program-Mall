"""
Step 8 交易闭环端到端集成测试
测试流程：
1. 获取 USER 和 MERCHANT 角色 token
2. 商家创建商品 (POST /api/merchant/products)
3. 平台管理员审核商品 (POST /api/admin/products/:productId/audit)
4. 商家上架商品 (PATCH /api/merchant/products/:productId/status)
5. 用户新增收货地址 (POST /api/app/addresses)
6. 用户添加商品至购物车 (POST /api/app/cart/items)
7. 用户预览订单 (POST /api/app/orders/preview)
8. 用户创建订单 (POST /api/app/orders)
9. 用户创建支付单，后端脚本推进已支付 (POST /api/app/payments/wechat + scenario:payment:paid)
10. 商家接受该订单 (POST /api/merchant/orders/:orderNo/accept)
11. 商家对该订单进行发货 (POST /api/merchant/orders/:orderNo/ship)
12. 用户确认收货 (POST /api/app/orders/:orderNo/confirm)
13. 用户提交评价，商家回复评价
14. 新建退款订单，商家驳回后再次同意退款
"""
import json
import os
import subprocess
import uuid
import time
import urllib.request
import urllib.error

API = "http://127.0.0.1:6002/api"
BACKEND_DIR = os.path.dirname(os.path.dirname(__file__))


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


def upload_demo_asset(filename, content, content_type="image/svg+xml"):
    boundary = f"----CodexBoundary{uuid.uuid4().hex}"
    body = []
    body.append(f"--{boundary}\r\n".encode())
    body.append(
        (
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
            f"Content-Type: {content_type}\r\n\r\n"
        ).encode()
    )
    body.append(content if isinstance(content, bytes) else content.encode())
    body.append(f"\r\n--{boundary}--\r\n".encode())

    req = urllib.request.Request(f"{API}/files/upload", data=b"".join(body), method="POST")
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    with urllib.request.urlopen(req, timeout=10) as resp:
        payload = json.loads(resp.read().decode() or "null")
    data = payload.get("data", payload)
    url = data.get("url")
    if not url:
        raise RuntimeError(f"upload failed: {payload}")
    return url


def build_demo_svg(title, subtitle, accent, footer):
    return f"""
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f7f4ec" />
      <stop offset="100%" stop-color="#eef4ea" />
    </linearGradient>
  </defs>
  <rect width="900" height="900" rx="48" fill="url(#bg)" />
  <rect x="72" y="72" width="756" height="756" rx="36" fill="#ffffff" stroke="{accent}" stroke-width="8" />
  <rect x="128" y="128" width="644" height="164" rx="24" fill="{accent}" />
  <text x="450" y="198" text-anchor="middle" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="52" font-weight="700" fill="#ffffff">{title}</text>
  <text x="450" y="246" text-anchor="middle" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="28" fill="rgba(255,255,255,0.9)">{subtitle}</text>
  <rect x="170" y="390" width="560" height="260" rx="28" fill="#f7f4ec" stroke="#dde6d7" stroke-width="4" />
  <text x="450" y="520" text-anchor="middle" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="34" font-weight="700" fill="{accent}">真实对象存储文件</text>
  <text x="450" y="570" text-anchor="middle" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="24" fill="#6f7b72">{footer}</text>
</svg>
""".strip()


def run_payment_paid(order_no):
    cmd = ["npm.cmd", "run", "scenario:payment:paid", "--", f"--orderNo={order_no}"]
    completed = subprocess.run(
        cmd,
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
        shell=False,
    )
    if completed.returncode != 0:
        return False, {
            "stdout": completed.stdout,
            "stderr": completed.stderr,
            "returncode": completed.returncode,
        }
    return True, completed.stdout


def run_test():
    print("=== Step 8 交易闭环端到端联调测试（无模拟支付）@ %s ===" % time.strftime("%Y-%m-%d %H:%M:%S"))

    # 1. 获取登录 Token
    print("\n[1/12] 获取用户和商户的鉴权令牌...")
    
    # ADMIN
    s, d = http("POST", "/admin/auth/login", body={"username": "admin", "password": "admin123456"})
    if s not in (200, 201) or not d or "accessToken" not in d.get("data", {}):
        print("  FAIL: ADMIN 登录失败")
        return False
    admin_token = d["data"]["accessToken"]
    print("  ADMIN Token: OK")

    # USER
    user_code = f"step8_user_{int(time.time())}"
    s, d = http("POST", "/identity/auth/wechat/login", body={"code": user_code, "nickname": "交易买家", "avatarUrl": ""})
    if s not in (200, 201) or not d or "accessToken" not in d.get("data", {}):
        print("  FAIL: USER 登录失败")
        return False
    user_token = d["data"]["accessToken"]
    print("  USER Token: OK")

    # MERCHANT
    merchant_code = f"step8_merchant_{int(time.time())}"
    s, d = http("POST", "/identity/auth/wechat/login", body={"code": merchant_code, "nickname": "交易卖家", "avatarUrl": ""})
    temp_user_token = d["data"]["accessToken"] if s in (200, 201) and d else None
    if not temp_user_token:
        print("  FAIL: MERCHANT 临时注册登录失败")
        return False

    # 提交商户申请并审核通过
    s_apply, d_apply = http("POST", "/merchant/apply", token=temp_user_token, body={
        "storeName": "湾源直销示范店",
        "contactName": "张店长",
        "contactMobile": "13988889999",
        "qualifications": []
    })
    if s_apply not in (200, 201) or not d_apply or "merchantId" not in d_apply.get("data", {}):
        print("  FAIL: 商户申请提交失败 (status=%d)" % s_apply)
        return False
    m_id = d_apply["data"]["merchantId"]

    # 管理员审核商户申请
    s_audit, d_audit = http("POST", f"/admin/merchants/{m_id}/audit", token=admin_token, body={
        "auditStatus": 3,
        "remark": "E2E Merchant Approved"
    })
    if s_audit not in (200, 201):
        print("  FAIL: 管理员审核商户失败")
        return False

    # 商户重新登录获取 MERCHANT 角色
    s_login, d_login = http("POST", "/identity/auth/wechat/login", body={"code": merchant_code, "nickname": "交易卖家", "avatarUrl": ""})
    merchant_token = d_login["data"]["accessToken"]
    print("  MERCHANT Token: OK")


    # 2. 商家创建商品
    print("\n[2/12] 商家创建商品...")
    demo_cover_url = upload_demo_asset(
        "step8-tomato-cover.svg",
        build_demo_svg("商品封面", "上传后返回真实 URL", "#2C4A39", "Step 8 交易测试"),
    )
    product_body = {
        "title": "湾源秘制有机番茄",
        "subtitle": "温室无公害种植，肉多沙甜",
        "coverUrl": demo_cover_url,
        "price": "9.90",
        "originPlace": "湾源有机农业园",
        "skus": [
            {"skuName": "精品装2kg", "price": "18.80", "originalPrice": "25.00", "stock": 50}
        ]
    }
    s, d = http("POST", "/merchant/products", token=merchant_token, body=product_body)
    if s not in (200, 201) or not d or "productId" not in d.get("data", {}):
        print("  FAIL: 商家创建商品失败 (status=%d, data=%s)" % (s, d))
        return False
    product_id = d["data"]["productId"]
    print("  商品创建成功, Product ID: %d" % product_id)


    # 3. 平台管理员审核商品
    print("\n[3/12] 平台管理员审核商品...")
    s, d = http("POST", f"/admin/products/{product_id}/audit", token=admin_token, body={"auditStatus": 3, "remark": "符合规范"})
    if s not in (200, 201):
        print("  FAIL: 管理员审核商品失败 (status=%d)" % s)
        return False
    print("  管理员审核商品成功")


    # 4. 商家上架商品
    print("\n[4/12] 商家上架商品...")
    s, d = http("PATCH", f"/merchant/products/{product_id}/status", token=merchant_token, body={"status": "ON_SHELF"})
    if s not in (200, 201):
        print("  FAIL: 商家上架商品失败 (status=%d)" % s)
        return False
    
    # 验证商品是否在列表及获取 SKU ID
    s, d = http("GET", f"/app/products/{product_id}", token=user_token)
    print("  [DEBUG] GET /app/products/%d: status=%d, data=%s" % (product_id, s, d))
    if s != 200 or not d or "data" not in d or "skus" not in d["data"]:
        print("  FAIL: 获取商品详情失败")
        return False
    sku_id = d["data"]["skus"][0]["id"]
    print("  商品成功上架, SKU ID: %d" % sku_id)


    # 5. 用户新增收货地址
    print("\n[5/12] 用户新增收货地址...")
    addr_body = {
        "receiverName": "小农人",
        "receiverMobile": "13812345678",
        "province": "广东省",
        "city": "广州市",
        "district": "天河区",
        "detailAddress": "五山路381号湾源科创园"
    }
    s, d = http("POST", "/app/addresses", token=user_token, body=addr_body)
    if s not in (200, 201) or not d or "id" not in d.get("data", {}):
        print("  FAIL: 用户新增收货地址失败 (status=%d, data=%s)" % (s, d))
        return False
    address_id = d["data"]["id"]
    print("  地址新增成功, Address ID: %d" % address_id)


    # 6. 用户添加商品至购物车
    print("\n[6/12] 用户添加商品至购物车...")
    s, d = http("POST", "/app/cart/items", token=user_token, body={"skuId": sku_id, "quantity": 3})
    if s not in (200, 201) or not d or "cartId" not in d.get("data", {}):
        print("  FAIL: 添加购物车失败 (status=%d, data=%s)" % (s, d))
        return False
    cart_id = d["data"]["cartId"]
    print("  购物车添加成功, Cart ID: %d" % cart_id)


    # 7. 用户预览订单
    print("\n[7/12] 用户预览订单...")
    preview_body = {
        "cartIds": [cart_id],
        "addressId": address_id,
        "deliveryType": 1,
        "freightAmount": 8.0
    }
    s, d = http("POST", "/app/orders/preview", token=user_token, body=preview_body)
    if s not in (200, 201) or not d or "summary" not in d.get("data", {}):
        print("  FAIL: 订单预览失败 (status=%d, data=%s)" % (s, d))
        return False
    pay_amount = d["data"]["summary"]["payAmount"]
    print("  订单预览成功, 应付金额: CNY %s" % pay_amount)


    # 8. 用户创建订单
    print("\n[8/12] 用户创建订单...")
    s, d = http("POST", "/app/orders", token=user_token, body=preview_body)
    if s not in (200, 201) or not d or "orderNo" not in d.get("data", {}):
        print("  FAIL: 订单创建失败 (status=%d, data=%s)" % (s, d))
        return False
    order_no = d["data"]["orderNo"]
    child_order_no = d["data"]["childOrderNos"][0]
    print("  订单创建成功, Parent Order No: %s, Child Order No: %s" % (order_no, child_order_no))

    # 校验初始订单状态
    s, d = http("GET", f"/admin/orders/{child_order_no}", token=admin_token)
    if s != 200 or not d:
        print("  FAIL: 获取订单状态失败")
        return False
    
    order_status = d["data"]["status"]
    pay_status = d["data"]["payStatus"]
    delivery_status = d["data"]["deliveryStatus"]
    print("  [状态校验 1] orderStatus=%s, payStatus=%d, deliveryStatus=%d" % (order_status, pay_status, delivery_status))
    if order_status != "PENDING_PAY" or pay_status != 0 or delivery_status != 0:
        print("  FAIL: 初始订单状态不正确（期望 PENDING_PAY, 0, 0）")
        return False


    # 9. 创建支付单并通过后端脚本推进支付成功
    print("\n[9/14] 用户创建支付单，后端脚本推进已支付...")
    s, d = http("POST", "/app/payments/wechat", token=user_token, body={"orderNo": order_no})
    print("  [DEBUG] POST /app/payments/wechat: status=%d, data=%s" % (s, d))
    if s not in (200, 201) or not d or "data" not in d or "prepayId" not in d["data"]:
        print("  FAIL: 调起微信支付参数失败")
        return False

    paid_ok, paid_result = run_payment_paid(order_no)
    if not paid_ok:
        print("  FAIL: 支付推进脚本执行失败 (%s)" % paid_result)
        return False
    print("  支付推进脚本执行成功")

    # 校验支付后状态
    s, d = http("GET", f"/admin/orders/{child_order_no}", token=admin_token)
    order_status = d["data"]["status"]
    pay_status = d["data"]["payStatus"]
    delivery_status = d["data"]["deliveryStatus"]
    print("  [状态校验 2] orderStatus=%s, payStatus=%d, deliveryStatus=%d" % (order_status, pay_status, delivery_status))
    if order_status != "PENDING_PAY" or pay_status != 1 or delivery_status != 0:
        print("  FAIL: 支付后订单状态不正确（期望 PENDING_PAY, 1, 0）")
        return False


    # 10. 商家接受该订单
    print("\n[10/14] 商家接受该订单...")
    s, d = http("POST", f"/merchant/orders/{child_order_no}/accept", token=merchant_token)
    if s not in (200, 201):
        print("  FAIL: 商家接单失败 (status=%d, data=%s)" % (s, d))
        return False

    # 校验接单后状态
    s, d = http("GET", f"/admin/orders/{child_order_no}", token=admin_token)
    order_status = d["data"]["status"]
    pay_status = d["data"]["payStatus"]
    delivery_status = d["data"]["deliveryStatus"]
    print("  [状态校验 3] orderStatus=%s, payStatus=%d, deliveryStatus=%d" % (order_status, pay_status, delivery_status))
    # 期望 orderStatus = TO_SHIP, deliveryStatus = 1 (待发货)
    if order_status != "TO_SHIP" or pay_status != 1 or delivery_status != 1:
        print("  FAIL: 商家接单后状态不正确（期望 TO_SHIP, 1, 1）")
        return False


    # 11. 商家对该订单进行发货
    print("\n[11/14] 商家对该订单进行发货...")
    ship_body = {
        "trackingNo": "SF88886666",
        "logisticsCompany": "顺丰冷链"
    }
    s, d = http("POST", f"/merchant/orders/{child_order_no}/ship", token=merchant_token, body=ship_body)
    if s not in (200, 201):
        print("  FAIL: 商家发货失败 (status=%d, data=%s)" % (s, d))
        return False

    # 校验发货后状态
    s, d = http("GET", f"/admin/orders/{child_order_no}", token=admin_token)
    order_status = d["data"]["status"]
    pay_status = d["data"]["payStatus"]
    delivery_status = d["data"]["deliveryStatus"]
    print("  [状态校验 4] orderStatus=%s, payStatus=%d, deliveryStatus=%d" % (order_status, pay_status, delivery_status))
    # 期望 orderStatus = TO_SHIP, deliveryStatus = 2 (已发货/待收货)
    if order_status != "TO_SHIP" or pay_status != 1 or delivery_status != 2:
        print("  FAIL: 商家发货后状态不正确（期望 TO_SHIP, 1, 2）")
        return False


    # 12. 用户确认收货
    print("\n[12/14] 用户确认收货...")
    s, d = http("POST", f"/app/orders/{child_order_no}/confirm", token=user_token)
    if s not in (200, 201):
        print("  FAIL: 用户确认收货失败 (status=%d, data=%s)" % (s, d))
        return False

    # 校验最终完成状态
    s, d = http("GET", f"/admin/orders/{child_order_no}", token=admin_token)
    order_status = d["data"]["status"]
    pay_status = d["data"]["payStatus"]
    delivery_status = d["data"]["deliveryStatus"]
    print("  [状态校验 5] orderStatus=%s, payStatus=%d, deliveryStatus=%d" % (order_status, pay_status, delivery_status))
    # 期望 orderStatus = COMPLETED, deliveryStatus = 2
    if order_status != "COMPLETED" or pay_status != 1 or delivery_status != 2:
        print("  FAIL: 用户确认收货后状态不正确（期望 COMPLETED, 1, 2）")
        return False

    # 获取 orderItemId 用于评价
    order_item_id = d["data"]["items"][0]["orderItemId"]

    # 13. 用户提交评价，商家回复评价
    print("\n[13/14] 用户提交评价，商家回复评价...")
    review_body = {
        "reviews": [
            {
                "orderItemId": order_item_id,
                "rating": 5,
                "content": "商品新鲜，发货很快，包装也不错。",
                "images": []
            }
        ]
    }
    s, d = http("POST", f"/app/orders/{child_order_no}/reviews", token=user_token, body=review_body)
    if s not in (200, 201):
        print("  FAIL: 用户提交评价失败 (status=%d, data=%s)" % (s, d))
        return False

    s, d = http("GET", "/merchant/reviews?pageSize=10", token=merchant_token)
    if s != 200 or not d or "data" not in d or "items" not in d["data"] or not d["data"]["items"]:
        print("  FAIL: 商家读取评价列表失败 (status=%d, data=%s)" % (s, d))
        return False
    review_id = d["data"]["items"][0]["id"]
    s, d = http("POST", f"/merchant/reviews/{review_id}/reply", token=merchant_token, body={
        "replyContent": "感谢您的支持，我们会继续保证品质。"
    })
    if s not in (200, 201):
        print("  FAIL: 商家回复评价失败 (status=%d, data=%s)" % (s, d))
        return False
    print("  评价提交与回复成功, Review ID: %s" % review_id)

    # 14. 新建退款订单并完成退款支线
    print("\n[14/14] 新建退款订单并完成退款支线...")
    s, d = http("POST", "/app/cart/items", token=user_token, body={"skuId": sku_id, "quantity": 1})
    if s not in (200, 201) or not d or "cartId" not in d.get("data", {}):
        print("  FAIL: 退款订单添加购物车失败 (status=%d, data=%s)" % (s, d))
        return False
    refund_cart_id = d["data"]["cartId"]
    refund_preview_body = {
        "cartIds": [refund_cart_id],
        "addressId": address_id,
        "deliveryType": 1,
        "freightAmount": 8.0
    }
    s, d = http("POST", "/app/orders", token=user_token, body=refund_preview_body)
    if s not in (200, 201) or not d or "orderNo" not in d.get("data", {}):
        print("  FAIL: 退款订单创建失败 (status=%d, data=%s)" % (s, d))
        return False
    refund_parent_order_no = d["data"]["orderNo"]
    refund_child_order_no = d["data"]["childOrderNos"][0]
    print("  退款订单创建成功, Parent: %s, Child: %s" % (refund_parent_order_no, refund_child_order_no))

    s, d = http("POST", "/app/payments/wechat", token=user_token, body={"orderNo": refund_parent_order_no})
    if s not in (200, 201):
        print("  FAIL: 退款订单创建支付单失败 (status=%d, data=%s)" % (s, d))
        return False
    paid_ok, paid_result = run_payment_paid(refund_parent_order_no)
    if not paid_ok:
        print("  FAIL: 退款订单支付推进失败 (%s)" % paid_result)
        return False

    s, d = http("GET", f"/admin/orders/{refund_child_order_no}", token=admin_token)
    if s != 200 or not d:
        print("  FAIL: 读取退款订单详情失败")
        return False
    refund_order_item_id = d["data"]["items"][0]["orderItemId"]
    refund_body = {
        "orderNo": refund_child_order_no,
        "orderItemId": refund_order_item_id,
        "applyType": 1,
        "applyReason": "收到番茄有破损，申请退款"
    }
    s, d = http("POST", "/app/refunds", token=user_token, body=refund_body)
    if s not in (200, 201) or not d or "data" not in d or "refundNo" not in d["data"]:
        print("  FAIL: 用户发起退款申请失败 (status=%d, data=%s)" % (s, d))
        return False
    refund_no = d["data"]["refundNo"]
    print("  退款申请成功, Refund No: %s" % refund_no)

    # 校验退款申请后状态
    s, d = http("GET", f"/admin/orders/{refund_child_order_no}", token=admin_token)
    after_sale_status = d["data"]["afterSaleStatus"]
    print("  [状态校验 6] orderStatus=%s, refundStatus=%d" % (d["data"]["status"], after_sale_status))
    if after_sale_status != 1:
        print("  FAIL: 退款申请后售后状态不正确（期望 1）")
        return False


    print("  首次退款申请状态正确")
    s, d = http("POST", f"/merchant/refunds/{refund_no}/process", token=merchant_token, body={
        "action": "reject",
        "remark": "未提供受损图片，暂不支持退款"
    })
    if s not in (200, 201):
        print("  FAIL: 商家驳回退款失败 (status=%d, data=%s)" % (s, d))
        return False

    # 校验驳回后状态
    s, d = http("GET", f"/admin/orders/{refund_child_order_no}", token=admin_token)
    after_sale_status = d["data"]["afterSaleStatus"]
    print("  [状态校验 7] orderStatus=%s, refundStatus=%d" % (d["data"]["status"], after_sale_status))
    if after_sale_status != 4:
        print("  FAIL: 驳回后售后状态不正确（期望 4）")
        return False

    s, d = http("POST", "/app/refunds", token=user_token, body=refund_body)
    if s not in (200, 201) or not d or "data" not in d or "refundNo" not in d["data"]:
        print("  FAIL: 用户重新发起退款申请失败 (status=%d, data=%s)" % (s, d))
        return False
    new_refund_no = d["data"]["refundNo"]
    print("  重新发起退款成功, New Refund No: %s" % new_refund_no)

    # 校验重新申请后状态
    s, d = http("GET", f"/admin/orders/{refund_child_order_no}", token=admin_token)
    after_sale_status = d["data"]["afterSaleStatus"]
    print("  [状态校验 8] orderStatus=%s, refundStatus=%d" % (d["data"]["status"], after_sale_status))
    if after_sale_status != 1:
        print("  FAIL: 重新申请后售后状态不正确（期望 1）")
        return False

    s, d = http("POST", f"/merchant/refunds/{new_refund_no}/process", token=merchant_token, body={
        "action": "approve"
    })
    if s not in (200, 201):
        print("  FAIL: 商家同意退款失败 (status=%d, data=%s)" % (s, d))
        return False

    # 校验最终同意后状态
    s, d = http("GET", f"/admin/orders/{refund_child_order_no}", token=admin_token)
    after_sale_status = d["data"]["afterSaleStatus"]
    print("  [状态校验 9] orderStatus=%s, refundStatus=%d" % (d["data"]["status"], after_sale_status))
    if after_sale_status != 3:
        print("  FAIL: 同意退款后售后状态不正确（期望 3）")
        return False

    s, d = http("GET", "/merchant/wallet", token=merchant_token)
    if s != 200:
        print("  FAIL: 商家钱包读取失败 (status=%d, data=%s)" % (s, d))
        return False
    print("  商家钱包读取成功")

    available_amount = float(d["data"].get("availableAmount", "0") or 0)
    if available_amount >= 1:
        s, d = http("POST", "/merchant/withdraws", token=merchant_token, body={
            "amount": "1.00",
            "fee": "0.00",
            "remark": "E2E 提现测试"
        })
        if s not in (200, 201) or not d or "data" not in d or "withdrawNo" not in d["data"]:
            print("  FAIL: 商家提现申请失败 (status=%d, data=%s)" % (s, d))
            return False
        withdraw_no = d["data"]["withdrawNo"]
        print("  商家提现申请成功, Withdraw No: %s" % withdraw_no)

        s, d = http("GET", "/admin/withdraws?pageSize=10", token=admin_token)
        if s != 200:
            print("  FAIL: 平台读取提现列表失败 (status=%d, data=%s)" % (s, d))
            return False

        s, d = http("POST", f"/admin/withdraws/{withdraw_no}/audit", token=admin_token, body={
            "action": "approve",
            "remark": "E2E approved"
        })
        if s not in (200, 201):
            print("  FAIL: 平台审核提现失败 (status=%d, data=%s)" % (s, d))
            return False
        print("  平台审核提现成功")
    else:
        print("  商家余额不足，跳过提现审核验证")

    print("\n=== 恭喜！端到端交易与售后完整链路联调测试全部通过！ ===")
    return True


if __name__ == "__main__":
    import sys
    success = run_test()
    if not success:
        sys.exit(1)
