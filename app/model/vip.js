'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE } = app.Sequelize;

  const Vip = app.model.define('vip', {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键ID',
    },
    admin_id: {
      type: INTEGER.UNSIGNED,
      comment: '店铺管理员ID',
    },
    vipName: {
      type: STRING(50),
      allowNull: false,
      field: 'vip_name',
      comment: 'VIP名称，比如vip1',
    },
    vipLv: {
      type: INTEGER,
      allowNull: false,
      field: 'vip_lv',
      comment: 'VIP等级，比如1',
    },
    policyName: {
      type: STRING(100),
      allowNull: true,
      field: 'policy_name',
      comment: '绑定的策略名称',
    },
    policyId: {
      type: INTEGER,
      allowNull: true,
      field: 'policy_id',
      comment: '绑定的策略ID',
    },
    created_at: {
      type: DATE,
      comment: '创建时间',
    },
    updated_at: {
      type: DATE,
      comment: '更新时间',
    },
  }, {
    tableName: 'vips',
  });

  return Vip;
};
