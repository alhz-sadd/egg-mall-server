const mysql = require('mysql2/promise');
const config = require('./config/config.default.js')({ name: 'default' });

async function main() {
  const dbConfig = config.sequelize;
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    port: dbConfig.port,
  });

  // Query a C user
  const [ users ] = await connection.execute('SELECT * FROM sys_user WHERE user_type = 4 AND is_deleted = 0 LIMIT 1');
  if (!users.length) {
    console.log('No C user found');
    process.exit(0);
  }

  const cUser = users[0];
  console.log('C User:', cUser.user_id, cUser.username);

  // check customer_relation
  const [ relations ] = await connection.execute('SELECT * FROM customer_relation WHERE c_user_id = ? AND status = 1 AND is_deleted = 0', [ cUser.user_id ]);
  console.log('relations:', relations);

  if (relations.length > 0) {
    const spId = relations[0].salesman_user_id;
    const [ configs ] = await connection.execute('SELECT * FROM sys_salesman_config WHERE salesman_user_id = ? AND is_default = 1 AND is_deleted = 0', [ spId ]);
    console.log('configs:', configs);
  }

  // let's see if any user has customer_relation
  const [ allRelations ] = await connection.execute('SELECT * FROM customer_relation WHERE status = 1 AND is_deleted = 0 LIMIT 5');
  console.log('all active relations:', allRelations);

  if (allRelations.length > 0) {
    for (const rel of allRelations) {
      const [ configs ] = await connection.execute('SELECT * FROM sys_salesman_config WHERE salesman_user_id = ? AND is_default = 1 AND is_deleted = 0', [ rel.salesman_user_id ]);
      console.log(`configs for sp ${rel.salesman_user_id}:`, configs);
    }
  }

  // check if there is any default address in sys_salesman_config
  const [ allConfigs ] = await connection.execute('SELECT * FROM sys_salesman_config WHERE is_deleted = 0');
  console.log('all configs:', allConfigs);

  await connection.end();
}

main().catch(console.error);
