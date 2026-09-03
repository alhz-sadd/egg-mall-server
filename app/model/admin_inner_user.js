'use strict';

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  const AdminInnerUser = app.model.define('admin_inner_user', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: '内部ID（主键）',
    },
    username: {
      type: STRING(64),
      allowNull: false,
      unique: true,
      comment: '登录账号',
    },
    google_code: {
      type: STRING(64),
      comment: '谷歌验证码（二级密码）',
    },
    password: {
      type: STRING(255),
      allowNull: false,
      comment: '加密密码',
    },
    nickname: {
      type: STRING(64),
      comment: '昵称/用户昵称',
    },
    gender: {
      type: INTEGER,
      defaultValue: 0,
      comment: '性别：0未知 1男 2女',
    },
    phone: {
      type: STRING(20),
      comment: '手机号',
    },
    email: {
      type: STRING(128),
      comment: '邮箱',
    },
    remark: {
      type: STRING(255),
      comment: '备注',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '状态：1启用 0禁用',
    },
  }, {
    tableName: 'admin_inner_users',
    comment: '内部管理员表(admin-inner)',
  });

  return AdminInnerUser;
};
