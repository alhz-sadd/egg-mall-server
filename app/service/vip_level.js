'use strict';

const Service = require('egg').Service;

class VipLevelService extends Service {
  /**
   * 获取VIP等级列表
   * @param root0
   * @param root0.shop_id
   * @param root0.is_enable
   */
  async list({ shop_id, is_enable }) {
    const { ctx } = this;
    const where = { shop_id };

    if (is_enable !== undefined && is_enable !== '') {
      where.is_enable = Number(is_enable);
    }

    return await ctx.model.ShopVipLevel.findAll({
      where,
      order: [
        [ 'sort', 'ASC' ],
        [ 'level', 'ASC' ],
      ],
    });
  }

  /**
   * 新增VIP等级
   * @param payload
   */
  async create(payload) {
    const { ctx } = this;
    return await ctx.model.ShopVipLevel.create(payload);
  }

  /**
   * 修改VIP等级
   * @param id
   * @param shop_id
   * @param payload
   */
  async update(id, shop_id, payload) {
    const { ctx } = this;
    const item = await ctx.model.ShopVipLevel.findOne({
      where: { id, shop_id },
    });

    if (!item) {
      ctx.throw(404, '该VIP等级配置不存在');
    }

    return await item.update(payload);
  }

  /**
   * 删除VIP等级
   * @param id
   * @param shop_id
   */
  async destroy(id, shop_id) {
    const { ctx } = this;
    const item = await ctx.model.ShopVipLevel.findOne({
      where: { id, shop_id },
    });

    if (!item) {
      ctx.throw(404, '该VIP等级配置不存在');
    }

    await item.destroy();
    return true;
  }

  /**
   * 自动复制 A 端模板到新店铺
   * @param new_shop_id
   * @param transaction
   */
  async copyTemplateToShop(new_shop_id, transaction) {
    const { ctx } = this;

    const templates = await ctx.model.ShopVipLevel.findAll({
      where: { shop_id: 0 },
      transaction,
    });

    if (templates.length === 0) return;

    const newVips = templates.map(tpl => {
      return {
        shop_id: new_shop_id,
        level: tpl.level,
        level_name: tpl.level_name,
        need_total_recharge: tpl.need_total_recharge,
        benefit: tpl.benefit,
        sort: tpl.sort,
        is_enable: tpl.is_enable,
      };
    });

    await ctx.model.ShopVipLevel.bulkCreate(newVips, { transaction });
  }

  /**
   * 同步 A 端模板到指定店铺
   * @param shop_id
   */
  async syncTemplateToShop(shop_id) {
    const { ctx } = this;
    const t = await ctx.model.transaction();
    try {
      // 1. 检查店铺是否存在
      const shop = await ctx.model.Shop.findByPk(shop_id, { transaction: t });
      if (!shop) {
        ctx.throw(404, '店铺不存在');
      }

      // 2. 删除该店铺现有的 VIP 配置
      await ctx.model.ShopVipLevel.destroy({
        where: { shop_id },
        transaction: t,
      });

      // 3. 复制最新的平台模板
      await this.copyTemplateToShop(shop_id, t);

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * 修改指定用户的 VIP 等级
   * @param shop_id
   * @param user_id
   * @param vip_level
   */
  async updateUserVip(shop_id, user_id, vip_level) {
    const { ctx } = this;

    // 1. 检查用户是否存在且属于该店铺
    const user = await ctx.model.SysUser.findOne({
      where: { user_id, shop_id, is_deleted: 0 },
    });
    if (!user) {
      ctx.throw(404, '用户不存在或不属于该店铺');
    }

    // 2. 检查 VIP 等级是否存在
    const vip = await ctx.model.ShopVipLevel.findOne({
      where: { shop_id, level: vip_level, is_enable: 1 },
    });
    if (!vip) {
      ctx.throw(400, '该 VIP 等级未在店铺启用');
    }

    // 3. 更新用户 VIP 等级
    await user.update({ vip_level });
    return true;
  }

  /**
   * 根据充值金额计算用户应有的 VIP 等级
   * @param shop_id
   * @param total_recharge
   */
  async calculateUserVip(shop_id, total_recharge) {
    const { ctx } = this;

    // 获取该店铺所有启用的 VIP 等级，按金额降序排列
    const levels = await ctx.model.ShopVipLevel.findAll({
      where: {
        shop_id,
        is_enable: 1,
      },
      order: [[ 'need_total_recharge', 'DESC' ], [ 'level', 'DESC' ]],
    });

    if (levels.length === 0) return 0;

    // 找到第一个满足条件的等级（因为是降序，所以是最高等级）
    // 包含 total_recharge 为 0 的场景（如果后台配置 VIP1 的门槛也是 0）
    for (const item of levels) {
      if (Number(total_recharge) >= Number(item.need_total_recharge)) {
        return item.level;
      }
    }

    return 0;
  }

  /**
   * 刷新用户的 VIP 等级 (通常在充值审核通过后，或者新注册时调用)
   * @param user_id
   */
  async refreshUserVip(user_id) {
    const { ctx } = this;

    const user = await ctx.model.SysUser.findByPk(user_id);
    if (!user || user.user_type !== 4) return; // 只处理 C 端用户

    // 1. 计算累计充值金额 (审核通过的充值订单)
    const totalRecharge = await ctx.model.UserRecharge.sum('user_receive_amount', {
      where: {
        user_id,
        status: 2, // 审核通过
      },
    }) || 0;

    // 2. 根据规则计算等级 (即使充值为0，如果店铺配置最低等级要求为0，也会升至对应的VIP级别)
    const newLevel = await this.calculateUserVip(user.shop_id, totalRecharge);

    // 3. 如果等级有变动，则更新
    if (user.vip_level !== newLevel) {
      await user.update({ vip_level: newLevel });
    }

    return newLevel;
  }

  /**
   * 获取指定的 VIP 等级详情
   * @param shop_id
   * @param level
   */
  async getVipLevelDetails(shop_id, level) {
    const { ctx } = this;
    return await ctx.model.ShopVipLevel.findOne({
      where: { shop_id, level, is_enable: 1 },
    });
  }
}

module.exports = VipLevelService;
