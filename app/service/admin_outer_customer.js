'use strict';

const Service = require('egg').Service;

class AdminOuterCustomerService extends Service {
  /**
   * 获取店铺的C端用户统计信息
   * @param {number} shopId 店铺ID
   */
  async getStatistics(shopId) {
    const { ctx, app } = this;
    const { Op } = app.Sequelize;

    // 获取今天和昨天的开始结束时间
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    // 1. 注册统计
    const relations = await ctx.model.CustomerRelation.findAll({
      where: { shop_id: shopId, is_deleted: 0 },
      attributes: [ 'c_user_id' ],
    });

    const userIds = relations.map(r => r.c_user_id);

    let totalRegister = 0;
    let todayRegister = 0;
    let yesterdayRegister = 0;

    if (userIds.length > 0) {
      totalRegister = await ctx.model.SysUser.count({
        where: {
          user_id: { [Op.in]: userIds },
          user_type: 4,
          is_deleted: 0,
        },
      });

      todayRegister = await ctx.model.SysUser.count({
        where: {
          user_id: { [Op.in]: userIds },
          user_type: 4,
          is_deleted: 0,
          create_time: {
            [Op.between]: [ todayStart, todayEnd ],
          },
        },
      });

      yesterdayRegister = await ctx.model.SysUser.count({
        where: {
          user_id: { [Op.in]: userIds },
          user_type: 4,
          is_deleted: 0,
          create_time: {
            [Op.between]: [ yesterdayStart, yesterdayEnd ],
          },
        },
      });
    }

    // 2. 充值统计 (总)
    const rechargeCount = await ctx.model.UserRecharge.count({
      where: {
        shop_id: shopId,
        status: 2, // 审核通过
      },
    });

    const rechargeUsers = await ctx.model.UserRecharge.findAll({
      where: {
        shop_id: shopId,
        status: 2,
      },
      attributes: [
        [ app.Sequelize.fn('DISTINCT', app.Sequelize.col('user_id')), 'user_id' ],
      ],
    });
    const rechargeUserCount = rechargeUsers.length;

    // 3. 提现统计 (总)
    const withdrawCount = await ctx.model.UserWithdraw.count({
      where: {
        shop_id: shopId,
        status: 2, // 审核通过
      },
    });

    const withdrawUsers = await ctx.model.UserWithdraw.findAll({
      where: {
        shop_id: shopId,
        status: 2,
      },
      attributes: [
        [ app.Sequelize.fn('DISTINCT', app.Sequelize.col('user_id')), 'user_id' ],
      ],
    });
    const withdrawUserCount = withdrawUsers.length;

    return {
      register: {
        total: totalRegister,
        yesterday: yesterdayRegister,
        today: todayRegister,
      },
      recharge: {
        people: rechargeUserCount,
        count: rechargeCount,
      },
      withdraw: {
        people: withdrawUserCount,
        count: withdrawCount,
      },
    };
  }

