'use strict';

const Service = require('egg').Service;

/**
 * @Service 资金明细服务
 * @description 统一处理各类资金流水，生成标准格式的资金明细
 */
class FundRecordService extends Service {
  /**
   * 生成唯一的、纯数字的 revenue_id
   * 规则：类型码(1位) + 0 + 补零的原始ID(8位) = 10位以上数字
   * @param {number} typeCode 类型码 (1:充值, 2:提现, 3:佣金)
   * @param {number} originalId 原始表的主键ID
   * @return {number} 合成的唯一ID
   */
  generateRevenueId(typeCode, originalId) {
    const paddedId = String(originalId).padStart(8, '0');
    return Number(`${typeCode}0${paddedId}`);
  }

  /**
   * 生成唯一的、16位纯数字的临时订单号
   * @param {string} prefix 两位前缀，用于区分来源
   * @return {string} 16位数字订单号
   */
  generateTempOrderNo(prefix) {
    const timestamp = Date.now(); // 13位
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // 3位
    return `${prefix}${timestamp}${random}`.substring(0, 16);
  }

  /**
   * 获取会员资金明细列表
   * @param {number|string} userId 用户ID (可以是9-12位业务ID或数据库主键ID)
   * @param {Object} query 查询参数
   * @param operator
   * @return {Object} 分页结果
   */
  async getFundDetails(userId, query = {}, operator = {}) {
    const { ctx, service } = this;
    const { Op } = ctx.app.Sequelize;

    // 1. 获取用户并校验权限
    let user;
    if (operator && operator.role) {
      user = await service.user.checkMemberAccess(userId, {
        role: operator.role,
        id: operator.adminId,
        shop_id: operator.shop_id, // 补充 shop_id 用于 B 端权限校验
      });
    } else {
      // 移动端自己查询
      user = await service.user.findUserByIdentifier(userId);
    }

    if (!user) {
      ctx.throw(404, '用户不存在');
    }
    const dbUserId = user.user_id; // 使用主键ID查询关联表

    // 判断如果传入了 operator.adminId（后台查询），增加表记录过滤 (新表不支持 admin_id 过滤，由外部保证权限)
    const where = { user_id: dbUserId };

    // 根据前端查询参数筛选类型
    // frontend filter mapping:
    // 0任务收益 -> biz_type 4
    // 1充值 -> biz_type 1
    // 2团队收益 -> biz_type 5
    // 3系统增加 -> biz_type 7
    // 4系统减少 -> biz_type 6
    // 5提现 -> biz_type 2, 3
    if (query.type !== undefined && query.type !== '' && query.type !== null) {
      const qType = String(query.type);
      if (qType === '0') where.biz_type = 4;
      else if (qType === '1') where.biz_type = 1;
      else if (qType === '2') where.biz_type = 5;
      else if (qType === '3') where.biz_type = 7;
      else if (qType === '4') where.biz_type = 6;
      else if (qType === '5') where.biz_type = { [Op.in]: [ 2, 3 ] };
    }

    // 过滤是否只看进账 (is_income = 1 表示只看进账，即 amount > 0)
    if (query.is_income === '1' || query.is_income === 1) {
      where.amount = {
        [Op.gt]: 0
      };
    }

    // 分页
    const { page = 1, page_size = 10, pageSize = 10 } = query;
    const limit = Number(pageSize || page_size);
    const offset = (Number(page) - 1) * limit;

    const { count, rows } = await ctx.model.UserWalletLog.findAndCountAll({
      where,
      order: [[ 'id', 'DESC' ]],
      limit,
      offset,
      raw: true,
    });

    // 单独查一下这些过滤条件下的总收入金额
    let total_revenue = 0;
    if (query.is_income === '1' || query.is_income === 1) {
      const sumResult = await ctx.model.UserWalletLog.sum('amount', { where });
      total_revenue = Number(sumResult) || 0;
    }

    const list = rows.map(log => {
      let mappedType = -1;
      let remark = log.remark || '';

      switch (log.biz_type) {
        case 4:
          mappedType = 0;
          if (!remark) remark = '静态收益';
          break;
        case 5:
          mappedType = 2;
          if (!remark) remark = '动态收益';
          break;
        case 1:
          mappedType = 1;
          if (!remark) remark = '用户充值';
          break;
        case 7:
          mappedType = 3;
          if (!remark) remark = '系统人工增加';
          break;
        case 6:
          mappedType = 4;
          if (!remark) remark = '系统人工扣除';
          break;
        case 2:
        case 3:
          mappedType = 5;
          if (!remark) remark = log.biz_type === 2 ? '用户提现' : '提现驳回退回';
          break;
        default:
          mappedType = 7;
          break;
      }

      return {
        revenue_id: log.id,
        user_id: log.user_id,
        order_no: log.log_no || log.related_order_id || this.generateTempOrderNo('90'),
        type: mappedType,
        doMoney: Number(log.amount),
        beforeMoney: Number(log.before_balance),
        afterMoney: Number(log.after_balance),
        remark,
        create_time: this.formatDateTime(log.create_time),
      };
    });

    return {
      list,
      total_revenue,
      pagination: {
        total: count,
        page: Number(page),
        page_size: limit,
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * 格式化日期为北京时间字符串（UTC+8）
   * @param {Date|string} date 日期
   * @return {string} 格式化后的时间
   */
  formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const beijing = new Date(utc + 8 * 60 * 60000);
    const pad = n => (n < 10 ? '0' + n : n);
    return beijing.getFullYear() + '-' + pad(beijing.getMonth() + 1) + '-' + pad(beijing.getDate()) + ' ' + pad(beijing.getHours()) + ':' + pad(beijing.getMinutes()) + ':' + pad(beijing.getSeconds());
  }
}

module.exports = FundRecordService;
