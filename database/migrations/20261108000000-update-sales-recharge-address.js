'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { STRING } = Sequelize;

    // 尝试重命名 address 为 address_trc20（如果表里有 address 字段的话）
    // 为了防止报错，可以先检查是否存在
    const tableInfo = await queryInterface.describeTable('sales_recharge_address');
    
    if (tableInfo.address) {
      await queryInterface.renameColumn('sales_recharge_address', 'address', 'address_trc20');
      // 因为 renameColumn 后原先的注释可能丢失，这里修改一下类型和注释
      await queryInterface.changeColumn('sales_recharge_address', 'address_trc20', {
        type: STRING(255),
        allowNull: true,
        comment: '默认(TRC20)地址',
      });
    } else if (!tableInfo.address_trc20) {
      // 如果没有 address 也没有 address_trc20，则直接新增
      await queryInterface.addColumn('sales_recharge_address', 'address_trc20', {
        type: STRING(255),
        allowNull: true,
        comment: '默认(TRC20)地址',
      });
    }

    if (!tableInfo.address_erc20) {
      await queryInterface.addColumn('sales_recharge_address', 'address_erc20', {
        type: STRING(255),
        allowNull: true,
        comment: 'ERC20地址',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const { STRING } = Sequelize;

    const tableInfo = await queryInterface.describeTable('sales_recharge_address');
    
    if (tableInfo.address_erc20) {
      await queryInterface.removeColumn('sales_recharge_address', 'address_erc20');
    }

    if (tableInfo.address_trc20) {
      await queryInterface.renameColumn('sales_recharge_address', 'address_trc20', 'address');
      await queryInterface.changeColumn('sales_recharge_address', 'address', {
        type: STRING(255),
        allowNull: true,
      });
    }
  },
};
