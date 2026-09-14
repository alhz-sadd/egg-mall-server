'use strict';

const { Application } = require('egg');

async function main() {
  const app = new Application({
    env: process.env.EGG_SERVER_ENV || 'local',
  });
  await app.ready();
  const ctx = app.createAnonymousContext();

  try {
    console.log('开始添加 operator_id 字段...');
    await ctx.model.query('ALTER TABLE `user_wallet_log` ADD COLUMN `operator_id` bigint(20) DEFAULT NULL COMMENT "操作人ID" AFTER `related_order_id`');
    console.log('字段添加成功！');
  } catch (error) {
    if (error.message && error.message.includes('Duplicate column name')) {
      console.log('字段已存在，忽略错误。');
    } else {
      console.error('字段添加失败：', error);
    }
  }

  await app.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
