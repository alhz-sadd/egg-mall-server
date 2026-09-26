'use strict';

const Service = require('egg').Service;

class ShopService extends Service {
  /**
   * 创建店铺
   * @param {Object} payload 店铺资料
   * @return {Promise<Object>} 店铺对象
   */
  async create(payload) {
    const { ctx } = this;
    const { shop_name, contact_person, contact_phone, remark, status } = payload;

    if (!shop_name) {
      ctx.throw(422, '店铺名称不能为空');
    }

    // 检查 shop_name 唯一性
    const existing = await ctx.model.Shop.findOne({ where: { shop_name, is_deleted: 0 } });
    if (existing) {
      ctx.throw(422, '店铺名称已存在');
    }

    // 生成店铺编号
    const shop_no = `SH${Date.now()}${Math.floor(Math.random() * 1000)}`;

    let shop;
    // 使用事务保证店铺和配置同时创建
    const t = await ctx.model.transaction();
    try {
      shop = await ctx.model.Shop.create({
        shop_name,
        shop_no,
        contact_person,
        contact_phone,
        status: status !== undefined ? status : 1,
        remark,
      }, { transaction: t });

      // 1. 自动同步平台默认 VIP 模板到该新店铺
      if (ctx.service.vipLevel && ctx.service.vipLevel.copyTemplateToShop) {
        await ctx.service.vipLevel.copyTemplateToShop(shop.shop_id, t);
      }

      // 2. 自动同步平台默认基础参数配置到该新店铺
      if (ctx.service.shopConfig && ctx.service.shopConfig.copyTemplateToShop) {
        await ctx.service.shopConfig.copyTemplateToShop(shop.shop_id, t);
      }

      // 3. 自动同步平台默认支付渠道模板到该新店铺
      if (ctx.service.payChannel && ctx.service.payChannel.copyTemplateToShop) {
        await ctx.service.payChannel.copyTemplateToShop(shop.shop_id, t);
      }

      await t.commit();
    } catch (error) {
      await t.rollback();
      ctx.logger.error('[创建店铺] 失败:', error);
      ctx.throw(500, error.message || '创建店铺及初始化配置失败');
    }

    return shop;
  }

  /**
   * 更新店铺
   * @param {number} shop_id 店铺ID
   * @param {Object} payload 更新内容
   */
  async update(shop_id, payload) {
    const { ctx } = this;
    const shop = await ctx.model.Shop.findByPk(shop_id);
    if (!shop || shop.is_deleted === 1) {
      ctx.throw(404, '店铺不存在');
    }

    const updateData = {};
    const fields = [
      'shop_name', 'contact_person', 'contact_phone', 'province', 'city',
      'district', 'address', 'logo', 'business_scope', 'expire_time',
      'status', 'settlement_type', 'remark', 'update_user_id',
    ];

    fields.forEach(field => {
      if (payload[field] !== undefined) {
        updateData[field] = payload[field];
      }
    });

    // 如果修改了 shop_no，需要校验唯一性
    if (payload.shop_no && payload.shop_no !== shop.shop_no) {
      const existing = await ctx.model.Shop.findOne({
        where: { shop_no: payload.shop_no, is_deleted: 0, shop_id: { [ctx.app.Sequelize.Op.ne]: shop_id } },
      });
      if (existing) {
        ctx.throw(422, '店铺编号已存在');
      }
      updateData.shop_no = payload.shop_no;
    }

    await shop.update(updateData);
    return shop;
  }

