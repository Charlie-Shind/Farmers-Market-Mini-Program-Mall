/**
 * Quick Zone 后端 e2e 冒烟测试
 *
 * 启动后端后运行：
 *   BACKEND_PORT=6002 npx ts-node test/quick-zone.smoke.ts
 *
 * 覆盖：
 *   1. GET /api/app/quick/flash-sale/active
 *   2. GET /api/app/quick/gift-zone/items
 *   3. GET /api/app/quick/origin-zone/items
 *   4. POST /api/app/quick/group-buy/nearby（带坐标/无坐标）
 *   5. GET /api/app/location/reverse（合法/非法坐标）
 *   6. POST /api/app/orders 响应里包含 cartCount
 */
const BASE = `http://127.0.0.1:${process.env.BACKEND_PORT ?? 6002}/api`;

interface CheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const results: CheckResult[] = [];

function record(name: string, passed: boolean, detail?: string) {
  results.push({ name, passed, detail });
  const tag = passed ? '✅' : '❌';
  const tail = detail ? ` — ${detail}` : '';
  console.log(`${tag} ${name}${tail}`);
}

async function call(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

function unwrap(payload: any): any {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return payload.data;
  }
  return payload;
}

async function checkFlashSaleActive() {
  const { status, data } = await call('GET', '/app/quick/flash-sale/active');
  if (status !== 200) {
    record('GET /app/quick/flash-sale/active 状态 200', false, `status=${status}`);
    return;
  }
  const body = unwrap(data);
  const hasWindows = Array.isArray(body?.windows);
  const hasItems = Array.isArray(body?.items);
  record(
    'GET /app/quick/flash-sale/active 返回结构',
    hasWindows && hasItems,
    `windows=${hasWindows ? body.windows.length : 'N/A'}, items=${hasItems ? body.items.length : 'N/A'}`,
  );
}

async function checkGiftZone() {
  const { status, data } = await call('GET', '/app/quick/gift-zone/items?pageSize=4');
  if (status !== 200) {
    record('GET /app/quick/gift-zone/items 状态 200', false, `status=${status}`);
    return;
  }
  const body = unwrap(data);
  const valid = body && Array.isArray(body.items) && typeof body.total === 'number';
  record(
    'GET /app/quick/gift-zone/items 返回分页结构',
    Boolean(valid),
    `total=${body?.total}, items=${body?.items?.length}`,
  );
}

async function checkOriginZone() {
  const { status, data } = await call('GET', '/app/quick/origin-zone/items?pageSize=4');
  if (status !== 200) {
    record('GET /app/quick/origin-zone/items 状态 200', false, `status=${status}`);
    return;
  }
  const body = unwrap(data);
  const valid = body && Array.isArray(body.items) && typeof body.total === 'number';
  record(
    'GET /app/quick/origin-zone/items 返回分页结构',
    Boolean(valid),
    `total=${body?.total}, items=${body?.items?.length}`,
  );

  // 断言返回字段包含 categoryId / categoryName
  const firstItem = body?.items?.[0] as Record<string, unknown> | undefined;
  const hasCatFields =
    firstItem && typeof firstItem.categoryId === 'number' && typeof firstItem.categoryName === 'string';
  record(
    'origin-zone items[0] 包含 categoryId / categoryName',
    Boolean(hasCatFields),
    `categoryId=${firstItem?.categoryId}, categoryName=${firstItem?.categoryName}`,
  );

  // 验证分类筛选：用第 1 件商品的 categoryId 做筛选，结果应全部属于该类目
  if (firstItem && typeof firstItem.categoryId === 'number') {
    const cid = firstItem.categoryId;
    const { status: s2, data: d2 } = await call('GET', `/app/quick/origin-zone/items?categoryId=${cid}&pageSize=10`);
    const b2 = unwrap(d2);
    const allSame =
      s2 === 200 && Array.isArray(b2?.items) && b2.items.length > 0 &&
      b2.items.every((i: { categoryId?: number }) => i.categoryId === cid);
    record(
      'origin-zone ?categoryId= 按类目筛选',
      Boolean(allSame),
      `cid=${cid}, items=${b2?.items?.length}`,
    );

    // categoryId 非法值不报错（返回空数组或忽略）
    const { status: s3 } = await call('GET', '/app/quick/origin-zone/items?categoryId=99999');
    record(
      'origin-zone ?categoryId=非法值 不报错',
      s3 === 200,
      `status=${s3}`,
    );
  }
}

