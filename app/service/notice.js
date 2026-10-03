'use strict';

const Service = require('egg').Service;

/**
 * 公告服务层 (仅供C端使用)
 */
class NoticeService extends Service {
  /**
   * 获取公告列表 (C端)
   * 优先拉取当前店铺绑定的启用公告模板，若无则拉取平台全局的启用公告模板。
   * 然后从该模板的 extra.notices 中读取公告数组，并在内存中进行关键词搜索和分页。
   * @param {Object} query 查询参数
   * @param {Number} shopId 店铺ID
   * @return {Object} 分页列表
   */
  async list(query = {}, shopId = 0) {
    const { ctx } = this;
    const { keyword, page = 1, page_size = 10 } = query;

    // 1. 查找当前店铺生效的公告模板
    let activeTemplate = await ctx.model.SysH5Config.findOne({
      where: { config_type: 2, status: 1, is_deleted: 0, shop_id: shopId },
      order: [[ 'id', 'DESC' ]],
    });

    // 2. 如果当前店铺没有绑定的公告模板，则尝试拉取全局生效的公告模板
    if (!activeTemplate && shopId !== 0) {
      activeTemplate = await ctx.model.SysH5Config.findOne({
        where: { config_type: 2, status: 1, is_deleted: 0, shop_id: 0 },
        order: [[ 'id', 'DESC' ]],
      });
    }

    let notices = [];
    if (activeTemplate) {
      // 如果是新版模板模式，公告存在 extra.notices 数组中
      if (activeTemplate.extra && Array.isArray(activeTemplate.extra.notices)) {
        notices = activeTemplate.extra.notices;
      } 
      // 兼容老版本：如果没有 extra.notices，但本身有 content，则将其作为一条公告
      else if (activeTemplate.content) {
        notices = [{
          title: activeTemplate.title,
          content: activeTemplate.content,
          create_time: activeTemplate.create_time,
        }];
      }
    }

    // 3. 关键词过滤
    if (keyword) {
      notices = notices.filter(n => n.title && n.title.includes(keyword));
    }

    // 4. 内存分页
    const total = notices.length;
    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);
    const paginatedNotices = notices.slice(offset, offset + limit);

    return {
      list: paginatedNotices,
      pagination: {
        total,
        page: Number(page),
        page_size: Number(page_size),
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

module.exports = NoticeService;
