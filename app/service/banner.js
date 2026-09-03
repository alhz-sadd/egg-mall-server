'use strict';

const Service = require('egg').Service;

const DEFAULT_BANNER_IMAGE = 'https://shbaikal.com/data/upload/20240812/0ac77301590c926eb4c9ecfa38936caa.jpg';

/**
 * 轮播图服务层
 */
class BannerService extends Service {
  /**
   * 获取轮播图列表
   * @return {Array} 轮播图数组
   */
  async list() {
    const { ctx } = this;
    const rows = await ctx.model.Banner.findAll({
      where: { status: 1 },
      order: [[ 'sort', 'DESC' ], [ 'id', 'DESC' ]],
    });
    return rows;
  }

  /**
   * 管理端轮播图列表
   * 返回全部状态，支持状态筛选
   * @param {Object} query 查询参数
   * @return {Array} 轮播图数组
   */
  async adminList(query = {}) {
    const { ctx } = this;
    const { status } = query;

    const where = {};
    if (status !== undefined && status !== null && status !== '') {
      where.status = Number(status);
    }

    const rows = await ctx.model.Banner.findAll({
      where,
      order: [[ 'sort', 'DESC' ], [ 'id', 'DESC' ]],
    });
    return rows;
  }

  /**
   * 获取轮播图详情
   * @param {number} id 轮播ID
   * @return {Object} 轮播图详情
   */
  async detail(id) {
    const { ctx } = this;
    const banner = await ctx.model.Banner.findByPk(id);
    if (!banner || banner.status !== 1) {
      ctx.throw(404, '轮播图不存在或已禁用');
    }
    return banner;
  }

  /**
   * 创建轮播图
   * @param {Object} payload 轮播图数据
   * @return {Object} 创建后的轮播图
   */
  async create(payload) {
    const { ctx } = this;
    this.validatePayload(payload);

    const banner = await ctx.model.Banner.create(payload);
    return banner.toJSON();
  }

  /**
   * 更新轮播图
   * @param {number} id 轮播ID
   * @param {Object} payload 轮播图数据
   * @return {Object} 更新后的轮播图
   */
  async update(id, payload) {
    const { ctx } = this;
    const banner = await ctx.model.Banner.findByPk(id);
    if (!banner) {
      ctx.throw(404, '轮播图不存在');
    }

    await banner.update(payload);
    return banner.toJSON();
  }

  /**
   * 删除轮播图（物理删除）
   * @param {number} id 轮播ID
   */
  async destroy(id) {
    const { ctx } = this;
    const banner = await ctx.model.Banner.findByPk(id);
    if (!banner) {
      ctx.throw(404, '轮播图不存在');
    }

    await banner.destroy();
  }

  /**
   * 校验轮播图必填字段
   * @param {Object} payload 轮播图数据
   */
  validatePayload(payload) {
    const { ctx } = this;
    ctx.assert(payload.image, 422, '图片地址不能为空');
  }
}

module.exports = BannerService;
module.exports.DEFAULT_BANNER_IMAGE = DEFAULT_BANNER_IMAGE;
