'use strict';

const Controller = require('egg').Controller;

class H5ConfigController extends Controller {
  // 通用列表处理
  async _list(configType) {
    const { ctx } = this;
    const query = { ...ctx.query, config_type: configType };
    
    // 如果路由带有 shop_id，则覆盖；如果没有带，则强制设为0，只返回平台模板
    if (ctx.params.shop_id !== undefined) {
      query.shop_id = ctx.params.shop_id;
    } else {
      query.shop_id = 0;
    }

    const result = await ctx.service.h5Config.list(query);

    // 兼容前端字段名并精简返回字段
    if (result.list) {
      result.list = result.list.map(data => {
        // 兼容 Sequelize 可能的 camelCase 转换
        const rawImg = data.cover_image || data.coverImage || '';

        // 如果是商品挂载且没有封面图，则使用商品的封面图
        if ([ 4, 5 ].includes(Number(data.config_type)) && !rawImg && data.goods) {
          data.cover_image = data.goods.cover_image;
        } else {
          data.cover_image = rawImg;
        }

        // 统一输出 image, imageUrl, cover_image 确保全兼容
        const finalImg = data.cover_image || '';
        data.image = finalImg;
        data.imageUrl = finalImg;
        data.cover_image = finalImg;

        // 根据用户要求，针对 Banner (configType=1) 精简字段
        if (Number(configType) === 1) {
          // 将 extra 中的 linkUrl 提取到外层
          if (data.extra) {
            let extraObj = data.extra;
            if (typeof extraObj === 'string') {
              try { extraObj = JSON.parse(extraObj); } catch (e) { extraObj = {}; }
            }
            if (extraObj.linkUrl) data.linkUrl = extraObj.linkUrl;
          }
          // 移除不需要的冗余字段 (仅针对 Banner)
          delete data.config_type;
          delete data.content;
          delete data.cover_image;
          delete data.extra;
          delete data.imageUrl;
          delete data.coverImage;
        } else {
          // 其他类型移除 Sequelize 可能自动生成的 camelCase 冗余字段
          delete data.coverImage;
        }
        return data;
      });
    }

    ctx.body = { code: 200, message: 'success', data: result };
  }

  // 通用新增处理
  async _add(configType) {
    const { ctx, service } = this;
    let body = ctx.request.body;
    const shopId = ctx.params.shop_id;

    // 如果前端直接传的是图片数组 ["url"]，则将其转换为对象格式
    if (Array.isArray(body)) {
      body = { image: body[0] };
    } else {
      body = { ...body };
      // 兼容 {"images": ["url"]} 格式
      if (Array.isArray(body.images) && body.images.length > 0 && !body.image) {
        body.image = body.images[0];
      }
    }

    // 处理文件上传
    const files = ctx.request.files;
    if (files && files.length) {
      const uploadRes = await service.upload.image(files[0], 'h5configs');
      body.cover_image = uploadRes.url;
    }

    // 兼容前端传入的 image 或 imageUrl
    if (body.image && !body.cover_image) body.cover_image = body.image;
    if (body.imageUrl && !body.cover_image) body.cover_image = body.imageUrl;

    // 针对首页商品(4)和任务商品(5)的特殊处理
    // 逻辑已迁移到 goods 表，此处逻辑废弃，但为了兼容性暂时保留校验逻辑的清理
    /*
    if ([ 4, 5 ].includes(Number(configType))) {
      ...
    }
    */

    // 必填字段校验与默认值 (数据库 title 不能为空)
    if (!body.title) {
      const typeNames = { 1: 'Banner', 2: '公告', 3: '规则', 6: '服务入口', 7: '分享图' };
      body.title = '未命名' + (typeNames[configType] || '配置');
    }

    if (body.shop_id === undefined) {
      body.shop_id = shopId !== undefined ? shopId : 0; // 默认全局，如果有路由参数则使用路由参数
    }

    // 如果是店铺模板(shop_id > 0)并且需要启用(status=1)，处理“只能有一个启用”逻辑
    const targetStatus = body.status !== undefined ? Number(body.status) : 1;
    if (targetStatus === 1 && body.shop_id !== 0) {
      await ctx.model.SysH5Config.update(
        { status: 0 },
        { where: { config_type: configType, shop_id: body.shop_id, is_deleted: 0 } }
      );
    }

    const payload = { ...body, config_type: configType };
    const adminId = ctx.state.adminInner.adminInnerId;
    const result = await ctx.service.h5Config.create(payload, adminId);
    ctx.body = { code: 200, message: '新增成功', data: result };
  }

