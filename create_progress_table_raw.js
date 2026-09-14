const mysql = require('mysql2/promise');
const config = require('./database/config.json').development;
const tableNames = require('./app/constant/table_names');

async function run() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.host,
      user: config.username,
      password: config.password,
      database: config.database,
      port: config.port,
    });

    const createTableSql = `
      CREATE TABLE IF NOT EXISTS \`user_task_item_progress\` (
        \`id\` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
        \`user_task_id\` bigint(20) NOT NULL COMMENT '关联 user_task.id',
        \`user_id\` bigint(20) NOT NULL COMMENT '关联 sys_user.user_id',
        \`task_item_id\` bigint(20) NOT NULL COMMENT '关联 shop_task_item.item_id',
        \`order_id\` bigint(20) DEFAULT NULL COMMENT '对应生成的订单号',
        \`status\` int(11) DEFAULT '0' COMMENT '任务子项状态 0=未完成, 1=已完成, 等等',
        \`revenue\` decimal(20,5) DEFAULT '0.00000' COMMENT '该子项产生的收益',
        \`create_time\` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`update_time\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        \`is_deleted\` int(11) DEFAULT '0' COMMENT '逻辑删除：0未删除，1已删除',
        PRIMARY KEY (\`id\`),
        KEY \`idx_user_task_id\` (\`user_task_id\`),
        KEY \`idx_user_id\` (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户任务子项进度表';
    `;

    await connection.execute(createTableSql);
    console.log(`Table user_task_item_progress created successfully.`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

run();