  /**
   * 获取店铺详情
   * @param {number} shop_id 店铺ID
   * @param {Object} options 附加选项，如 operator (当前操作人)
   */
  async detail(shop_id, options = {}) {
    const { ctx, app } = this;
    const { Op } = app.Sequelize;
    const shop = await ctx.model.Shop.findOne({
      where: { shop_id, is_deleted: 0 },
    });

    if (!shop) return null;

    const result = shop.toJSON();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    // 构建基础条件
    const baseWhere = { shop_id, is_deleted: 0 };
    const rechargeWhere = { shop_id, status: 1 };
    const withdrawWhere = { shop_id, status: 1 };

    // B端数据隔离：如果传入了 operator，且 user_type = 3（业务员），则只能看自己发展的客户数据
    if (options.operator && options.operator.user_type === 3) {
      baseWhere.salesman_user_id = options.operator.userId || options.operator.user_id;

      // 充值和提现也需要通过 user_id 过滤（即该业务员的客户）
      const customerRelations = await ctx.model.CustomerRelation.findAll({
        where: baseWhere,
        attributes: [ 'c_user_id' ],
      });
      const customerIds = customerRelations.map(c => c.c_user_id);

      if (customerIds.length > 0) {
        rechargeWhere.user_id = { [Op.in]: customerIds };
        withdrawWhere.user_id = { [Op.in]: customerIds };
      } else {
        // 如果没有客户，为了让充值/提现查询结果为0，给一个不可能的条件
        rechargeWhere.user_id = -1;
        withdrawWhere.user_id = -1;
      }
    }

    // 1. 注册数据 (基于 customer_relation 表)
    const total_register_count = await ctx.model.CustomerRelation.count({
      where: baseWhere,
    });

    const yesterday_register_count = await ctx.model.CustomerRelation.count({
      where: {
        ...baseWhere,
        create_time: {
          [Op.between]: [ yesterdayStart, yesterdayEnd ],
        },
      },
    });

    const today_register_count = await ctx.model.CustomerRelation.count({
      where: {
        ...baseWhere,
        create_time: {
          [Op.between]: [ todayStart, todayEnd ],
        },
      },
    });

    result.register_data = {
      total_register_count,
      yesterday_register_count,
      today_register_count,
    };

    // 2. 充值数据 (基于 user_recharge 表)
    const rechargeResult = await ctx.model.UserRecharge.findAll({
      where: rechargeWhere,
      attributes: [
        [ app.Sequelize.fn('SUM', app.Sequelize.col('amount')), 'total_recharge_amount' ],
        [ app.Sequelize.fn('COUNT', app.Sequelize.fn('DISTINCT', app.Sequelize.col('user_id'))), 'total_recharge_users' ],
        [ app.Sequelize.fn('COUNT', app.Sequelize.col('recharge_id')), 'total_recharge_count' ],
      ],
      raw: true,
    });

    result.recharge_data = {
      total_recharge_amount: rechargeResult[0].total_recharge_amount ? Number(rechargeResult[0].total_recharge_amount) : 0,
      total_recharge_users: rechargeResult[0].total_recharge_users ? Number(rechargeResult[0].total_recharge_users) : 0,
      total_recharge_count: rechargeResult[0].total_recharge_count ? Number(rechargeResult[0].total_recharge_count) : 0,
    };

    // 3. 提现数据 (基于 user_withdraw 表)
    const withdrawResult = await ctx.model.UserWithdraw.findAll({
      where: withdrawWhere,
      attributes: [
        [ app.Sequelize.fn('SUM', app.Sequelize.col('amount')), 'total_withdraw_amount' ],
        [ app.Sequelize.fn('COUNT', app.Sequelize.fn('DISTINCT', app.Sequelize.col('user_id'))), 'total_withdraw_users' ],
        [ app.Sequelize.fn('COUNT', app.Sequelize.col('withdraw_id')), 'total_withdraw_count' ],
      ],
      raw: true,
    });

    result.withdraw_data = {
      total_withdraw_amount: withdrawResult[0].total_withdraw_amount ? Number(withdrawResult[0].total_withdraw_amount) : 0,
      total_withdraw_users: withdrawResult[0].total_withdraw_users ? Number(withdrawResult[0].total_withdraw_users) : 0,
      total_withdraw_count: withdrawResult[0].total_withdraw_count ? Number(withdrawResult[0].total_withdraw_count) : 0,
    };

    // 4. VIP 等级
    result.vips = await ctx.model.ShopVipLevel.findAll({
      where: { shop_id, is_enable: 1 },
      order: [[ 'sort', 'ASC' ], [ 'level', 'ASC' ]],
    });

    // 5. 店铺配置
    result.config = await ctx.model.ShopConfig.findOne({
      where: { shop_id },
    });

    return result;
  }