async function checkGroupBuyNearby() {
  const noCoord = await call('POST', '/app/quick/group-buy/nearby', {});
  const body1 = unwrap(noCoord.data);
  const noCoordOk = noCoord.status === 200 && Array.isArray(body1?.groups) && body1.groups.length === 0;
  record(
    'POST /app/quick/group-buy/nearby 无坐标返回空数组',
    noCoordOk,
    `status=${noCoord.status}, groups=${body1?.groups?.length}`,
  );

  const withCoord = await call('POST', '/app/quick/group-buy/nearby', { lat: 30.5, lng: 114.3, limit: 4 });
  const body2 = unwrap(withCoord.data);
  const withCoordOk = withCoord.status === 200 && Array.isArray(body2?.groups);
  record(
    'POST /app/quick/group-buy/nearby 带坐标返回结构',
    withCoordOk,
    `groups=${body2?.groups?.length}`,
  );
}

async function checkLocationReverse() {
  const ok = await call('GET', '/app/location/reverse?lat=30.5&lng=114.3');
  const okBody = unwrap(ok.data);
  const okValid = ok.status === 200 && okBody && typeof okBody.name === 'string';
  record(
    'GET /app/location/reverse 合法坐标',
    okValid,
    `status=${ok.status}, name=${okBody?.name}, source=${okBody?.source}`,
  );

  const bad = await call('GET', '/app/location/reverse?lat=abc&lng=xyz');
  record(
    'GET /app/location/reverse 非法坐标 400',
    bad.status === 400,
    `status=${bad.status}`,
  );
}

async function checkCreateOrderCartCount() {
  // 1. 拉一个可结算的购物车 SKU
  const cartRes = await call('GET', '/app/cart');
  if (cartRes.status !== 200) {
    record('GET /app/cart 用于下单前准备', false, `status=${cartRes.status}`);
    return;
  }
  const cartBody = unwrap(cartRes.data);
  const flat = (cartBody as any[]).flatMap((g: any) => g.items || []);
  if (flat.length === 0) {
    record('POST /api/app/orders 含 cartCount 字段', false, '购物车为空，跳过');
    return;
  }
  const cartId = flat[0].cartId;
  const addrRes = await call('GET', '/app/addresses');
  const addrBody = unwrap(addrRes.data);
  const addressId = Array.isArray(addrBody) && addrBody[0] ? addrBody[0].id : null;

  const create = await call('POST', '/app/orders', {
    cartIds: [cartId],
    addressId,
    deliveryType: 1,
  });
  const createBody = unwrap(create.data);
  const hasCartCount = createBody && (createBody.cartCount === 0 || typeof createBody.cartCount === 'number');
  record(
    'POST /api/app/orders 响应包含 cartCount',
    hasCartCount,
    `cartCount=${createBody?.cartCount}, orderNo=${createBody?.orderNo}`,
  );
}

async function main() {
  console.log(`🚀 冒烟测试目标: ${BASE}\n`);

  await checkFlashSaleActive();
  await checkGiftZone();
  await checkOriginZone();
  await checkGroupBuyNearby();
  await checkLocationReverse();
  await checkCreateOrderCartCount();

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  console.log(`\n=== 汇总 ===`);
  console.log(`通过: ${passed} / ${results.length}`);
  if (failed > 0) {
    console.log(`失败: ${failed}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('冒烟测试运行异常:', err);
  process.exit(1);
});
