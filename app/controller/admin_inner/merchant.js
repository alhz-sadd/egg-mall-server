'use strict';

const Controller = require('egg').Controller;
const { Op } = require('sequelize');

class MerchantController extends Controller {
  /**
   * 获取商家/店铺列表
   * 以店铺 (shop) 为主体，包含关联的商家账号 (user_type=2) 及下级业务员 (user_type=3)
   */
  async index() {
    const { ctx } = this;
    const { keyword, status, page = 1, page_size = 10 } = ctx.query;

    const where = {
      is_deleted: 0,
    };

    if (status !== undefined && status !== null && status !== '') {
      where.status = Number(status);
    }

    if (keyword) {
      where[Op.or] = [
        { shop_name: { [Op.like]: `%${keyword}%` } },
        { shop_no: { [Op.like]: `%${keyword}%` } },
        { contact_person: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.Shop.findAndCountAll({
      where,
      order: [[ 'shop_id', 'DESC' ]],
      offset,
      limit,
      raw: true,
    });

    const shopIds = rows.map(r => r.shop_id);

    // 查询关联的商家账号 (user_type=2)
    let allMerchants = [];
    if (shopIds.length > 0) {
      allMerchants = await ctx.model.SysUser.findAll({
        where: {
          user_type: 2,
          is_deleted: 0,
          shop_id: { [Op.in]: shopIds },
        },
        attributes: { exclude: [ 'password', 'totp_secret', 'totp_recovery_codes' ] },
        raw: true,
      });
    }

    // 查询所有下级 (user_type=3)
    let allSubs = [];
    if (shopIds.length > 0) {
      allSubs = await ctx.model.SysUser.findAll({
        where: {
          user_type: 3,
          is_deleted: 0,
          shop_id: { [Op.in]: shopIds },
        },
        attributes: { exclude: [ 'password', 'totp_secret', 'totp_recovery_codes' ] },
        raw: true,
        order: [[ 'user_id', 'DESC' ]],
      });
    }

    // 获取角色映射
    const roles = await ctx.model.SysRole.findAll({
      attributes: [ 'role_id', 'role_name' ],
      raw: true,
    });
    const roleMap = {};
    roles.forEach(r => {
      roleMap[r.role_id] = r.role_name;
    });

    const assignRoleName = user => {
      if (user.role_id && roleMap[user.role_id]) {
        user.role_name = roleMap[user.role_id];
      } else if (user.user_type === 2) {
        user.role_name = '商家';
      } else if (user.user_type === 3) {
        user.role_name = '业务员';
      } else {
        user.role_name = '未知';
      }
      return user;
    };

    const list = rows.map(shop => {
      // 查找该店铺的商家账号
      const merchantUser = allMerchants.find(u => u.shop_id === shop.shop_id);

      const item = {
        ...shop,
        // 如果有商家账号，合并部分账号信息
        user_id: merchantUser ? merchantUser.user_id : null,
        username: merchantUser ? merchantUser.username : null,
        nickname: merchantUser ? merchantUser.nickname : shop.contact_person,
        role_id: merchantUser ? merchantUser.role_id : null,
        merchant_status: merchantUser ? merchantUser.status : null,
      };

      if (merchantUser) {
        assignRoleName(item);
      } else {
        item.role_name = '店铺 (未绑定商家)';
      }

      // 挂载业务员
      const children = allSubs.filter(sub => sub.shop_id === shop.shop_id);
      item.children = children.map(assignRoleName);

      return item;
    });

    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        list,
        pagination: {
          total: count,
          page: Number(page),
          page_size: Number(page_size),
          total_pages: Math.ceil(count / limit),
        },
      },
    };
  }

  /**
   * 获取所有商家/店铺列表 (下拉框等使用)
   */
  async allMerchants() {
    const { ctx } = this;

    const shops = await ctx.model.Shop.findAll({
      where: { is_deleted: 0 },
      raw: true,
      order: [[ 'shop_id', 'DESC' ]],
    });

    const shopIds = shops.map(s => s.shop_id);

    let allMerchants = [];
    let allSubs = [];
    if (shopIds.length > 0) {
      [ allMerchants, allSubs ] = await Promise.all([
        ctx.model.SysUser.findAll({
          where: { user_type: 2, is_deleted: 0, shop_id: { [Op.in]: shopIds } },
          attributes: { exclude: [ 'password', 'totp_secret', 'totp_recovery_codes' ] },
          raw: true,
        }),
        ctx.model.SysUser.findAll({
          where: { user_type: 3, is_deleted: 0, shop_id: { [Op.in]: shopIds } },
          attributes: { exclude: [ 'password', 'totp_secret', 'totp_recovery_codes' ] },
          raw: true,
          order: [[ 'user_id', 'DESC' ]],
        }),
      ]);
    }

    const list = shops.map(shop => {
      const merchantUser = allMerchants.find(u => u.shop_id === shop.shop_id);
      const item = {
        ...shop,
        user_id: merchantUser ? merchantUser.user_id : null,
        username: merchantUser ? merchantUser.username : null,
        nickname: merchantUser ? merchantUser.nickname : shop.contact_person,
      };
      const children = allSubs.filter(sub => sub.shop_id === shop.shop_id);
      item.children = children;
      return item;
    });

    ctx.body = {
      code: 200,
      message: 'success',
      data: list,
    };
  }

  /**
   * 获取店铺角色列表
   */
  async roles() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { status } = ctx.query;

    const where = {
      // 现在的角色不绑定到 admin_id，而是全局或者绑定到 shop_id。
      // 我们暂定全局返回角色列表，如果需要隔离，需过滤 shop_id
    };

    if (status) {
      where.status = status;
    }

    const roles = await ctx.model.SysRole.findAll({
      where,
      order: [[ 'role_id', 'ASC' ]],
    });

    ctx.body = {
      code: 200,
      message: 'success',
      data: roles,
    };
  }

