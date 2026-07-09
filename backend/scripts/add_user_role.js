const { Client } = require('pg');
const fs = require('fs');
const content = fs.readFileSync('/www/wwwroot/farm/backend/.env.local', 'utf8');
const m = content.match(/DATABASE_URL=(.+)/);
const url = m[1].trim();
const client = new Client({ connectionString: url });
async function main() {
  await client.connect();
  
  const current = await client.query('SELECT id, user_id, role_id, created_at FROM user_role ORDER BY id');
  fs.writeFileSync('/tmp/user_role_backup.json', JSON.stringify(current.rows, null, 2));
  console.log('Backup saved to /tmp/user_role_backup.json');
  console.log('Current user_role records:', current.rowCount);
  
  const result = await client.query(`
    INSERT INTO user_role (user_id, role_id)
    SELECT u.id, 2
    FROM "user" u
    WHERE u.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_role ur
        WHERE ur.user_id = u.id AND ur.role_id = 2
      )
  `);
  console.log('Inserted user_role records:', result.rowCount);
  
  const after = await client.query('SELECT r.code, COUNT(*) as cnt FROM user_role ur JOIN role r ON ur.role_id = r.id GROUP BY r.code');
  console.log('After fix:');
  for (const row of after.rows) {
    console.log('  ', row.code, ':', row.cnt);
  }
  
  const multiRole = await client.query('SELECT COUNT(*) as cnt FROM (SELECT user_id FROM user_role GROUP BY user_id HAVING COUNT(*) > 1) t');
  console.log('Multi-role users:', multiRole.rows[0].cnt);
  
  await client.end();
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