  /**
   * 获取店铺的C端用户列表
   * 店长 (user_type = 2)：看该 shop_id 下所有的 user_type = 4
   * 业务员 (user_type = 3)：看自己直推及衍生的所有 user_type = 4
   * @param {Object} query 查询参数
   * @param {Object} currentUser 当前登录用户 (需包含 user_id, user_type, shop_id)
   */
  async getCustomerList(query, currentUser) {
    const { ctx, app } = this;
    const { Op } = app.Sequelize;

    let {
      page = 1, page_size = 10, keyword, username, phone, start_time, end_time,
      user_id, parent_id, salesman_id, user_level, user_ip, has_recharge, is_virtual, is_real_user, status, sort,
    } = query;
    page = parseInt(page) || 1;
    page_size = parseInt(page_size) || 10;

    // 基础过滤条件: 是C端用户(user_type=4)
    // 移除强行绑定 shop_id 的过滤，因为 sys_user 中 C 端用户的 shop_id 可能是 null（它记录在 customer_relation 中）
    const where = {
      user_type: 4,
      is_deleted: 0,
    };

    // 搜索条件
    if (keyword) {
      where[Op.or] = [
        { username: { [Op.like]: `%${keyword}%` } },
        { phone: { [Op.like]: `%${keyword}%` } },
        { nickname: { [Op.like]: `%${keyword}%` } },
      ];
    } else {
      if (username) where.username = { [Op.like]: `%${username}%` };
      if (phone) where.phone = { [Op.like]: `%${phone}%` };
    }

    if (user_id) where.user_id = user_id;
    if (status !== undefined && status !== '') where.status = Number(status);

    if (is_virtual !== undefined && is_virtual !== '') {
      where.is_real_user = Number(is_virtual) === 1 ? 0 : 1;
    }
    if (is_real_user !== undefined && is_real_user !== '') {
      where.is_real_user = Number(is_real_user);
    }

    if (user_ip) where.last_login_ip = { [Op.like]: `%${user_ip}%` };

    if (user_level) {
      // 业务员搜层级：1级(直推)、2级(间推)、3级及以上。这需要走关联表或者写特定的递归筛选
      // 为防止全表扫导致性能问题，可以根据 user_level 参数，从之前算出来的层级关系树里做内存过滤
      // 这里的 allDescendantIds 等在前面权限隔离处已经获取过了
      // 我们可以在此处不做 where 追加，留到查询后过滤，或者根据具体业务需要扩展 SQL。
      // 为简化当前接口复杂度，如果只是展示字段，可以考虑在返回时打上层级标签。
    }

    if (start_time || end_time) {
      where.create_time = {};
      if (start_time) where.create_time[Op.gte] = new Date(start_time);
      if (end_time) where.create_time[Op.lte] = new Date(end_time);
    }

    // 权限隔离逻辑
    if (currentUser.user_type === 3) { // 业务员
      // 1. 查找业务员的直属客户
      const directRelations = await ctx.model.CustomerRelation.findAll({
        where: {
          root_salesman_user_id: currentUser.user_id, // 修复：原来是 salesman_user_id
          is_deleted: 0,
        },
        attributes: [ 'c_user_id' ],
      });

      let currentLevelIds = directRelations.map(r => r.c_user_id);
      const allDescendantIds = new Set(currentLevelIds);

      // 2. 逐层向下查找，直至叶子节点
      while (currentLevelIds.length > 0) {
        const children = await ctx.model.CustomerRelation.findAll({
          where: {
            parent_customer_user_id: { [Op.in]: currentLevelIds },
            is_deleted: 0,
          },
          attributes: [ 'c_user_id' ],
        });

        currentLevelIds = [];
        for (const child of children) {
          if (!allDescendantIds.has(child.c_user_id)) {
            allDescendantIds.add(child.c_user_id);
            currentLevelIds.push(child.c_user_id);
          }
        }
      }

      // 3. 将所有查到的用户ID加入查询条件
      if (allDescendantIds.size > 0) {
        where.user_id = {
          [Op.in]: Array.from(allDescendantIds),
        };
      } else {
        // 没有任何直推或衍生客户，直接返回空
        return { list: [], total: 0 };
      }
    } else if (currentUser.user_type === 2) {
      // 店长可以看当前 shop_id 的所有人
      // 通过关联表 customer_relation 来过滤 shop_id
      const shopRelations = await ctx.model.CustomerRelation.findAll({
        where: { shop_id: currentUser.shop_id, is_deleted: 0 },
        attributes: [ 'c_user_id' ],
      });
      const shopUserIds = shopRelations.map(r => r.c_user_id);
      if (shopUserIds.length > 0) {
        where.user_id = { [Op.in]: shopUserIds };
      } else {
        return { list: [], total: 0 };
      }
    } else {
      // 其他类型（异常情况），兜底不返回数据
      return { list: [], total: 0 };
    }

    // 查询满足条件的用户分页数据

    // 排序逻辑
    const order = [];
    if (sort) {
      if (sort === 'balance_asc') {
        // 由于余额不在主表，如果在代码层排序，需要先查全部或联表查询。目前简化处理或留空
        // 若要联查排序，需修改 include 并在主查询加 order
      }
    }
    order.push([ 'create_time', 'DESC' ]);

    // 联合查询条件
    const include = [];

    // 处理关联表条件：parent_id, salesman_id, user_level, has_recharge
    const relationWhere = {};
    if (parent_id) relationWhere.parent_customer_user_id = parent_id;
    if (salesman_id) relationWhere.root_salesman_user_id = salesman_id;
    if (Object.keys(relationWhere).length > 0) {
      include.push({
        model: ctx.model.CustomerRelation,
        as: 'customerRelation', // 需在 SysUser 模型中定义关联
        where: relationWhere,
        required: true,
      });
    }

    if (has_recharge !== undefined || sort?.startsWith('balance')) {
      const walletWhere = {};
      if (has_recharge === '1') walletWhere.total_recharge_amount = { [Op.gt]: 0 };
      if (has_recharge === '0') walletWhere.total_recharge_amount = 0;

      const walletInclude = {
        model: ctx.model.UserWallet,
        as: 'wallet', // 需在 SysUser 模型中定义关联
        required: Object.keys(walletWhere).length > 0,
      };
      if (Object.keys(walletWhere).length > 0) walletInclude.where = walletWhere;
      include.push(walletInclude);

      if (sort === 'balance_asc') order.unshift([{ model: ctx.model.UserWallet, as: 'wallet' }, 'balance', 'ASC' ]);
      if (sort === 'balance_desc') order.unshift([{ model: ctx.model.UserWallet, as: 'wallet' }, 'balance', 'DESC' ]);
    }

    const { rows, count } = await ctx.model.SysUser.findAndCountAll({
      where,
      include: include.length > 0 ? include : undefined,
      attributes: [ 'user_id', 'username', 'nickname', 'phone', 'avatar', 'status', 'create_time', 'remark', 'inviter_user_id', 'last_login_ip', 'last_login_time', 'is_real_user', 'user_type', 'vip_level' ],
      order,
      limit: page_size,
      offset: (page - 1) * page_size,
      distinct: true, // 防止 count 受 include 影响
    });

    // 关联获取 user_wallet 钱包信息, customer_relation 和 customer_stat
    const userIds = rows.map(r => r.user_id);
    const walletMap = {};
    const relationMap = {};
    const extraUserMap = {}; // 用于存放额外查询出的业务员/上级客户名称
    const firstRechargeMap = {}; // 存放首充信息
    const rechargeCountMap = {}; // 记录用户的充值总次数
    const loginLogMap = {}; // 记录用户的最新登录信息
    const withdrawCountMap = {}; // 新增：记录用户的提现次数
    const withdrawAmountMap = {}; // 新增：记录用户的提现金额
    const parentIncomeAmountMap = {}; // 新增：记录给上级贡献的佣金

    if (userIds.length > 0) {
      // 查询每个用户的最新登录日志
      const loginLogs = await ctx.model.UserLoginLog.findAll({
        where: { user_id: { [Op.in]: userIds } },
        attributes: [ 'user_id', 'login_ip', 'login_location', 'login_time' ],
        order: [[ 'login_time', 'DESC' ]],
        raw: true,
      });
      loginLogs.forEach(log => {
        // 由于按倒序排，第一个出现的即为最新的记录
        if (!loginLogMap[log.user_id]) {
          loginLogMap[log.user_id] = log;
        }
      });

      const wallets = await ctx.model.UserWallet.findAll({
        where: { user_id: { [Op.in]: userIds } },
        attributes: [ 'user_id', 'balance', 'static_income', 'dynamic_income', 'total_recharge_amount', 'total_withdraw_amount' ],
        raw: true, // 使用 raw: true 避免实例的 getter 带来的隐式问题
      });
      wallets.forEach(w => {
        walletMap[w.user_id] = w;
      });

      const relations = await ctx.model.CustomerRelation.findAll({
        where: { c_user_id: { [Op.in]: userIds }, is_deleted: 0 },
        attributes: [ 'c_user_id', 'parent_customer_user_id', 'root_salesman_user_id', 'shop_id', 'remark' ],
      });

      const extraUserIds = new Set();
      relations.forEach(r => {
        relationMap[r.c_user_id] = r;
        if (r.root_salesman_user_id) extraUserIds.add(r.root_salesman_user_id);
        if (r.parent_customer_user_id) extraUserIds.add(r.parent_customer_user_id);
      });

      if (extraUserIds.size > 0) {
        const extraUsers = await ctx.model.SysUser.findAll({
          where: { user_id: { [Op.in]: Array.from(extraUserIds) } },
          attributes: [ 'user_id', 'username', 'nickname' ],
        });
        extraUsers.forEach(u => {
          // 优先取昵称，没有则取用户名
          extraUserMap[u.user_id] = u.nickname || u.username;
        });
      }
      
      // 查询首充及充值次数信息
      const allRecharges = await ctx.model.UserRecharge.findAll({
        where: { 
          user_id: { [Op.in]: userIds },
          status: 2, // 审核通过
        },
        attributes: [ 'user_id', 'amount', 'audit_time', 'create_time', 'is_first_recharge' ],
        raw: true,
      });
      
      allRecharges.forEach(fr => {
        // 统计充值次数
        rechargeCountMap[fr.user_id] = (rechargeCountMap[fr.user_id] || 0) + 1;
        
        // 首充可能标记为 is_first_recharge = 1
        // 如果没有标记，但在审核通过记录中它是最早的，我们也可以作为首充依据
        const time = fr.audit_time || fr.create_time;
        if (!firstRechargeMap[fr.user_id] || new Date(time) < new Date(firstRechargeMap[fr.user_id].time)) {
          firstRechargeMap[fr.user_id] = {
            amount: fr.amount,
            time: time
          };
        }
      });

      // 增加：动态查询并计算用户的提现统计 (只要审核通过的都算)
      const allWithdraws = await ctx.model.UserWithdraw.findAll({
        where: {
          user_id: { [Op.in]: userIds },
          status: 2, // 审核通过(已打款)
        },
        attributes: ['user_id', 'amount'],
        raw: true,
      });

      // 增加：动态查询该用户给其直属上级产生的下级贡献佣金总计
      // 由于流水表里没有直接存“下级是谁”，我们可以通过联表查询 shop_task_user_item_progress 来确认
      // 先把该页所有用户的进度记录ID查出来
      const userProgresses = await ctx.model.ShopTaskUserItemProgress.findAll({
        where: { user_id: { [Op.in]: userIds } },
        attributes: ['id', 'user_id'],
        raw: true
      });
      
      const progressToUserMap = {};
      const progressIds = [];
      userProgresses.forEach(p => {
        progressToUserMap[p.id] = p.user_id;
        progressIds.push(p.id);
      });

      userIds.forEach(id => {
        parentIncomeAmountMap[id] = 0;
      });

      if (progressIds.length > 0) {
        // 然后去流水表查这些进度ID产生的上级动态收益
        const allParentIncomes = await ctx.model.UserWalletLog.findAll({
          where: {
            biz_type: 5, // 5 = 动态收益发放
            related_order_id: { [Op.in]: progressIds }
          },
          attributes: ['related_order_id', 'amount'],
          raw: true,
        });

        allParentIncomes.forEach(log => {
          const uid = progressToUserMap[log.related_order_id];
          if (uid) {
            parentIncomeAmountMap[uid] += parseFloat(log.amount || 0);
          }
        });
      }

      // 初始化所有用户的默认值，确保存在映射
      userIds.forEach(id => {
        withdrawCountMap[id] = 0;
        withdrawAmountMap[id] = 0;
      });

      allWithdraws.forEach(wRecord => {
        const uid = Number(wRecord.user_id);
        withdrawCountMap[uid] = (withdrawCountMap[uid] || 0) + 1;
        withdrawAmountMap[uid] = (withdrawAmountMap[uid] || 0) + parseFloat(wRecord.amount || 0);
      });
    }

    // 获取所有启用的 VIP 规则
    const allVipLevels = await ctx.model.ShopVipLevel.findAll({
      where: { is_enable: 1 },
      raw: true,
      order: [[ 'need_total_recharge', 'DESC' ]], // 按需要充值金额倒序
    });
    const vipMapByShop = {};
    allVipLevels.forEach(v => {
      if (!vipMapByShop[v.shop_id]) vipMapByShop[v.shop_id] = [];
      vipMapByShop[v.shop_id].push(v);
    });

    const list = await Promise.all(rows.map(async row => {
      const w = walletMap[row.user_id] || {};
      const r = relationMap[row.user_id] || {};

      let calculatedLevel = 4;
      if (row.user_type === 4) {
        let currentId = row.user_id;
        while (true) {
          // 优先从已查出的 relationMap 中获取
          let rel = relationMap[currentId];
          if (!rel) {
            rel = await ctx.model.CustomerRelation.findOne({ where: { c_user_id: currentId, is_deleted: 0 } });
            if (rel) relationMap[currentId] = rel; // 缓存一下
          }
          if (!rel || !rel.parent_customer_user_id) break;
          calculatedLevel++;
          currentId = rel.parent_customer_user_id;
        }
      } else {
        calculatedLevel = row.user_type;
      }

      // 动态计算 VIP 等级
      const totalRecharge = Number(w.total_recharge_amount || 0);
      const userShopId = r.shop_id || row.shop_id; // 从关系表或主表取 shop_id
      const shopVips = vipMapByShop[userShopId] || vipMapByShop[0] || [];
      
      let currentVipLevel = row.vip_level || 1; // 默认值
      let currentVipName = 'VIP1';
      for (const vip of shopVips) {
        if (totalRecharge >= Number(vip.need_total_recharge)) {
          currentVipLevel = vip.level;
          currentVipName = vip.level_name;
          break; // 由于我们是按 DESC 倒序排的，第一个满足条件的就是最高等级
        }
      }

      const firstRechargeInfo = firstRechargeMap[row.user_id] || {};
      const latestLoginInfo = loginLogMap[row.user_id] || {};

      return {
        ...row.toJSON(),

        // 真实钱包表查询出的可用资产
        voucher_balance: Number(w.balance || w.voucher_balance || 0).toFixed(2),
        static_income: Number(w.static_income || 0).toFixed(2),
        dynamic_income: Number(w.dynamic_income || 0).toFixed(2),
        // (将三种资产加总返回给前端一个总额概念，方便兼容历史)
        balance: (Number(w.balance || w.voucher_balance || 0) + Number(w.static_income || 0) + Number(w.dynamic_income || 0)).toFixed(2),
        frozen_balance: '0.00', // 如果需要列表展示冻结资产，可以继续关联钱包表或者走 stat 冗余

        // 来自 钱包 表的字段
        is_recharge_user: (Number(w.total_recharge_amount || 0) > 0) ? 1 : 0,
        total_recharge_amount: Number(w.total_recharge_amount || 0).toFixed(2),
        total_recharge_count: rechargeCountMap[row.user_id] || 0,
        first_recharge_amount: firstRechargeInfo.amount !== undefined ? Number(firstRechargeInfo.amount).toFixed(2) : null,
        first_recharge_time: firstRechargeInfo.time || null,
        allow_withdraw: 1,
        temp_withdraw_status: 1,
        total_withdraw_amount: (withdrawAmountMap[row.user_id] || 0).toFixed(2),
        total_withdraw_count: withdrawCountMap[row.user_id] || 0,
        
        // 增加：给上级产生的佣金贡献字段
        contribute_commission_to_parent: (parentIncomeAmountMap ? (parentIncomeAmountMap[row.user_id] || 0) : 0).toFixed(2),

        // 登录信息：优先从 user_login_log 取最新一条，如果为空则回退使用主表记录
        last_login_ip: latestLoginInfo.login_ip || row.last_login_ip || null,
        last_login_location: latestLoginInfo.login_location || (row.last_login_ip ? (ctx.service.sysLog ? ctx.service.sysLog.resolveIpLocation(row.last_login_ip) : '未知') : null),
        last_login_time: latestLoginInfo.login_time || row.last_login_time || null,

        parent_customer_user_id: r.parent_customer_user_id || null,
        parent_customer_name: extraUserMap[r.parent_customer_user_id] || null,
        root_salesman_user_id: r.root_salesman_user_id || null,
        root_salesman_name: extraUserMap[r.root_salesman_user_id] || null,
        user_level: calculatedLevel,
        vip_level: currentVipLevel,
        vip_name: currentVipName,
        remark: r.remark || row.remark || null, // 优先使用关系表里的备注
      };
    }));

    return { list, total: count };
  }

