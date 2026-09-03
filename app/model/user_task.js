'use strict';

module.exports = app => {
  const { INTEGER, DECIMAL, DATEONLY } = app.Sequelize;

  const UserTask = app.model.define('user_task', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: 'ID',
    },
    admin_id: {
      type: INTEGER.UNSIGNED,
      comment: '店铺管理员ID',
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
    reward: {
      type: DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '任务收益',
    },
    task_date: {
      type: DATEONLY,
      allowNull: false,
      comment: '任务完成日期',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '状态：1完成 0取消',
    },
  }, {
    tableName: 'user_tasks',
    comment: '用户任务记录表',
  });

  UserTask.associate = function() {
    app.model.UserTask.belongsTo(app.model.User, { foreignKey: 'user_id', as: 'user' });
    app.model.UserTask.belongsTo(app.model.Task, { foreignKey: 'task_id', as: 'task' });
  };

  return UserTask;
};
