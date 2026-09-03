'use strict';

const Service = require('egg').Service;
const { Op } = require('sequelize');

/**
 * 商品服务层
 */
class ProductService extends Service {
  /**
   * 获取服务基础URL
   * @return {string} 基础URL
   */
  getBaseUrl() {
    const { ctx } = this;
    const protocol = ctx.request.protocol || 'http';
    const host = ctx.request.header.host || 'localhost:7001';
    return `${protocol}://${host}`;
  }

  /**
   * 解析图片URL，将本地路径转换为完整URL
   * @param {string} url 原始URL
   * @return {string} 解析后的URL
   */
  resolveImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // 如果是本地IP的URL，替换为当前请求的host
      return url.replace(/http:\/\/127\.0\.0\.1:\d+/g, this.getBaseUrl().replace(/\/$/, ''));
    }
    if (url.startsWith('/')) {
      return this.getBaseUrl().replace(/\/$/, '') + url;
    }
    return url;
  }

  /**
   * 获取商品列表
   * @param {Object} query 查询参数
   * @return {Object} 分页结果
   */
  async list(query = {}) {
    const { ctx } = this;
    const { type, keyword, page = 1, page_size = 10, locale } = query;

    const where = { status: 1 };
    if (type !== undefined && type !== '0' && type !== 0) {
      where.type = type;
    }
    if (keyword) {
      where.title = { [Op.like]: `%${keyword}%` };
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.Product.findAndCountAll({
      where,
      order: [[ 'sort', 'ASC' ], [ 'id', 'DESC' ]],
      offset,
      limit,
    });

    return {
      list: rows.map(item => this.formatProduct(item, locale)),
      pagination: {
        total: count,
        page: Number(page),
        page_size: Number(page_size),
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * 管理端商品列表
   * 返回全部状态，支持状态筛选
   * @param {Object} query 查询参数
   * @return {Object} 分页结果
   */
  async adminList(query = {}) {
    const { ctx } = this;
    const { type, keyword, status, price_min, price_max, page = 1, page_size = 10, locale } = query;

    const where = {};
    if (type !== undefined && type !== '0' && type !== 0) {
      where.type = type;
    }
    if (keyword) {
      where.title = { [Op.like]: `%${keyword}%` };
    }
    if (status !== undefined) {
      where.status = status;
    }
    if (price_min !== undefined || price_max !== undefined) {
      where.price = {};
      if (price_min !== undefined) {
        where.price[Op.gte] = Number(price_min);
      }
      if (price_max !== undefined) {
        where.price[Op.lte] = Number(price_max);
      }
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.Product.findAndCountAll({
      where,
      order: [[ 'sort', 'ASC' ], [ 'id', 'DESC' ]],
      offset,
      limit,
    });

    return {
      list: rows.map(item => this.formatProduct(item, locale)),
      pagination: {
        total: count,
        page: Number(page),
        page_size: Number(page_size),
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * 获取商品详情
   * @param {number} id 商品ID
   * @param {string} locale 语言环境
   * @return {Object} 商品详情
   */
  async detail(id, locale) {
    const { ctx } = this;
    const product = await ctx.model.Product.findByPk(id);
    if (!product || product.status !== 1) {
      ctx.throw(404, '商品不存在或已下架');
    }
    return this.formatProduct(product, locale);
  }

  /**
   * 创建商品
   * @param {Object} payload 商品数据
   * @return {Object} 创建后的商品
   */
  async create(payload) {
    const { ctx } = this;
    this.validatePayload(payload);

    const product = await ctx.model.Product.create(payload);
    return this.formatProduct(product);
  }

  /**
   * 更新商品
   * @param {number} id 商品ID
   * @param {Object} payload 商品数据
   * @return {Object} 更新后的商品
   */
  async update(id, payload) {
    const { ctx } = this;
    const product = await ctx.model.Product.findByPk(id);
    if (!product) {
      ctx.throw(404, '商品不存在');
    }

    await product.update(payload);
    return this.formatProduct(product);
  }

  /**
   * 删除商品（物理删除）
   * @param {number} id 商品ID
   */
  async destroy(id) {
    const { ctx } = this;
    const product = await ctx.model.Product.findByPk(id);
    if (!product) {
      ctx.throw(404, '商品不存在');
    }

    await product.destroy();
  }

  /**
   * 校验商品必填字段
   * @param {Object} payload 商品数据
   */
  validatePayload(payload) {
    const { ctx } = this;
    ctx.assert(payload.title, 422, '商品名称不能为空');
    ctx.assert(payload.price !== undefined, 422, '商品价格不能为空');
  }

  /**
   * 格式化商品返回数据，解析图片URL并根据多语言替换标题和描述
   * @param {Object} product 商品实例
   * @param {string} locale 语言环境 (如 'en-US')
   * @return {Object} 格式化后的商品
   */
  formatProduct(product, locale = 'zh-CN') {
    const { ctx } = this;
    const data = product.toJSON();
    // 解析图片URL，将本地路径转换为完整URL
    if (data.img) {
      data.img = this.resolveImageUrl(data.img);
    }
    if (data.images && Array.isArray(data.images)) {
      data.images = data.images.map(url => this.resolveImageUrl(url));
    }

    // 多语言处理
    if (locale !== 'zh-CN') {
      // 1. 优先尝试读取数据库自动翻译的 translations 字段
      if (data.translations && data.translations[locale]) {
        const trans = data.translations[locale];
        if (trans.title) data.title = trans.title;
        if (trans.description) data.description = trans.description;
      } else {
        // 2. 兜底策略：使用之前的全局 ctx.__ 字典（用于未自动翻译的老数据或特殊手动配置）
        if (ctx.__) {
          data.title = ctx.__(data.title) || data.title;
          if (data.description) {
            data.description = ctx.__(data.description) || data.description;
          }
        }
      }
    }

    // 保留 translations 字段，方便前端（尤其是管理端）在列表中直接读取或展示各语种翻译
    return data;
  }
}

module.exports = ProductService;
