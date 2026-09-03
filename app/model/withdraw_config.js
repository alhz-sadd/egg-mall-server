'use strict';

/**
 * 提现参数配置模型
 * 全站仅维护一条配置记录
 * @param app
 */
module.exports = app => {
  const { STRING, INTEGER, DECIMAL, BOOLEAN } = app.Sequelize;

  const WithdrawConfig = app.model.define('withdraw_config', {
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
    min_money: {
      type: DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 10.00,
      comment: '提现最小值',
    },
    need_task: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: '首次提现是否需要完成任务',
    },
    sx_rate: {
      type: STRING(20),
      allowNull: false,
      defaultValue: '0.03',
      comment: '手续费比例',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '状态：1启用 0禁用',
    },
  }, {
    tableName: 'withdraw_config',
    comment: '提现参数配置表',
  });

  return WithdrawConfig;
};