  // 通用编辑处理
  async _edit() {
    const { ctx, service } = this;
    const body = { ...ctx.request.body };
    const id = ctx.params.id || body.id;
    const shopId = ctx.params.shop_id;
    ctx.assert(id, 422, 'id 不能为空');

    // 处理文件上传
    const files = ctx.request.files;
    if (files && files.length) {
      const uploadRes = await service.upload.image(files[0], 'h5configs');
      body.cover_image = uploadRes.url;
    }

    // 兼容前端传入的 image 或 imageUrl
    if (body.image && !body.cover_image) body.cover_image = body.image;
    if (body.imageUrl && !body.cover_image) body.cover_image = body.imageUrl;

    // 针对首页商品(4)和任务商品(5)的特殊处理
    const item = await ctx.service.h5Config.detail(id);
    const configType = item.config_type;
    if ([ 4, 5 ].includes(Number(configType))) {
      const goodsId = body.goods_id || body.goodsId || (body.extra && body.extra.goodsId);
      if (goodsId) {
        const goods = await ctx.model.Goods.findOne({ where: { goods_id: goodsId, is_deleted: 0 } });
        ctx.assert(goods, 422, '关联商品不存在');
        body.extra = { ...item.extra, ...body.extra, goodsId: Number(goodsId) };
        if (!body.title && !item.title) body.title = goods.goods_name;
      }
    }

    if (body.shop_id === undefined) {
      body.shop_id = shopId !== undefined ? shopId : item.shop_id;
    }

    // 如果是店铺模板(shop_id > 0)并且需要启用(status=1)，处理“只能有一个启用”逻辑
    const targetStatus = body.status !== undefined ? Number(body.status) : item.status;
    if (targetStatus === 1 && body.shop_id !== 0) {
      await ctx.model.SysH5Config.update(
        { status: 0 },
        { where: { config_type: configType, shop_id: body.shop_id, is_deleted: 0 } }
      );
    }

    const payload = body;
    const adminId = ctx.state.adminInner.adminInnerId;
    await ctx.service.h5Config.update(id, payload, adminId);
    ctx.body = { code: 200, message: '编辑成功' };
  }

  // 通用删除处理
  async _remove() {
    const { ctx } = this;
    const id = ctx.params.id || ctx.query.id;
    ctx.assert(id, 422, 'id 不能为空');
    await ctx.service.h5Config.destroy(id);
    ctx.body = { code: 200, message: '删除成功' };
  }

  // 通用状态更新处理
  async _updateStatus(configType) {
    const { ctx } = this;
    const id = ctx.params.id;
    const { status } = ctx.request.body;
    const shopId = ctx.params.shop_id || 0;

    if (!id) ctx.throw(400, '必须传递模板的 id');
    if (status === undefined) ctx.throw(400, '必须传递 status 字段');

    // 只能启用一条逻辑（仅店铺生效，全局不受限）
    if (Number(status) === 1 && shopId !== 0) {
      await ctx.model.SysH5Config.update(
        { status: 0 },
        { where: { config_type: configType, shop_id: shopId, is_deleted: 0 } }
      );
    }
    
    await ctx.model.SysH5Config.update(
      { status: Number(status) },
      { where: { id, config_type: configType, shop_id: shopId, is_deleted: 0 } }
    );

    ctx.body = { code: 200, message: '状态更新成功' };
  }

