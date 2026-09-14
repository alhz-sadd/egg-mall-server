
const Sequelize = require('sequelize');
const config = require('./config/config.local')();

const sequelize = new Sequelize(
  config.sequelize.database,
  config.sequelize.username,
  config.sequelize.password,
  {
    host: config.sequelize.host,
    dialect: config.sequelize.dialect,
    port: config.sequelize.port,
    logging: console.log,
  },
);

// Define models briefly for testing
const SysUser = sequelize.define('sys_user', {
  user_id: { type: Sequelize.BIGINT, primaryKey: true },
  nickname: Sequelize.STRING,
  username: Sequelize.STRING,
}, { tableName: 'sys_user', timestamps: false });

const GoodsCategory = sequelize.define('goods_category', {
  category_id: { type: Sequelize.BIGINT, primaryKey: true },
  category_name: Sequelize.STRING,
  category_code: Sequelize.STRING,
  is_deleted: Sequelize.TINYINT,
}, { tableName: 'goods_category', timestamps: false });

const Goods = sequelize.define('goods', {
  goods_id: { type: Sequelize.BIGINT, primaryKey: true },
  goods_name: Sequelize.STRING,
  is_deleted: Sequelize.TINYINT,
  is_show_home: Sequelize.TINYINT,
  category_id: Sequelize.BIGINT,
  create_user_id: Sequelize.BIGINT,
}, { tableName: 'goods', timestamps: false });

Goods.belongsTo(SysUser, { foreignKey: 'create_user_id', as: 'creator' });
Goods.belongsTo(GoodsCategory, { foreignKey: 'category_id', as: 'category' });

async function run() {
  try {
    const { count, rows } = await Goods.findAndCountAll({
      where: { is_deleted: 0 },
      include: [
        { model: SysUser, as: 'creator', attributes: [ 'nickname', 'username' ] },
        { model: GoodsCategory, as: 'category', attributes: [ 'category_name', 'category_code' ] },
      ],
    });
    console.log('Count:', count);
    console.log('Rows:', JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await sequelize.close();
  }
}

run();
