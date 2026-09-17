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
  { method: 'POST', pattern: /\/merchants(\?|$)/, businessType: 0, title: '添加商家' },
  { method: 'POST', pattern: /\/shops(\?|$)/, businessType: 0, title: '创建店铺' },
  { method: 'POST', pattern: /\/vip-levels(\?|$)/, businessType: 0, title: '添加VIP等级' },
  { method: 'POST', pattern: /\/products(\?|$)/, businessType: 0, title: '添加商品' },
  { method: 'POST', pattern: /\/tasks(\?|$)/, businessType: 0, title: '添加任务' },
  // 修改
  { method: 'PUT', pattern: /\/merchants\//, businessType: 1, title: '修改商家' },
  { method: 'PUT', pattern: /\/shops\//, businessType: 1, title: '修改店铺' },
  { method: 'PUT', pattern: /\/vip-levels\//, businessType: 1, title: '修改VIP等级' },
  { method: 'PUT', pattern: /\/products\//, businessType: 1, title: '修改商品' },
  { method: 'PUT', pattern: /\/tasks\//, businessType: 1, title: '修改任务' },
  // 删除
  { method: 'DELETE', pattern: /\/merchants\//, businessType: 2, title: '删除商家' },
  { method: 'DELETE', pattern: /\/shops\//, businessType: 2, title: '删除店铺' },
  { method: 'DELETE', pattern: /\/vip-levels\//, businessType: 2, title: '删除VIP等级' },
  { method: 'DELETE', pattern: /\/products\//, businessType: 2, title: '删除商品' },
  { method: 'DELETE', pattern: /\/tasks\//, businessType: 2, title: '删除任务' },
];

class SysLogService extends Service {
  /**
   * 格式化时间
   * @param date
   */
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const pad = n => (n < 10 ? '0' + n : n);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  /**
   * 根据IP解析地区
   * @param ip
   */
  resolveIpLocation(ip) {
    if (!ip) return '未知';
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return '本地';
    }
    try {
      const IP2Region = require('ip2region');
      const searcher = new IP2Region();
      const result = searcher.search(ip);
      if (!result) return '未知';
      return result.region || '未知';
    } catch (err) {
      return '未知';
    }
  }

  /**
   * 过滤敏感字段
   * @param params
   */
  filterSensitiveParams(params) {
    if (!params || typeof params !== 'object') return params;
    const sensitiveKeys = [ 'password', 'old_password', 'new_password', 'confirm_password', 'withdraw_password', 'token', 'authorization' ];
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
   * @param ctx
   */
  resolveRequestParams(ctx) {
    const method = ctx.method.toUpperCase();
    if (method === 'GET' || method === 'DELETE') {
      return ctx.query;
    }
    return ctx.request.body;
  }

  /**
   * 解析操作类型与标题
   * @param method
   * @param url
   */
  resolveBusinessType(method, url) {
    const upperMethod = method.toUpperCase();
    for (const rule of BUSINESS_RULES) {
      if (rule.method === upperMethod && rule.pattern.test(url)) {
        return { businessType: rule.businessType, title: rule.title };
      }
    }
    if (upperMethod === 'POST') return { businessType: 0, title: '新增操作' };
    if (upperMethod === 'PUT') return { businessType: 1, title: '修改操作' };
    if (upperMethod === 'DELETE') return { businessType: 2, title: '删除操作' };
    return { businessType: 9, title: '其他操作' };
  }

  /**
   * 判断是否需要记录日志
   * @param method
   * @param url
   */
  shouldLog(method, url) {
    const upperMethod = method.toUpperCase();
    if (!url.startsWith('/api/admin-inner/') && !url.startsWith('/api/admin-outer/')) return false;
    if (upperMethod === 'GET') {
      return BUSINESS_RULES.some(rule => rule.method === 'GET' && rule.pattern.test(url));
    }
    return [ 'POST', 'PUT', 'DELETE', 'PATCH' ].includes(upperMethod);
  }
  /**
   * 记录登录日志
   * @param {Object} data 日志数据
   */
  async recordLoginLog(data) {
    const { ctx } = this;
    try {
      // 设备类型转换
      let deviceType = data.device_type;
      if (typeof deviceType === 'string') {
        const map = { PC: 1, Android: 2, iOS: 3, iPhone: 3, iPad: 3 };
        deviceType = map[deviceType] || 4;
      }

      const ip = data.ip || data.login_ip || ctx.ip;
      let location = data.location || data.login_location;

      // 如果未传入 location，则通过 ip 解析地理位置
      if (!location && ip) {
        if (ctx.app.utils && ctx.app.utils.ip && ctx.app.utils.ip.getIpLocation) {
          location = ctx.app.utils.ip.getIpLocation(ip);
        } else {
          location = this.resolveIpLocation(ip);
        }
      }

      await ctx.model.UserLoginLog.create({
        log_no: data.log_no || `L${Date.now()}${Math.floor(Math.random() * 1000)}`,
        user_id: data.userId || data.user_id || 0,
        username: data.username,
        login_ip: ip,
        login_location: location,
        user_agent: data.user_agent || ctx.get('user-agent'),
        device_type: deviceType,
        browser: data.browser,
        os: data.os,
        login_type: data.login_type, // 1:A端 2:B端 3:C端
        login_result: data.login_result !== undefined ? data.login_result : 1,
        remark: data.remark || data.msg,
      });
    } catch (err) {
      ctx.logger.error('[SysLogService] 记录登录日志失败：', err.message);
    }
  }

  /**
   * 记录操作日志
   * @param {Object} data 日志数据
   */
  async recordOperationLog(data) {
    const { ctx } = this;
    try {
      // 检查模型是否存在，兼容不同环境下的加载顺序或命名差异
      const OperModel = ctx.model.SysOperLog || ctx.model.SysOperlog;
      if (!OperModel) {
        ctx.logger.error('[SysLogService] 记录操作日志失败：ctx.model.SysOperLog 未定义');
        return;
      }

      await OperModel.create({
        user_id: data.userId || data.user_id,
        username: data.username,
        title: data.title,
        business_type: data.businessType || data.business_type || 9,
        method: data.method || data.operUrl || data.oper_url,
        request_method: data.requestMethod || data.request_method,
        oper_url: data.operUrl || data.oper_url,
        oper_ip: data.operIp || data.oper_ip || ctx.ip,
        oper_location: data.operLocation || data.oper_location,
        oper_param: typeof data.operParam === 'object' ? JSON.stringify(data.operParam) : data.operParam,
        json_result: typeof data.jsonResult === 'object' ? JSON.stringify(data.jsonResult) : data.jsonResult,
        status: data.status !== undefined ? data.status : 0,
        error_msg: data.errorMsg || data.error_msg,
      });
    } catch (err) {
      ctx.logger.error('[SysLogService] 记录操作日志失败：', err.message);
    }
  }

  /**
   * 查询登录日志列表
   * @param {Object} query 查询参数
   * @param {Object} adminUser 当前登录的管理员信息（用于权限控制）
   */
  async loginLogs(query = {}, adminUser = null) {
    const { ctx, app } = this;
    const { username, login_result, login_ip, login_location, device_type, page = 1, page_size = 10 } = query;
    const { Op } = app.Sequelize;

    const where = {};
    if (username) where.username = { [Op.like]: `%${username}%` };
    if (login_result !== undefined && login_result !== '') where.login_result = Number(login_result);
    if (login_ip) where.login_ip = { [Op.like]: `%${login_ip}%` };
    if (login_location) where.login_location = { [Op.like]: `%${login_location}%` };
    if (device_type !== undefined && device_type !== '') where.device_type = Number(device_type);

    const include = [];
    // 始终关联用户信息，方便前端展示
    include.push({
      model: ctx.model.SysUser,
      as: 'user',
      attributes: [ 'nickname', 'shop_id' ],
    });

    // 权限控制：A端(user_type=1)看全部，B端(user_type=2/3)只能看本店账号
    if (adminUser && adminUser.user_type !== 1) {
      where['$user.shop_id$'] = adminUser.shop_id;
    }

    const { count, rows } = await ctx.model.UserLoginLog.findAndCountAll({
      where,
      include,
      order: [[ 'login_time', 'DESC' ]],
      offset: (page - 1) * page_size,
      limit: Number(page_size),
    });

    return {
      total: count,
      list: rows.map(item => {
        const data = item.toJSON();
        return {
          id: data.id,
          log_no: data.log_no,
          user_id: data.user_id,
          username: data.username,
          login_ip: data.login_ip,
          login_location: data.login_location || '未知',
          device_type: data.device_type,
          browser: data.browser,
          os: data.os,
          login_type: data.login_type,
          login_result: data.login_result,
          login_time: this.formatDate(data.login_time),
          nickname: data.user ? data.user.nickname : null,
        };
      }),
      page: Number(page),
      page_size: Number(page_size),
    };
  }

  /**
   * 批量删除登录日志
   * @param ids
   * @param adminUser
   */
  async batchDestroyLoginLogs(ids, adminUser = null) {
    const { ctx, app } = this;
    const { Op } = app.Sequelize;

    const where = { id: { [Op.in]: ids } };

    if (adminUser && adminUser.user_type !== 1) {
      // 校验权限：只能删除本店用户的日志
      const logs = await ctx.model.UserLoginLog.findAll({
        where: { id: { [Op.in]: ids } },
        include: [{
          model: ctx.model.SysUser,
          as: 'user',
          where: { shop_id: adminUser.shop_id },
          attributes: [ 'user_id' ],
        }],
      });
      const validIds = logs.map(l => l.id);
      where.id = { [Op.in]: validIds };
    }

    await ctx.model.UserLoginLog.destroy({ where });
  }

  /**
   * 清空登录日志
   * @param adminUser
   */
  async clearLoginLogs(adminUser = null) {
    const { ctx, app } = this;
    const { Op } = app.Sequelize;

    const where = {};
    if (adminUser && adminUser.user_type !== 1) {
      const shopUsers = await ctx.model.SysUser.findAll({
        where: { shop_id: adminUser.shop_id },
        attributes: [ 'user_id' ],
      });
      const shopUserIds = shopUsers.map(u => u.user_id);
      where.user_id = { [Op.in]: shopUserIds };
    }

    await ctx.model.UserLoginLog.destroy({ where });
  }

  /**
   * 查询操作日志列表
   * @param {Object} query 查询参数
   * @param {Object} adminUser 当前登录的管理员信息（用于权限控制）
   */
  async operationLogs(query = {}, adminUser = null) {
    const { ctx, app } = this;
    const { oper_username, oper_status, oper_module, oper_type, oper_location, start_time, end_time, page = 1, page_size = 10 } = query;
    const { Op } = app.Sequelize;

    const where = {};
    if (oper_username) where.username = { [Op.like]: `%${oper_username}%` };
    if (oper_status !== undefined && oper_status !== '') where.status = Number(oper_status);
    if (oper_module) where.title = { [Op.like]: `%${oper_module}%` };
    if (oper_type !== undefined && oper_type !== '') where.business_type = Number(oper_type);
    if (oper_location) where.oper_location = { [Op.like]: `%${oper_location}%` };

    if ((start_time && start_time !== '') || (end_time && end_time !== '')) {
      where.oper_time = {};
      if (start_time && start_time !== '') {
        where.oper_time[Op.gte] = new Date(start_time);
      }
      if (end_time && end_time !== '') {
        where.oper_time[Op.lte] = new Date(end_time);
      }
    }

    const include = [{
      model: ctx.model.SysUser,
      as: 'user',
      attributes: [ 'nickname', 'shop_id' ],
    }];

    // 权限控制：A端(user_type=1)看全部，B端(user_type=2/3)只能看本店日志
    if (adminUser && adminUser.user_type !== 1) {
      where['$user.shop_id$'] = adminUser.shop_id;
    }

    const { count, rows } = await ctx.model.SysOperLog.findAndCountAll({
      where,
      include,
      order: [[ 'id', 'DESC' ]],
      offset: (page - 1) * page_size,
      limit: Number(page_size),
    });

    return {
      total: count,
      list: rows.map(item => {
        const data = item.toJSON();
        const typeMap = { 0: '新增', 1: '修改', 2: '删除', 3: '授权', 4: '导出', 5: '导入', 6: '强退', 7: '生成代码', 8: '清除数据', 9: '其他' };

        let params = {};
        try {
          params = data.oper_param ? (typeof data.oper_param === 'string' ? JSON.parse(data.oper_param) : data.oper_param) : {};
        } catch (e) {
          params = data.oper_param;
        }

        return {
          id: data.id,
          log_no: `OP${data.id}`,
          module: data.title,
          oper_type: typeMap[data.business_type] || '其他',
          oper_desc: `${data.title} - ${typeMap[data.business_type] || '操作'}`,
          oper_name: data.username,
          oper_ip: data.oper_ip,
          oper_location: data.oper_location || '未知',
          status: data.status === 0 ? '正常' : '异常',
          oper_time: this.formatDate(data.oper_time),
          request_info: {
            req_module: data.title,
            req_url: data.oper_url,
            req_params: params,
            req_method: data.request_method,
            res_body: data.json_result,
            res_status: data.status === 0 ? '正常' : '异常',
            req_desc: data.title,
          },
        };
      }),
      page: Number(page),
      page_size: Number(page_size),
    };
  }

  /**
   * 批量删除操作日志
   * @param ids
   * @param adminUser
   */
  async batchDestroyOperationLogs(ids, adminUser = null) {
    const { ctx, app } = this;
    const { Op } = app.Sequelize;

    const where = { id: { [Op.in]: ids } };
    if (adminUser && adminUser.user_type !== 1) {
      const logs = await ctx.model.SysOperLog.findAll({
        where: { id: { [Op.in]: ids } },
        include: [{
          model: ctx.model.SysUser,
          as: 'user',
          where: { shop_id: adminUser.shop_id },
          attributes: [ 'user_id' ],
        }],
      });
      const validIds = logs.map(l => l.id);
      where.id = { [Op.in]: validIds };
    }

    await ctx.model.SysOperLog.destroy({ where });
  }

  /**
   * 清空操作日志
   * @param adminUser
   */
  async clearOperationLogs(adminUser = null) {
    const { ctx, app } = this;
    const { Op } = app.Sequelize;

    const where = {};
    if (adminUser && adminUser.user_type !== 1) {
      const shopUsers = await ctx.model.SysUser.findAll({
        where: { shop_id: adminUser.shop_id },
        attributes: [ 'user_id' ],
      });
      const shopUserIds = shopUsers.map(u => u.user_id);
      where.user_id = { [Op.in]: shopUserIds };
    }

    await ctx.model.SysOperLog.destroy({ where });
  }
}

module.exports = SysLogService;
