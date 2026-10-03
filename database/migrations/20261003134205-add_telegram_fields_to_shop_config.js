'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('shop_config', 'telegram_bot_token', {
      type: Sequelize.STRING(128),
      allowNull: true,
      comment: 'Telegram机器人Token',
    });
    await queryInterface.addColumn('shop_config', 'telegram_chat_id', {
      type: Sequelize.STRING(64),
      allowNull: true,
      comment: 'Telegram接收消息的ChatID',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('shop_config', 'telegram_bot_token');
    await queryInterface.removeColumn('shop_config', 'telegram_chat_id');
  }
};
