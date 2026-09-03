'use strict';

module.exports = app => {
  const { STRING, INTEGER, DECIMAL } = app.Sequelize;

  const StrategyRule = app.model.define('strategy_rule', {
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
    strategy_id: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      comment: '策略ID（policyId）',
    },
    rule_model_id: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      comment: '规则模型ID',
    },
    num: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      comment: '序号',
    },
    rule_type: {
      type: INTEGER,
      defaultValue: 0,
      comment: '规则类型：0普通订单 1幸运订单',
    },
    match_type: {
      type: INTEGER,
      defaultValue: 0,
      comment: '匹配类型：0手动匹配 1智能匹配',
    },
    wares_id: {
      type: INTEGER.UNSIGNED,
      comment: '商品ID',
    },
    admin_set_wares_name: {
      type: STRING(255),
      comment: '任务商品名称',
    },
    admin_set_price: {
      type: DECIMAL(12, 2),
      defaultValue: 0.00,
      comment: '金额',
    },
    back_rate: {
      type: DECIMAL(8, 6),
      defaultValue: 0.000000,
      comment: '收益率',
    },
    back_money: {
      type: DECIMAL(12, 2),
      defaultValue: 0.00,
      comment: '返回上级的佣金',
    },
    add_money: {
      type: DECIMAL(12, 2),
      defaultValue: 0.00,
      comment: '加佣金额',
    },
    is_trigger: {
      type: STRING(8),
      defaultValue: '0',
      comment: '是否触发',
    },
    is_run: {
      type: STRING(8),
      defaultValue: '0',
      comment: '是否执行',
    },
    status: {
      type: INTEGER,
      defaultValue: 1,
      comment: '状态：1启用 0禁用',
    },
    remark: {
      type: STRING(500),
      comment: '备注',
    },
  }, {
    tableName: 'strategy_rules',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: '策略规则表',
  });

  return StrategyRule;
};
