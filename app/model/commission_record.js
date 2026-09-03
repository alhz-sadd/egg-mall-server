'use strict';

module.exports = app => {
  const { INTEGER, DECIMAL, DATEONLY } = app.Sequelize;

  const CommissionRecord = app.model.define('commission_record', {
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
      comment: '获得佣金用户ID',
    },
    source_user_id: {
      type: INTEGER.UNSIGNED,
      comment: '来源用户ID',
    },
    amount: {
      type: DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: '佣金金额',
    },
    commission_date: {
      type: DATEONLY,
      allowNull: false,
      comment: '佣金日期',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '状态：1有效 0无效',
    },
  }, {
    tableName: 'commission_records',
    comment: '佣金记录表',
  });

  CommissionRecord.associate = function() {
    app.model.CommissionRecord.belongsTo(app.model.User, { foreignKey: 'user_id', as: 'user' });
    app.model.CommissionRecord.belongsTo(app.model.User, { foreignKey: 'source_user_id', as: 'source_user' });
  };

  return CommissionRecord;
};
