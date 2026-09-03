'use strict';

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  const AdminLoginLog = app.model.define('admin_login_log', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: '登录日志ID',
    },
    admin_id: {
      type: INTEGER.UNSIGNED,
      comment: '管理员ID（登录失败可能为空）',
    },
    username: {
      type: STRING(64),
      comment: '登录账号',
    },
    ip: {
      type: STRING(64),
      comment: 'IP地址',
    },
    location: {
      type: STRING(255),
      comment: '登录地点',
    },
    device: {
      type: STRING(128),
      comment: '设备信息',
    },
    browser: {
      type: STRING(128),
      comment: '浏览器信息',
    },
    os: {
      type: STRING(64),
      comment: '操作系统',
    },
    operation: {
      type: STRING(64),
      comment: '操作信息：登录成功/退出成功/登录失败：密码错误/登录失败：用户不存在/账号已禁用',
    },
    duration: {
      type: INTEGER,
      defaultValue: 0,
      comment: '消耗时间（毫秒）',
    },
    status: {
      type: INTEGER,
      defaultValue: 0,
      comment: '状态：0登录成功 1登录失败',
    },
    remark: {
      type: STRING(500),
      comment: '备注',
    },
  }, {
    tableName: 'admin_login_logs',
    comment: '管理员登录日志表',
  });

  AdminLoginLog.associate = function() {
    app.model.AdminLoginLog.belongsTo(app.model.AdminUser, { foreignKey: 'admin_id', as: 'admin', onDelete: 'SET NULL' });
  };

  return AdminLoginLog;
};
