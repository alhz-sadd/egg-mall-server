'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE } = app.Sequelize;

  const AdminUser = app.model.define('admin_user', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: '内部ID（主键）',
    },
    admin_code: {
      type: app.Sequelize.BIGINT.UNSIGNED,
      unique: true,
      comment: '管理员编码（9-12位唯一ID，对外暴露）',
    },
    google_code: {
      type: STRING(64),
      comment: '谷歌验证码（二级密码）',
    },
    username: {
      type: STRING(64),
      allowNull: false,
      unique: true,
      comment: '登录账号',
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
    bind_admin_id: {
      type: INTEGER.UNSIGNED,
      comment: '绑定的上级管理员ID',
    },
    remark: {
      type: STRING(255),
      comment: '备注',
    },
    role: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 2,
      comment: '角色：1超级管理员 2业务员',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '状态：1启用 0禁用',
    },
    last_login_ip: {
      type: STRING(64),
      comment: '最后登录IP',
    },
    last_login_time: {
      type: DATE,
      comment: '最后登录时间',
    },
    bindRechargeaddress: {
      type: STRING(255),
      defaultValue: null,
      comment: '绑定充值地址',
    },
  }, {
    tableName: 'admin_users',
    comment: '管理员表',
  });

  return AdminUser;
};
