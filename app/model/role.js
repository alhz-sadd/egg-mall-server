'use strict';

module.exports = app => {
  const { STRING, INTEGER, BOOLEAN } = app.Sequelize;

  const Role = app.model.define('role', {
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
    roleName: {
      type: STRING(30),
      allowNull: false,
      comment: '角色名称',
    },
    roleKey: {
      type: STRING(100),
      allowNull: false,
      comment: '角色权限字符串',
    },
    roleSort: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '显示顺序',
    },
    dataScope: {
      type: STRING(1),
      defaultValue: '1',
      comment: '数据范围（1：全部数据权限 2：自定数据权限）',
    },
    menuCheckStrictly: {
      type: BOOLEAN,
      defaultValue: true,
      comment: '菜单树选择项是否关联显示',
    },
    deptCheckStrictly: {
      type: BOOLEAN,
      defaultValue: true,
      comment: '部门树选择项是否关联显示',
    },
    status: {
      type: STRING(1),
      allowNull: false,
      defaultValue: '0',
      comment: '角色状态（0正常 1停用）',
    },
    delFlag: {
      type: STRING(1),
      defaultValue: '0',
      comment: '删除标志（0代表存在 2代表删除）',
    },
    remark: {
      type: STRING(500),
      allowNull: true,
      comment: '备注',
    },
    createBy: {
      type: STRING(64),
      allowNull: true,
      comment: '创建者',
    },
    updateBy: {
      type: STRING(64),
      allowNull: true,
      comment: '更新者',
    },
  }, {
    tableName: 'roles',
    comment: '角色表',
    timestamps: true,
    createdAt: 'createTime',
    updatedAt: 'updateTime',
  });

  return Role;
};
