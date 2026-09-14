const { Sequelize } = require('sequelize');
const config = require('./database/config.json').development;
const tableNames = require('./app/constant/table_names');

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  port: config.port,
});

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    const queryInterface = sequelize.getQueryInterface();
    const { BIGINT, INTEGER, DATE, DECIMAL } = Sequelize;

    await queryInterface.createTable(tableNames.USER_TASK_ITEM_PROGRESS, {
      id: {
        type: BIGINT(20),
        primaryKey: true,
        autoIncrement: true,
        comment: '主键',
      },
      user_task_id: {
        type: BIGINT(20),
        allowNull: false,
        comment: '关联 user_task.id',
      },
      user_id: {
        type: BIGINT(20),
        allowNull: false,
        comment: '关联 sys_user.user_id',
      },
      task_item_id: {
        type: BIGINT(20),
        allowNull: false,
        comment: '关联 shop_task_item.item_id',
      },
      order_id: {
        type: BIGINT(20),
        allowNull: true,
        comment: '对应生成的订单号',
      },
      status: {
        type: INTEGER,
        defaultValue: 0,
        comment: '任务子项状态 0=未完成, 1=已完成, 等等',
      },
      revenue: {
        type: DECIMAL(20, 5),
        defaultValue: 0.00000,
        comment: '该子项产生的收益',
      },
      create_time: {
        type: DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: '创建时间',
      },
      update_time: {
        type: DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        comment: '更新时间',
      },
      is_deleted: {
        type: INTEGER,
        defaultValue: 0,
        comment: '逻辑删除：0未删除，1已删除',
      }
    });
    console.log(`Table ${tableNames.USER_TASK_ITEM_PROGRESS} created successfully.`);
  } catch (error) {
    console.error('Unable to connect to the database or create table:', error);
  } finally {
    await sequelize.close();
  }
}

run();