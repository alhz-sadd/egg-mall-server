const http = require('http');

async function main() {
  const mysql = require('mysql2/promise');
  const config = require('./config/config.default.js')({ name: 'default' });
  const dbConfig = config.sequelize;
  const connection = await mysql.createConnection({
    host: dbConfig.host || '127.0.0.1',
    user: dbConfig.username || 'root',
    password: dbConfig.password || '',
    database: dbConfig.database || 'egg_mall',
    port: dbConfig.port || 3306,
  });

  // sign a token using jwt
  const jwt = require('jsonwebtoken');
  const [ users ] = await connection.execute('SELECT * FROM sys_user WHERE user_type = 4 AND is_deleted = 0 LIMIT 1');
  if (!users.length) {
    console.log('No C user found');
    process.exit(0);
  }
  const cUser = users[0];

  // read jwt secret from config
  const token = jwt.sign(
    { userId: cUser.user_id, username: cUser.username },
    config.jwt.secret || '123456',
    { expiresIn: '1d' },
  );

  const options = {
    hostname: '127.0.0.1',
    port: 7001,
    path: '/api/mobile/recharge/sales-address',
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
    },
  };

  const req = http.request(options, res => {
    console.log('Status Code:', res.statusCode);
    let data = '';
    res.on('data', chunk => {
      data += chunk;
    });
    res.on('end', () => {
      console.log(data);
      process.exit(0);
    });
  });

  req.on('error', e => {
    console.error(`problem with request: ${e.message}`);
  });

  req.end();
}

main().catch(console.error);