  /**
   * 店长/业务员手动添加C端用户（辅助注册），仅操作 sys_user 及新表
   * @param {Object} payload 注册参数
   * @param {Object} currentUser 当前操作者
   */
  async createCustomer(payload, currentUser) {
    const { ctx, app } = this;
    const { phone, password, promo_code, ip } = payload;
    const { user_id: operatorId, shop_id: operatorShopId } = currentUser;

    // 校验手机号是否已注册(只检查新表 sys_user)
    const existSysPhone = await ctx.model.SysUser.findOne({ where: { phone, is_deleted: 0 } });
    if (existSysPhone) {
      ctx.throw(409, '手机号已被注册');
    }

    // 解析推广码获取业务员信息
    const salesmanUser = await ctx.model.SysUser.findOne({
      where: { invite_code: promo_code, is_deleted: 0, status: 1 },
    });
    if (!salesmanUser || (salesmanUser.user_type !== 2 && salesmanUser.user_type !== 3)) {
      ctx.throw(403, '推广码无效');
    }

    const rootSalesmanUserId = salesmanUser.user_id;
    const targetShopId = salesmanUser.shop_id || operatorShopId;

    // 生成新表邀请码
    const personalInviteCode = await ctx.service.user.generateInviteCode();
    const hashedPassword = await ctx.genHash(password);

    // 开启事务
    const transaction = await ctx.model.transaction();
    try {
      // 1. 创建新表 SysUser (C端用户)
      const sysUser = await ctx.model.SysUser.create({
        username: phone,
        password: hashedPassword,
        phone,
        user_type: 4, // C端用户
        shop_id: null, // C端用户的shop_id保存在customer_relation，主表可留空
        status: 1,
        invite_code: personalInviteCode,
        inviter_user_id: null,
        last_login_ip: ip,
        is_recharged: 0,
        is_real_user: 1, // 真实注册用户
        create_user_id: operatorId, // 记录创建人
      }, { transaction });

      // 2. 创建新表钱包 UserWallet
      await ctx.model.UserWallet.create({
        user_id: sysUser.user_id,
        balance: 0,
        static_income: 0,
        dynamic_income: 0,
        total_recharge_amount: 0,
        total_withdraw_amount: 0,
      }, { transaction });

      // 3. 创建新表客户归属 CustomerRelation
      await ctx.model.CustomerRelation.create({
        c_user_id: sysUser.user_id,
        parent_customer_user_id: null,
        shop_id: targetShopId,
        root_salesman_user_id: rootSalesmanUserId,
        root_shop_id: targetShopId,
      }, { transaction });

      // 4. 创建 customer_stat 初始化记录 (deprecated)
      // await ctx.model.CustomerStat.create({
      //   customer_user_id: sysUser.user_id,
      //   allow_withdraw: 1,
      //   temp_withdraw_status: 1,
      // }, { transaction });

      await transaction.commit();

      // 更新 Redis 缓存，存入新注册的 C端用户 invite_code
      const newInviteCacheKey = `invite:code:${personalInviteCode}`;
      await app.redis.set(newInviteCacheKey, sysUser.user_id, 'EX', 86400 * 7);

      return sysUser;
    } catch (error) {
      await transaction.rollback();
      ctx.logger.error('[AdminOuterCustomerService.createCustomer] 添加C端用户失败:', error);
      ctx.throw(500, '添加用户失败');
    }
  }
  /**
   * 编辑 C 端客户信息
   * @param {number} userId 用户ID
   * @param {Object} payload 载荷参数
   * @param {Object} currentUser 当前操作者
   */
  async updateCustomer(userId, payload, currentUser) {
    const { ctx } = this;
    const { remark, status, is_real_user } = payload;

    // 1. 校验用户是否存在并且是 C端用户
    const user = await ctx.model.SysUser.findOne({
      where: { user_id: userId, user_type: 4, is_deleted: 0 },
    });
    if (!user) {
      ctx.throw(404, 'C端客户不存在');
    }

    // 2. 校验数据权限：B店铺只能修改属于本店的客户
    const relation = await ctx.model.CustomerRelation.findOne({
      where: { c_user_id: userId, is_deleted: 0 },
    });
    if (!relation || relation.shop_id !== currentUser.shop_id) {
      ctx.throw(403, '无权操作非本店客户');
    }

    const transaction = await ctx.model.transaction();
    try {
      const operResult = [];

      // 3. 修改 sys_user 的备注和状态
      const sysUserUpdate = {};
      if (remark !== undefined) {
        sysUserUpdate.remark = remark;
        operResult.push(`备注修改为: ${remark}`);
      }
      if (status !== undefined) {
        // 兼容前端可能传 true/false 的情况
        sysUserUpdate.status = status === true || status === 'true' || status === 1 || status === '1' ? 1 : 0;
        operResult.push(`账号状态修改为: ${sysUserUpdate.status}`);
      }
      if (is_real_user !== undefined) {
        sysUserUpdate.is_real_user = is_real_user === true || is_real_user === 'true' || is_real_user === 1 || is_real_user === '1' ? 1 : 0;
        operResult.push(`真实用户状态修改为: ${sysUserUpdate.is_real_user}`);
      }
      if (Object.keys(sysUserUpdate).length > 0) {
        await user.update(sysUserUpdate, { transaction });
      }

      // 4. 修改 customer_stat 的提现配置 (deprecated)
      // if (allow_withdraw !== undefined || temp_withdraw_status !== undefined) {
      //   let stat = await ctx.model.CustomerStat.findOne({
      //     where: { customer_user_id: userId },
      //   });

      //   // 如果 stat 记录不存在（比如老数据没同步），则主动创建一条
      //   if (!stat) {
      //     stat = await ctx.model.CustomerStat.create({
      //       customer_user_id: userId,
      //       allow_withdraw: 1,
      //       temp_withdraw_status: 1,
      //     }, { transaction });
      //   }

      //   const statUpdate = {};
      //   if (allow_withdraw !== undefined) {
      //     statUpdate.allow_withdraw = allow_withdraw === true || allow_withdraw === 'true' || allow_withdraw === 1 || allow_withdraw === '1' ? 1 : 0;
      //     operResult.push(\`提现状态:\${statUpdate.allow_withdraw}\`);
      //   }
      //   if (temp_withdraw_status !== undefined) {
      //     statUpdate.temp_withdraw_status = temp_withdraw_status === true || temp_withdraw_status === 'true' || temp_withdraw_status === 1 || temp_withdraw_status === '1' ? 1 : 0;
      //     operResult.push(\`临时提现状态:\${statUpdate.temp_withdraw_status}\`);
      //   }

      //   // 确保使用 transaction 更新
      //   if (Object.keys(statUpdate).length > 0) {
      //     // 由于 Egg Sequelize 某些版本的脏检查或实例绑定问题
      //     // 我们直接使用 ctx.model.query 执行原生 SQL，将更新强制带入事务
      //     const sql = 'UPDATE customer_stat SET allow_withdraw = :allow_withdraw, temp_withdraw_status = :temp_withdraw_status WHERE customer_user_id = :customer_user_id';
      //     await ctx.model.query(sql, {
      //       replacements: {
      //         allow_withdraw: statUpdate.allow_withdraw !== undefined ? statUpdate.allow_withdraw : stat.allow_withdraw,
      //         temp_withdraw_status: statUpdate.temp_withdraw_status !== undefined ? statUpdate.temp_withdraw_status : stat.temp_withdraw_status,
      //         customer_user_id: userId,
      //       },
      //       type: ctx.model.Sequelize.QueryTypes.UPDATE,
      //       transaction,
      //     });
      //   }
      // }

      await transaction.commit();

      // 5. 写入操作日志 sys_oper_log
      if (operResult.length > 0) {
        // 由于依赖了 sysLog，需要确保之前挂载过或者有通用日志服务，若没有可调整
        if (ctx.service.sysLog && ctx.service.sysLog.createLog) {
          await ctx.service.sysLog.createLog({
            oper_user_id: currentUser.user_id,
            oper_username: currentUser.username || '',
            shop_id: currentUser.shop_id,
            oper_type: 2, // 修改
            oper_module: 'C端客户管理',
            oper_desc: '编辑客户配置',
            request_method: ctx.method,
            request_url: ctx.url,
            request_params: JSON.stringify(payload),
            response_result: `code:200,msg:"修改成功",客户ID:${userId},修改项:[${operResult.join(',')}]`,
            oper_status: 1,
            oper_ip: ctx.ip,
          });
        }
      }

      return true;
    } catch (error) {
      await transaction.rollback();
      ctx.logger.error('[AdminOuterCustomerService.updateCustomer] error:', error);
      ctx.throw(500, '更新客户信息失败');
    }
  }

