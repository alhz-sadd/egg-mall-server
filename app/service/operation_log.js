'use strict';

const Service = require('egg').Service;

/**
 * 操作类型映射
 * 根据请求方法和 URL 路径匹配规则，返回 businessType 和 title
 * 0新增 1修改 2删除 3授权 4导出 5导入 6强退 7生成代码 8清空数据 9其他
 */
const BUSINESS_RULES = [
  // 导出
  { method: 'GET', pattern: /\/export(\?|$)/, businessType: 4, title: '导出数据' },
  { method: 'POST', pattern: /\/export(\?|$)/, businessType: 4, title: '导出数据' },
  // 导入
  { method: 'POST', pattern: /\/import(\?|$)/, businessType: 5, title: '导入数据' },
  // 生成代码
  { method: 'POST', pattern: /\/generate-code(\?|$)/, businessType: 7, title: '生成代码' },
  // 强退
  { method: 'POST', pattern: /\/(force-logout|kick-out)(\?|$)/, businessType: 6, title: '强制退出' },
  // 授权
  { method: 'POST', pattern: /\/(login|auth|authorize|grant|role-permissions)(\?|$)/, businessType: 3, title: '授权操作' },
  { method: 'PUT', pattern: /\/(role-permissions)(\?|$)/, businessType: 3, title: '授权操作' },
  // 清空数据
  { method: 'DELETE', pattern: /\/clear-/, businessType: 8, title: '清空数据' },
  { method: 'POST', pattern: /\/clear-/, businessType: 8, title: '清空数据' },
  // 新增
  { method: 'POST', pattern: /\/withdraw-ways(\?|$)/, businessType: 0, title: '添加提现方式' },
  { method: 'POST', pattern: /\/recharges(\?|$)/, businessType: 0, title: '添加上分明细' },
  { method: 'POST', pattern: /\/withdraws\/audit-success(\?|$)/, businessType: 0, title: '提现审核通过' },
  { method: 'POST', pattern: /\/withdraws\/audit-fail(\?|$)/, businessType: 0, title: '提现审核失败' },
  { method: 'POST', pattern: /\/tasks\/audit-success(\?|$)/, businessType: 0, title: '任务审核通过' },
  { method: 'POST', pattern: /\/tasks\/audit-fail(\?|$)/, businessType: 0, title: '任务审核失败' },
  { method: 'POST', pattern: /\/user-credentials\/audit-success(\?|$)/, businessType: 0, title: '用户凭证审核通过' },
  { method: 'POST', pattern: /\/user-credentials\/audit-fail(\?|$)/, businessType: 0, title: '用户凭证审核失败' },
  { method: 'POST', pattern: /\/strategies(\?|$)/, businessType: 0, title: '创建策略' },
  { method: 'POST', pattern: /\/categories(\?|$)/, businessType: 0, title: '添加分类' },
  { method: 'POST', pattern: /\/products(\?|$)/, businessType: 0, title: '添加商品' },
  { method: 'POST', pattern: /\/tasks(\?|$)/, businessType: 0, title: '添加任务' },
  { method: 'POST', pattern: /\/banners(\?|$)/, businessType: 0, title: '添加轮播图' },
  { method: 'POST', pattern: /\/notices(\?|$)/, businessType: 0, title: '添加公告' },
  { method: 'POST', pattern: /\/customer-services(\?|$)/, businessType: 0, title: '添加客服' },
  { method: 'POST', pattern: /\/admin-users(\?|$)/, businessType: 0, title: '添加管理员' },
  { method: 'POST', pattern: /\/roles(\?|$)/, businessType: 0, title: '添加角色' },
  // 修改
  { method: 'PUT', pattern: /\/withdraw-ways\//, businessType: 1, title: '修改提现方式' },
  { method: 'PUT', pattern: /\/recharges\//, businessType: 1, title: '修改上分明细' },
  { method: 'PUT', pattern: /\/strategies\//, businessType: 1, title: '修改策略' },
  { method: 'PUT', pattern: /\/strategies\/\d+\/rules\//, businessType: 1, title: '修改策略规则' },
  { method: 'PUT', pattern: /\/categories\//, businessType: 1, title: '修改分类' },
  { method: 'PUT', pattern: /\/products\//, businessType: 1, title: '修改商品' },
  { method: 'PUT', pattern: /\/tasks\//, businessType: 1, title: '修改任务' },
  { method: 'PUT', pattern: /\/banners\//, businessType: 1, title: '修改轮播图' },
  { method: 'PUT', pattern: /\/notices\//, businessType: 1, title: '修改公告' },
  { method: 'PUT', pattern: /\/customer-services\//, businessType: 1, title: '修改客服' },
  { method: 'PUT', pattern: /\/admin-users\//, businessType: 1, title: '修改管理员' },
  { method: 'PUT', pattern: /\/roles\//, businessType: 1, title: '修改角色' },
  // 删除
  { method: 'DELETE', pattern: /\/withdraw-ways\//, businessType: 2, title: '删除提现方式' },
  { method: 'DELETE', pattern: /\/recharges\//, businessType: 2, title: '删除上分明细' },
  { method: 'DELETE', pattern: /\/operation-logs\/batch(\?|$)/, businessType: 2, title: '批量删除操作日志' },
  { method: 'DELETE', pattern: /\/operation-logs\/clear(\?|$)/, businessType: 8, title: '清空操作日志' },
  { method: 'DELETE', pattern: /\/strategies\//, businessType: 2, title: '删除策略' },
  { method: 'DELETE', pattern: /\/categories\//, businessType: 2, title: '删除分类' },
  { method: 'DELETE', pattern: /\/products\//, businessType: 2, title: '删除商品' },
  { method: 'DELETE', pattern: /\/tasks\//, businessType: 2, title: '删除任务' },
  { method: 'DELETE', pattern: /\/banners\//, businessType: 2, title: '删除轮播图' },
  { method: 'DELETE', pattern: /\/notices\//, businessType: 2, title: '删除公告' },
  { method: 'DELETE', pattern: /\/customer-services\//, businessType: 2, title: '删除客服' },
  { method: 'DELETE', pattern: /\/admin-users\//, businessType: 2, title: '删除管理员' },
  { method: 'DELETE', pattern: /\/roles\//, businessType: 2, title: '删除角色' },
];

/**
 * 操作日志服务层
 * 处理管理端操作日志的查询、删除、清空和自动记录
 */
class OperationLogService extends Service {
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
   * 根据IP解析地区
   * 复用 ip2region 库，未安装或解析失败时返回兜底值
   * @param {string} ip IP地址
   * @return {string} 地区信息
   */
  resolveIpLocation(ip) {
    if (!ip) return '未知';
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return '本地';
    }

    try {
      const IP2Region = require('ip2region');
      let searcher;
      if (typeof IP2Region.create === 'function') {
        searcher = IP2Region.create();
      } else if (typeof IP2Region === 'function') {
        searcher = new IP2Region();
      } else {
        return '未知';
      }
      const result = searcher.search(ip);
      if (!result) return '未知';
      if (typeof result === 'string') return result;
      if (result.region) return result.region;
      if (result.country || result.province || result.city) {
        return [ result.country, result.province, result.city ].filter(Boolean).join(' ');
      }
      return '未知';
    } catch (err) {
      return '未知';
    }
  }

  /**
   * 过滤敏感字段
   * @param {Object} params 参数对象
   * @return {Object} 过滤后的对象
   */
  filterSensitiveParams(params) {
    if (!params || typeof params !== 'object') return params;
    const sensitiveKeys = [ 'password', 'old_password', 'new_password', 'confirm_password', 'withdraw_password', 'user_withdraw_password', 'token', 'authorization', 'google_code' ];
    const result = Array.isArray(params) ? [ ...params ] : { ...params };
    for (const key of Object.keys(result)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        result[key] = '******';
      } else if (result[key] && typeof result[key] === 'object') {
        result[key] = this.filterSensitiveParams(result[key]);
      }
    }
    return result;
  }

  /**
   * 解析请求参数
   * @param {Object} ctx 上下文
   * @return {Object} 请求参数
   */
  resolveRequestParams(ctx) {
    const method = ctx.method.toUpperCase();
    if (method === 'GET' || method === 'DELETE') {
      return ctx.query;
    }
    return ctx.request.body;
  }

  /**
   * 根据请求方法和URL解析操作类型与标题
   * @param {string} method 请求方法
   * @param {string} url 请求URL
   * @return {Object} { businessType, title }
   */
  resolveBusinessType(method, url) {
    const upperMethod = method.toUpperCase();
    for (const rule of BUSINESS_RULES) {
      if (rule.method === upperMethod && rule.pattern.test(url)) {
        return { businessType: rule.businessType, title: rule.title };
      }
    }

    // 默认按 HTTP 方法推断
    if (upperMethod === 'POST') return { businessType: 0, title: '新增操作' };
    if (upperMethod === 'PUT') return { businessType: 1, title: '修改操作' };
    if (upperMethod === 'DELETE') return { businessType: 2, title: '删除操作' };
    return { businessType: 9, title: '其他操作' };
  }

  /**
   * 判断是否需要记录日志
   * 默认只记录管理端写操作，GET 查询操作不记录
   * @param {string} method 请求方法
   * @param {string} url 请求URL
   * @return {boolean} 是否需要记录
   */
  shouldLog(method, url) {
    const upperMethod = method.toUpperCase();
    if (!upperMethod || !url) return false;
    if (!url.startsWith('/api/admin/')) return false;

    // 操作日志自身查询接口不记录，避免循环
    if (upperMethod === 'GET' && url.startsWith('/api/admin/operation-logs')) return false;

    // GET 请求只有命中导出等规则时才记录
    if (upperMethod === 'GET') {
      return BUSINESS_RULES.some(rule => rule.method === 'GET' && rule.pattern.test(url));
    }

    // 写操作都记录
    return [ 'POST', 'PUT', 'DELETE', 'PATCH' ].includes(upperMethod);
  }

  /**
   * 创建操作日志
   * @param {Object} logData 日志数据
   * @return {Object} 创建的日志
   */
  async create(logData) {
    const { ctx } = this;
    return await ctx.model.AdminOperationLog.create({
      admin_id: logData.adminId || null,
      username: logData.username || null,
      oper_name: logData.operName || null,
      operator_type: logData.operatorType || null,
      title: logData.title || null,
      business_type: logData.businessType !== undefined ? logData.businessType : 9,
      oper_url: logData.operUrl || null,
      request_method: logData.requestMethod || null,
      oper_param: logData.operParam || null,
      json_result: logData.jsonResult || null,
      request: logData.request || null,
      ip: logData.operIp || null,
      location: logData.operLocation || null,
      duration: logData.costTime || 0,
      oper_time: logData.operTime || new Date(),
      status: logData.status !== undefined ? logData.status : 0,
      remark: logData.remark || null,
    });
  }

  /**
   * 管理端获取操作日志列表
   * @param {Object} query 查询参数
   * @param {number|null} adminId 可选的管理员ID，用于隔离查询
   * @return {Object} 分页结果
   */
  async adminList(query = {}, adminId) {
    const { ctx } = this;
    const {
      business_type, businessType,
      title,
      oper_name, operName,
      oper_url, operUrl,
      status,
      start_time, startTime,
      end_time, endTime,
      page = 1, pageSize = 10,
    } = query;

    const where = {};

    if (adminId !== undefined) {
      where.admin_id = adminId;
    }

    const bt = business_type !== undefined ? business_type : businessType;
    if (bt !== undefined && bt !== '') {
      where.business_type = Number(bt);
    }

    if (title !== undefined && title !== '') {
      where.title = { [ctx.app.Sequelize.Op.like]: `%${title}%` };
    }

    const name = oper_name !== undefined ? oper_name : operName;
    if (name !== undefined && name !== '') {
      where.oper_name = { [ctx.app.Sequelize.Op.like]: `%${name}%` };
    }

    const url = oper_url !== undefined ? oper_url : operUrl;
    if (url !== undefined && url !== '') {
      where.oper_url = { [ctx.app.Sequelize.Op.like]: `%${url}%` };
    }

    if (status !== undefined && status !== '') {
      where.status = Number(status);
    }

    const start = start_time !== undefined ? start_time : startTime;
    const end = end_time !== undefined ? end_time : endTime;
    if (start !== undefined && start !== '' || end !== undefined && end !== '') {
      where.oper_time = {};
      if (start !== undefined && start !== '') {
        where.oper_time[ctx.app.Sequelize.Op.gte] = new Date(start);
      }
      if (end !== undefined && end !== '') {
        where.oper_time[ctx.app.Sequelize.Op.lte] = new Date(end);
      }
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const size = Math.min(100, Math.max(1, Number(pageSize) || 10));
    const offset = (pageNum - 1) * size;

    const { count, rows } = await ctx.model.AdminOperationLog.findAndCountAll({
      where,
      order: [[ 'id', 'DESC' ]],
      offset,
      limit: size,
    });

    return {
      total: count,
      list: rows.map(item => this.formatItem(item)),
    };
  }

  /**
   * 格式化单条日志数据
   * @param {Object} item 模型实例或原始对象
   * @return {Object} 格式化后的数据
   */
  formatItem(item) {
    const data = item.toJSON ? item.toJSON() : item;
    const createTime = this.formatDate(data.created_at);
    const updateTime = this.formatDate(data.updated_at);
    let requestObj = null;
    try {
      requestObj = data.request ? JSON.parse(data.request) : null;
    } catch (e) {
      requestObj = null;
    }

    return {
      operId: data.id,
      operName: data.oper_name || data.username || null,
      operatorType: data.operator_type || null,
      title: data.title || null,
      businessType: data.business_type,
      operUrl: data.oper_url || null,
      requestMethod: data.request_method || null,
      operParam: data.oper_param || null,
      jsonResult: data.json_result || null,
      request: requestObj,
      operIp: data.ip || null,
      operLocation: data.location || null,
      costTime: data.duration || 0,
      operTime: data.oper_time ? this.formatDate(data.oper_time) : createTime,
      status: data.status,
      remark: data.remark || null,
      createTime,
      updateTime,
    };
  }

  /**
   * 批量删除操作日志
   * @param {Array<number>} ids 日志ID数组
   */
  async batchDestroy(ids) {
    const { ctx } = this;
    ctx.assert(Array.isArray(ids) && ids.length > 0, 422, '请选择要删除的日志');

    await ctx.model.AdminOperationLog.destroy({
      where: {
        id: { [ctx.app.Sequelize.Op.in]: ids },
      },
    });
  }

  /**
   * 清空所有操作日志
   */
  async clearAll() {
    const { ctx } = this;
    await ctx.model.AdminOperationLog.destroy({ where: {} });
  }
}

module.exports = OperationLogService;
