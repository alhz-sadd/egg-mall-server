'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { STRING, BIGINT, TINYINT, DATE, TEXT } = app.Sequelize;

  const SysOperLog = app.model.define(TableNames.SYS_OPER_LOG, {
    id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键自增',
    },
    user_id: {
      type: BIGINT,
      allowNull: true,
      comment: '用户ID，关联 sys_user.user_id',
    },
    title: {
      type: STRING(128),
      allowNull: true,
      comment: '系统模块/操作标题',
    },
    business_type: {
      type: TINYINT,
      allowNull: true,
      defaultValue: 0,
      comment: '操作类型：0新增 1修改 2删除 3授权 4导出 5导入 6强退 7生成代码 8清空数据 9其他',
    },
    method: {
      type: STRING(128),
      allowNull: true,
      comment: '请求方式（旧字段名，实际存URL）',
    },
    request_method: {
      type: STRING(16),
      allowNull: true,
      comment: '请求方式',
    },
    username: {
      type: STRING(64),
      allowNull: true,
      comment: '操作人员账号',
    },
    oper_url: {
      type: STRING(255),
      allowNull: true,
      comment: '请求地址',
    },
    oper_ip: {
      type: STRING(64),
      allowNull: true,
      comment: '操作地址IP',
    },
    oper_location: {
      type: STRING(255),
      allowNull: true,
      comment: '操作地点',
    },
    oper_param: {
      type: TEXT,
      allowNull: true,
      comment: '请求参数',
    },
    json_result: {
      type: TEXT,
      allowNull: true,
      comment: '返回结果',
    },
    status: {
      type: TINYINT,
      allowNull: true,
      defaultValue: 1,
      comment: '操作状态（0正常 1异常）',
    },
    error_msg: {
      type: TEXT,
      allowNull: true,
      comment: '错误消息',
    },
    cost_time: {
      type: BIGINT,
      allowNull: true,
      defaultValue: 0,
      comment: '请求消耗时间(毫秒)',
    },
    oper_time: {
      type: DATE,
      allowNull: false,
      defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: '操作时间',
    },
  }, {
    tableName: 'sys_oper_log',
    comment: '操作日志表',
    timestamps: false,
    underscored: false,
    indexes: [
      {
        name: 'idx_user_id',
        fields: [ 'user_id' ],
      },
      {
        name: 'idx_business_type',
        fields: [ 'business_type' ],
      },
      {
        name: 'idx_status',
        fields: [ 'status' ],
      },
      {
        name: 'idx_oper_time',
        fields: [ 'oper_time' ],
      },
    ],
  });

  SysOperLog.associate = () => {
    app.model.SysOperLog.belongsTo(app.model.SysUser, { foreignKey: 'user_id', as: 'user' });
  };

  return SysOperLog;
};
