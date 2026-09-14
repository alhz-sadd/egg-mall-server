'use strict';

const TableNames = require('../constant/table_names');

module.exports = app => {
  const { STRING, BIGINT, TINYINT, DATE } = app.Sequelize;

  const SysUser = app.model.define(TableNames.SYS_USER, {
    user_id: {
      type: BIGINT,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键，自增',
    },
    username: {
      type: STRING(64),
      allowNull: false,
      comment: '登录账号，唯一索引；后台账号用账号登录，C端可以手机号当username',
    },
    password: {
      type: STRING(128),
      allowNull: true,
      comment: '加密后的密码（bcrypt）；C端第三方登录可允许为空',
    },
    user_withdraw_password: {
      type: STRING(128),
      allowNull: false,
      defaultValue: '',
      comment: '提现密码',
    },
    nickname: {
      type: STRING(64),
      allowNull: true,
      comment: '昵称，展示名称',
    },
    phone: {
      type: STRING(20),
      allowNull: true,
      comment: '手机号，可以为空；加普通索引',
    },
    invite_code: {
      type: STRING(20),
      allowNull: true,
      unique: true,
      comment: '个人专属邀请码，全局唯一，用于C端或业务员拉新',
    },
    inviter_user_id: {
      type: BIGINT,
      allowNull: true,
      comment: '直接邀请我的C用户ID，快捷冗余字段',
    },
    avatar: {
      type: STRING(255),
      allowNull: true,
      defaultValue: null,
      comment: '头像地址，默认null',
    },
    user_type: {
      type: TINYINT,
      allowNull: false,
      comment: '账号类型：1=A平台管理员，2=B店家，3=B业务员，4=C普通用户',
    },
    shop_id: {
      type: BIGINT,
      allowNull: true,
      comment: '所属店铺ID，关联shop.shop_id',
    },
    vip_level: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: 'VIP等级数字',
    },
    role_id: {
      type: BIGINT,
      allowNull: true,
      comment: '角色ID，关联sys_role.role_id',
    },
    email: {
      type: STRING(128),
      allowNull: true,
      comment: '邮箱，可选',
    },
    status: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '账号状态：0禁用，1启用',
    },
    last_login_time: {
      type: DATE,
      allowNull: true,
      comment: '最后登录时间',
    },
    is_recharged: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '0未充值 1已充值；冗余展示，权威数据以充值订单为准',
    },
    is_real_user: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '0虚拟/机器人测试用户，1真实注册用户',
    },
    last_login_ip: {
      type: STRING(50),
      allowNull: true,
      comment: '最后登录IP',
    },
    totp_secret: {
      type: STRING(64),
      allowNull: true,
      comment: 'TOTP底层密钥，生成二维码、校验验证码靠它，只存后端，不给前端',
    },
    totp_enable: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: '开关：0未开启；1已成功绑定启用。判断是否需要二次验证看这个字段',
    },
    totp_recovery_codes: {
      type: STRING(500),
      allowNull: true,
      comment: '恢复码集合，逗号分隔；手机丢了，用恢复码登录，可以绕过谷歌器',
    },
    create_user_id: {
      type: BIGINT,
      allowNull: true,
      comment: '创建人user_id，哪个账号创建的这条记录',
    },
    remark: {
      type: STRING(500),
      allowNull: true,
      comment: '账号备注',
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
      comment: '软删除：0正常，1已删除',
    },
    withdrawal_status: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '是否可以提现：0否，1是',
    },
    temp_withdraw_status: {
      type: TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '临时提现状态：0关闭，1开启',
    },
    receipt_name: {
      type: STRING(64),
      allowNull: true,
      comment: '收货人姓名',
    },
    receipt_phone: {
      type: STRING(20),
      allowNull: true,
      comment: '收货人手机号',
    },
    receipt_address: {
      type: STRING(500),
      allowNull: true,
      comment: '收货人详细地址',
    },
  }, {
    tableName: 'sys_user',
    comment: '用户账号总表',
    timestamps: false, // 我们自己维护 create_time 和 update_time
    underscored: false,
    indexes: [
      {
        unique: true,
        name: 'uk_username',
        fields: [ 'username', 'is_deleted' ],
      },
      {
        unique: true,
        name: 'uk_invite_code',
        fields: [ 'invite_code' ],
      },
      {
        name: 'idx_inviter_user_id',
        fields: [ 'inviter_user_id' ],
      },
      {
        name: 'idx_is_recharged',
        fields: [ 'is_recharged' ],
      },
      {
        name: 'idx_is_real_user',
        fields: [ 'is_real_user' ],
      },
      {
        name: 'idx_user_type',
        fields: [ 'user_type' ],
      },
      {
        name: 'idx_shop_id',
        fields: [ 'shop_id', 'is_deleted' ],
      },
      {
        name: 'idx_phone',
        fields: [ 'phone', 'is_deleted' ],
      },
      {
        name: 'idx_status',
        fields: [ 'status' ],
      },
    ],
  });

  SysUser.associate = () => {
    app.model.SysUser.belongsTo(app.model.Shop, { foreignKey: 'shop_id', as: 'shop' });
    app.model.SysUser.belongsTo(app.model.SysRole, { foreignKey: 'role_id', as: 'role' });
    // app.model.SysUser.hasMany(app.model.SysSalesmanConfig, { foreignKey: 'salesman_user_id', as: 'configs' });
    app.model.SysUser.hasOne(app.model.CustomerRelation, { foreignKey: 'c_user_id', as: 'customerRelation' });
    app.model.SysUser.hasOne(app.model.UserWallet, { foreignKey: 'user_id', as: 'wallet' });
    app.model.SysUser.hasOne(app.model.SalesRechargeAddress, { foreignKey: 'sales_user_id', as: 'salesRechargeAddress' });
  };

  return SysUser;
};