  async resetWithdrawPassword(userId, withdraw_pwd, currentUser) {
    const { ctx } = this;

    // 1. 校验用户是否存在并且是C端用户
    const user = await ctx.model.SysUser.findOne({
      where: { user_id: userId, user_type: 4, is_deleted: 0 },
    });
    if (!user) {
      ctx.throw(404, 'C端客户不存在');
    }

    // 2. 校验数据权限：B店铺只能修改属于本店的客户
    const relation = await ctx.model.CustomerRelation.findOne({
      where: { c_user_id: userId, is_deleted: 0 },
    });
    if (!relation || relation.shop_id !== currentUser.shop_id) {
      ctx.throw(403, '无权操作非本店客户');
    }

    // 3. 生成新盐和哈希
    const crypto = require('crypto');
    const salt = crypto.randomBytes(16).toString('hex');
    const newWithdrawPwdHash = crypto.createHash('sha256').update(withdraw_pwd + salt).digest('hex');

    await user.update({
      withdraw_pwd: newWithdrawPwdHash,
      withdraw_pwd_salt: salt,
    });

    // 记录操作日志
    await ctx.service.sysLog.recordOperationLog({
      userId: currentUser.user_id,
      username: currentUser.username,
      title: '修改客户提现密码',
      businessType: 2, // 2 表示修改 (根据 sys_operation_log 约定)
      operUrl: ctx.url,
      requestMethod: ctx.method,
      operIp: ctx.ip,
      operParam: JSON.stringify({ target_id: userId }),
    });

    return true;
  }

