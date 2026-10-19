const mysql = require('mysql2/promise');
require('dotenv').config();
async function run() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: 'egg-test',
      password: process.env.DB_PASSWORD,
      database: 'egg-test'
    });
    const [sysUserRows] = await connection.query('SELECT * FROM sys_user WHERE user_id = 2469 OR username = "2469" OR phone = "2469"');
    console.log("User 2469 check:", sysUserRows);
    const [wallets] = await connection.query('SELECT * FROM user_wallet WHERE user_id = 2469');
    console.log("user_wallet:", wallets);
    const [tasks] = await connection.query('SELECT * FROM shop_task_user_item_progress WHERE user_id = 2469');
    console.log("shop_task_user_item_progress count:", tasks.length);
    await connection.end();
  } catch (err) {
    console.error(err);
  }
}
run();