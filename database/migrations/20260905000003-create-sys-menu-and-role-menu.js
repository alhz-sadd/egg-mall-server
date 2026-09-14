'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { STRING, BIGINT, TINYINT, DATE, INTEGER } = Sequelize;

    // 强制清理可能残留的表
    await queryInterface.dropTable('sys_role_menu').catch(() => {});
    await queryInterface.dropTable('sys_menu').catch(() => {});

    // sys_menu
    await queryInterface.createTable('sys_menu', {
      menu_id: {
        type: BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: '主键',
      },
      parent_id: {
        type: BIGINT,
        allowNull: false,
        defaultValue: 0,
        comment: '父菜单ID，0为一级菜单',
      },
      menu_name: {
        type: STRING(64),
        allowNull: false,
        comment: '菜单名称',
      },
      menu_type: {
        type: TINYINT,
        allowNull: false,
        comment: '1菜单，2按钮',
      },
      route_path: {
        type: STRING(255),
        allowNull: true,
        comment: '前端路由地址',
      },
      component: {
        type: STRING(255),
        allowNull: true,
        comment: '前端组件路径',
      },
      perms: {
        type: STRING(255),
        allowNull: true,
        comment: '权限标识，如：shop:list、customer:add',
      },
      icon: {
        type: STRING(128),
        allowNull: true,
        comment: '菜单图标',
      },
      sort: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '排序',
      },
      visible: {
        type: TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: '0隐藏 1显示',
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: '更新时间',
      },
      is_deleted: {
        type: TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: '软删除：0正常, 1删除',
      },
    });

    // sys_role_menu
    await queryInterface.createTable('sys_role_menu', {
      id: {
        type: BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: '主键',
      },
      role_id: {
        type: BIGINT,
        allowNull: false,
        comment: 'sys_role.role_id',
      },
      menu_id: {
        type: BIGINT,
        allowNull: false,
        comment: 'sys_menu.menu_id',
      },
    });

    await queryInterface.addIndex('sys_role_menu', [ 'role_id', 'menu_id' ], {
      unique: true,
      name: 'uk_sys_role_menu',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sys_role_menu');
    await queryInterface.dropTable('sys_menu');
  },
};