  // 通用绑定模板处理
  async _bindTemplate(configType, templateName = '模板') {
    const { ctx } = this;
    const shopId = ctx.params.shop_id;
    const { template_id } = ctx.request.body;

    if (!shopId) ctx.throw(400, '必须提供 shopId');
    if (!template_id) ctx.throw(400, '必须传递 template_id 字段');

    // 获取平台模板
    const template = await ctx.model.SysH5Config.findOne({
      where: { id: template_id, config_type: configType, shop_id: 0, is_deleted: 0 },
    });

    if (!template) ctx.throw(404, `指定的平台${templateName}不存在`);

    // 禁用当前店铺其他同类型模板
    await ctx.model.SysH5Config.update(
      { status: 0 },
      { where: { config_type: configType, shop_id: shopId, status: 1, is_deleted: 0 } }
    );

    const adminId = ctx.state.adminInner.adminInnerId;
    
    // 创建店铺模板并启用
    const newTemplate = await ctx.model.SysH5Config.create({
      config_type: configType,
      title: template.title,
      cover_image: template.cover_image,
      content: template.content,
      extra: template.extra,
      sort: template.sort,
      status: 1,
      shop_id: shopId,
      create_user_id: adminId,
      update_user_id: adminId,
    });

    ctx.body = { code: 200, message: '绑定模板成功', data: newTemplate };
  }

  // Banner
  async bannerList() { await this._list(1); }
  async bannerAdd() { await this._add(1); }
  async bannerEdit() { await this._edit(); }
  async bannerRemove() { await this._remove(); }

  // 公告
  async noticeList() { await this._list(2); }
  
  async noticeAdd() {
    const { ctx } = this;
    if (ctx.request.body.notices && Array.isArray(ctx.request.body.notices)) {
      ctx.request.body.extra = { ...(ctx.request.body.extra || {}), notices: ctx.request.body.notices };
    }
    await this._add(2);
  }

  async noticeEdit() {
    const { ctx } = this;
    if (ctx.request.body.notices && Array.isArray(ctx.request.body.notices)) {
      ctx.request.body.extra = { ...(ctx.request.body.extra || {}), notices: ctx.request.body.notices };
    }
    await this._edit();
  }

  async noticeRemove() { await this._remove(); }
  async noticeUpdateStatus() { await this._updateStatus(2); }
  async noticeBind() { await this._bindTemplate(2, '公告模板'); }

  // 规则
  async ruleList() { await this._list(3); }
  async ruleAdd() { await this._add(3); }
  async ruleEdit() { await this._edit(); }
  async ruleRemove() { await this._remove(); }

  // 服务入口
  async serviceEntryList() { await this._list(6); }
  async serviceEntryAdd() { await this._add(6); }
  async serviceEntryEdit() { await this._edit(); }
  async serviceEntryRemove() { await this._remove(); }

  // 分享图
  async shareImageList() { await this._list(7); }
  
  async shareImageAdd() {
    const { ctx } = this;
    const body = ctx.request.body;
    ctx.assert(body.title, 422, '模板名称不能为空');
    ctx.assert(body.cover_image || body.image || body.imageUrl, 422, '分享图不能为空');
    await this._add(7);
  }
  
  async shareImageEdit() {
    const { ctx } = this;
    const body = ctx.request.body;
    if (body.title !== undefined) {
      ctx.assert(body.title, 422, '模板名称不能为空');
    }
    if (body.cover_image !== undefined || body.image !== undefined || body.imageUrl !== undefined) {
      ctx.assert(body.cover_image || body.image || body.imageUrl, 422, '分享图不能为空');
    }
    await this._edit();
  }
  
  async shareImageRemove() { await this._remove(); }
  
  async shareImageUpdateStatus() { await this._updateStatus(7); }

  async shareImageBind() { await this._bindTemplate(7, '分享图模板'); }
}

module.exports = H5ConfigController;