  /**
   * 删除店铺 (深度级联清理)
   * @param {number} shop_id 店铺ID
   */
  async destroy(shop_id) {
    const { ctx, app } = this;
    const shop = await ctx.model.Shop.findByPk(shop_id);
    if (!shop) {
      ctx.throw(404, '店铺不存在');
    }

    const t = await ctx.model.transaction();
    try {
      // 1. 获取该店铺下的所有用户ID (包括商家、店长、业务员、C端用户)
      const users = await ctx.model.SysUser.findAll({
        where: { shop_id, is_deleted: 0 },
        attributes: [ 'user_id' ],
        transaction: t,
      });
      const userIds = users.map(u => u.user_id);

      // 2. 软删除店铺内所有用户
      await ctx.model.SysUser.update(
        { is_deleted: 1 },
        { where: { shop_id }, transaction: t },
      );

      // 3. 软删除店铺主表
      await shop.update({ is_deleted: 1 }, { transaction: t });

      // 4. 物理清理与 shop_id 直接关联的业务表
      const shopRelatedTables = [
        'shop_config',
        'shop_vip_level',
        'shop_pay_channel',
        'shop_task', // 注意：这里是数据库表名，如果模型名不同需确认
        'customer_relation',
        'user_recharge',
        'user_withdraw',
        'sales_recharge_address',
      ];

      for (const table of shopRelatedTables) {
        try {
          await ctx.model.query(`DELETE FROM ${table} WHERE shop_id = :shop_id`, {
            replacements: { shop_id },
            transaction: t,
          });
        } catch (e) {
          ctx.logger.warn(`[店铺删除] 清理表 ${table} (shop_id=${shop_id}) 失败: ${e.message}`);
        }
      }

      // 5. 物理清理与 user_id 关联的日志、钱包等数据
      if (userIds.length > 0) {
        const userRelatedTables = [
          'sys_oper_log',
          'user_login_log',
          'user_operate_log',
          'user_wallet',
          'user_wallet_log',
        'shop_task_user', // 对应 sys_user 的任务
      ];

        for (const table of userRelatedTables) {
          try {
            await ctx.model.query(`DELETE FROM ${table} WHERE user_id IN (:userIds)`, {
              replacements: { userIds },
              transaction: t,
            });
          } catch (e) {
            ctx.logger.warn(`[店铺删除] 清理表 ${table} (users) 失败: ${e.message}`);
          }
        }
      }

      await t.commit();
      return true;
    } catch (error) {
      await t.rollback();
      ctx.logger.error(`[店铺删除] 深度清理失败 (shop_id=${shop_id}):`, error);
      ctx.throw(500, error.message || '删除店铺及清理关联数据失败');
    }
  }

  /**
   * 分页列表
   * @param {Object} query 查询参数
   */
  async list(query) {
    const { ctx, app } = this;
    const { page = 1, pageSize = 10, shop_name, shop_no, status, contact_phone } = query;
    const { Op } = app.Sequelize;

    const where = { is_deleted: 0 };
    if (shop_name) where.shop_name = { [Op.like]: `%${shop_name}%` };
    if (shop_no) where.shop_no = shop_no;
    if (status !== undefined && status !== '') where.status = Number(status);
    if (contact_phone) where.contact_phone = contact_phone;

    const { count, rows } = await ctx.model.Shop.findAndCountAll({
      where,
      offset: (page - 1) * pageSize,
      limit: Number(pageSize),
      order: [[ 'create_time', 'DESC' ]],
    });

    return {
      total: count,
      list: rows,
      page: Number(page),
      pageSize: Number(pageSize),
    };
  }
}

module.exports = ShopService;
