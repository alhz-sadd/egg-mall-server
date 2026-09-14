'use strict';

const Service = require('egg').Service;
const dayjs = require('dayjs');
const { v4: uuidv4 } = require('uuid');

/**
 * 订单服务层
 */
class OrderService extends Service {
  /**
   * 获取订单详情信息 (配合 searchTask 使用)
   * @param {string} orderId 订单编号(order_id)
   * @param {number} userId 用户ID
   * @return {Object} 格式化后的订单详情
   */
  async getOrderMsg(orderId, userId) {
    const { ctx } = this;
    const { Op } = ctx.app.Sequelize;

    // 获取当前请求用户的真实数据库主键ID
    const userObj = await ctx.model.SysUser.findByPk(userId);
    if (!userObj || userObj.user_type !== 4) {
      ctx.throw(404, '用户不存在');
    }
    const dbUserId = userObj.user_id;

    // 从进度表中查找订单
    const progress = await ctx.model.ShopTaskUserItemProgress.findOne({
      where: {
        order_id: orderId.toString(),
        user_id: dbUserId
      }
    });

    if (!progress) {
      ctx.throw(404, '任务订单不存在');
    }

    const taskItem = await ctx.model.ShopTaskItem.findOne({ where: { item_id: progress.task_item_id } });
    const shopTask = taskItem ? await ctx.model.ShopTask.findByPk(taskItem.task_id) : null;
    const goods = progress.goods_id ? await ctx.model.Goods.findByPk(progress.goods_id) : null;

    const wallet = await ctx.model.UserWallet.findOne({ where: { user_id: dbUserId } });
    let needPrice = 0;
    const totalAmount = Number(progress.goods_price || 0);
    const balance = Number(wallet ? wallet.balance : 0);

    if (totalAmount > balance) {
      needPrice = (totalAmount - balance).toFixed(2);
    }

    const revenueRate = shopTask ? Number(shopTask.yield_rate || 0) : 0;
    const parentRevenueRate = shopTask ? Number(shopTask.parent_yield_rate || 0) : 0;
    
    // 进度表中的 status: 0=未完成, 1=已完成
    // 映射到前端期望的 status: 0=待支付, 1=已完成
    let mappedStatus = 0;
    if (progress.status === 1) {
      mappedStatus = 1; // 对应已完成/已支付
    }

    return {
      orderId: progress.order_id,
      orderType: taskItem ? taskItem.item_type : 1, // 1:普通订单任务, 2:幸运订单任务
      needPrice: needPrice.toString(),
      remark: '任务订单',
      revenueRate: revenueRate.toString(),
      revenue: progress.revenue.toString(),
      totalPrice: totalAmount.toString(),
      parentRevenueRate: parentRevenueRate.toString(),
      parentRevenue: (totalAmount * parentRevenueRate).toFixed(2),
      status: mappedStatus,
      picUrl: goods ? goods.cover_image : '',
      waresName: progress.goods_title || '',
      cTime: progress.create_time ? new Date(progress.create_time).toISOString() : null,
      uTime: progress.update_time ? new Date(progress.update_time).toISOString() : null,
    };
  }

  /**
   * 生成订单编号
   * @return {string} 订单编号
   */
  generateOrderNo() {
    const date = dayjs().format('YYYYMMDDHHmmss');
    const suffix = uuidv4().replace(/-/g, '').slice(0, 8)
      .toUpperCase();
    return `O${date}${suffix}`;
  }

