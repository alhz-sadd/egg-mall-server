const { Sequelize } = require('sequelize');

// 使用项目实际配置，如果是开发环境，通常密码可能是空的或者 root
const sequelize = new Sequelize('egg_mall', 'root', '', {
  host: '127.0.0.1',
  port: 3306,
  dialect: 'mysql',
});

async function run() {
  try {
    await sequelize.query("ALTER TABLE user_login_log ADD COLUMN remark VARCHAR(256) NULL COMMENT '操作备注信息' AFTER login_result;");
    console.log('Column added successfully');
  } catch (err) {
    console.log('Error or already exists:', err.message);
  }
  process.exit(0);
}
run();
