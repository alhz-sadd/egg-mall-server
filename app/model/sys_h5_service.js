'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { STRING, BIGINT, TINYINT, DATE, INTEGER } = app.Sequelize;

  const SysH5Service = app.model.define(TableNames.SYS_H5_SERVICE, {
    id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键自增',
    },
    service_name: {
      type: STRING(128),
      allowNull: false,
      comment: '客服昵称/名称',
    },
    avatar: {
      type: STRING(512),
      allowNull: true,
      comment: '客服头像图片地址',
    },
    contact_type: {
      type: TINYINT,
      allowNull: true,
      comment: '1-微信，2-QQ，3-手机号',
    },
    contact_value: {
      type: STRING(512),
      allowNull: true,
      comment: '对应联系方式字符串',
    },
    jump_url: {
      type: STRING(512),
      allowNull: true,
      comment: '跳转地址',
    },
    sort: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '排序，数值越小越靠前',
    },
    status: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '0禁用，1启用',
    },
    remark: {
      type: STRING(500),
      allowNull: true,
      comment: '后台备注',
    },
    create_user_id: {
      type: BIGINT,
      allowNull: true,
      comment: '创建人ID',
    },
    update_user_id: {
      type: BIGINT,
      allowNull: true,
      comment: '修改人ID',
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
    is_deleted: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '软删除：0正常 1删除',
    },
  }, {
    tableName: 'sys_h5_service',
    timestamps: false,
    underscored: false,
  });

  SysH5Service.associate = () => {
    app.model.SysH5Service.belongsTo(app.model.SysUser, { foreignKey: 'create_user_id', as: 'creator' });
    app.model.SysH5Service.belongsTo(app.model.SysUser, { foreignKey: 'update_user_id', as: 'updater' });
  };

  return SysH5Service;
};
