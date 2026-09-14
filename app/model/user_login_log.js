'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { STRING, BIGINT, TINYINT, TEXT, DATE } = app.Sequelize;

  const UserLoginLog = app.model.define(TableNames.USER_LOGIN_LOG, {
    id: {
      type: BIGINT,
      autoIncrement: true,
      primaryKey: true,
      comment: '自增主键',
    },
    log_no: {
      type: STRING(64),
      allowNull: false,
      unique: 'uk_log_no',
      comment: '登录日志业务编号，对外溯源展示',
    },
    user_id: {
      type: BIGINT,
      allowNull: false,
      comment: '关联sys_user.id',
    },
    username: {
      type: STRING(64),
      comment: '账号冗余保存',
    },
    login_ip: {
      type: STRING(64),
      comment: '登录原始IP地址',
    },
    login_location: {
      type: STRING(128),
      allowNull: true,
      comment: 'IP解析地理位置，程序解析后存入，解析失败为NULL',
    },
    user_agent: {
      type: TEXT,
      comment: '原始UA完整字符串',
    },
    device_type: {
      type: TINYINT,
      allowNull: true,
      comment: '设备类型：1 PC电脑 2安卓 3 iOS苹果 4其他设备',
    },
    browser: {
      type: STRING(64),
      allowNull: true,
      comment: '浏览器名称：Chrome / Edge / Safari / 微信内置浏览器等',
    },
    os: {
      type: STRING(64),
      allowNull: true,
      comment: '操作系统：Windows11、MacOS、Android14、iOS18',
    },
    login_type: {
      type: TINYINT,
      allowNull: false,
      comment: '1:A平台端 2:B店铺后台 3:C端H5',
    },
    login_result: {
      type: TINYINT,
      allowNull: false,
      comment: '0登录失败 1登录成功',
    },
    remark: {
      type: STRING(256),
      allowNull: true,
      comment: '操作备注信息',
    },
    login_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: '登录发生时间',
    },
  }, {
    tableName: 'user_login_log',
    comment: '全端用户登录日志',
    timestamps: false,
    indexes: [
      { name: 'idx_user_id', fields: [ 'user_id' ] },
      { name: 'idx_login_type', fields: [ 'login_type' ] },
      { name: 'idx_login_time', fields: [ 'login_time' ] },
      { name: 'idx_device_type', fields: [ 'device_type' ] },
    ],
  });

  UserLoginLog.associate = function() {
    if (app.model.SysUser) {
      app.model.UserLoginLog.belongsTo(app.model.SysUser, { foreignKey: 'user_id', as: 'user' });
    }
  };

  return UserLoginLog;
};
