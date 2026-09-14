'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { STRING, BIGINT, TINYINT, DATE, TEXT, INTEGER } = app.Sequelize;

  const SysH5Config = app.model.define(TableNames.SYS_H5_CONFIG, {
    id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键自增',
    },
    config_type: {
      type: TINYINT,
      allowNull: false,
      comment: '类型：1-Banner, 2-公告, 3-规则管理, 4-首页商品, 5-任务商品',
    },
    title: {
      type: STRING(255),
      allowNull: false,
      comment: '标题：banner标题、公告标题、规则名称、商品显示名称',
    },
    cover_image: {
      type: STRING(512),
      allowNull: true,
      comment: '封面图；banner图、商品封面图；可为null',
    },
    content: {
      type: TEXT,
      allowNull: true,
      comment: '内容：公告正文、规则富文本内容',
    },
    extra: {
      type: TEXT,
      allowNull: true,
      comment: '扩展JSON字段',
      get() {
        const val = this.getDataValue('extra');
        if (val) {
          try {
            return JSON.parse(val);
          } catch (e) {
            return {};
          }
        }
        return {};
      },
      set(val) {
        this.setDataValue('extra', typeof val === 'string' ? val : JSON.stringify(val));
      },
    },
    sort: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '排序，数字越小越靠前',
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
    tableName: 'sys_h5_config',
    timestamps: false,
    underscored: false,
  });

  SysH5Config.associate = () => {
    app.model.SysH5Config.belongsTo(app.model.SysUser, { foreignKey: 'create_user_id', as: 'creator' });
    app.model.SysH5Config.belongsTo(app.model.SysUser, { foreignKey: 'update_user_id', as: 'updater' });
  };

  return SysH5Config;
};
