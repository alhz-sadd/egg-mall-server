'use strict';

const Service = require('egg').Service;
const { Op } = require('sequelize');

/**
 * 客服服务层
 */
class CustomerServiceService extends Service {
  /**
   * 获取客服列表 (C端)
   * @param {Object} query 查询参数
   * @return {Object} 分页列表
   */
  async list(query = {}) {
    const { ctx, app } = this;
    const { keyword, page = 1, page_size = 10, shop_id, type } = query;

    const where = { status: 1, is_deleted: 0 };
    if (keyword) {
      where.service_name = { [Op.like]: `%${keyword}%` };
    }
    
    // 如果传入了 type (比如 'Telegram')，做类型筛选
    if (type) {
      where.contact_type = type;
    }
    
    // 如果显式传入了 shop_id (即使是0)，则按 shop_id 过滤
    if (shop_id !== undefined) {
      where.shop_id = shop_id;
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.SysH5Service.findAndCountAll({
      where,
      order: [[ 'sort', 'ASC' ], [ 'id', 'DESC' ]],
      offset,
      limit,
    });
    
    // 轮询分配逻辑 (仅在不分页或获取所有时才有意义，但如果在列表接口，可以随机打乱或根据 Redis 计数分配)
    // 这里实现一个基于 Redis 的简单轮询分配逻辑，如果查询结果有多个
    let assignedList = rows;
    
    // 如果前端没有显式要求分页，或者只取一条数据来分配客服 (通常是前端只取1条)
    // 也可以在后端直接做随机返回，避免所有人都加同一个客服
    if (rows.length > 1) {
       // 我们可以在内存里做个简单的随机，或者根据时间戳，让前端获取到的第一个始终不同
       // 下面提供一种基于当前时间的伪随机位移，让列表循环滚动，实现"平均返回"
       // 例如：第一秒 [A, B, C], 第二秒 [B, C, A]
       const shift = Math.floor(Date.now() / 1000) % rows.length;
       assignedList = rows.slice(shift).concat(rows.slice(0, shift));
    }

    return {
      list: assignedList,
      pagination: {
        total: count,
        page: Number(page),
        page_size: Number(page_size),
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * 管理端客服列表
   * @param {Object} query 查询参数
   * @return {Object} 分页列表
   */
  async adminList(query = {}) {
    const { ctx } = this;
    const { keyword, status, page = 1, page_size = 10 } = query;

    const where = { is_deleted: 0 };
    if (keyword) {
      where.service_name = { [Op.like]: `%${keyword}%` };
    }
    if (status !== undefined && status !== null && status !== '') {
      where.status = Number(status);
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.SysH5Service.findAndCountAll({
      where,
      order: [[ 'sort', 'ASC' ], [ 'id', 'DESC' ]],
      offset,
      limit,
    });

    return {
      list: rows,
      pagination: {
        total: count,
        page: Number(page),
        page_size: Number(page_size),
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * 获取客服详情
   * @param {number} id 客服ID
   * @return {Object} 客服详情
   */
  async detail(id) {
    const { ctx } = this;
    const customerService = await ctx.model.SysH5Service.findOne({
      where: { id, is_deleted: 0 },
    });
    if (!customerService || customerService.status !== 1) {
      ctx.throw(404, 'customer_service.not_exist_or_disabled');
    }
    return customerService;
  }

  /**
   * 创建客服
   * @param {Object} payload 客服数据
   * @return {Object} 创建后的客服
   */
  async create(payload) {
    const { ctx } = this;

    ctx.assert(payload.service_name || payload.name, 422, '客服名称不能为空');
    
    // 如果是 Telegram 类型，且前端没有传入 jump_url，但传了 contact_value (比如 tg号)
    // 我们可以自动拼接 jump_url
    let jumpUrl = payload.jump_url || payload.link || '';
    // 兼容前端可能传字符串的情况，统一转数字（如果传了Telegram等字符串，则按映射转换）
    let contactType = payload.contact_type !== undefined ? payload.contact_type : 1;
    if (contactType === 'Telegram') contactType = 2;
    if (contactType === 'WhatsApp') contactType = 3;
    if (typeof contactType === 'string') contactType = parseInt(contactType, 10);

    const contactValue = payload.contact_value || payload.contact || '';
    
    if (!jumpUrl && contactValue) {
      if (contactType === 2) { 
        // 去除可能的 @ 符号
        const cleanTg = contactValue.replace('@', '');
        jumpUrl = `https://telegram.me/${cleanTg}`;
      } else if (contactType === 3) {
        jumpUrl = `https://api.whatsapp.com/send?phone=${contactValue}&text=`;
      }
    }

    const customerService = await ctx.model.SysH5Service.create({
      service_name: payload.service_name || payload.name,
      avatar: payload.avatar || payload.image,
      contact_type: contactType,
      contact_value: contactValue,
      jump_url: jumpUrl,
      sort: payload.sort || 0,
      status: payload.status !== undefined ? payload.status : 1,
      remark: payload.remark,
    });
    return customerService.toJSON();
  }

  /**
   * 更新客服
   * @param {number} id 客服ID
   * @param {Object} payload 更新数据
   * @return {Object} 更新后的客服
   */
  async update(id, payload) {
    const { ctx } = this;
    const customerService = await ctx.model.SysH5Service.findOne({
      where: { id, is_deleted: 0 },
    });
    if (!customerService) {
      ctx.throw(404, '客服不存在');
    }

    const updateData = {};
    if (payload.service_name || payload.name) updateData.service_name = payload.service_name || payload.name;
    if (payload.avatar || payload.image) updateData.avatar = payload.avatar || payload.image;
    if (payload.contact_type) updateData.contact_type = payload.contact_type;
    if (payload.contact_value || payload.contact) updateData.contact_value = payload.contact_value || payload.contact;
    if (payload.jump_url || payload.link) updateData.jump_url = payload.jump_url || payload.link;
    if (payload.sort !== undefined) updateData.sort = payload.sort;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.remark !== undefined) updateData.remark = payload.remark;
    
    // 如果是 Telegram 或 WhatsApp，且修改了账号，自动更新链接
    let currentType = updateData.contact_type !== undefined ? updateData.contact_type : customerService.contact_type;
    if (currentType === 'Telegram') currentType = 2;
    if (currentType === 'WhatsApp') currentType = 3;
    if (typeof currentType === 'string') currentType = parseInt(currentType, 10);

    const currentContact = updateData.contact_value || customerService.contact_value;
    
    // 如果没有传入新的 jump_url，并且修改了账号或者是新建的需要补全链接
    if (currentContact && !updateData.jump_url && !payload.jump_url) {
      if (currentType === 2) {
        const cleanTg = currentContact.replace('@', '');
        updateData.jump_url = `https://telegram.me/${cleanTg}`;
      } else if (currentType === 3) {
        updateData.jump_url = `https://api.whatsapp.com/send?phone=${currentContact}&text=`;
      }
    }

    await customerService.update(updateData);
    return customerService;
  }

  /**
   * 删除客服
   * @param {number} id 客服ID
   */
  async destroy(id) {
    const { ctx } = this;
    const customerService = await ctx.model.SysH5Service.findOne({
      where: { id, is_deleted: 0 },
    });
    if (!customerService) {
      ctx.throw(404, '客服不存在');
    }

    await customerService.destroy();
  }
}

module.exports = CustomerServiceService;
