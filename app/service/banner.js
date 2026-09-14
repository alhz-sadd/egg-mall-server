'use strict';

const Service = require('egg').Service;

const DEFAULT_BANNER_IMAGE = 'https://shbaikal.com/data/upload/20240812/0ac77301590c926eb4c9ecfa38936caa.jpg';

/**
 * 轮播图服务层
 */
class BannerService extends Service {
  /**
   * 获取轮播图列表 (C端)
   * @return {Array} 轮播图数组
   */
  async list() {
    const { ctx } = this;
    const rows = await ctx.model.SysH5Config.findAll({
      where: { config_type: 1, status: 1, is_deleted: 0 },
      order: [[ 'sort', 'ASC' ], [ 'id', 'DESC' ]],
    });
    return rows.map(item => this.formatBanner(item));
  }

  /**
   * 管理端轮播图列表
   * @param {Object} query 查询参数
   * @return {Array} 轮播图数组
   */
  async adminList(query = {}) {
    const { ctx } = this;
    const { status } = query;

    const where = { config_type: 1, is_deleted: 0 };
    if (status !== undefined && status !== null && status !== '') {
      where.status = Number(status);
    }

    const rows = await ctx.model.SysH5Config.findAll({
      where,
      order: [[ 'sort', 'ASC' ], [ 'id', 'DESC' ]],
    });
    return rows.map(item => this.formatBanner(item));
  }

  /**
   * 获取轮播图详情
   * @param {number} id 轮播ID
   * @return {Object} 轮播图详情
   */
  async detail(id) {
    const { ctx } = this;
    const banner = await ctx.model.SysH5Config.findOne({
      where: { id, config_type: 1, is_deleted: 0 },
    });
    if (!banner || banner.status !== 1) {
      ctx.throw(404, '轮播图不存在或已禁用');
    }
    return this.formatBanner(banner);
  }

  /**
   * 创建轮播图
   * @param {Object} payload 轮播图数据
   * @return {Object} 创建后的轮播图
   */
  async create(payload) {
    const { ctx } = this;
    this.validatePayload(payload);

    const banner = await ctx.model.SysH5Config.create({
      config_type: 1,
      title: payload.title || 'Banner',
      cover_image: payload.image || payload.cover_image,
      extra: { linkUrl: payload.linkUrl || payload.link_url },
      sort: payload.sort || 0,
      status: payload.status !== undefined ? payload.status : 1,
      remark: payload.remark,
    });
    return this.formatBanner(banner);
  }

  /**
   * 更新轮播图
   * @param {number} id 轮播ID
   * @param {Object} payload 轮播图数据
   * @return {Object} 更新后的轮播图
   */
  async update(id, payload) {
    const { ctx } = this;
    const banner = await ctx.model.SysH5Config.findOne({
      where: { id, config_type: 1, is_deleted: 0 },
    });
    if (!banner) {
      ctx.throw(404, '轮播图不存在');
    }

    const updateData = {};
    if (payload.title) updateData.title = payload.title;
    if (payload.image || payload.cover_image) updateData.cover_image = payload.image || payload.cover_image;
    if (payload.linkUrl !== undefined || payload.link_url !== undefined) {
      updateData.extra = { ...banner.extra, linkUrl: payload.linkUrl || payload.link_url };
    }
    if (payload.sort !== undefined) updateData.sort = payload.sort;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.remark !== undefined) updateData.remark = payload.remark;

    await banner.update(updateData);
    return this.formatBanner(banner);
  }

  /**
   * 删除轮播图
   * @param {number} id 轮播ID
   */
  async destroy(id) {
    const { ctx } = this;
    const banner = await ctx.model.SysH5Config.findOne({
      where: { id, config_type: 1, is_deleted: 0 },
    });
    if (!banner) {
      ctx.throw(404, '轮播图不存在');
    }

    await banner.update({ is_deleted: 1 });
  }

  /**
   * 格式化输出
   * @param item
   */
  formatBanner(item) {
    const data = item.toJSON ? item.toJSON() : item;
    return {
      id: data.id,
      title: data.title,
      image: data.cover_image,
      imageUrl: data.cover_image,
      linkUrl: data.extra ? data.extra.linkUrl : '',
      sort: data.sort,
      status: data.status,
      remark: data.remark,
      create_time: data.create_time,
    };
  }

  /**
   * 校验轮播图必填字段
   * @param {Object} payload 轮播图数据
   */
  validatePayload(payload) {
    const { ctx } = this;
    ctx.assert(payload.image || payload.cover_image, 422, '图片地址不能为空');
  }
}

module.exports = BannerService;
module.exports.DEFAULT_BANNER_IMAGE = DEFAULT_BANNER_IMAGE;
