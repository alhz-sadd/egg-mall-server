'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = [
      'addresses', 'banners', 'carts', 'categories', 'commission_records',
      'customer_services', 'logistics_addresses', 'menus', 'notices',
      'orders', 'order_items', 'order_carousels', 'permissions', 'products',
      'recharge_records', 'recharge_ways', 'roles', 'role_menus',
      'role_permissions', 'rules', 'strategy_rules', 'sys_config', 'tasks',
      'user_credentials', 'user_login_logs', 'user_tasks', 'vips',
      'withdraw_config', 'withdraw_ways',
    ];

    for (const table of tables) {
      // 检查表是否存在以及字段是否存在，防止重复添加报错
      const tableInfo = await queryInterface.describeTable(table).catch(() => null);
      if (tableInfo && !tableInfo.admin_id) {
        await queryInterface.addColumn(table, 'admin_id', {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
          comment: '店铺管理员ID (admin_users.id)',
        });

        // 尝试添加索引，如果失败忽略
        try {
          await queryInterface.addIndex(table, [ 'admin_id' ], {
            name: `${table}_admin_id_idx`,
          });
        } catch (e) {
          console.log(`Failed to add index for ${table}:`, e.message);
        }
      }
    }
  },

  async down(queryInterface) {
    const tables = [
      'addresses', 'banners', 'carts', 'categories', 'commission_records',
      'customer_services', 'logistics_addresses', 'menus', 'notices',
      'orders', 'order_items', 'order_carousels', 'permissions', 'products',
      'recharge_records', 'recharge_ways', 'roles', 'role_menus',
      'role_permissions', 'rules', 'strategy_rules', 'sys_config', 'tasks',
      'user_credentials', 'user_login_logs', 'user_tasks', 'vips',
      'withdraw_config', 'withdraw_ways',
    ];

    for (const table of tables) {
      const tableInfo = await queryInterface.describeTable(table).catch(() => null);
      if (tableInfo && tableInfo.admin_id) {
        try {
          await queryInterface.removeIndex(table, `${table}_admin_id_idx`);
        } catch (e) {
          // ignore
        }
        await queryInterface.removeColumn(table, 'admin_id');
      }
    }
  },
};
