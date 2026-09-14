'use strict';

const { Sequelize } = require('sequelize');
const config = require('../config/config.default')({ env: 'development', name: 'egg-mall' });

const sequelize = new Sequelize(
  config.sequelize.database,
  config.sequelize.username,
  config.sequelize.password,
  {
    host: config.sequelize.host,
    port: config.sequelize.port,
    dialect: config.sequelize.dialect,
  },
);

async function main() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功。');

    // 检查列是否存在，如果不存在则添加
    const [ results ] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE table_name = 'user_wallet' 
      AND table_schema = '${config.sequelize.database}' 
      AND column_name = 'total_invite_income';
    `);

    if (results[0].count === 0) {
      console.log('开始添加 total_invite_income 字段...');
      await sequelize.query(`
        ALTER TABLE user_wallet 
        ADD COLUMN total_invite_income DECIMAL(18, 2) NOT NULL DEFAULT 0.00 COMMENT '累计邀请下级总收入' AFTER total_withdraw_amount;
      `);
      console.log('字段添加成功！');
    } else {
      console.log('字段 total_invite_income 已存在。');
    }

  } catch (error) {
    console.error('操作失败:', error);
  } finally {
    await sequelize.close();
  }
}

main();