  /**
   * B端给C端用户添加或扣除资金 (后台充值/扣款)
   * @param {Number} userId C端用户ID
   * @param {Object} payload 资金操作参数
   * @param {Object} currentUser 当前操作的B端用户
   */
  async updateBalance(userId, payload, currentUser) {
    const { ctx } = this;
    const { amount, balance_type, change_type, remark } = payload;
    const { shop_id } = currentUser;

    // 参数校验
    if (!amount || Number(amount) <= 0) {
      ctx.throw(400, '操作金额必须大于0');
    }
    if (![ 1, 2 ].includes(Number(change_type))) {
      ctx.throw(400, '无效的操作类型 (1增加 2扣除)');
    }

    const isAdd = Number(change_type) === 1;
    if (isAdd) {
      if (![ 0, 1, 2 ].includes(Number(balance_type))) {
        ctx.throw(400, '增加余额时，balance_type 必须是 0-赠送 1-员工添加 2-通道充值');
      }
    }

    // 1. 校验用户是否存在并且是C端用户
    const user = await ctx.model.SysUser.findOne({
      where: { user_id: userId, user_type: 4, is_deleted: 0 },
    });
    if (!user) {
      ctx.throw(404, 'C端客户不存在');
    }

    // 2. 校验数据权限：B店铺只能操作属于本店的客户
    const relation = await ctx.model.CustomerRelation.findOne({
      where: { c_user_id: userId, is_deleted: 0 },
    });
    if (!relation || relation.shop_id !== shop_id) {
      ctx.throw(403, '无权操作非本店客户资金');
    }

    const transaction = await ctx.model.transaction();
    try {
      // 3. 获取用户钱包并加排他锁
      const wallet = await ctx.model.UserWallet.findOne({
        where: { user_id: userId },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!wallet) {
        ctx.throw(404, '未找到用户钱包数据');
      }

      const opAmount = Number(amount);
      const beforeBalance = Number(wallet.balance || wallet.voucher_balance || 0);
      let afterBalance = 0;

      // 计算余额 (仅操作代金资产/余额)
      if (isAdd) {
        afterBalance = Number((beforeBalance + opAmount).toFixed(2));
      } else {
        if (beforeBalance < opAmount) ctx.throw(400, '用户余额不足，扣除失败');
        afterBalance = Number((beforeBalance - opAmount).toFixed(2));
      }

      await wallet.update({ balance: afterBalance }, { transaction });

      // 4. 生成资金流水
      const logNo = 'BL' + Date.now() + Math.floor(Math.random() * 1000);
      let remarkText = remark;
      if (!remarkText) {
        if (isAdd) {
          const typeName = { 0: '赠送', 1: '员工添加', 2: '通道充值' }[Number(balance_type)];
          remarkText = `后台手动增加余额(${typeName})`;
        } else {
          remarkText = '后台手动扣除余额';
        }
      }

      await ctx.model.UserWalletLog.create({
        user_id: userId,
        log_no: logNo,
        biz_type: isAdd ? 7 : 6, // 7其他(虚拟增加) 6资产扣减(后台扣除) - 不算真实充值
        amount: isAdd ? opAmount : -opAmount,
        balance_type: 1, // 强制为1，表示操作的是主余额（代金资产）
        before_balance: beforeBalance,
        after_balance: afterBalance,
        related_order_id: null,
        remark: remarkText,
      }, { transaction });

      // 5. 生成账单流水明细 (user_bill) - 已经用 UserWalletLog 替代
      // await ctx.model.UserBill.create({
      //   user_id: userId,
      //   shop_id,
      //   bill_type: isAdd ? 7 : 8, // 7后台人工增加 8后台人工扣除 - 避免被统计脚本算入充值
      //   related_no: logNo,
      //   change_amount: isAdd ? opAmount : -opAmount,
      //   balance_before: beforeBalance,
      //   balance_after: afterBalance,
      //   frozen_before: Number(wallet.freeze_voucher_balance) || 0,
      //   frozen_after: Number(wallet.freeze_voucher_balance) || 0,
      // }, { transaction });

      // 6. 联动更新 customer_stat 冗余字段，保证B端列表显示同步 (deprecated)
      // await ctx.model.CustomerStat.update({ voucher_balance: afterBalance }, {
      //   where: { customer_user_id: userId },
      //   transaction,
      // });

      await transaction.commit();

      // 6. 异步记录操作日志
      if (ctx.service.sysLog && ctx.service.sysLog.createLog) {
        ctx.service.sysLog.createLog({
          oper_user_id: currentUser.user_id,
          oper_username: currentUser.username || '',
          shop_id,
          oper_type: 2, // 修改
          oper_module: 'C端客户资金管理',
          oper_desc: isAdd ? '后台增加资金' : '后台扣除资金',
          request_method: ctx.method,
          request_url: ctx.url,
          request_params: JSON.stringify(payload),
          response_result: `code:200,msg:"操作成功",客户ID:${userId},变动:${isAdd ? '+' : '-'}${opAmount}`,
          oper_status: 1,
          oper_ip: ctx.ip,
        }).catch(err => ctx.logger.error('记录操作日志失败', err));
      }

      return {
        before_balance: beforeBalance,
        after_balance: afterBalance,
        change_amount: isAdd ? opAmount : -opAmount,
      };
    } catch (error) {
      await transaction.rollback();
      ctx.logger.error('[AdminOuterCustomerService.updateBalance] error:', error);
      ctx.throw(error.status || 500, error.message || '资金操作失败');
    }
  }

  /**
   * 获取C端用户的资金明细列表 (基于新表 user_wallet_log, 不走老表)
   * @param {number} userId 用户ID
   * @param {Object} query 查询参数
   * @param {number} shopId 店铺ID
   */
  async getFundDetails(userId, query, shopId) {
    const { ctx } = this;
    const { pageNum = 1, pageSize = 10, type } = query;

    // 1. 校验数据权限
    const relation = await ctx.model.CustomerRelation.findOne({
      where: { c_user_id: userId, is_deleted: 0 },
    });
    if (!relation || relation.shop_id !== shopId) {
      ctx.throw(403, '无权查看非本店客户资金明细');
    }

    // 2. 从 user_wallet_log 查询所有流水
    // 由于业务要求不走老表(收益表/充提老表)，全部依据 user_wallet_log
    const where = { user_id: userId };
    const logs = await ctx.model.UserWalletLog.findAll({
      where,
      order: [[ 'id', 'DESC' ]], // 按创建时间倒序
      raw: true,
    });

    // 3. 映射并组装数据
    // 新表的 biz_type 定义: (1充值 2提现申请 3提现驳回退回 4静态收益发放 5动态收益发放 6资产扣减 7其他(后台人工增加))
    // 需要映射到前端需要的 type: 0任务收益, 1用户充值, 2团队收益, 3系统增加, 4系统减少, 5提现
    let allRecords = logs.map(log => {
      let mappedType = -1;
      let remark = log.remark || '';

      switch (log.biz_type) {
        case 4: // 静态收益
          mappedType = 0; // 映射为: 0任务收益
          if (!remark) remark = '静态收益';
          break;
        case 5: // 动态收益
          mappedType = 2; // 映射为: 2团队收益
          if (!remark) remark = '动态收益';
          break;
        case 1: // 充值
          mappedType = 1; // 映射为: 1用户充值
          if (!remark) remark = '用户充值';
          break;
        case 7: // 后台人工增加
          mappedType = 3; // 映射为: 3系统增加
          if (!remark) remark = '系统人工增加';
          break;
        case 6: // 资产扣减
          mappedType = 4; // 映射为: 4系统减少
          if (!remark) remark = '系统人工扣除';
          break;
        case 2: // 提现申请扣款
        case 3: // 提现驳回退款 (变动为正)
          mappedType = 5; // 映射为: 5提现
          if (!remark) remark = log.biz_type === 2 ? '用户提现' : '提现驳回退回';
          break;
        default:
          mappedType = 7; // 未知
          break;
      }

      return {
        rawTime: new Date(log.created_at || log.log_time || Date.now()).getTime(),
        create_time: this.formatDateTime(log.created_at || log.log_time),
        revenue_id: `wl_${log.id}`, // 唯一标识
        user_id: log.user_id,
        order_no: log.related_order_id || log.log_no || this.generateTempOrderNo('90'),
        type: mappedType,
        doMoney: Number(log.amount), // 带有正负号
        beforeMoney: Number(log.before_balance),
        afterMoney: Number(log.after_balance),
        remark,
      };
    });

    // 4. 按前端传入的 type 进行过滤
    if (type !== undefined && type !== '' && type !== null) {
      allRecords = allRecords.filter(r => String(r.type) === String(type));
    }

    // 5. 分页
    const total = allRecords.length;
    const offset = (Number(pageNum) - 1) * Number(pageSize);
    const list = allRecords.slice(offset, offset + Number(pageSize)).map(item => {
      const cloned = { ...item };
      delete cloned.rawTime;
      return cloned;
    });

    return {
      total,
      pageNum: Number(pageNum),
      pageSize: Number(pageSize),
      list,
    };
  }

  /**
   * 生成临时单号
   * @param {string} prefix
   */
  generateTempOrderNo(prefix) {
    return prefix + Date.now() + Math.floor(Math.random() * 10000);
  }

  /**
   * 格式化时间
   * @param {string|Date} dateStr 时间字符串或日期对象
   */
  formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
  }
}

module.exports = AdminOuterCustomerService;
