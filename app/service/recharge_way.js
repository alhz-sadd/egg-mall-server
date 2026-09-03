'use strict';

const Service = require('egg').Service;

/**
 * 充值方式服务层
 * 处理管理端充值方式的增删改查
 */
class RechargeWayService extends Service {
  /**
   * 格式化时间
   * @param {Date|string} date 日期
   * @return {string} 格式化后的时间字符串
   */
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const pad = n => (n < 10 ? '0' + n : n);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  /**
   * 管理端获取充值方式列表
   * @param {Object} query 查询参数
   * @param adminId
   * @return {Object} 分页结果
   */
  async adminList(query = {}, adminId) {
    const { ctx } = this;
    const { keyword, status, page = 1, pageSize = 10 } = query;

    const where = {};
    if (adminId !== undefined) {
      where.admin_id = adminId;
    }
    if (keyword !== undefined && keyword !== '') {
      where.way = { [ctx.app.Sequelize.Op.like]: `%${keyword}%` };
    }
    if (status !== undefined && status !== '') {
      where.status = Number(status);
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const size = Math.min(100, Math.max(1, Number(pageSize) || 10));
    const offset = (pageNum - 1) * size;

    const { count, rows } = await ctx.model.RechargeWay.findAndCountAll({
      where,
      order: [[ 'sort', 'ASC' ], [ 'id', 'DESC' ]],
      offset,
      limit: size,
    });

    return {
      total: count,
      list: rows.map(item => this.formatItem(item)),
    };
  }

  /**
   * 格式化单条充值方式数据
   * @param {Object} item 模型实例或原始对象
   * @return {Object} 格式化后的数据
   */
  formatItem(item) {
    const data = item.toJSON ? item.toJSON() : item;
    const cTime = this.formatDate(data.created_at);
    const uTime = this.formatDate(data.updated_at);
    return {
      id: data.id,
      way: data.way,
      address: data.address || null,
      sort: data.sort,
      remark: data.remark || null,
      status: data.status,
      intoPeople: data.created_by || null,
      cTime,
      ctime: cTime,
      uTime,
      utime: uTime,
    };
  }

  /**
   * 移动端获取启用的充值方式列表
   * 仅返回 status=0（启用）的充值方式，按 sort 升序、id 降序排列
   * @return {Object} 列表数据 { total, list }
   */
  async mobileList() {
    const { ctx } = this;

    const { count, rows } = await ctx.model.RechargeWay.findAndCountAll({
      where: { status: 0 },
      order: [[ 'sort', 'ASC' ], [ 'id', 'DESC' ]],
    });

    return {
      total: count,
      list: rows.map(item => this.formatItem(item)),
    };
  }

  /**
   * 管理端添加充值方式
   * @param {Object} payload 请求参数
   * @param adminId
   * @return {Object} 创建的充值方式
   */
  async adminCreate(payload, adminId) {
    const { ctx } = this;
    ctx.assert(payload.way, 422, '充值方式名称不能为空');

    const admin = ctx.state.admin || {};
    const adminName = admin.nickname || admin.username || null;

    const createData = {
      way: payload.way,
      sort: payload.sort !== undefined ? Number(payload.sort) : 0,
      remark: payload.remark || null,
      status: payload.status !== undefined ? Number(payload.status) : 0,
      created_by: adminName,
    };
    if (adminId !== undefined) {
      createData.admin_id = adminId;
    }

    const item = await ctx.model.RechargeWay.create(createData);

    return this.formatItem(item);
  }

  /**
   * 管理端更新充值方式
   * @param {number} id 充值方式ID
   * @param {Object} payload 请求参数
   * @return {Object} 更新后的充值方式
   */
  async adminUpdate(id, payload) {
    const { ctx } = this;
    const item = await ctx.model.RechargeWay.findByPk(id);
    ctx.assert(item, 404, '充值方式不存在');

    const updateData = {};
    if (payload.way !== undefined && payload.way !== '') {
      updateData.way = payload.way;
    }
    if (payload.sort !== undefined && payload.sort !== '') {
      updateData.sort = Number(payload.sort);
    }
    if (payload.remark !== undefined) {
      updateData.remark = payload.remark;
    }
    if (payload.status !== undefined && payload.status !== '') {
      updateData.status = Number(payload.status);
    }

    await item.update(updateData);
    return this.formatItem(item);
  }

  /**
   * 管理端删除充值方式
   * @param {number} id 充值方式ID
   * @param adminId
   */
  async adminDestroy(id, adminId) {
    const { ctx } = this;
    const item = await ctx.model.RechargeWay.findByPk(id);
    ctx.assert(item, 404, '充值方式不存在');
    if (adminId !== undefined && item.admin_id !== adminId) {
      ctx.throw(403, '无权操作该店铺的充值方式');
    }
    await item.destroy();
  }
}

module.exports = RechargeWayService;
