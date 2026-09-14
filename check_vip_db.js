const mysql = require('mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
    host: '47.238.77.10',
    user: 'egg_mall',
    password: 'pizEe5PLjGWJhnWL',
    database: 'egg_mall',
  });

  try {
    const [ rows ] = await connection.execute('DESCRIBE shop_vip_level');
    console.log('shop_vip_level structure:', JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

check();
