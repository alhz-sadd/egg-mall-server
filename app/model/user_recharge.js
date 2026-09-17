'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { BIGINT, STRING, DECIMAL, TINYINT, DATE } = app.Sequelize;

  const UserRecharge = app.model.define(TableNames.USER_RECHARGE, {
    id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键ID',
    },
    order_no: {
      type: STRING(64),
      allowNull: false,
      comment: '充值订单号，唯一',
    },
    shop_id: {
      type: BIGINT,
      allowNull: false,
      comment: '所属店铺ID',
    },
    user_id: {
      type: BIGINT,
      allowNull: false,
      comment: 'C端用户ID，关联sys_user.id',
    },
    sales_user_id: {
      type: BIGINT,
      allowNull: false,
      comment: '归属业务员ID，关联sys_user.id',
    },
    channel_code: {
      type: STRING(64),
      allowNull: false,
      comment: '充值渠道编码 usdt_trc20 / usdt_erc20',
    },
    channel_name: {
      type: STRING(128),
      allowNull: false,
      comment: '渠道展示名称',
    },
    amount: {
      type: DECIMAL(18, 6),
      allowNull: false,
      comment: '用户填写转账原始金额',
    },
    fee: {
      type: DECIMAL(18, 6),
      allowNull: false,
      defaultValue: 0,
      comment: '充值手续费',
    },
    system_receive_amount: {
      type: DECIMAL(18, 6),
      allowNull: false,
      defaultValue: 0,
      comment: '系统实收金额 amount-fee',
    },
    user_receive_amount: {
      type: DECIMAL(18, 6),
      allowNull: false,
      defaultValue: 0,
      comment: '用户钱包实际到账金额',
    },
    is_first_recharge: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '是否首充 0否 1是',
    },
    status: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '订单状态：1待审核，2审核通过，3审核驳回，4已取消',
    },
    audit_type: {
      type: TINYINT,
      allowNull: true,
      comment: '审核类型：1真实充值，2虚拟充值',
    },
    voucher_img: {
      type: STRING(255),
      allowNull: true,
      comment: '用户转账凭证图片地址',
    },
    audit_user_id: {
      type: BIGINT,
      allowNull: true,
      comment: '审核人ID（B端操作人sys_user.id）',
    },
    audit_time: {
      type: DATE,
      allowNull: true,
      comment: '审核时间',
    },
    reject_reason: {
      type: STRING(500),
      allowNull: true,
      comment: '驳回原因',
    },
    remark: {
      type: STRING(500),
      allowNull: true,
      comment: '备注',
    },
    create_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: '创建时间',
    },
    update_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: '更新时间',
    },
  }, {
    tableName: 'user_recharge',
    timestamps: false,
    comment: '用户充值订单表',
    indexes: [
      { name: 'idx_shop_id', fields: [ 'shop_id' ] },
      { name: 'idx_user_id', fields: [ 'user_id' ] },
      { name: 'idx_sales_user_id', fields: [ 'sales_user_id' ] },
      { unique: true, name: 'idx_order_no', fields: [ 'order_no' ] },
    ],
  });

  UserRecharge.associate = () => {
    app.model.UserRecharge.belongsTo(app.model.SysUser, { foreignKey: 'user_id', as: 'user' });
    app.model.UserRecharge.belongsTo(app.model.Shop, { foreignKey: 'shop_id', as: 'shop' });
    app.model.UserRecharge.belongsTo(app.model.SysUser, { foreignKey: 'sales_user_id', as: 'sales_user' });
  };

  return UserRecharge;
};
