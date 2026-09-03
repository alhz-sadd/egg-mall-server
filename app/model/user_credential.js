'use strict';

module.exports = app => {
  const { STRING, INTEGER } = app.Sequelize;

  const UserCredential = app.model.define('user_credential', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: 'ID',
    },
    admin_id: {
      type: INTEGER.UNSIGNED,
      comment: '店铺管理员ID',
    },
    user_id: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      comment: '用户ID',
    },
    real_name: {
      type: STRING(64),
      allowNull: false,
      comment: '姓名',
    },
    id_number: {
      type: STRING(32),
      allowNull: false,
      comment: '证件号',
    },
    front_image: {
      type: STRING(255),
      allowNull: false,
      comment: '正面图片',
    },
    back_image: {
      type: STRING(255),
      allowNull: false,
      comment: '反面图片',
    },
    status: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '状态：0审核中 1已通过 2审核失败',
    },
  }, {
    tableName: 'user_credentials',
    comment: '用户凭证表',
  });

  UserCredential.associate = function() {
    app.model.UserCredential.belongsTo(app.model.User, { foreignKey: 'user_id', as: 'user' });
  };

  return UserCredential;
};
