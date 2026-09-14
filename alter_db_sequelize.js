'use strict';

const { Sequelize } = require('sequelize');
const configLocal = require('./config/config.local.js')({ name: 'egg_mall_server' });
const configDefault = require('./config/config.default.js')({ name: 'egg_mall_server' });

// Merge DB config
const dbConfig = Object.assign({}, configDefault.sequelize, configLocal.sequelize);

async function main() {
  const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      port: dbConfig.port,
      dialect: dbConfig.dialect,
      logging: console.log,
    }
  );

  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    console.log('Adding operator_id to user_wallet_log...');
    await sequelize.query('ALTER TABLE `user_wallet_log` ADD COLUMN `operator_id` bigint(20) DEFAULT NULL COMMENT "操作人ID" AFTER `related_order_id`');
    console.log('Column operator_id added successfully.');

  } catch (error) {
    if (error.message && error.message.includes('Duplicate column name')) {
      console.log('Column operator_id already exists.');
    } else {
      console.error('Unable to add column:', error);
    }
  } finally {
    await sequelize.close();
  }
}

main();
