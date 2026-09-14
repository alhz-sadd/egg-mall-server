'use strict';

const Service = require('egg').Service;

class CustomerService extends Service {
  /**
   * 获取C端用户活跃详情
   * @param {number} customerUserId - C端用户ID
   * @param {number} [shopId] - 店铺ID（B端需要传入，用于校验归属）
   * @return {Object} 活跃详情
   */
  async getActiveInfo(customerUserId, shopId) {
    const { ctx } = this;
    const { Op } = require('sequelize');

    // B端校验归属
    if (shopId) {
      const rel = await ctx.model.CustomerRelation.findOne({
        where: { c_user_id: customerUserId, shop_id: shopId, is_deleted: 0 },
      });
      if (!rel) {
        ctx.throw(403, '无权查看该客户');
      }
    }

    // 2. 获取钱包真实数据
    const wallet = await ctx.model.UserWallet.findOne({
      attributes: [ 'user_id', 'voucher_balance', 'static_income', 'dynamic_income', 'freeze_voucher_balance', 'freeze_static_income', 'freeze_dynamic_income', 'total_recharge_amount', 'total_withdraw_amount', 'create_time', 'update_time' ],
      where: { user_id: customerUserId },
    });

    // 3. 获取用户基本信息（注册时间）
    const userInfo = await ctx.model.SysUser.findOne({
      where: { user_id: customerUserId, is_deleted: 0 },
    });
    if (!userInfo) {
      ctx.throw(404, '客户不存在');
    }

    // 4. 最近充值聚合
    const rechargeAgg = await ctx.model.UserRecharge.findOne({
      where: { user_id: customerUserId, status: 1 },
      attributes: [
        [ ctx.model.fn('MAX', ctx.model.col('create_time')), 'last_recharge_time' ],
        [ ctx.model.fn('COUNT', ctx.model.col('*')), 'total' ],
        [ ctx.model.fn('SUM', ctx.model.col('amount')), 'sum_amount' ],
      ],
      raw: true,
    });

    // 5. 近7天充值次数
    const recent7Recharge = await ctx.model.UserRecharge.count({
      where: {
        user_id: customerUserId,
        status: 1,
        create_time: {
          [Op.gte]: new Date(Date.now() - 7 * 24 * 3600 * 1000),
        },
      },
    });

    // 6. 最近提现聚合
    const withdrawAgg = await ctx.model.UserWithdraw.findOne({
      where: { user_id: customerUserId, status: 1 },
      attributes: [
        [ ctx.model.fn('MAX', ctx.model.col('create_time')), 'last_withdraw_time' ],
        [ ctx.model.fn('COUNT', ctx.model.col('*')), 'total' ],
        [ ctx.model.fn('SUM', ctx.model.col('amount')), 'sum_amount' ],
      ],
      raw: true,
    });

    // 7. 近7天提现次数
    const recent7Withdraw = await ctx.model.UserWithdraw.count({
      where: {
        user_id: customerUserId,
        status: 1,
        create_time: {
          [Op.gte]: new Date(Date.now() - 7 * 24 * 3600 * 1000),
        },
      },
    });

    // 计算注册天数
    const registerTs = userInfo.create_time ? new Date(userInfo.create_time).getTime() : Date.now();
    const nowTs = Date.now();
    const daysSinceRegister = Math.floor((nowTs - registerTs) / (1000 * 3600 * 24));

    return {
      // 登录活跃信息
      last_login_ip: userInfo.last_login_ip,
      last_login_location: null, // 从ip解析或日志获取
      last_login_time: userInfo.last_login_time,
      register_time: userInfo.create_time,
      days_since_register: daysSinceRegister,

      // 充值活跃
      first_recharge_time: null, // 可选
      last_recharge_time: (rechargeAgg && rechargeAgg.last_recharge_time) ? rechargeAgg.last_recharge_time : null,
      total_recharge_amount: (rechargeAgg && rechargeAgg.sum_amount) ? Number(rechargeAgg.sum_amount) : 0,
      total_recharge_count: (rechargeAgg && rechargeAgg.total) ? Number(rechargeAgg.total) : 0,

      // 提现活跃
      last_withdraw_time: (withdrawAgg && withdrawAgg.last_withdraw_time) ? withdrawAgg.last_withdraw_time : null,
      total_withdraw_amount: (withdrawAgg && withdrawAgg.sum_amount) ? Number(withdrawAgg.sum_amount) : 0,
      total_withdraw_count: (withdrawAgg && withdrawAgg.total) ? Number(withdrawAgg.total) : 0,

      // 当前钱包资产
      wallet: wallet ? {
        voucher_balance: Number(wallet.voucher_balance || 0),
        static_income: Number(wallet.static_income || 0),
        dynamic_income: Number(wallet.dynamic_income || 0),
        freeze_voucher_balance: Number(wallet.freeze_voucher_balance || 0),
      } : {
        voucher_balance: 0,
        static_income: 0,
        dynamic_income: 0,
        freeze_voucher_balance: 0,
      },

      // 最近行为快照
      recent_7day_recharge_count: recent7Recharge || 0,
      recent_7day_withdraw_count: recent7Withdraw || 0,

      // 提现配置
      allow_withdraw: userInfo.withdrawal_status !== undefined ? userInfo.withdrawal_status : 1,
      temp_withdraw_status: userInfo.temp_withdraw_status !== undefined ? userInfo.temp_withdraw_status : 1,
    };
  }
  /**
   * 获取用户登录日志分页
   * @param {number} customerUserId - C端用户ID
   * @param {number} pageNum - 页码
   * @param {number} pageSize - 每页条数
   * @param {number} [shopId] - 店铺ID（B端需要传入，用于校验归属）
   * @return {Object} 分页结果 { total, list }
   */
  async getLoginLogList(customerUserId, pageNum, pageSize, shopId) {
    const { ctx } = this;

    // B端越权校验
    if (shopId) {
      const rel = await ctx.model.CustomerRelation.findOne({
        where: { c_user_id: customerUserId, shop_id: shopId, is_deleted: 0 },
      });
      if (!rel) {
        ctx.throw(403, '无权查看该客户信息');
      }
    }

    const where = { user_id: customerUserId, login_type: 3 }; // login_type: 3 表示C端
    const offset = (Number(pageNum) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    const { count, rows } = await ctx.model.UserLoginLog.findAndCountAll({
      attributes: [ 'id', 'login_ip', 'login_location', 'login_result', 'device_type', 'browser', 'login_time' ], // 强制只查存在的字段，排除模型里定义但库里没有的 remark 字段
      where,
      order: [[ 'login_time', 'DESC' ]],
      offset,
      limit,
    });

    const list = rows.map(item => {
      // 兼容底层模型查询时如果没获取到 remark 字段的情况
      const defaultRemark = item.login_result === 1 ? '登录成功' : '登录失败';
      let remark = defaultRemark;
      try {
        if (item.getDataValue && item.getDataValue('remark') !== undefined) {
          remark = item.getDataValue('remark') || defaultRemark;
        } else if (item.remark !== undefined) {
          remark = item.remark || defaultRemark;
        }
      } catch (e) {
        // 如果 Sequelize 抛出 Unknown column 异常被捕获到这里
      }

      return {
        id: item.id,
        login_ip: item.login_ip,
        login_location: item.login_location,
        login_status: item.login_result, // 模型字段是 login_result
        login_device: item.device_type === 1 ? 'PC电脑' : item.device_type === 2 ? '安卓' : item.device_type === 3 ? 'iOS苹果' : item.browser || 'H5浏览器',
        login_time: item.login_time,
        remark,
      };
    });

    return { total: count, list };
  }

  /**
   * 获取C端用户层级关系树（向上溯源链路 + 归属业务员 + 直属下级分页）
   * @param {Number} customerUserId C端用户ID
   * @param {Number|null} shopId 店铺ID，传入则进行权限过滤
   * @param {Number} pageNum 直属下级分页页码
   * @param {Number} pageSize 直属下级分页每页条数
   */
  async getRelationTree(customerUserId, shopId, pageNum = 1, pageSize = 10) {
    const { ctx } = this;
    const sysUserAttributes = [ 'user_id', 'username', 'nickname', 'is_real_user', 'create_time' ];

    // 1. 获取当前用户关系及基础信息，校验店铺归属
    const currentRelationWhere = { c_user_id: customerUserId, is_deleted: 0, status: 1 };
    if (shopId) {
      currentRelationWhere.shop_id = shopId;
    }

    const currentRelation = await ctx.model.CustomerRelation.findOne({
      where: currentRelationWhere,
    });

    if (!currentRelation && shopId) {
      ctx.throw(403, '无权查看该客户信息');
    }

    const currentUser = await ctx.model.SysUser.findOne({
      where: { user_id: customerUserId },
      attributes: sysUserAttributes,
    });

    if (!currentUser) {
      ctx.throw(404, '当前客户不存在');
    }

    const current = {
      customer_user_id: currentUser.user_id,
      username: currentUser.username,
      user_level: 1,
      is_real_user: currentUser.is_real_user,
      register_time: currentUser.create_time,
    };

    // 2. 获取归属业务员
    let salesman = null;
    const salesmanId = currentRelation ? (currentRelation.salesman_user_id || currentRelation.root_salesman_user_id) : null;
    if (salesmanId) {
      const salesmanUser = await ctx.model.SysUser.findOne({
        where: { user_id: salesmanId },
        attributes: [ 'user_id', 'username', 'nickname' ],
      });
      if (salesmanUser) {
        salesman = {
          salesman_user_id: salesmanUser.user_id,
          username: salesmanUser.username,
          nick_name: salesmanUser.nickname,
        };
      }
    }

    // 获取店铺信息及店长
    let shopInfo = null;
    let shopManager = null;
    if (currentRelation && currentRelation.shop_id) {
      shopInfo = await ctx.model.Shop.findOne({
        where: { shop_id: currentRelation.shop_id },
        attributes: [ 'shop_id', 'shop_name' ],
      });
      shopManager = await ctx.model.SysUser.findOne({
        where: { shop_id: currentRelation.shop_id, user_type: 2, is_deleted: 0 },
        attributes: [ 'user_id', 'username', 'nickname' ],
      });
    }

    // 3. 向上溯源链路 (C端父链)
    const cUserParents = [];

    let currentLoopUserId = currentRelation ? currentRelation.parent_customer_user_id : null;
    let loopCount = 0;
    const MAX_DEPTH = 50; // 防止脏数据导致死循环

    while (currentLoopUserId && loopCount < MAX_DEPTH) {
      // B端查询要求上级也必须在同店铺内
      const parentRelWhere = { c_user_id: currentLoopUserId, is_deleted: 0, status: 1 };
      if (shopId) parentRelWhere.shop_id = shopId;

      const parentRel = await ctx.model.CustomerRelation.findOne({ where: parentRelWhere });
      if (!parentRel) break; // 若上级不属于本店铺或关系不存在，停止溯源

      const parentUser = await ctx.model.SysUser.findOne({
        where: { user_id: currentLoopUserId },
        attributes: sysUserAttributes,
      });

      if (!parentUser) break;

      cUserParents.push({
        user_id: parentUser.user_id,
        username: parentUser.username,
        user_level: 1,
        relation_type: loopCount === 0 ? '直接上级' : (loopCount === 1 ? '上上级' : `上${loopCount + 1}级`),
      });

      currentLoopUserId = parentRel.parent_customer_user_id;
      loopCount++;
    }

    // 构建最终的上级链路 (Top-Down 顺序: 店铺 -> 店长 -> 业务员 -> C端上级)
    const parentChain = [];

    if (shopInfo) {
      parentChain.push({
        user_id: shopInfo.shop_id,
        username: shopInfo.shop_name,
        user_level: '店铺',
        relation_type: '所属店铺',
      });
    }

    if (shopManager) {
      parentChain.push({
        user_id: shopManager.user_id,
        username: shopManager.username,
        user_level: '店长',
        relation_type: '所属店长',
      });
    }

    if (salesman) {
      parentChain.push({
        user_id: salesman.salesman_user_id,
        username: salesman.username,
        user_level: '业务员',
        relation_type: '所属业务员',
      });
    }

    // C端上级从最高级往下排，所以倒序插入
    for (let i = cUserParents.length - 1; i >= 0; i--) {
      parentChain.push(cUserParents[i]);
    }

    // 4. 获取直属下级（分页）
    const childrenWhere = { parent_customer_user_id: customerUserId, is_deleted: 0, status: 1 };
    if (shopId) childrenWhere.shop_id = shopId;

    const { count, rows: childrenRelations } = await ctx.model.CustomerRelation.findAndCountAll({
      where: childrenWhere,
      limit: parseInt(pageSize),
      offset: (parseInt(pageNum) - 1) * parseInt(pageSize),
      order: [[ 'create_time', 'DESC' ]],
    });

    const childrenList = [];
    if (childrenRelations.length > 0) {
      const childUserIds = childrenRelations.map(rel => rel.c_user_id);
      const childUsers = await ctx.model.SysUser.findAll({
        where: { user_id: childUserIds },
        attributes: sysUserAttributes,
      });

      // 为了保持排序一致，将 childUsers 转为 Map，根据 childrenRelations 的顺序填充
      const childUserMap = new Map();
      childUsers.forEach(user => childUserMap.set(user.user_id, user));

      childrenRelations.forEach(rel => {
        const user = childUserMap.get(rel.c_user_id);
        if (user) {
          childrenList.push({
            customer_user_id: user.user_id,
            username: user.username,
            user_level: 1,
            is_real_user: user.is_real_user,
            register_time: user.create_time,
          });
        }
      });
    }

    return {
      current,
      parent_chain: parentChain,
      salesman,
      children: {
        total: count,
        pageNum: parseInt(pageNum),
        pageSize: parseInt(pageSize),
        list: childrenList,
      },
    };
  }
}

module.exports = CustomerService;
