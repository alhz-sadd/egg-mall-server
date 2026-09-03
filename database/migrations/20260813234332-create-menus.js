'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, BOOLEAN, JSON, DATE } = Sequelize;
    await queryInterface.createTable('menus', {
      id: {
        type: INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      parent_id: {
        type: INTEGER.UNSIGNED,
        allowNull: true,
      },
      name: {
        type: STRING(64),
        allowNull: false,
      },
      path: {
        type: STRING(128),
        allowNull: false,
      },
      component: {
        type: STRING(128),
        allowNull: true,
      },
      redirect: {
        type: STRING(128),
        allowNull: true,
      },
      hidden: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      alwaysShow: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      meta: {
        type: JSON,
        allowNull: true,
      },
      created_at: {
        type: DATE,
        allowNull: false,
      },
      updated_at: {
        type: DATE,
        allowNull: false,
      },
    });
  },

  down: async queryInterface => {
    await queryInterface.dropTable('menus');
  },
};
