import { Pool } from 'pg';

const connectionString = 'postgresql://farm:farm123456@127.0.0.1:6001/farm?schema=public';
const pool = new Pool({ connectionString });

const OLD_IMAGE_DOMAIN = '322d237e.r26.cpolar.top';
const NEW_IMAGE_DOMAIN = '6e615d20.r26.cpolar.top';

const OLD_API_DOMAIN = '45829cb8.r26.cpolar.top';
const NEW_API_DOMAIN = 'e361fb2.r26.cpolar.top';

async function main() {
  const client = await pool.connect();
  try {
    // 1. Get all character/text columns in all public tables
    const res = await client.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND data_type IN ('character varying', 'text')
        AND table_name NOT LIKE '_prisma%';
    `);

    console.log(`Found ${res.rows.length} text columns to inspect.`);

    let totalUpdatedRows = 0;

    for (const row of res.rows) {
      const tableName = row.table_name;
      const columnName = row.column_name;

      // Update image domain
      const imgUpdateRes = await client.query(`
        UPDATE "${tableName}"
        SET "${columnName}" = REPLACE("${columnName}", $1, $2)
        WHERE "${columnName}" LIKE $3;
      `, [OLD_IMAGE_DOMAIN, NEW_IMAGE_DOMAIN, `%${OLD_IMAGE_DOMAIN}%`]);

      if (imgUpdateRes.rowCount && imgUpdateRes.rowCount > 0) {
        console.log(`Updated ${imgUpdateRes.rowCount} rows in "${tableName}"."${columnName}" (${OLD_IMAGE_DOMAIN} -> ${NEW_IMAGE_DOMAIN})`);
        totalUpdatedRows += imgUpdateRes.rowCount;
      }

      // Update API domain
      const apiUpdateRes = await client.query(`
        UPDATE "${tableName}"
        SET "${columnName}" = REPLACE("${columnName}", $1, $2)
        WHERE "${columnName}" LIKE $3;
      `, [OLD_API_DOMAIN, NEW_API_DOMAIN, `%${OLD_API_DOMAIN}%`]);

      if (apiUpdateRes.rowCount && apiUpdateRes.rowCount > 0) {
        console.log(`Updated ${apiUpdateRes.rowCount} rows in "${tableName}"."${columnName}" (${OLD_API_DOMAIN} -> ${NEW_API_DOMAIN})`);
        totalUpdatedRows += apiUpdateRes.rowCount;
      }
    }

    console.log(`Database update complete. Total rows updated: ${totalUpdatedRows}`);
  } finally {
    client.release();
  }
}

main()
  .catch((e) => {
    console.error('Error updating database domains:', e);
  })
  .finally(async () => {
    await pool.end();
  });
