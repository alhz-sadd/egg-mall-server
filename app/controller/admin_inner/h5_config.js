'use strict';

const Controller = require('egg').Controller;

class H5ConfigController extends Controller {
  // 通用列表处理
  async _list(configType) {
    const { ctx } = this;
    const query = { ...ctx.query, config_type: configType };
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
      const typeNames = { 1: 'Banner', 2: '公告', 3: '规则', 6: '服务入口' };
      body.title = '未命名' + (typeNames[configType] || '配置');
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

  // Banner
  async bannerList() { await this._list(1); }
  async bannerAdd() { await this._add(1); }
  async bannerEdit() { await this._edit(); }
  async bannerRemove() { await this._remove(); }

  // 公告
  async noticeList() { await this._list(2); }
  async noticeAdd() { await this._add(2); }
  async noticeEdit() { await this._edit(); }
  async noticeRemove() { await this._remove(); }

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
}

module.exports = H5ConfigController;
