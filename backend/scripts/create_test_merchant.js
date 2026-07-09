const { Client } = require('pg');
const fs = require('fs');
const content = fs.readFileSync('/www/wwwroot/farm/backend/.env.local', 'utf8');
const m = content.match(/DATABASE_URL=(.+)/);
const url = m[1].trim();
const client = new Client({ connectionString: url });

async function main() {
  await client.connect();
  const mobile = '18706075626';

  const userRes = await client.query('SELECT id, openid, nickname, mobile FROM "user" WHERE mobile = \$1 AND deleted_at IS NULL', [mobile]);
  if (userRes.rowCount === 0) {
    console.log('未找到用户');
    await client.end();
    return;
  }
  const user = userRes.rows[0];
  console.log('用户 id:', user.id, 'mobile:', user.mobile, 'nickname:', user.nickname || '');

  const merchantRole = await client.query('SELECT id FROM role WHERE code = \'MERCHANT\'');
  if (merchantRole.rowCount === 0) {
    console.log('MERCHANT 角色不存在');
    await client.end();
    return;
  }
  const merchantRoleId = merchantRole.rows[0].id;

  // 分配 MERCHANT 角色
  await client.query(`
    INSERT INTO user_role (user_id, role_id)
    VALUES (\$1, \$2)
    ON CONFLICT (user_id, role_id) DO NOTHING
  `, [user.id, merchantRoleId]);
  console.log('已分配 MERCHANT 角色');

  // 创建或更新商户记录
  const existingMerchant = await client.query('SELECT id FROM merchant WHERE user_id = \$1', [user.id]);
  let merchantId;
  if (existingMerchant.rowCount > 0) {
    merchantId = existingMerchant.rows[0].id;
    await client.query('UPDATE merchant SET status = 1, store_name = \$1, contact_name = \$2, contact_mobile = \$3, updated_at = NOW() WHERE id = \$4', [
      '测试商户',
      '测试联系人',
      mobile,
      merchantId,
    ]);
    console.log('已更新商户记录，merchant id:', merchantId);
  } else {
    const newMerchant = await client.query(`
      INSERT INTO merchant (user_id, store_name, contact_name, contact_mobile, status, created_at, updated_at)
      VALUES (\$1, \$2, \$3, \$4, 1, NOW(), NOW())
      RETURNING id
    `, [user.id, '测试商户', '测试联系人', mobile]);
    merchantId = newMerchant.rows[0].id;
    console.log('已创建商户记录，merchant id:', merchantId);
  }

  // 创建钱包
  await client.query(`
    INSERT INTO merchant_wallet (merchant_id, available_balance, frozen_balance, total_income, total_withdrawn, created_at, updated_at)
    VALUES (\$1, 0, 0, 0, 0, NOW(), NOW())
    ON CONFLICT (merchant_id) DO NOTHING
  `, [merchantId]);
  console.log('已创建/更新商户钱包');

  // 查询结果
  const roles = await client.query('SELECT r.code FROM user_role ur JOIN role r ON ur.role_id = r.id WHERE ur.user_id = \$1', [user.id]);
  console.log('当前角色:', roles.rows.map(r => r.code).join(', '));
  const merchant = await client.query('SELECT id, user_id, store_name, status FROM merchant WHERE id = \$1', [merchantId]);
  console.log('商户信息:', merchant.rows[0]);

  await client.end();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
