'use strict';

const Controller = require('egg').Controller;

class SalespersonController extends Controller {
  /**
   * 获取业务员账号列表
   * 支持通过 bind_admin_id 过滤
   */
  async index() {
    const { ctx, service } = this;
    const result = await service.adminUser.salespersonList(ctx.query);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * 获取指定商家下的业务员列表
   */
  async listByMerchant() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    const query = {
      ...ctx.query,
      bind_admin_id: id,
    };

    const result = await service.adminUser.salespersonList(query);

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }

  /**
   * 创建业务员账号
   */
  async create() {
    const { ctx, service } = this;
    const payload = ctx.request.body;

    // 强制指定角色为 2 (业务员)
    payload.role = 2;
    payload.roleName = '业务员';
    payload.roleKey = 'user';

    // 内部系统创建，操作者角色传 1（超级管理员/系统），或者不影响权限校验的值
    const admin = await service.adminUser.create(payload, 1);

    ctx.body = {
      code: 200,
      message: '创建成功',
      data: admin,
    };
  }

  /**
   * 更新业务员账号
   */
  async update() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    if (!id || id === 'undefined' || id === 'null') {
      ctx.throw(400, '请在URL中提供正确的业务员ID');
    }

    // 检查目标账号是否为业务员
    const targetAdmin = await ctx.model.AdminUser.findByPk(id);
    if (!targetAdmin) {
      ctx.throw(404, '业务员不存在或ID不正确');
    }
    if (targetAdmin.role !== 2) {
      ctx.throw(403, '只能修改业务员账号');
    }

    const admin = await service.adminUser.update(id, ctx.request.body);

    ctx.body = {
      code: 200,
      message: '更新成功',
      data: admin,
    };
  }

  /**
   * 删除业务员账号
   */
  async destroy() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    if (!id || id === 'undefined' || id === 'null') {
      ctx.throw(400, '请在URL中提供正确的业务员ID');
    }

    // 检查目标账号是否为业务员
    const targetAdmin = await ctx.model.AdminUser.findByPk(id);
    if (!targetAdmin) {
      ctx.throw(404, '业务员不存在或ID不正确');
    }
    if (targetAdmin.role !== 2) {
      ctx.throw(403, '只能删除业务员账号');
    }

    await service.adminUser.destroy(id);

    ctx.body = {
      code: 200,
      message: '删除成功',
      data: null,
    };
  }

  /**
   * @summary 获取下级业绩接口
   * @description 返回所有业务员，以及所有业务员下级用户的统计数据
   * @router get /api/admin-inner/salesperson/performance
   * @request header string Authorization Bearer admin token
   */
  async performance() {
    const { ctx } = this;
    const { Op } = require('sequelize');

    // 1. 获取所有业务员 (role = 2)
    const salespersons = await ctx.model.AdminUser.findAll({
      where: { role: 2 },
      attributes: [ 'id', 'username', 'nickname', 'bind_admin_id', 'status' ],
      raw: true,
    });

    const result = [];

    // 2. 遍历业务员，统计其下级用户数据
    for (const sp of salespersons) {
      // 查询归属于该业务员的移动端用户
      // 关系通过 customer_relation 管理
      const relations = await ctx.model.CustomerRelation.findAll({
        where: { salesman_user_id: sp.id, is_deleted: 0 },
        attributes: [ 'c_user_id' ],
        raw: true,
      });

      const userIds = relations.map(u => u.c_user_id);
      const userCount = userIds.length;

      let topUpCount = 0;
      let topUpAmount = 0;
      let realRechargeAmount = 0;
      let realRechargeCount = 0;
      let mockRechargeAmount = 0;
      let mockRechargeCount = 0;

      if (userIds.length > 0) {
        // 查找这些用户所有成功的充值记录 (status = 1)
        const records = await ctx.model.RechargeRecord.findAll({
          where: {
            user_id: { [Op.in]: userIds },
            status: 1,
          },
          attributes: [ 'amount', 'operation_type', 'remark' ],
          raw: true,
        });

        for (const record of records) {
          const amount = Number(record.amount);

          // operation_type: 0赠送客户 1员工添加 2第三方充值
          // 2 表示真实移动端充值，0和1属于模拟充值(员工添加、代金等)
          if (record.operation_type === 2) {
            realRechargeAmount += amount;
            realRechargeCount += 1;
          } else if (record.operation_type === 0 || record.operation_type === 1) {
            mockRechargeAmount += amount;
            mockRechargeCount += 1;
          }
        }

        // 上分统计 (根据现有系统逻辑，所有加款都统称为上分，或者是专指员工添加和系统赠送，
        // 这里把真实充值和模拟充值总和作为上分，或只计算模拟充值为上分。根据需求，真实充值和模拟充值分别统计。
        // 上分通常指人工操作，即 operation_type 为 0 和 1 的总和，这里将其等同于模拟充值，或者总充值。
        // 根据字面意思，“上分次数”、“上分金额”如果是指所有的充值，那就是所有 record 的总和。
        topUpCount = records.length;
        topUpAmount = records.reduce((sum, r) => sum + Number(r.amount), 0);
      }

      result.push({
        salesperson_id: sp.id,
        salesperson_username: sp.username,
        salesperson_nickname: sp.nickname,
        user_count: userCount,
        top_up_count: topUpCount,
        top_up_amount: Number(topUpAmount.toFixed(2)),
        real_recharge_amount: Number(realRechargeAmount.toFixed(2)),
        real_recharge_count: realRechargeCount,
        mock_recharge_amount: Number(mockRechargeAmount.toFixed(2)),
        mock_recharge_count: mockRechargeCount,
      });
    }

    ctx.body = {
      code: 200,
      message: 'success',
      data: result,
    };
  }
}

module.exports = SalespersonController;
