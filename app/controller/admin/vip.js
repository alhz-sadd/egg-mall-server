'use strict';

const Controller = require('egg').Controller;

/**
 * @controller AdminVip 管理端 - VIP管理
 */
class VipController extends Controller {
  /**
   * 获取 VIP 列表 (支持分页和名称/等级搜索)
   */
  async index() {
    const { ctx } = this;
    const { page = 1, limit = 10, vipName, vipLv } = ctx.query;
    const { Op } = ctx.app.Sequelize;

    const where = {};
    if (vipName) {
      where.vipName = { [Op.like]: `%${vipName}%` };
    }
    if (vipLv) {
      where.vipLv = vipLv;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await ctx.model.Vip.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit),
      order: [
        [ 'vipLv', 'ASC' ],
        [ 'created_at', 'DESC' ],
      ],
    });

    ctx.body = {
      code: 200,
      list: result.rows,
      total: result.count,
      msg: '获取成功',
    };
  }

  /**
   * 获取 VIP 详情
   */
  async show() {
    const { ctx } = this;
    const id = ctx.params.id;
    const vip = await ctx.model.Vip.findByPk(id);

    if (!vip) {
      ctx.body = { code: 404, msg: 'VIP不存在' };
      return;
    }

    ctx.body = {
      code: 200,
      data: vip,
      msg: '获取成功',
    };
  }

  /**
   * 新增 VIP
   */
  async create() {
    const { ctx } = this;
    const { vipName, vipLv, policyName, policyId } = ctx.request.body;

    if (!vipName || vipLv === undefined) {
      ctx.body = { code: 400, msg: 'vipName 和 vipLv 是必填项' };
      return;
    }

    // 检查是否存在同等级或同名
    const exist = await ctx.model.Vip.findOne({
      where: {
        [ctx.app.Sequelize.Op.or]: [
          { vipName },
          { vipLv },
        ],
      },
    });
    if (exist) {
      ctx.body = { code: 400, msg: 'VIP名称或等级已存在' };
      return;
    }

    const vip = await ctx.model.Vip.create({
      vipName,
      vipLv,
      policyName: policyName || '默认策略',
      policyId: policyId || 0,
    });

    ctx.body = {
      code: 200,
      data: vip,
      msg: '创建成功',
    };
  }

  /**
   * 修改 VIP
   */
  async update() {
    const { ctx } = this;
    const id = ctx.params.id;
    const { vipName, vipLv, policyName, policyId } = ctx.request.body;

    const vip = await ctx.model.Vip.findByPk(id);
    if (!vip) {
      ctx.body = { code: 404, msg: 'VIP不存在' };
      return;
    }

    // 检查名称或等级是否与其他冲突
    if (vipName || vipLv !== undefined) {
      const exist = await ctx.model.Vip.findOne({
        where: {
          id: { [ctx.app.Sequelize.Op.ne]: id },
          [ctx.app.Sequelize.Op.or]: [
            vipName ? { vipName } : null,
            vipLv !== undefined ? { vipLv } : null,
          ].filter(Boolean),
        },
      });
      if (exist) {
        ctx.body = { code: 400, msg: 'VIP名称或等级已存在' };
        return;
      }
    }

    await vip.update({
      vipName: vipName || vip.vipName,
      vipLv: vipLv !== undefined ? vipLv : vip.vipLv,
      policyName: policyName !== undefined ? policyName : vip.policyName,
      policyId: policyId !== undefined ? policyId : vip.policyId,
    });

    ctx.body = {
      code: 200,
      data: vip,
      msg: '更新成功',
    };
  }

  /**
   * 删除 VIP
   */
  async destroy() {
    const { ctx } = this;
    const id = ctx.params.id;

    const vip = await ctx.model.Vip.findByPk(id);
    if (!vip) {
      ctx.body = { code: 404, msg: 'VIP不存在' };
      return;
    }

    await vip.destroy();
    ctx.body = {
      code: 200,
      msg: '删除成功',
    };
  }
}

module.exports = VipController;
