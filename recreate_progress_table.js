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

    // 1. Drop the old table
    await connection.execute('DROP TABLE IF EXISTS `shop_task_user_item_progress`');
    console.log('Table `shop_task_user_item_progress` dropped successfully.');

    // 2. Create the new table
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS \`shop_task_user_item_progress\` (
        \`id\` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
        \`shop_task_user_id\` bigint(20) NOT NULL COMMENT '关联 shop_task_user.id',
        \`user_id\` bigint(20) NOT NULL COMMENT '关联 sys_user.user_id',
        \`task_item_id\` bigint(20) NOT NULL COMMENT '关联 shop_task_item.item_id',
        \`order_id\` varchar(64) DEFAULT NULL COMMENT '对应生成的订单号',
        \`goods_id\` bigint(20) DEFAULT NULL COMMENT '动态匹配的商品ID',
        \`goods_price\` decimal(10,2) DEFAULT NULL COMMENT '实际订单金额',
        \`goods_title\` varchar(255) DEFAULT NULL COMMENT '动态匹配的商品标题',
        \`status\` int(11) DEFAULT '0' COMMENT '任务子项状态 0=未完成, 1=已完成, 等等',
        \`revenue\` decimal(20,5) DEFAULT '0.00000' COMMENT '该子项产生的收益',
        \`is_triggered\` int(11) DEFAULT '0' COMMENT '订单是否已触发：0否 1是',
        \`is_processing\` int(11) DEFAULT '0' COMMENT '是否正在进行中：0否 1是',
        \`create_time\` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`update_time\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        \`is_deleted\` int(11) DEFAULT '0' COMMENT '逻辑删除：0未删除，1已删除',
        PRIMARY KEY (\`id\`),
        KEY \`idx_shop_task_user_id\` (\`shop_task_user_id\`),
        KEY \`idx_user_id\` (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户任务子项进度表';
    `;

    await connection.execute(createTableSql);
    console.log('Table shop_task_user_item_progress created successfully.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

run();