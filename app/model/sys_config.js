'use strict';

/**
 * 系统配置模型
 * @param app
 */
module.exports = app => {
  const { STRING, INTEGER, DATE } = app.Sequelize;

  const SysConfig = app.model.define('sys_config', {
    config_id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: 'ID',
    },
    admin_id: {
      type: INTEGER.UNSIGNED,
      comment: '店铺管理员ID',
    },
    config_name: {
      type: STRING(100),
      allowNull: false,
      defaultValue: '',
      comment: '参数名称',
    },
    config_key: {
      type: STRING(100),
      allowNull: false,
      defaultValue: '',
      comment: '参数键名',
    },
    config_value: {
      type: STRING(500),
      allowNull: false,
      defaultValue: '',
      comment: '参数键值',
    },
    remark: {
      type: STRING(500),
      allowNull: true,
      comment: '备注',
    },
    created_at: {
      type: DATE,
      allowNull: false,
      comment: '创建时间',
    },
    updated_at: {
      type: DATE,
      allowNull: false,
      comment: '更新时间',
    },
  }, {
    tableName: 'sys_config',
    comment: '系统配置表',
  });

  return SysConfig;
};
