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
   * @param {string} orderId 订单编号(order_no)
   * @param {number} userId 用户ID
   * @return {Object} 格式化后的订单详情
   */
  async getOrderMsg(orderId, userId) {
    const { ctx } = this;
    const { Op } = ctx.app.Sequelize;

    // 获取当前请求用户的真实数据库主键ID
    const userObj = await ctx.model.User.findOne({
      where: { user_id: userId.toString() },
    });
    const dbUserId = userObj ? userObj.id : userId;

    const order = await ctx.model.Order.findOne({
      where: {
        [Op.or]: [
          { order_no: orderId.toString() },
          { id: Number(orderId) || 0 },
        ],
        user_id: dbUserId,
      },
      include: [{
        model: ctx.model.OrderItem,
        as: 'items',
      }],
    });

    if (!order) {
      ctx.throw(404, '订单不存在');
    }

    const user = await ctx.model.User.findByPk(dbUserId);
    let needPrice = 0;
    const totalAmount = Number(order.pay_amount || 0);
    const balance = Number(user ? user.user_balance : 0);

    if (totalAmount > balance) {
      needPrice = (totalAmount - balance).toFixed(2);
    }

    // 这里需要查询订单项以获取商品名称和图片
    let waresName = '';
    let picUrl = '';
    if (order.items && order.items.length > 0) {
      waresName = order.items[0].product_name;
      picUrl = order.items[0].product_image;
    }

    // 从订单记录中提取收益率数据，假设 searchTask 创建的未支付订单包含了这些信息
    const revenueRate = Number(order.static_commission || 0) > 0 ? Number(order.static_commission) : 0;
    const revenue = (totalAmount * revenueRate).toFixed(5);
    const revenueRateView = (revenueRate * 100).toFixed(2) + '%';

    // 返回组装好的数据结构
    return {
      googleCod: null,
      ids: null,
      isLucky: false,
      needPrice: needPrice.toString(),
      orderId: order.order_no,
      remark: order.remark || null,
      revenue,
      revenueRate: revenueRate.toString(),
      totalPrice: totalAmount.toString(),
      revenueRateView,
      status: order.status,
      waresName,
      picUrl,
      cTime: order.created_at ? new Date(order.created_at).toISOString() : null,
      uTime: order.updated_at ? new Date(order.updated_at).toISOString() : null,
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
    const { address_id, cart_item_ids, remark } = payload;

    // 校验地址
    const address = await ctx.model.Address.findOne({
      where: { id: address_id, user_id: userId },
    });
    if (!address) {
      ctx.throw(404, '收货地址不存在');
    }

    // 查询购物车记录
    const carts = await ctx.model.Cart.findAll({
      where: {
        id: cart_item_ids,
        user_id: userId,
        selected: 1,
      },
      include: [{
        model: ctx.model.Product,
        as: 'product',
      }],
    });

    if (!carts.length) {
      ctx.throw(400, '请选择要购买的商品');
    }

    const transaction = await ctx.model.transaction();
    try {
      let totalAmount = 0;
      const orderItems = [];

      for (const cart of carts) {
        const product = cart.product;
        if (!product || product.status !== 1) {
          throw new Error(`商品「${product ? product.title : '未知'}」已下架`);
        }
        if (product.stock < cart.quantity) {
          throw new Error(`商品「${product.title}」库存不足`);
        }

        const itemTotal = Number(product.price) * cart.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          product_id: product.id,
          product_name: product.title,
          product_image: product.img,
          price: product.price,
          quantity: cart.quantity,
          total_amount: itemTotal,
        });

        // 扣减库存
        await product.decrement('stock', { by: cart.quantity, transaction });
        await product.increment('sales', { by: cart.quantity, transaction });
      }

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
      await ctx.model.OrderItem.bulkCreate(
        orderItems.map(item => ({ ...item, order_id: order.id })),
        { transaction },
      );

      // 删除已下单的购物车记录
      await ctx.model.Cart.destroy({
        where: { id: cart_item_ids },
        transaction,
      });

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
    const userObj = await ctx.model.User.findOne({
      where: { user_id: userId.toString() },
    });
    const dbUserId = userObj ? userObj.id : userId;

    const where = { user_id: dbUserId };
    if (status !== undefined && status !== '' && status !== null && status !== 'null') {
      where.status = Number(status);
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.Order.findAndCountAll({
      where,
      include: [{
        model: ctx.model.OrderItem,
        as: 'items',
      }],
      order: [[ 'id', 'DESC' ]],
      offset,
      limit,
    });

    const user = await ctx.model.User.findByPk(userId);
    const balance = Number(user ? user.user_balance : 0);

    const list = rows.map(order => {
      let needPrice = 0;
      const totalAmount = Number(order.pay_amount || 0);

      if (totalAmount > balance) {
        needPrice = (totalAmount - balance).toFixed(2);
      }

      let waresName = '';
      let picUrl = '';
      if (order.items && order.items.length > 0) {
        waresName = order.items[0].product_name;
        picUrl = order.items[0].product_image;
      }

      const revenueRate = Number(order.static_commission || 0) > 0 ? Number(order.static_commission) : 0;
      const revenue = (totalAmount * revenueRate).toFixed(5);
      const revenueRateView = (revenueRate * 100).toFixed(2) + '%';

      return {
        googleCod: null,
        ids: null,
        isLucky: false,
        needPrice: needPrice.toString(),
        orderId: order.order_no,
        remark: order.remark || null,
        revenue,
        revenueRate: revenueRate.toString(),
        totalPrice: totalAmount.toString(),
        revenueRateView,
        status: order.status,
        waresName,
        picUrl,
        cTime: order.created_at ? new Date(order.created_at).toISOString() : null,
      };
    });

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
   * @param {number} userId 业务用户ID (如100861)
   * @return {Object} 更新后的订单
   */
  async pay(idOrNo, userId) {
    const { ctx } = this;
    const { Op } = ctx.app.Sequelize;

    // 获取当前请求用户的真实数据库主键ID
    const userObj = await ctx.model.User.findOne({
      where: { user_id: userId },
    });
    const dbUserId = userObj ? userObj.id : userId;

    // 支持按 order_no 或 id 查询
    const order = await ctx.model.Order.findOne({
      where: {
        [Op.or]: [
          { id: idOrNo },
          { order_no: idOrNo.toString() },
        ],
        user_id: dbUserId,
      },
      include: [{ model: ctx.model.OrderItem, as: 'items' }],
    });
    if (!order) {
      ctx.throw(404, '订单不存在');
    }
    if (order.status !== 0) {
      ctx.throw(400, '订单状态异常，无法支付');
    }

    // 更新订单状态为已支付，并更新用户余额等逻辑
    const transaction = await ctx.model.transaction();
    try {
      await order.update({
        status: 3, // 直接将状态更新为已完成(3)
        pay_time: new Date(),
        finish_time: new Date(),
      }, { transaction });

      const rewardAmount = Number(order.pay_amount || 0) * Number(order.static_commission || 0);

      // 任务订单结算：返还本金 + 佣金
      // 因为在 searchTask 时并未实际扣除本金，只是生成了待支付订单
      // 所以完成订单时的净收益为：纯佣金 (rewardAmount)
      // 增加 user_balance 余额，同时累加到 static_income (静态收益) 中，用于返款统计展示
      await ctx.model.User.increment({
        user_balance: rewardAmount,
        static_income: rewardAmount,
      }, {
        where: { id: dbUserId },
        transaction,
      });

      // 支付/结算完成后，记录一条 UserTask（代表用户已完成该任务），以便 getUserTaskInfo 统计
      const taskItem = order.items && order.items.length > 0 ? order.items[0] : null;
      if (taskItem) {
        await ctx.model.UserTask.create({
          user_id: dbUserId,
          task_id: taskItem.product_id,
          status: 1, // 已完成
          reward: rewardAmount,
          task_date: dayjs().format('YYYY-MM-DD'),
        }, { transaction });
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      ctx.throw(400, '支付失败：' + err.message);
    }

    return await this.detail(order.id, dbUserId);
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
          model: ctx.model.User,
          as: 'user',
          attributes: [ 'id', 'user_id', 'phone', 'nickname' ],
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
