'use strict';

module.exports = app => {
  const { STRING, INTEGER, TEXT, DATE } = app.Sequelize;

  const AdminOperationLog = app.model.define('admin_operation_log', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: '操作日志ID',
    },
    admin_id: {
      type: INTEGER.UNSIGNED,
      comment: '管理员ID',
    },
    username: {
      type: STRING(64),
      comment: '操作账号',
    },
    oper_name: {
      type: STRING(64),
      comment: '操作人员名称',
    },
    operator_type: {
      type: INTEGER,
      comment: '账号权限等级：1管理员 2主管 3业务员',
    },
    title: {
      type: STRING(128),
      comment: '系统模块/操作标题',
    },
    business_type: {
      type: INTEGER,
      defaultValue: 9,
      comment: '操作类型：0新增 1修改 2删除 3授权 4导出 5导入 6强退 7生成代码 8清空数据 9其他',
    },
    oper_url: {
      type: STRING(255),
      comment: '请求地址',
    },
    request_method: {
      type: STRING(16),
      comment: '请求方式',
    },
    oper_param: {
      type: TEXT,
      comment: '请求参数',
    },
    json_result: {
      type: TEXT,
      comment: '接口返回结果',
    },
    request: {
      type: TEXT,
      comment: '请求信息汇总（JSON）',
    },
    ip: {
      type: STRING(64),
      comment: 'IP地址',
    },
    location: {
      type: STRING(255),
      comment: '操作地点',
    },
    duration: {
      type: INTEGER,
      defaultValue: 0,
      comment: '消耗时间（毫秒）',
    },
    oper_time: {
      type: DATE,
      comment: '操作时间',
    },
    status: {
      type: INTEGER,
      defaultValue: 0,
      comment: '操作状态：0成功 1失败',
    },
    remark: {
      type: STRING(500),
      comment: '备注',
    },
  }, {
    tableName: 'admin_operation_logs',
    comment: '管理员操作日志表',
  });

  AdminOperationLog.associate = function() {
    app.model.AdminOperationLog.belongsTo(app.model.AdminUser, { foreignKey: 'admin_id', as: 'admin', onDelete: 'SET NULL' });
  };

  return AdminOperationLog;
};
