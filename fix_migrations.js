const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({host:'47.131.176.215', user:'egg_test', password:'CmH3WLkLLK5GM8SW', database:'egg_test'});
  
  // Insert missing migrations into SequelizeMeta
  const migrationsToInsert = [
    '20261003000000-create-shop-h5-binding.js',
    '20261003000001-add-shop-id-to-h5-tables.js',
    '20261003134205-add_telegram_fields_to_shop_config.js',
    '20261015201636-add_index_to_shop_task_user.js',
    '20261018222100-add_target_id_to_sys_oper_log.js',
    '20261028201615-add_withdraw_ticket_to_sys_user.js'
  ];

  for (const m of migrationsToInsert) {
    try {
      await conn.query('INSERT IGNORE INTO SequelizeMeta (name) VALUES (?)', [m]);
      console.log('Inserted', m);
    } catch (err) {
      console.error(err);
    }
  }

  process.exit(0);
}
run();