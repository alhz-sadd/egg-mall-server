'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { STRING, BIGINT, TINYINT, DATE, INTEGER } = app.Sequelize;

  const SysRole = app.model.define(TableNames.SYS_ROLE, {
    role_id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键',
    },
    role_name: {
      type: STRING(64),
      allowNull: false,
      comment: '角色名称：平台管理员、店家角色、业务员角色',
    },
    role_code: {
      type: STRING(64),
      allowNull: false,
      comment: '角色编码，唯一，如：platform_admin、shop_admin、shop_salesman',
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
    is_deleted: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '软删除：0正常，1删除',
    },
  }, {
    tableName: 'sys_role',
    comment: '角色表',
    timestamps: false,
    underscored: false,
    indexes: [
      {
        unique: true,
        name: 'uk_role_code',
        fields: [ 'role_code' ],
      },
    ],
  });

  SysRole.associate = () => {
    app.model.SysRole.hasMany(app.model.SysUser, { foreignKey: 'role_id', as: 'users' });
  };

  return SysRole;
};
