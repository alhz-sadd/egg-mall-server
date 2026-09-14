'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { BIGINT, STRING, TINYINT, DATE } = app.Sequelize;

  const UserIdentity = app.model.define(TableNames.USER_IDENTITY, {
    identity_id: {
      type: BIGINT,
      autoIncrement: true,
      primaryKey: true,
      comment: '主键自增',
    },
    user_id: {
      type: BIGINT,
      allowNull: false,
      comment: '关联 sys_user.user_id',
    },
    real_name: {
      type: STRING(64),
      allowNull: false,
      comment: '真实姓名',
    },
    id_card_no: {
      type: STRING(255),
      allowNull: false,
      comment: '身份证号码；加密存储',
    },
    id_card_front: {
      type: STRING(512),
      allowNull: false,
      comment: '身份证正面图片地址',
    },
    id_card_back: {
      type: STRING(512),
      allowNull: false,
      comment: '身份证反面图片地址',
    },
    hand_id_card: {
      type: STRING(512),
      allowNull: true,
      comment: '手持身份证照片',
    },
    audit_status: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '0未提交，1待审核，2审核通过，3审核驳回',
    },
    audit_user_id: {
      type: BIGINT,
      allowNull: true,
      comment: '平台审核管理员ID',
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
    create_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: '提交时间',
    },
    update_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: '更新时间',
    },
    is_deleted: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '软删除:0正常，1删除',
    },
  }, {
    tableName: 'user_identity',
    timestamps: false,
  });

  UserIdentity.associate = function() {
    app.model.UserIdentity.belongsTo(app.model.SysUser, { foreignKey: 'user_id', as: 'user' });
  };

  return UserIdentity;
};
