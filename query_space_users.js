const Sequelize = require('sequelize');
const config = {
  dialect: 'mysql',
  host: '47.131.176.215',
  port: 3306,
  database: 'egg_test',
  username: 'egg_test',
  password: 'CmH3WLkLLK5GM8SW',
};

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  port: config.port,
  logging: false,
});

async function run() {
  try {
    const [results] = await sequelize.query(
      "SELECT user_id, username, nickname, phone, shop_id, create_time FROM sys_user WHERE (username LIKE '% %' OR phone LIKE '% %' OR nickname LIKE ' %' OR nickname LIKE '% ') AND is_deleted = 0"
    );
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

run();
