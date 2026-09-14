'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { BIGINT, STRING, TINYINT, DATE } = Sequelize;

    await queryInterface.createTable('sys_user', {
      user_id: {
        type: BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: '主键，自增',
      },
      username: {
        type: STRING(64),
        allowNull: false,
        comment: '登录账号，后台账号用账号登录，C端可以手机号当username',
      },
      password: {
        type: STRING(128),
        allowNull: true,
        comment: '加密后的密码（bcrypt）；C端第三方登录可允许为空',
      },
      nickname: {
        type: STRING(64),
        allowNull: true,
        comment: '昵称，展示名称',
      },
      phone: {
        type: STRING(20),
        allowNull: true,
        comment: '手机号，可以为空',
      },
      avatar: {
        type: STRING(255),
        allowNull: true,
        defaultValue: null,
        comment: '头像地址',
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
      last_login_ip: {
        type: STRING(50),
        allowNull: true,
        comment: '最后登录IP',
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: '创建时间',
      },
      update_time: {
        type: DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        comment: '更新时间',
      },
      is_deleted: {
        type: TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: '软删除：0正常，1已删除',
      },
    });

    // 创建索引
    await queryInterface.addIndex('sys_user', [ 'username', 'is_deleted' ], {
      unique: true,
      name: 'uk_username',
    });

    await queryInterface.addIndex('sys_user', [ 'user_type' ], {
      name: 'idx_user_type',
    });

    await queryInterface.addIndex('sys_user', [ 'shop_id', 'is_deleted' ], {
      name: 'idx_shop_id',
    });

    await queryInterface.addIndex('sys_user', [ 'phone', 'is_deleted' ], {
      name: 'idx_phone',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sys_user');
  },
};
