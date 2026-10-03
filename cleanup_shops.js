const mysql = require('mysql2/promise');

async function main() {
  // 这里配置了线上生产数据库的连接信息
  // 请直接在你的生产服务器上运行这个脚本 (node cleanup_shops.js)
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    database: 'egg_mall',
    user: 'egg_mall',
    password: 'pizEe5PLjGWJhnWL'
  });

  try {
    // 只保留这几家店铺，以及全局的 0
    const keepShopIdsWithGlobal = [0, 20, 30, 32];
    const keepPlaceholders = keepShopIdsWithGlobal.map(() => '?').join(',');

    console.log('开始物理清理其他所有店铺数据...');

    // 1. 获取需要删除的用户 ID
    const [users] = await connection.execute(
      `SELECT user_id FROM sys_user WHERE shop_id NOT IN (${keepPlaceholders})`,
      keepShopIdsWithGlobal
    );
    const userIds = users.map(u => u.user_id);
    console.log(`找到了 ${userIds.length} 个属于待删除店铺的用户，将一并物理删除。`);

    await connection.beginTransaction();

    // 2. 删除用户主表
    await connection.execute(
      `DELETE FROM sys_user WHERE shop_id NOT IN (${keepPlaceholders})`,
      keepShopIdsWithGlobal
    );
    console.log(`已物理删除除保留外所有店铺相关的 sys_user 数据`);

    // 3. 删除店铺主表
    await connection.execute(
      `DELETE FROM shop WHERE shop_id NOT IN (${keepPlaceholders})`,
      keepShopIdsWithGlobal
    );
    console.log(`已物理删除除保留外所有 shop 数据`);

    // 4. 删除店铺关联的所有配置和记录表
    const shopRelatedTables = [
      'shop_config',
      'shop_vip_level',
      'shop_pay_channel',
      'shop_task',
      'shop_h5_binding',
      'customer_relation',
      'user_recharge',
      'user_withdraw',
      'sales_recharge_address',
      'recharge_order',
      'user_operate_log'
    ];

    for (const table of shopRelatedTables) {
      try {
        await connection.execute(
          `DELETE FROM ${table} WHERE shop_id NOT IN (${keepPlaceholders})`,
          keepShopIdsWithGlobal
        );
        console.log(`已清理表: ${table}`);
      } catch (e) {
        console.warn(`清理表 ${table} 时出错 (可能表不存在): ${e.message}`);
      }
    }

    // 5. 删除关联用户的个人数据表
    if (userIds.length > 0) {
      const userRelatedTables = [
        'sys_oper_log',
        'sys_user_role',
        'user_identity',
        'user_login_log',
        'user_login_logs',
        'user_wallet',
        'user_wallet_log',
        'shop_task_user',
        'user_tasks',
        'user_commission_log',
        'user_task_income_log',
        'user_task_stat'
      ];

      const batchSize = 1000;
      for (const table of userRelatedTables) {
        try {
          for (let i = 0; i < userIds.length; i += batchSize) {
            const batch = userIds.slice(i, i + batchSize);
            const placeholders = batch.map(() => '?').join(',');
            await connection.execute(
              `DELETE FROM ${table} WHERE user_id IN (${placeholders})`,
              batch
            );
          }
          console.log(`已清理关联用户表: ${table}`);
        } catch (e) {
          console.warn(`清理关联用户表 ${table} 时出错 (可能表不存在): ${e.message}`);
        }
      }
    }

    await connection.commit();
    console.log('🎉 物理清理全部完成！只保留了店铺 20, 30, 32。');
  } catch (error) {
    await connection.rollback();
    console.error('清理失败，已回滚:', error);
  } finally {
    await connection.end();
  }
}

main();