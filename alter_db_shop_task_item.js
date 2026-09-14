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

    console.log('Adding new columns to shop_task_item...');

    // Add rule_type
    try {
      await sequelize.query('ALTER TABLE `shop_task_item` ADD COLUMN `rule_type` TINYINT DEFAULT NULL COMMENT "规则类型：1=智能匹配，2=手动匹配" AFTER `is_lucky_order`');
      console.log('Column rule_type added successfully.');
    } catch (error) {
      if (error.message && error.message.includes('Duplicate column name')) {
        console.log('Column rule_type already exists.');
      } else {
        console.error('Unable to add column rule_type:', error);
      }
    }

    // Add goods_title
    try {
      await sequelize.query('ALTER TABLE `shop_task_item` ADD COLUMN `goods_title` VARCHAR(255) DEFAULT NULL COMMENT "商品标题" AFTER `goods_price`');
      console.log('Column goods_title added successfully.');
    } catch (error) {
      if (error.message && error.message.includes('Duplicate column name')) {
        console.log('Column goods_title already exists.');
      } else {
        console.error('Unable to add column goods_title:', error);
      }
    }

    // Add goods_id
    try {
      await sequelize.query('ALTER TABLE `shop_task_item` ADD COLUMN `goods_id` BIGINT DEFAULT NULL COMMENT "商品ID" AFTER `goods_title`');
      console.log('Column goods_id added successfully.');
    } catch (error) {
      if (error.message && error.message.includes('Duplicate column name')) {
        console.log('Column goods_id already exists.');
      } else {
        console.error('Unable to add column goods_id:', error);
      }
    }

  } catch (error) {
    console.error('Database operation failed:', error);
  } finally {
    await sequelize.close();
  }
}

main();
