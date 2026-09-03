'use strict';

const Controller = require('egg').Controller;

class MerchantController extends Controller {
  /**
   * 获取商家（admin_user）列表
   * 只返回商家(role=1)的数据，商家下级(主管、业务员)放在商家的 children 内
   */
  async index() {
    const { ctx } = this;
    const { keyword, status, page = 1, page_size = 10 } = ctx.query;
    const { Op } = require('sequelize');

    const where = { role: 1 };

    if (status !== undefined && status !== null && status !== '') {
      where.status = Number(status);
    }

    if (keyword) {
      where.username = { [Op.like]: `%${keyword}%` };
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.AdminUser.findAndCountAll({
      where,
      order: [[ 'id', 'DESC' ]],
      offset,
      limit,
      attributes: { exclude: [ 'password' ] },
      raw: true,
    });

    // 查询所有下级(非role=1的账号)
    const allSubs = await ctx.model.AdminUser.findAll({
      where: { role: { [Op.ne]: 1 } },
      attributes: { exclude: [ 'password' ] },
      raw: true,
      order: [[ 'id', 'DESC' ]],
    });

    // 获取所有角色配置，通过 admin_id 映射 role_name
    const roles = await ctx.model.Role.findAll({
      attributes: [ 'admin_id', 'roleName' ],
      where: { admin_id: { [Op.not]: null } },
      raw: true,
    });
    const roleMap = {};
    roles.forEach(r => {
      roleMap[r.admin_id] = r.roleName;
    });

    // 辅助函数：设置角色名称
    const assignRoleName = admin => {
      // 优先取关联的自定义角色名称，其次根据固定 role 字段判断
      if (roleMap[admin.id]) {
        admin.role_name = roleMap[admin.id];
      } else if (admin.role === 1) {
        admin.role_name = '商家';
      } else if (admin.role === 2) {
        admin.role_name = '业务员';
      } else {
        admin.role_name = '未知';
      }
      return admin;
    };

    // 递归组装树形结构
    const buildTree = parentId => {
      // 统一转换为字符串比较
      const children = allSubs.filter(sub => String(sub.bind_admin_id) === String(parentId));
      // 将属于该商家或其下级的所有账号都放入当前层级
      let allChildren = [ ...children ].map(assignRoleName);
      children.forEach(child => {
        const grandChildren = buildTree(child.id);
        allChildren = allChildren.concat(grandChildren);
      });
      return allChildren;
    };

    const list = rows.map(merchant => {
      merchant = assignRoleName(merchant);
      // 商家下的 children 是其所有后代账号的平铺列表
      merchant.children = buildTree(merchant.id);
      return merchant;
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
   * 获取所有商家及下级列表
   */
  async allMerchants() {
    const { ctx } = this;
    const { Op } = require('sequelize');

    const merchants = await ctx.model.AdminUser.findAll({
      where: { role: 1 },
      attributes: { exclude: [ 'password' ] },
      raw: true,
      order: [[ 'id', 'DESC' ]],
    });

    const allSubs = await ctx.model.AdminUser.findAll({
      where: { role: { [Op.ne]: 1 } },
      attributes: { exclude: [ 'password' ] },
      raw: true,
      order: [[ 'id', 'DESC' ]],
    });

    const roles = await ctx.model.Role.findAll({
      attributes: [ 'admin_id', 'roleName' ],
      where: { admin_id: { [Op.not]: null } },
      raw: true,
    });
    const roleMap = {};
    roles.forEach(r => {
      roleMap[r.admin_id] = r.roleName;
    });

    const assignRoleName = admin => {
      if (roleMap[admin.id]) {
        admin.role_name = roleMap[admin.id];
      } else if (admin.role === 1) {
        admin.role_name = '商家';
      } else if (admin.role === 2) {
        admin.role_name = '业务员';
      } else {
        admin.role_name = '未知';
      }
      return admin;
    };

    const buildTree = parentId => {
      const children = allSubs.filter(sub => String(sub.bind_admin_id) === String(parentId));
      let allChildren = [ ...children ].map(assignRoleName);
      children.forEach(child => {
        const grandChildren = buildTree(child.id);
        allChildren = allChildren.concat(grandChildren);
      });
      return allChildren;
    };

    const list = merchants.map(merchant => {
      merchant = assignRoleName(merchant);
      merchant.children = buildTree(merchant.id);
      return merchant;
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
      admin_id: id,
      delFlag: '0',
    };

    if (status) {
      where.status = status;
    }

    const roles = await ctx.model.Role.findAll({
      where,
      order: [[ 'roleSort', 'ASC' ]],
    });

    ctx.body = {
      code: 200,
      message: 'success',
      data: roles,
    };
  }

  /**
   * 获取商家详情
   */
  async show() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const { Op } = require('sequelize');

    const roles = await ctx.model.Role.findAll({
      attributes: [ 'admin_id', 'roleName' ],
      where: { admin_id: { [Op.not]: null } },
      raw: true,
    });
    const roleMap = {};
    roles.forEach(r => {
      roleMap[r.admin_id] = r.roleName;
    });

    const assignRoleName = admin => {
      if (roleMap[admin.id]) {
        admin.role_name = roleMap[admin.id];
      } else if (admin.role === 1) {
        admin.role_name = '商家';
      } else if (admin.role === 2) {
        admin.role_name = '业务员';
      } else {
        admin.role_name = '未知';
      }
      return admin;
    };

    // 1. 获取商家详情
    const merchant = await service.adminUser.detail(id);
    if (!merchant) {
      ctx.throw(404, '商家不存在');
    }
    assignRoleName(merchant);

    // 2. 获取所有下级信息 (用于组装 children 和统计)
    const allAdmins = await ctx.model.AdminUser.findAll({
      attributes: { exclude: [ 'password' ] },
      raw: true,
    });

    // 递归获取所有后代 admin ID
    const getSubAdminIds = parentId => {
      const subs = allAdmins.filter(a => String(a.bind_admin_id) === String(parentId));
      let ids = subs.map(s => s.id);
      subs.forEach(s => {
        ids = ids.concat(getSubAdminIds(s.id));
      });
      return ids;
    };

    const subAdminIds = getSubAdminIds(id);
    const allRelatedAdminIds = [ Number(id), ...subAdminIds ];

    // 4. 统计数据
    // 下级数量 (所有后代 admin 账号)
    const sub_merchant_count = subAdminIds.length;

    // 店铺用户数量 (通过该店铺及关联业务员的邀请码注册的 H5 用户)
    // admin_role 不为 1 和 2 的才是普通注册用户
    const user_count = await ctx.model.User.count({
      where: {
        admin_id: { [Op.in]: allRelatedAdminIds },
        admin_role: { [Op.notIn]: [ 1, 2 ] },
      },
    });

    // 累计充值数 & 累计充值金额
    // 从 RechargeRecord 中统计 status=1 的记录，并且只能是 H5 普通用户的充值
    const [ total_recharge_amount, total_recharge_count, product_count, task_count, order_count ] = await Promise.all([
      ctx.model.RechargeRecord.sum('amount', {
        include: [{
          model: ctx.model.User,
          as: 'user',
          where: {
            admin_id: { [Op.in]: allRelatedAdminIds },
            admin_role: { [Op.notIn]: [ 1, 2 ] },
          },
          required: true,
          attributes: [],
        }],
        where: {
          status: 1,
        },
      }),
      ctx.model.RechargeRecord.count({
        include: [{
          model: ctx.model.User,
          as: 'user',
          where: {
            admin_id: { [Op.in]: allRelatedAdminIds },
            admin_role: { [Op.notIn]: [ 1, 2 ] },
          },
          required: true,
          attributes: [],
        }],
        where: {
          status: 1,
        },
      }),
      ctx.model.Product.count({
        where: {
          admin_id: { [Op.in]: allRelatedAdminIds },
        },
      }),
      ctx.model.Task.count({
        where: {
          admin_id: { [Op.in]: allRelatedAdminIds },
        },
      }),
      ctx.model.Order.count({
        where: {
          admin_id: { [Op.in]: allRelatedAdminIds },
        },
      }),
    ]);

    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        ...merchant,
        count: {
          sub_merchant_count,
          user_count,
          product_count,
          task_count,
          order_count,
          total_recharge_amount: Number(total_recharge_amount) || 0,
          total_recharge_count: total_recharge_count || 0,
        },
      },
    };
  }

  /**
   * 获取店铺总数据接口
   * 返回店铺统计数据：业务员数量、注册数量、真实充值、模拟充值、身份验证、订单数等
   */
  async statistics() {
    const { ctx } = this;
    const { id: merchantId } = ctx.params;
    const { Op } = require('sequelize');

    // 1. 总业务员数量
    const salespersons = await ctx.model.AdminUser.findAll({
      where: { bind_admin_id: merchantId, role: 2 },
      attributes: [ 'id' ],
      raw: true,
    });
    const salesperson_count = salespersons.length;
    const spIds = salespersons.map(s => s.id);

    // 2. 总h5注册数量
    const h5UserWhere = {
      [Op.or]: [
        { admin_id: merchantId },
      ],
      admin_role: { [Op.or]: [{ [Op.notIn]: [ 1, 2 ] }, { [Op.is]: null }] },
    };

    if (spIds.length > 0) {
      h5UserWhere[Op.or].push({ bind_salesperson_id: { [Op.in]: spIds } });
      h5UserWhere[Op.or].push({ admin_id: { [Op.in]: spIds } });
    }

    const h5Users = await ctx.model.User.findAll({
      where: h5UserWhere,
      attributes: [ 'id' ],
      raw: true,
    });
    const h5_register_count = h5Users.length;
    const h5UserIds = h5Users.map(u => u.id);

    // 3~8. 充值相关统计
    let real_recharge_count = 0;
    let real_recharge_amount = 0;
    let mock_recharge_count = 0;
    let mock_recharge_amount = 0;

    if (h5UserIds.length > 0) {
      const rechargeRecords = await ctx.model.RechargeRecord.findAll({
        where: {
          user_id: { [Op.in]: h5UserIds },
          status: 1,
        },
        attributes: [ 'amount', 'operation_type' ],
        raw: true,
      });

      rechargeRecords.forEach(record => {
        const amount = Number(record.amount) || 0;
        if (record.operation_type === 2) { // 2 为走移动端充值（真实充值）
          real_recharge_count++;
          real_recharge_amount += amount;
        } else if (record.operation_type === 0 || record.operation_type === 1) {
          mock_recharge_count++;
          mock_recharge_amount += amount;
        }
      });
    }

    const total_recharge_count = real_recharge_count + mock_recharge_count;
    const total_recharge_amount = real_recharge_amount + mock_recharge_amount;

    // 9. 身份验证成功数量
    let kyc_verified_count = 0;
    if (h5UserIds.length > 0) {
      kyc_verified_count = await ctx.model.UserCredential.count({
        where: {
          user_id: { [Op.in]: h5UserIds },
          status: 1,
        },
      });
    }

    // 10. 身份验证成功奖励金额
    const sysConfig = await ctx.model.SysConfig.findOne({
      where: { admin_id: merchantId, config_key: 'user.money.dai.gift' },
      raw: true,
    });
    const kycRewardAmountPerUser = sysConfig ? Number(sysConfig.config_value) : 100;
    const kyc_reward_amount = kyc_verified_count * kycRewardAmountPerUser;

    // 11. 所有订单数 (支付成功、发货、完成才算)
    let order_count = 0;
    if (h5UserIds.length > 0) {
      order_count = await ctx.model.Order.count({
        where: {
          user_id: { [Op.in]: h5UserIds },
          status: { [Op.in]: [ 1, 2, 3 ] },
        },
      });
    }

    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        salesperson_count,
        h5_register_count,
        real_recharge_count,
        real_recharge_amount: Number(real_recharge_amount.toFixed(2)),
        mock_recharge_count,
        mock_recharge_amount: Number(mock_recharge_amount.toFixed(2)),
        total_recharge_count,
        total_recharge_amount: Number(total_recharge_amount.toFixed(2)),
        kyc_verified_count,
        kyc_reward_amount: Number(kyc_reward_amount.toFixed(2)),
        order_count,
      },
    };
  }

  /**
   * 创建商家账号
   */
  async create() {
    const { ctx, service } = this;
    // 创建时如果未传role，可以默认为 1 (商家)
    const payload = ctx.request.body;
    if (!payload.role) {
      payload.role = 1;
    }
    const admin = await service.adminUser.create(payload);
    ctx.body = {
      code: 200,
      message: '创建成功',
      data: admin,
    };
  }

  /**
   * 更新商家账号
   */
  async update() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const admin = await service.adminUser.update(id, ctx.request.body, 1);
    ctx.body = {
      code: 200,
      message: '更新成功',
      data: admin,
    };
  }

  /**
   * 删除商家账号
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    await service.adminUser.destroy(id, 1);
    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }
}

module.exports = MerchantController;