  /**
   * 创建订单
   * @param {number} userId 用户ID
   * @param {Object} payload 订单参数
   * @return {Object} 创建的订单
   */
  async create(userId, payload) {
    const { ctx } = this;
    const { address_id, product_id, quantity, remark } = payload;

    // 校验地址
    const address = await ctx.model.Address.findOne({
      where: { id: address_id, user_id: userId },
    });
    if (!address) {
      ctx.throw(404, '收货地址不存在');
    }

    const transaction = await ctx.model.transaction();
    try {
      const product = await ctx.model.Product.findByPk(product_id);
      if (!product || product.status !== 1) {
        throw new Error(`商品「${product ? product.title : '未知'}」已下架`);
      }
      if (product.stock < quantity) {
        throw new Error(`商品「${product.title}」库存不足`);
      }

      const totalAmount = Number(product.price) * quantity;

      const orderItem = {
        product_id: product.id,
        product_name: product.title,
        product_image: product.img,
        price: product.price,
        quantity,
        total_amount: totalAmount,
      };

      // 扣减库存
      await product.decrement('stock', { by: quantity, transaction });
      await product.increment('sales', { by: quantity, transaction });

      const freightAmount = 0;
      const discountAmount = 0;
      const payAmount = totalAmount + freightAmount - discountAmount;

      const order = await ctx.model.Order.create({
        order_no: this.generateOrderNo(),
        user_id: userId,
        address_id,
        total_amount: totalAmount,
        freight_amount: freightAmount,
        discount_amount: discountAmount,
        pay_amount: payAmount,
        status: 0,
        remark,
      }, { transaction });

      // 创建订单商品快照
      await ctx.model.OrderItem.create(
        { ...orderItem, order_id: order.id },
        { transaction },
      );

      await transaction.commit();

      return await this.detail(order.id, userId);
    } catch (err) {
      await transaction.rollback();
      ctx.throw(400, err.message);
    }
  }

