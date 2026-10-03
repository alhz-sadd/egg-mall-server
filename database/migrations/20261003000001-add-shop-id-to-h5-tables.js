'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { BIGINT } = Sequelize;

    // Add shop_id to sys_h5_config
    await queryInterface.addColumn('sys_h5_config', 'shop_id', {
      type: BIGINT,
      allowNull: false,
      defaultValue: 0,
      comment: '所属店铺ID，0表示全局',
    });

    // Add index for shop_id on sys_h5_config
    await queryInterface.addIndex('sys_h5_config', [ 'shop_id', 'is_deleted' ], {
      name: 'idx_sys_h5_config_shop_id',
    });

    // Add shop_id to sys_h5_service
    await queryInterface.addColumn('sys_h5_service', 'shop_id', {
      type: BIGINT,
      allowNull: false,
      defaultValue: 0,
      comment: '所属店铺ID，0表示全局',
    });

    // Add index for shop_id on sys_h5_service
    await queryInterface.addIndex('sys_h5_service', [ 'shop_id', 'is_deleted' ], {
      name: 'idx_sys_h5_service_shop_id',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('sys_h5_config', 'shop_id');
    await queryInterface.removeColumn('sys_h5_service', 'shop_id');
  },
};
