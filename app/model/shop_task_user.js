'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { INTEGER, DECIMAL, DATEONLY } = app.Sequelize;

  const ShopTaskUser = app.model.define(TableNames.SHOP_TASK_USER, {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: 'ID',
    },
    user_id: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      comment: '用户ID',
    },
    task_id: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      comment: '任务ID',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '状态：1完成 0取消',
    },
    task_status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '0已绑定1任务进行中，2全部完成，3已过期截止',
    },
  }, {
    tableName: TableNames.SHOP_TASK_USER,
    comment: '用户任务记录表',
    createdAt: 'create_time',
    updatedAt: 'update_time',
  });

  ShopTaskUser.associate = function() {
    app.model.ShopTaskUser.belongsTo(app.model.SysUser, { foreignKey: 'user_id', as: 'user' });
    // app.model.ShopTaskUser.belongsTo(app.model.Task, { foreignKey: 'task_id', as: 'task' });
  };

  return ShopTaskUser;
};