  /**
   * 获取商家/店铺详情
   */
  async show() {
    const { ctx } = this;
    const { id } = ctx.params;

    // 1. 尝试按商家 ID 查找
    let merchantModel = await ctx.model.SysUser.findOne({
      where: { user_id: id, user_type: 2, is_deleted: 0 },
      attributes: { exclude: [ 'password', 'totp_secret', 'totp_recovery_codes' ] },
    });

    let shopId;
    let merchant = null;

    if (merchantModel) {
      shopId = merchantModel.shop_id;
      merchant = merchantModel.toJSON();
    } else {
      // 2. 如果不是商家 ID，尝试作为店铺 ID 查找
      const shopModel = await ctx.model.Shop.findOne({
        where: { shop_id: id, is_deleted: 0 },
      });
      if (shopModel) {
        shopId = shopModel.shop_id;
        // 尝试找该店铺关联的商家账号
        merchantModel = await ctx.model.SysUser.findOne({
          where: { shop_id: shopId, user_type: 2, is_deleted: 0 },
          attributes: { exclude: [ 'password', 'totp_secret', 'totp_recovery_codes' ] },
        });
        if (merchantModel) {
          merchant = merchantModel.toJSON();
        }
      }
    }

    if (!shopId) {
      ctx.throw(404, '商家或店铺不存在');
    }

    // 获取店铺基础资料
    const shop = await ctx.model.Shop.findByPk(shopId);

    // 获取角色映射
    const roles = await ctx.model.SysRole.findAll({
      attributes: [ 'role_id', 'role_name' ],
      raw: true,
    });
    const roleMap = {};
    roles.forEach(r => {
      roleMap[r.role_id] = r.role_name;
    });

    const assignRoleName = user => {
      if (user.role_id && roleMap[user.role_id]) {
        user.role_name = roleMap[user.role_id];
      } else if (user.user_type === 2) {
        user.role_name = '商家';
      } else if (user.user_type === 3) {
        user.role_name = '业务员';
      } else {
        user.role_name = '未知';
      }
      return user;
    };

    if (merchant) {
      merchant = assignRoleName(merchant);
    }

    // 2. 获取所有下级信息 (所有该 shop_id 的业务员)
    const subAdminIds = [];
    const allAdmins = await ctx.model.SysUser.findAll({
      where: { shop_id: shopId, user_type: 3, is_deleted: 0 },
      attributes: [ 'user_id' ],
      raw: true,
    });
    allAdmins.forEach(a => subAdminIds.push(a.user_id));

    // 4. 统计数据
    const sub_merchant_count = subAdminIds.length;

    // C端普通用户数量 (归属于该 shop_id)
    let user_count = 0;
    if (ctx.model.CustomerRelation) {
      user_count = await ctx.model.CustomerRelation.count({
        where: { shop_id: shopId },
      });
    }

    // 累计充值数 & 累计充值金额
    let total_recharge_amount = 0;
    let total_recharge_count = 0;
    if (ctx.model.UserRecharge) {
      const [ amountSum, count ] = await Promise.all([
        ctx.model.UserRecharge.sum('amount', {
          where: { shop_id: shopId, status: 2 },
        }),
        ctx.model.UserRecharge.count({
          where: { shop_id: shopId, status: 2 },
        }),
      ]);
      total_recharge_amount = amountSum || 0;
      total_recharge_count = count || 0;
    }

    // 店铺商品数量
    let product_count = 0;
    if (ctx.model.ShopGoods) {
      product_count = await ctx.model.ShopGoods.count({
        where: { shop_id: shopId },
      });
    }

    // 任务数量
    let task_count = 0;
    if (ctx.model.ShopTask) {
      task_count = await ctx.model.ShopTask.count({
        where: { shop_id: shopId },
      });
    }

    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        ...(merchant || {}),
        ...shop.toJSON(),
        count: {
          sub_merchant_count,
          user_count,
          product_count,
          task_count,
          order_count: 0,
          total_recharge_amount: Number(total_recharge_amount) || 0,
          total_recharge_count: total_recharge_count || 0,
        },
      },
    };
  }

  /**
   * 获取店铺总数据接口
   */
  async statistics() {
    const { ctx } = this;
    const { id } = ctx.params;

    // 尝试按商家 ID 或 店铺 ID 查找 shopId
    let shopId;
    const merchant = await ctx.model.SysUser.findOne({
      where: { user_id: id, user_type: 2, is_deleted: 0 },
      attributes: [ 'shop_id' ],
      raw: true,
    });

    if (merchant) {
      shopId = merchant.shop_id;
    } else {
      const shop = await ctx.model.Shop.findOne({
        where: { shop_id: id, is_deleted: 0 },
        attributes: [ 'shop_id' ],
        raw: true,
      });
      if (shop) {
        shopId = shop.shop_id;
      }
    }

    if (!shopId) {
      ctx.throw(404, '找不到店铺信息');
    }

    // 1. 总业务员数量
    const salesperson_count = await ctx.model.SysUser.count({
      where: { shop_id: shopId, user_type: 3, is_deleted: 0 },
    });

    // 2. 总h5注册数量
    let h5_register_count = 0;
    if (ctx.model.CustomerRelation) {
      h5_register_count = await ctx.model.CustomerRelation.count({
        where: { shop_id: shopId },
      });
    }

    // 3~8. 充值相关统计
    let real_recharge_count = 0;
    let real_recharge_amount = 0;

    if (ctx.model.UserRecharge) {
      const rechargeRecords = await ctx.model.UserRecharge.findAll({
        where: { shop_id: shopId, status: 2 },
        attributes: [ 'amount' ],
        raw: true,
      });

      rechargeRecords.forEach(record => {
        const amount = Number(record.amount) || 0;
        real_recharge_count++;
        real_recharge_amount += amount;
      });
    }

    // 9. 身份验证成功数量
    let kyc_verified_count = 0;
    if (ctx.model.UserIdentity) {
      kyc_verified_count = await ctx.model.UserIdentity.count({
        include: [{
          model: ctx.model.SysUser,
          as: 'user',
          where: { shop_id: shopId },
          required: true,
          attributes: [],
        }],
        where: { status: 1 },
      });
    }

    // 10. 身份验证成功奖励金额
    let kyc_reward_amount = 0;
    if (ctx.model.ShopConfig) {
      const sysConfig = await ctx.model.ShopConfig.findOne({
        where: { shop_id: shopId },
        raw: true,
      });
      const kycRewardAmountPerUser = sysConfig ? Number(sysConfig.real_name_reward) : 100;
      kyc_reward_amount = kyc_verified_count * kycRewardAmountPerUser;
    }

    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        salesperson_count,
        h5_register_count,
        real_recharge_count,
        real_recharge_amount: Number(real_recharge_amount.toFixed(2)),
        mock_recharge_count: 0,
        mock_recharge_amount: 0,
        total_recharge_count: real_recharge_count,
        total_recharge_amount: Number(real_recharge_amount.toFixed(2)),
        kyc_verified_count,
        kyc_reward_amount: Number(kyc_reward_amount.toFixed(2)),
        order_count: 0,
      },
    };
  }

  /**
   * 创建商家/店铺 (简化版)
   */
  async create() {
    const { ctx } = this;
    const payload = ctx.request.body;

    // 参数校验：仅保留店铺基础字段
    ctx.validate({
      shop_name: { type: 'string', required: true, message: '店铺名称不能为空' },
      contact_person: { type: 'string', required: false },
      contact_phone: { type: 'string', required: false },
      remark: { type: 'string', required: false },
      status: { type: 'int', required: false },
    }, payload);

    try {
      // 调用 Service 创建店铺并自动初始化配置
      const shop = await ctx.service.shop.create(payload);

      ctx.body = {
        code: 200,
        message: '店铺创建成功',
        data: {
          shop_id: shop.shop_id,
          shop_name: shop.shop_name,
          shop_no: shop.shop_no,
        },
      };
    } catch (err) {
      ctx.logger.error('[创建店铺] 失败:', err);
      if (err.status === 422) {
        ctx.throw(422, err.message);
      }
      ctx.throw(500, err.message || '创建店铺失败');
    }
  }

  /**
   * 更新商家/店铺账号
   */
  async update() {
    const { ctx, app } = this;
    const { id } = ctx.params; // 这里可能是 user_id 也可能是 shop_id，根据路由定义
    const payload = ctx.request.body;

    // 如果是按 user_id 更新商家账号
    const admin = await ctx.model.SysUser.findOne({
      where: { user_id: id, is_deleted: 0 },
    });

    if (admin) {
      // 更新商家账号逻辑
      if (payload.username && payload.username !== admin.username) {
        const exist = await ctx.model.SysUser.findOne({
          where: { username: payload.username, is_deleted: 0 },
        });
        if (exist) {
          ctx.throw(422, '账号已存在');
        }
      }

      const updateData = {
        username: payload.username !== undefined ? payload.username : admin.username,
        nickname: payload.nickname !== undefined ? payload.nickname : admin.nickname,
        phone: payload.phone !== undefined ? payload.phone : admin.phone,
        email: payload.email !== undefined ? payload.email : admin.email,
        role_id: payload.role_id !== undefined ? payload.role_id : admin.role_id,
        status: payload.status !== undefined ? payload.status : admin.status,
        remark: payload.remark !== undefined ? payload.remark : admin.remark,
      };

      if (payload.password) {
        const salt = await app.bcrypt.genSalt(10);
        updateData.password = await app.bcrypt.hash(payload.password, salt);
      }

      await admin.update(updateData);

      // 同步更新关联店铺状态
      if (admin.shop_id && payload.status !== undefined) {
        await ctx.model.Shop.update(
          { status: payload.status },
          { where: { shop_id: admin.shop_id } },
        );
      }

      const data = admin.toJSON();
      delete data.password;

      ctx.body = { code: 200, message: '更新成功', data };
      return;
    }

    // 如果没找到用户，尝试按 shop_id 更新店铺
    const shop = await ctx.model.Shop.findOne({ where: { shop_id: id, is_deleted: 0 } });
    if (shop) {
      await ctx.service.shop.update(id, payload);
      ctx.body = { code: 200, message: '店铺更新成功', data: null };
      return;
    }

    ctx.throw(404, '商家或店铺不存在');
  }

  /**
   * 删除商家账号及店铺 (深度级联清理)
   */
  async destroy() {
    const { ctx } = this;
    const { id } = ctx.params;

    // 1. 尝试按商家 ID 查找
    const merchant = await ctx.model.SysUser.findOne({
      where: { user_id: id, is_deleted: 0 },
    });

    let shopId;
    if (merchant) {
      shopId = merchant.shop_id;
    } else {
      // 2. 如果不是商家 ID，尝试作为店铺 ID 直接删除
      const shop = await ctx.model.Shop.findByPk(id);
      if (shop) {
        shopId = shop.shop_id;
      }
    }

    if (!shopId) {
      // 如果仅是独立用户且无店铺关联，则仅软删用户
      if (merchant) {
        await merchant.update({ is_deleted: 1 });
        ctx.body = { code: 200, message: '账号删除成功', data: null };
        return;
      }
      ctx.throw(404, '商家或店铺不存在');
    }

    // 调用 Service 执行深度清理
    await ctx.service.shop.destroy(shopId);

    ctx.body = {
      code: 200,
      message: '删除成功，已清理店铺相关的所有数据及关联用户',
      data: null,
    };
  }
}

module.exports = MerchantController;
