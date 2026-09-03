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

    // 1. 获取用户并校验权限
    let user;
    if (operator && operator.role) {
      user = await service.user.checkMemberAccess(userId, {
        role: operator.role,
        id: operator.adminId,
      });
    } else {
      // 移动端自己查询
      user = await service.user.findUserByCodeOrId(userId);
    }

    if (!user) {
      ctx.throw(404, '用户不存在');
    }
    const dbUserId = user.id; // 使用主键ID查询关联表
    const displayUserId = user.user_id; // 获取用于显示的9-12位业务ID

    // 判断如果传入了 operator.adminId（后台查询），增加表记录过滤
    const whereBase = { user_id: dbUserId, status: 1 };
    if (operator && operator.adminId !== undefined) {
      whereBase.admin_id = operator.adminId;
    }

    // 2. 数据查询
    const [ commissionRecords, rechargeRecords, withdrawRecords ] = await Promise.all([
      ctx.model.CommissionRecord.findAll({ where: whereBase, raw: true }),
      ctx.model.RechargeRecord.findAll({ where: whereBase, raw: true }),
      ctx.model.WithdrawRecord.findAll({ where: whereBase, raw: true }),
    ]);

    // 3. 数据转换与聚合
    let allRecords = [];

    // 任务收益(0) / 团队收益(2)
    for (const item of commissionRecords) {
      const isTeam = item.source_user_id && Number(item.source_user_id) !== Number(dbUserId);
      allRecords.push({
        rawTime: new Date(item.commission_date).getTime(),
        create_time: this.formatDateTime(item.commission_date),
        revenue_id: this.generateRevenueId(3, item.id),
        user_id: displayUserId,
        order_no: this.generateTempOrderNo('91'),
        type: isTeam ? 2 : 0, // 2:团队收益, 0:任务收益
        doMoney: Number(item.amount),
        remark: isTeam ? '团队收益' : '任务收益',
      });
    }

    // 充值(1) / 系统增加(3) / 系统减少(4)
    for (const item of rechargeRecords) {
      let type,
        remark;
      if (item.operation_type === 3 || item.recharge_type === 3) { // 后台扣款
        type = 4; // 系统减少
        remark = '系统减少';
      } else if ([ 0, 1 ].includes(item.operation_type)) { // 后台加款
        type = 3; // 系统增加
        remark = item.operation_type === 0 ? '系统赠送' : '员工添加';
      } else { // 用户充值
        type = 1; // 充值
        remark = '用户充值';
      }
      allRecords.push({
        rawTime: new Date(item.created_at).getTime(),
        create_time: this.formatDateTime(item.created_at),
        revenue_id: this.generateRevenueId(1, item.id),
        user_id: displayUserId,
        order_no: this.generateTempOrderNo('92'),
        type,
        doMoney: Number(item.amount),
        remark: item.remark || remark,
      });
    }

    // 提现(5)
    for (const item of withdrawRecords) {
      allRecords.push({
        rawTime: new Date(item.created_at).getTime(),
        create_time: this.formatDateTime(item.created_at),
        revenue_id: this.generateRevenueId(2, item.id),
        user_id: displayUserId,
        order_no: this.generateTempOrderNo('93'),
        type: 5, // 提现
        doMoney: -Math.abs(Number(item.amount)), // 提现金额记为负数
        remark: item.remark || '用户提现',
      });
    }

    // 4. 按时间正序排列，用于计算前后余额
    allRecords.sort((a, b) => a.rawTime - b.rawTime);

    // 5. 计算操作前后金额
    let runningBalance = Number(user.user_balance);
    for (let i = allRecords.length - 1; i >= 0; i--) {
      const record = allRecords[i];
      record.afterMoney = runningBalance;
      record.beforeMoney = runningBalance - record.doMoney;
      runningBalance = record.beforeMoney;
    }

    // 6. 按时间倒序排列用于最终展示
    allRecords.sort((a, b) => b.rawTime - a.rawTime);

    // 7. 根据前端查询参数筛选类型
    const typeFilter = query.type;
    if (typeFilter !== undefined && typeFilter !== '' && typeFilter !== null) {
      allRecords = allRecords.filter(r => String(r.type) === String(typeFilter));
    }

    // 8. 分页
    const { page = 1, page_size = 10 } = query;
    const total = allRecords.length;
    const offset = (Number(page) - 1) * Number(page_size);
    const list = allRecords.slice(offset, offset + Number(page_size)).map(item => {
      const cloned = { ...item };
      delete cloned.rawTime;
      return cloned;
    });

    return {
      list,
      pagination: {
        total,
        page: Number(page),
        page_size: Number(page_size),
        total_pages: Math.ceil(total / Number(page_size)),
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