  /**
   * 获取订单列表
   * @param {number} userId 用户ID
   * @param {Object} query 查询参数
   * @return {Object} 分页结果
   */
  async list(userId, query = {}) {
    const { ctx } = this;
    const { status, page = 1, page_size = 10 } = query;

    // 获取当前请求用户的真实数据库主键ID
    const userObj = await ctx.model.SysUser.findByPk(userId);
    if (!userObj || userObj.user_type !== 4) {
      ctx.throw(404, '用户不存在');
    }
    const dbUserId = userObj.user_id;

    const where = { user_id: dbUserId };
    // 前端 status 参数: 0待支付，1已完成
    // 对应进度表 status: 0未完成, 1已完成
    if (status !== undefined && status !== '' && status !== null && status !== 'null') {
      where.status = parseInt(status, 10);
    }

    const limit = parseInt(page_size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    const { count, rows } = await ctx.model.ShopTaskUserItemProgress.findAndCountAll({
      where,
      limit,
      offset,
      order: [['create_time', 'DESC']],
    });

    const list = [];
    for (const progress of rows) {
      const taskItem = await ctx.model.ShopTaskItem.findOne({ where: { item_id: progress.task_item_id } });
      const shopTask = taskItem ? await ctx.model.ShopTask.findByPk(taskItem.task_id) : null;
      const goods = progress.goods_id ? await ctx.model.Goods.findByPk(progress.goods_id) : null;
      const totalAmount = Number(progress.goods_price || 0);
      const revenueRate = shopTask ? Number(shopTask.yield_rate || 0) : 0;
      
      let mappedStatus = 0;
      if (progress.status === 1) {
        mappedStatus = 1; 
      }

      list.push({
        orderId: progress.order_id,
        orderType: taskItem ? taskItem.item_type : 1,
        totalPrice: totalAmount.toString(),
        revenueRate: revenueRate.toString(),
        revenue: progress.revenue.toString(),
        status: mappedStatus,
        picUrl: goods ? goods.cover_image : '',
        waresName: progress.goods_title || '',
        cTime: progress.create_time ? new Date(progress.create_time).toISOString() : null,
      });
    }

    return {
      list,
      pagination: {
        total: count,
        page: Number(page),
        page_size: Number(page_size),
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * 获取订单详情
   * @param {number} id 订单ID
   * @param {number} userId 用户ID
   * @return {Object} 订单详情
   */
  async detail(id, userId) {
    const { ctx } = this;
    const order = await ctx.model.Order.findOne({
      where: { id, user_id: userId },
      include: [{
        model: ctx.model.OrderItem,
        as: 'items',
      }],
    });
    if (!order) {
      ctx.throw(404, '订单不存在');
    }
    return order;
  }

  /**
   * 取消订单
   * @param {number} id 订单ID
   * @param {number} userId 用户ID
   * @return {Object} 更新后的订单
   */
  async cancel(id, userId) {
    const { ctx } = this;
    const order = await ctx.model.Order.findOne({
      where: { id, user_id: userId },
      include: [{
        model: ctx.model.OrderItem,
        as: 'items',
      }],
    });
    if (!order) {
      ctx.throw(404, '订单不存在');
    }
    if (order.status !== 0) {
      ctx.throw(400, '当前订单状态不允许取消');
    }

    const transaction = await ctx.model.transaction();
    try {
      // 恢复库存和销量
      for (const item of order.items) {
        await ctx.model.Product.increment('stock', {
          by: item.quantity,
          where: { id: item.product_id },
          transaction,
        });
        await ctx.model.Product.decrement('sales', {
          by: item.quantity,
          where: { id: item.product_id },
          transaction,
        });
      }

      await order.update({ status: 4 }, { transaction });
      await transaction.commit();

      return await this.detail(id, userId);
    } catch (err) {
      await transaction.rollback();
      ctx.throw(400, err.message);
    }
  }

  /**
   * 模拟支付 (支持根据订单号或订单ID支付)
   * @param {string|number} idOrNo 订单ID或订单编号
   * @param {number} userId 业务用户ID
   * @return {Object} 更新后的订单
   */
  async pay(idOrNo, userId) {
    const { ctx } = this;
    const { Op } = ctx.app.Sequelize;

    // 1. 获取真实用户ID
    const userObj = await ctx.model.SysUser.findByPk(userId);
    if (!userObj || userObj.user_type !== 4) {
      ctx.throw(404, '用户不存在');
    }
    const dbUserId = userObj.user_id;

    // 2. 查找订单对应的任务进度
    const progress = await ctx.model.ShopTaskUserItemProgress.findOne({
      where: {
        order_id: idOrNo.toString(),
        user_id: dbUserId,
        status: 0,
        is_processing: 1
      }
    });

    if (!progress) {
      ctx.throw(404, '订单不存在或已支付');
    }

    const orderAmount = Number(progress.goods_price);
    const revenue = Number(progress.revenue); // 静态收益

    // 3. 校验余额是否足够扣除
    const userWallet = await ctx.model.UserWallet.findOne({ where: { user_id: dbUserId } });
    if (!userWallet || Number(userWallet.balance) < orderAmount) {
      ctx.throw(400, '余额不足，无法支付订单');
    }

    // 4. 获取对应的任务配置和上级信息 (用于计算动态返佣)
    const taskItem = await ctx.model.ShopTaskItem.findOne({ where: { item_id: progress.task_item_id } });
    const shopTask = await ctx.model.ShopTask.findByPk(taskItem.task_id);
    const parentYieldRate = Number(shopTask.parent_yield_rate);
    const dynamicRevenue = orderAmount * parentYieldRate; // 动态收益(返佣给上级)
    const totalRevenue = revenue + orderAmount; // 结算给用户的金额(本金+静态收益)

    const transaction = await ctx.model.transaction();
    try {
      // 5. 更新任务子项进度状态为已完成
      await progress.update({
        status: 1,
        is_processing: 0,
        update_time: new Date()
      }, { transaction });

      // 6. 更新用户钱包 (扣除本金, 发放本金+静态收益)
      // 在实际业务中，可以先扣除，再发放，或者直接计算净变动。这里为了清晰，直接计算净变动：
      // 净变动 = (本金 + 静态收益) - 本金 = 静态收益 (revenue)
      await ctx.model.UserWallet.update({
        balance: ctx.app.Sequelize.literal(`balance + ${revenue}`),
        static_income: ctx.app.Sequelize.literal(`static_income + ${revenue}`)
      }, {
        where: { user_id: dbUserId },
        transaction
      });

      // 7. 处理上级返佣 (如果有上级)
      if (userObj.inviter_user_id && dynamicRevenue > 0) {
        const parentWallet = await ctx.model.UserWallet.findOne({ where: { user_id: userObj.inviter_user_id } });
        if (parentWallet) {
          await ctx.model.UserWallet.update({
            balance: ctx.app.Sequelize.literal(`balance + ${dynamicRevenue}`),
            dynamic_income: ctx.app.Sequelize.literal(`dynamic_income + ${dynamicRevenue}`)
          }, {
            where: { user_id: userObj.inviter_user_id },
            transaction
          });
        }
      }

      await transaction.commit();
      
      return {
        orderId: progress.order_id,
        status: 1, // 已完成
        payAmount: orderAmount,
        revenue: revenue
      };
    } catch (err) {
      await transaction.rollback();
      ctx.throw(400, '支付失败：' + err.message);
    }
  }


  /**
   * 管理端获取订单列表
   * @param {Object} query 查询参数
   * @param adminId
   * @return {Object} 分页结果 { total, list }
   */
  async adminList(query = {}, adminId) {
    const { ctx } = this;
    const { uid, user_uid, order_no, status, start_time, end_time, page = 1, pageSize = 10 } = query;

    const pageNum = Math.max(1, Number(page));
    let size = Number(pageSize);
    if (isNaN(size) || size < 1) size = 10;
    if (size > 100) size = 100;

    const where = {};
    if (adminId !== undefined) {
      where.admin_id = adminId;
    }
    if (uid !== undefined && uid !== '') {
      where.id = Number(uid);
    }
    if (user_uid !== undefined && user_uid !== '') {
      where.user_id = Number(user_uid);
    }
    if (order_no !== undefined && order_no !== '') {
      where.order_no = { [ctx.app.Sequelize.Op.like]: `%${order_no}%` };
    }
    if (status !== undefined && status !== '') {
      where.status = Number(status);
    }
    if (start_time || end_time) {
      where.created_at = {};
      if (start_time) where.created_at[ctx.app.Sequelize.Op.gte] = new Date(start_time);
      if (end_time) where.created_at[ctx.app.Sequelize.Op.lte] = new Date(end_time);
    }

    const offset = (pageNum - 1) * size;

    const { count, rows } = await ctx.model.Order.findAndCountAll({
      where,
      include: [
        {
          model: ctx.model.OrderItem,
          as: 'items',
          attributes: [ 'product_name' ],
        },
        {
          model: ctx.model.SysUser,
          as: 'user',
          attributes: [ 'user_id', 'phone', 'nickname', 'username' ],
        },
      ],
      order: [[ 'id', 'DESC' ]],
      offset,
      limit: size,
    });

    const statusMap = {
      0: '待支付',
      1: '已支付',
      2: '已发货',
      3: '已完成',
      4: '已取消',
    };

    const formatDate = date => {
      if (!date) return '';
      return new Date(date).toISOString();
    };

    return {
      list: rows.map(order => ({
        uid: order.id,
        user_uid: order.user_id,
        user_id: order.user ? order.user.user_id : null,
        order_no: order.order_no,
        order_price: order.pay_amount,
        static_commission: order.static_commission,
        dynamic_commission: order.dynamic_commission,
        status: order.status,
        status_text: statusMap[order.status] || '未知',
        created_at: formatDate(order.created_at),
        product_name: order.items && order.items.length ? order.items[0].product_name : '',
      })),
      pagination: {
        total: count,
        page: pageNum,
        page_size: size,
        total_pages: Math.ceil(count / size),
      },
    };
  }

  /**
   * 管理端删除订单（物理删除）
   * @param {number} id 订单ID
   * @param adminId
   */
  async adminDestroy(id, adminId) {
    const { ctx } = this;
    const order = await ctx.model.Order.findByPk(id, {
      include: [{ model: ctx.model.OrderItem, as: 'items' }],
    });
    if (!order) {
      ctx.throw(404, '订单不存在');
    }
    if (adminId !== undefined && order.admin_id !== adminId) {
      ctx.throw(403, '无权操作该店铺订单');
    }

    const transaction = await ctx.model.transaction();
    try {
      await ctx.model.OrderItem.destroy({ where: { order_id: id }, transaction });
      await order.destroy({ transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = OrderService;
