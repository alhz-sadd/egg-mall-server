'use strict';

const Service = require('egg').Service;

class GoodsService extends Service {
  /**
   * 分页获取商品列表 (后台)
   * @param query
   */
  async list(query = {}) {
    const { ctx } = this;
    const { goods_name, goods_no, goods_type, status, is_home, category_id, page = 1, page_size = 10, order_by } = query;
    const where = { is_deleted: 0 };

    if (goods_name) where.goods_name = { [ctx.app.Sequelize.Op.like]: `%${goods_name}%` };
    if (goods_no) where.goods_no = goods_no;
    if (goods_type) where.goods_type = goods_type;
    if (status !== undefined && status !== '') where.status = status;
    if (is_home !== undefined && is_home !== '') where.is_home = Number(is_home);
    if (category_id && category_id !== '0' && category_id !== 0) where.category_id = category_id;

    const offset = (page - 1) * page_size;
    let order = [[ 'sort', 'ASC' ], [ 'goods_id', 'DESC' ]];
    if (order_by === 'price_asc') {
      order = [[ 'price', 'ASC' ], [ 'goods_id', 'DESC' ]];
    } else if (order_by === 'price_desc') {
      order = [[ 'price', 'DESC' ], [ 'goods_id', 'DESC' ]];
    }

    const { count, rows } = await ctx.model.Goods.findAndCountAll({
      where,
      include: [
        { model: ctx.model.SysUser, as: 'creator', attributes: [ 'nickname', 'username' ] },
        { model: ctx.model.GoodsCategory, as: 'category', attributes: [ 'category_name', 'category_code' ] },
      ],
      order,
      offset,
      limit: Number(page_size),
    });

    // 格式化数据结构以支持嵌套对象
    const formattedRows = rows.map(item => {
      // 因为没用 raw: true, 直接调 toJSON() 获取模型数据，且能自动应用 model 的 getter
      const row = item.toJSON();
      const formattedRow = {};
      const creator = {};
      const category = {};

      for (const key in row) {
        if (key.startsWith('creator.')) {
          creator[key.replace('creator.', '')] = row[key];
        } else if (key.startsWith('category.')) {
          category[key.replace('category.', '')] = row[key];
        } else {
          formattedRow[key] = row[key];
        }
      }

      formattedRow.creator = (row.creator || (creator.nickname ? creator : null));
      formattedRow.category = (row.category || (category.category_name ? category : null));

      // H5端有些地方取的是 image 而非 cover_image
      formattedRow.image = row.cover_image;

      return formattedRow;
    });

    return {
      list: formattedRows,
      pagination: {
        total: count,
        page: Number(page),
        page_size: Number(page_size),
      },
    };
  }

  /**
   * 获取详情
   * @param goodsId
   */
  async detail(goodsId) {
    const { ctx } = this;
    const item = await ctx.model.Goods.findOne({
      where: { goods_id: goodsId, is_deleted: 0 },
      include: [
        { model: ctx.model.SysUser, as: 'creator', attributes: [ 'nickname', 'username' ] },
        { model: ctx.model.SysUser, as: 'updater', attributes: [ 'nickname', 'username' ] },
        { model: ctx.model.GoodsCategory, as: 'category', attributes: [ 'category_name', 'category_code' ] },
      ],
    });
    ctx.assert(item, 404, '商品不存在');

    // 格式化数据结构
    const row = item.toJSON();
    const formattedItem = {};
    const creator = {};
    const updater = {};
    const category = {};

    for (const key in row) {
      if (key.startsWith('creator.')) {
        creator[key.replace('creator.', '')] = row[key];
      } else if (key.startsWith('updater.')) {
        updater[key.replace('updater.', '')] = row[key];
      } else if (key.startsWith('category.')) {
        category[key.replace('category.', '')] = row[key];
      } else {
        formattedItem[key] = row[key];
      }
    }

    formattedItem.creator = (row.creator || (creator.nickname ? creator : null));
    formattedItem.updater = (row.updater || (updater.nickname ? updater : null));
    formattedItem.category = (row.category || (category.category_name ? category : null));

    return formattedItem;
  }

  /**
   * 创建商品
   * @param payload
   * @param adminId
   */
  async create(payload, adminId) {
    const { ctx } = this;

    // 校验分类是否存在
    const category = await ctx.model.GoodsCategory.findOne({
      where: { category_id: payload.category_id, is_deleted: 0 },
    });
    ctx.assert(category, 422, '所选分类不存在或已被删除');

    // 如果未传 goods_no，自动生成（规则：G + 时间戳 + 4位随机数）
    if (!payload.goods_no) {
      payload.goods_no = 'G' + Date.now() + Math.floor(Math.random() * 9000 + 1000);
    } else {
      // 如果手动传了，校验唯一性
      const exist = await ctx.model.Goods.findOne({
        where: { goods_no: payload.goods_no, is_deleted: 0 },
      });
      ctx.assert(!exist, 422, '商品编码已存在');
    }

    // 处理库存，不传默认为 999999999 (无限库存)
    if (payload.stock === undefined || payload.stock === null || payload.stock === '') {
      payload.stock = 999999999;
    }

    return await ctx.model.Goods.create({
      ...payload,
      create_user_id: adminId,
      update_user_id: adminId,
    });
  }

  /**
   * 更新商品
   * @param goodsId
   * @param payload
   * @param adminId
   */
  async update(goodsId, payload, adminId) {
    const { ctx } = this;
    const item = await ctx.model.Goods.findOne({ where: { goods_id: goodsId, is_deleted: 0 } });
    ctx.assert(item, 404, '商品不存在');

    if (payload.category_id && payload.category_id !== item.category_id) {
      const category = await ctx.model.GoodsCategory.findOne({
        where: { category_id: payload.category_id, is_deleted: 0 },
      });
      ctx.assert(category, 422, '所选分类不存在或已被删除');
    }

    if (payload.goods_no && payload.goods_no !== item.goods_no) {
      const exist = await ctx.model.Goods.findOne({
        where: { goods_no: payload.goods_no, is_deleted: 0, goods_id: { [ctx.app.Sequelize.Op.ne]: goodsId } },
      });
      ctx.assert(!exist, 422, '商品编码已存在');
    }

    // 处理库存，如果传了空，则视为无限库存
    if (payload.stock === '') {
      payload.stock = 999999999;
    }

    return await item.update({
      ...payload,
      update_user_id: adminId,
      update_time: ctx.app.Sequelize.literal('CURRENT_TIMESTAMP'),
    });
  }

  /**
   * 软删除商品
   * @param goodsId
   */
  async destroy(goodsId) {
    const { ctx } = this;
    const item = await ctx.model.Goods.findOne({ where: { goods_id: goodsId, is_deleted: 0 } });
    ctx.assert(item, 404, '商品不存在');
    return await item.update({ is_deleted: 1 });
  }
}

module.exports = GoodsService;
