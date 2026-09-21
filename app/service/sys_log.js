'use strict';

const Service = require('egg').Service;

/**
 * 操作类型映射
 * 根据请求方法和 URL 路径匹配规则，返回 businessType 和 title
 * 0新增 1修改 2删除 3授权 4导出 5导入 6强退 7生成代码 8清空数据 9其他
 */
const BUSINESS_RULES = [
  // === 1. 资金与充提 ===
  { method: 'POST', pattern: /^\/api\/mobile\/recharge\/submit(\?|$)/, businessType: 0, title: '发起充值请求' },
  { method: 'POST', pattern: /^\/api\/mobile\/withdraw\/submit(\?|$)/, businessType: 0, title: '发起提现请求' },
  { method: 'POST', pattern: /^\/api\/admin-outer\/recharge\/[^\/]+\/audit-success(\?|$)/, businessType: 1, title: '通过充值请求' },
  { method: 'POST', pattern: /^\/api\/admin-outer\/recharge\/[^\/]+\/audit-fail(\?|$)/, businessType: 1, title: '拒绝充值请求' },
  { method: 'POST', pattern: /^\/api\/admin-outer\/withdraw\/[^\/]+\/audit-success(\?|$)/, businessType: 1, title: '通过提现请求' },
  { method: 'POST', pattern: /^\/api\/admin-outer\/withdraw\/[^\/]+\/audit-fail(\?|$)/, businessType: 1, title: '拒绝提现请求' },
  { method: 'PUT', pattern: /^\/api\/admin-outer\/withdraw\/[^\/]+\/address(\?|$)/, businessType: 1, title: '修改提现地址' },
  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/points-give\/create(\?|$)/, businessType: 0, title: '人工上分' },
  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/points-deduct\/create(\?|$)/, businessType: 0, title: '人工下分' },

  // === 2. 认证与授权 ===
  { method: 'POST', pattern: /^\/api\/admin-outer\/user-identities\/[^\/]+\/audit-success(\?|$)/, businessType: 1, title: '通过实名认证' },
  { method: 'POST', pattern: /^\/api\/admin-outer\/user-identities\/[^\/]+\/audit-fail(\?|$)/, businessType: 1, title: '拒绝实名认证' },
  { method: 'POST', pattern: /^\/api\/mobile\/users\/identity(\?|$)/, businessType: 0, title: '提交实名认证' },
  { method: 'POST', pattern: /^\/api\/mobile\/users\/register(\?|$)/, businessType: 0, title: '用户注册' },
  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/(login|auth|authorize|grant|role-permissions)(\?|$)/, businessType: 3, title: '授权操作' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/(role-permissions)(\?|$)/, businessType: 3, title: '授权操作' },

  // === 3. 订单与任务 ===
  { method: 'PUT', pattern: /^\/api\/admin-outer\/tasks\/items\/[^\/]+(\?|$)/, businessType: 1, title: '修改任务子项' },
  { method: 'PUT', pattern: /^\/api\/admin-outer\/tasks\/user-items\/[^\/]+(\?|$)/, businessType: 1, title: '修改用户任务子项' },
  { method: 'POST', pattern: /^\/api\/admin-outer\/tasks\/(bind-user|start-user|close-user)(\?|$)/, businessType: 1, title: '任务状态修改' },
  { method: 'POST', pattern: /^\/api\/admin-outer\/tasks(\?|$)/, businessType: 0, title: '新增任务模板' },
  { method: 'PUT', pattern: /^\/api\/admin-outer\/tasks\/[^\/]+(\?|$)/, businessType: 1, title: '修改任务模板' },
  { method: 'DELETE', pattern: /^\/api\/admin-outer\/tasks\/[^\/]+(\?|$)/, businessType: 2, title: '删除任务模板' },
  { method: 'POST', pattern: /^\/api\/mobile\/orders\/[^\/]+\/pay(\?|$)/, businessType: 1, title: '支付订单' },
  { method: 'PUT', pattern: /^\/api\/mobile\/orders\/[^\/]+\/cancel(\?|$)/, businessType: 1, title: '取消订单' },
  { method: 'POST', pattern: /^\/api\/mobile\/orders(\?|$)/, businessType: 0, title: '创建订单' },
  { method: 'POST', pattern: /^\/api\/mobile\/finishOrder(\?|$)/, businessType: 1, title: '完成任务订单' },

  // === 4. 账号与资料管理 ===
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/profile\/updatePwd(\?|$)/, businessType: 1, title: '修改后台密码' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/profile(\?|$)/, businessType: 1, title: '修改后台资料' },
  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/totp\//, businessType: 1, title: '谷歌验证码操作' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/users\/reset-pwd(\?|$)/, businessType: 1, title: '重置用户密码' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/users\/reset-google(\?|$)/, businessType: 1, title: '重置用户谷歌验证' },
  { method: 'PUT', pattern: /^\/api\/mobile\/users\/password(\?|$)/, businessType: 1, title: '修改登录密码' },
  { method: 'PUT', pattern: /^\/api\/mobile\/users\/withdraw-password(\?|$)/, businessType: 1, title: '修改提现密码' },
  { method: 'PUT', pattern: /^\/api\/mobile\/users\/profile(\?|$)/, businessType: 1, title: '修改个人资料' },
  { method: 'PUT', pattern: /^\/api\/mobile\/users\/receipt-info(\?|$)/, businessType: 1, title: '修改收货信息' },
  { method: 'PUT', pattern: /^\/api\/mobile\/users\/receipt(\?|$)/, businessType: 1, title: '修改收货信息' },
  { method: 'POST', pattern: /^\/api\/mobile\/users\/credential(\?|$)/, businessType: 0, title: '上传凭证' },
  { method: 'DELETE', pattern: /^\/api\/mobile\/users\/credential(\?|$)/, businessType: 2, title: '删除凭证' },

  // === 5. C端收货地址 ===
  { method: 'POST', pattern: /^\/api\/mobile\/addresses(\?|$)/, businessType: 0, title: '新增收货地址' },
  { method: 'PUT', pattern: /^\/api\/mobile\/addresses\/[^\/]+\/default(\?|$)/, businessType: 1, title: '设为默认地址' },
  { method: 'PUT', pattern: /^\/api\/mobile\/addresses\/[^\/]+(\?|$)/, businessType: 1, title: '修改收货地址' },
  { method: 'DELETE', pattern: /^\/api\/mobile\/addresses\/[^\/]+(\?|$)/, businessType: 2, title: '删除收货地址' },

  // === 6. VIP 模板 ===
  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/(shop-)?vip-levels\/bind-shop(\?|$)/, businessType: 1, title: '同步VIP模板' },
  { method: 'PUT', pattern: /^\/api\/admin-outer\/vip-levels\/user\/update(\?|$)/, businessType: 1, title: '修改用户VIP等级' },
  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/(shop-)?vip-levels(\?|$)/, businessType: 0, title: '新增VIP模板' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/(shop-)?vip-levels\/[^\/]+(\?|$)/, businessType: 1, title: '修改VIP模板' },
  { method: 'DELETE', pattern: /^\/api\/(admin-inner|admin-outer)\/(shop-)?vip-levels\/[^\/]+(\?|$)/, businessType: 2, title: '删除VIP模板' },

  // === 7. 系统与后台管理 ===
  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/merchants(\?|$)/, businessType: 0, title: '新增商家' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/merchants\/[^\/]+(\?|$)/, businessType: 1, title: '修改商家' },
  { method: 'DELETE', pattern: /^\/api\/(admin-inner|admin-outer)\/merchants\/[^\/]+(\?|$)/, businessType: 2, title: '删除商家' },

  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/shops(\?|$)/, businessType: 0, title: '新增店铺' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/shops\/[^\/]+\/setting(\?|$)/, businessType: 1, title: '修改店铺设置' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/shops\/[^\/]+\/config(\?|$)/, businessType: 1, title: '修改店铺配置' },
  { method: 'PUT', pattern: /^\/api\/admin-outer\/shop\/settings(\?|$)/, businessType: 1, title: '修改店铺设置' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/shops\/[^\/]+(\?|$)/, businessType: 1, title: '修改店铺' },
  { method: 'DELETE', pattern: /^\/api\/(admin-inner|admin-outer)\/shops\/[^\/]+(\?|$)/, businessType: 2, title: '删除店铺' },

  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/(salespersons|operators)(\?|$)/, businessType: 0, title: '新增业务员' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/(salespersons|operators)\/[^\/]+(\?|$)/, businessType: 1, title: '修改业务员' },
  { method: 'DELETE', pattern: /^\/api\/(admin-inner|admin-outer)\/(salespersons|operators)\/[^\/]+(\?|$)/, businessType: 2, title: '删除业务员' },

  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/customers(\?|$)/, businessType: 0, title: '新增客户' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/customers\/[^\/]+\/reset-password(\?|$)/, businessType: 1, title: '重置客户密码' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/customers\/[^\/]+\/withdraw-password(\?|$)/, businessType: 1, title: '重置客户提现密码' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/customers\/[^\/]+(\?|$)/, businessType: 1, title: '修改客户' },
  { method: 'DELETE', pattern: /^\/api\/(admin-inner|admin-outer)\/customers\/[^\/]+(\?|$)/, businessType: 2, title: '删除客户' },

  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/employees(\?|$)/, businessType: 0, title: '新增员工' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/employees\/[^\/]+\/reset-password(\?|$)/, businessType: 1, title: '重置员工密码' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/employees\/[^\/]+(\?|$)/, businessType: 1, title: '修改员工' },
  { method: 'DELETE', pattern: /^\/api\/(admin-inner|admin-outer)\/employees\/[^\/]+(\?|$)/, businessType: 2, title: '删除员工' },

  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/(products|goods)(\?|$)/, businessType: 0, title: '新增商品' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/(products|goods)\/[^\/]+(\?|$)/, businessType: 1, title: '修改商品' },
  { method: 'DELETE', pattern: /^\/api\/(admin-inner|admin-outer)\/(products|goods)\/[^\/]+(\?|$)/, businessType: 2, title: '删除商品' },

  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/(notices|h5-config\/notices)(\?|$)/, businessType: 0, title: '新增公告' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/(notices|h5-config\/notices)\/[^\/]+(\?|$)/, businessType: 1, title: '修改公告' },
  { method: 'DELETE', pattern: /^\/api\/(admin-inner|admin-outer)\/(notices|h5-config\/notices)\/[^\/]+(\?|$)/, businessType: 2, title: '删除公告' },

  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/(banners|h5-config\/banners)(\?|$)/, businessType: 0, title: '新增轮播图' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/(banners|h5-config\/banners)\/[^\/]+(\?|$)/, businessType: 1, title: '修改轮播图' },
  { method: 'DELETE', pattern: /^\/api\/(admin-inner|admin-outer)\/(banners|h5-config\/banners)\/[^\/]+(\?|$)/, businessType: 2, title: '删除轮播图' },

  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/h5-config\/rules(\?|$)/, businessType: 0, title: '新增H5规则' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/h5-config\/rules\/[^\/]+\/status(\?|$)/, businessType: 1, title: '修改H5规则状态' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/h5-config\/rules\/?(\?|$)/, businessType: 1, title: '修改H5规则' },
  { method: 'DELETE', pattern: /^\/api\/(admin-inner|admin-outer)\/h5-config\/rules\/?(\?|$)/, businessType: 2, title: '删除H5规则' },

  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/(customer-services|h5-services|h5-config\/service-entries)(\?|$)/, businessType: 0, title: '新增客服配置' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/(customer-services|h5-services|h5-config\/service-entries)\/[^\/]+(\?|$)/, businessType: 1, title: '修改客服配置' },
  { method: 'DELETE', pattern: /^\/api\/(admin-inner|admin-outer)\/(customer-services|h5-services|h5-config\/service-entries)\/[^\/]+(\?|$)/, businessType: 2, title: '删除客服配置' },

  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/pay-channels\/bind-shop(\?|$)/, businessType: 1, title: '同步支付通道' },
  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/pay-channels(\?|$)/, businessType: 0, title: '新增支付通道' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/pay-channels\/[^\/]+(\?|$)/, businessType: 1, title: '修改支付通道' },
  { method: 'DELETE', pattern: /^\/api\/(admin-inner|admin-outer)\/pay-channels\/[^\/]+(\?|$)/, businessType: 2, title: '删除支付通道' },

  { method: 'POST', pattern: /^\/api\/admin-outer\/sales-address(\?|$)/, businessType: 0, title: '新增收款地址' },
  { method: 'PUT', pattern: /^\/api\/admin-outer\/sales-address\/[^\/]+(\?|$)/, businessType: 1, title: '修改收款地址' },
  { method: 'DELETE', pattern: /^\/api\/admin-outer\/sales-address\/[^\/]+(\?|$)/, businessType: 2, title: '删除收款地址' },

  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/system\/config(\?|$)/, businessType: 1, title: '修改系统配置' },
  
  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/system\/menu\/delete(\?|$)/, businessType: 2, title: '删除系统菜单' },
  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/system\/menu(\?|$)/, businessType: 0, title: '新增系统菜单' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/system\/menu\/[^\/]+(\?|$)/, businessType: 1, title: '修改系统菜单' },
  { method: 'DELETE', pattern: /^\/api\/(admin-inner|admin-outer)\/system\/menu\/[^\/]+(\?|$)/, businessType: 2, title: '删除系统菜单' },

  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/system\/role(\?|$)/, businessType: 0, title: '新增系统角色' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/system\/role\/[^\/]+\/menus(\?|$)/, businessType: 3, title: '角色分配菜单' },
  { method: 'PUT', pattern: /^\/api\/(admin-inner|admin-outer)\/system\/role\/[^\/]+(\?|$)/, businessType: 1, title: '修改系统角色' },
  { method: 'DELETE', pattern: /^\/api\/(admin-inner|admin-outer)\/system\/role\/[^\/]+(\?|$)/, businessType: 2, title: '删除系统角色' },

  // === 8. 通用操作 ===
  { method: 'GET', pattern: /^\/api\/(admin-inner|admin-outer)\/export(\?|$)/, businessType: 4, title: '导出数据' },
  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/export(\?|$)/, businessType: 4, title: '导出数据' },
  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/import(\?|$)/, businessType: 5, title: '导入数据' },
  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/generate-code(\?|$)/, businessType: 7, title: '生成代码' },
  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/(force-logout|kick-out)(\?|$)/, businessType: 6, title: '强制退出' },
  { method: 'DELETE', pattern: /^\/api\/(admin-inner|admin-outer)\/clear-/, businessType: 8, title: '清空数据' },
  { method: 'POST', pattern: /^\/api\/(admin-inner|admin-outer)\/clear-/, businessType: 8, title: '清空数据' },
  { method: 'DELETE', pattern: /^\/api\/(admin-inner|admin-outer)\/operation-logs\/batch(\?|$)/, businessType: 2, title: '批量删除操作日志' },
  { method: 'DELETE', pattern: /^\/api\/(admin-inner|admin-outer)\/operation-logs\/clear(\?|$)/, businessType: 8, title: '清空操作日志' },
  { method: 'DELETE', pattern: /^\/api\/(admin-inner|admin-outer)\/login-logs\/batch(\?|$)/, businessType: 2, title: '批量删除登录日志' },
  { method: 'DELETE', pattern: /^\/api\/(admin-inner|admin-outer)\/login-logs\/clear(\?|$)/, businessType: 8, title: '清空登录日志' },
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
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return '本地';
    }
    try {
      const IP2Region = require('ip2region').default;
      const searcher = new IP2Region();
      const result = searcher.search(ip);
      if (!result) return '未知';
      
      let region = '未知';
      if (typeof result === 'string') {
        region = result.split('|').filter(item => item && item !== '0').join(' ');
      } else {
        const { country, province, city, isp } = result;
        const parts = [];
        
        // 1. 处理国家：如果是国内且有省份，省略"中国"字样，使展示更精简
        if (country && country !== '0') {
          if (country === '中国' && (province || city)) {
            // 省略
          } else {
            parts.push(country);
          }
        }
        
        // 2. 处理省份
        if (province && province !== '0') {
          parts.push(province);
        }
        
        // 3. 处理城市 (去重，避免出现 "上海市 上海市")
        if (city && city !== '0') {
          if (!province || (!province.includes(city) && !city.includes(province))) {
            parts.push(city);
          }
        }
        
        // 4. 处理ISP运营商
        if (isp && isp !== '0') {
          parts.push(isp);
        }
        
        if (parts.length > 0) {
          region = parts.join(' ');
        }
      }
      
      return region;
    } catch (err) {
      this.ctx.logger.error('ip2region 解析失败:', err);
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
    if (!url.startsWith('/api/admin-inner/') && !url.startsWith('/api/admin-outer/') && !url.startsWith('/api/mobile/')) return false;
    if (upperMethod === 'GET') {
      return BUSINESS_RULES.some(rule => rule.method === 'GET' && rule.pattern.test(url));
    }
    return [ 'POST', 'PUT', 'DELETE', 'PATCH' ].includes(upperMethod);
  }


  /**
   * 解析 User-Agent 获取浏览器、操作系统和设备类型信息
   * @param {string} userAgent
   */
  resolveUserAgent(userAgent) {
    if (!userAgent) return { browser: '未知', os: '未知', deviceType: 4 }; // 默认 4:未知
    
    let browser = '未知';
    let os = '未知';
    let deviceType = 4; // 1:PC, 2:Android, 3:iOS, 4:未知

    try {
      const UAParser = require('ua-parser-js');
      const parser = new UAParser(userAgent);
      const result = parser.getResult();

      // 获取浏览器
      if (result.browser.name) {
        browser = result.browser.name;
        if (result.browser.version) {
          // 只保留主版本号，比如 Chrome 120
          browser += ' ' + result.browser.version.split('.')[0];
        }
      }

      // 获取操作系统
      if (result.os.name) {
        os = result.os.name;
        if (result.os.version) {
          os += ' ' + result.os.version;
        }
      }

      // 微信和一些特殊浏览器的补丁
      if (userAgent.includes('MicroMessenger')) {
        browser = '微信内置浏览器';
      }

      // 判断设备类型
      const deviceName = result.device.type || ''; // console, mobile, tablet, smarttv, wearable, embedded
      const osName = result.os.name || '';

      if (deviceName === 'mobile' || deviceName === 'tablet') {
        if (osName === 'iOS' || osName === 'Mac OS') {
          deviceType = 3; // iOS
        } else if (osName === 'Android') {
          deviceType = 2; // Android
        }
      } else if (!deviceName && (osName.includes('Windows') || osName === 'Mac OS' || osName === 'Linux')) {
        deviceType = 1; // PC
      }
      
      return { browser, os, deviceType };
    } catch (e) {
      this.ctx.logger.error('ua-parser-js 解析失败:', e);
      return { browser: '未知', os: '未知', deviceType: 4 };
    }
  }

  /**
   * 批量获取用户的最新登录信息（统一封装）
   * @param {Array<number>} userIds
   * @return {Object} 键为 userId，值为最新登录信息对象
   */
  async getLatestLoginInfoMap(userIds) {
    if (!userIds || userIds.length === 0) return {};
    const { ctx } = this;
    
    const map = {};
    await Promise.all(userIds.map(async (uid) => {
      // 1. 从登录日志表查询最新的一条记录
      const log = await ctx.model.UserLoginLog.findOne({
        where: { user_id: uid },
        order: [[ 'login_time', 'DESC' ]],
        raw: true,
      });

      if (log) {
        let location = log.login_location;
        if (!location || location === '未知' || location === '') {
          location = await this.resolveIpLocation(log.login_ip);
        }
        map[uid] = {
          login_ip: log.login_ip,
          login_location: location,
          login_time: log.login_time,
          device_type: log.device_type,
          browser: log.browser,
          os: log.os,
        };
      } else {
        // 2. 如果没有任何日志，兜底从 sys_user 主表获取
        const user = await ctx.model.SysUser.findOne({
          where: { user_id: uid },
          attributes: ['user_id', 'last_login_ip', 'last_login_time'],
          raw: true,
        });
        if (user) {
          map[uid] = {
            login_ip: user.last_login_ip,
            login_location: await this.resolveIpLocation(user.last_login_ip),
            login_time: user.last_login_time,
          };
        } else {
          map[uid] = { login_ip: null, login_location: '未知', login_time: null };
        }
      }
    }));
    
    return map;
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

      // 如果未传入 location，或者 location 是空的，则通过 ip 解析地理位置
      if ((!location || location === '') && ip) {
        if (ctx.app.utils && ctx.app.utils.ip && ctx.app.utils.ip.getIpLocation) {
          location = ctx.app.utils.ip.getIpLocation(ip);
        } else {
          location = this.resolveIpLocation(ip);
        }
      }

      const uaStr = data.user_agent || ctx.get('user-agent');
      let browser = data.browser;
      let os = data.os;

      // 解析 UA 兜底
      const parsedUa = this.resolveUserAgent(uaStr);
      
      // 如果前端未传或传了空，使用 UA 解析结果
      if (!browser || browser === '' || browser === '未知') {
        browser = parsedUa.browser;
      }
      if (!os || os === '' || os === '未知') {
        os = parsedUa.os;
      }
      
      // 修正 deviceType，如果原来传了字符串，已经被转换为数字了
      if (deviceType === 4 || !deviceType) {
        deviceType = parsedUa.deviceType;
      }

      await ctx.model.UserLoginLog.create({
        log_no: data.log_no || `L${Date.now()}${Math.floor(Math.random() * 1000)}`,
        user_id: data.userId || data.user_id || 0,
        username: data.username,
        login_ip: ip,
        login_location: location,
        user_agent: uaStr,
        device_type: deviceType,
        browser: browser,
        os: os,
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
        business_type: data.businessType !== undefined ? data.businessType : (data.business_type !== undefined ? data.business_type : 9),
        method: data.method || data.operUrl || data.oper_url,
        request_method: data.requestMethod || data.request_method,
        oper_url: data.operUrl || data.oper_url,
        oper_ip: data.operIp || data.oper_ip || ctx.ip,
        oper_location: data.operLocation || data.oper_location,
        oper_param: typeof data.operParam === 'object' ? JSON.stringify(data.operParam) : data.operParam,
        json_result: typeof data.jsonResult === 'object' ? JSON.stringify(data.jsonResult) : data.jsonResult,
        status: data.status !== undefined ? data.status : 0,
        error_msg: data.errorMsg || data.error_msg,
        cost_time: data.costTime !== undefined ? data.costTime : (data.cost_time !== undefined ? data.cost_time : 0),
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
    if (adminUser) {
      if (adminUser.user_type === 1) { // A端
        if (query.shop_id) {
          where['$user.shop_id$'] = Number(query.shop_id);
        }
      } else { // B端
        where['$user.shop_id$'] = adminUser.shop_id;
      }
    }

    const { count, rows } = await ctx.model.UserLoginLog.findAndCountAll({
      where,
      include,
      order: [[ 'login_time', 'DESC' ]],
      offset: (page - 1) * page_size,
      limit: Number(page_size),
    });

      const list = [];
      for (const item of rows) {
        const data = item.toJSON();
        list.push({
          id: data.id,
          log_no: data.log_no,
          user_id: data.user_id,
          username: data.username,
          login_ip: data.login_ip,
          login_location: data.login_location || await this.resolveIpLocation(data.login_ip),
          device_type: data.device_type,
          browser: data.browser,
          os: data.os,
          login_type: data.login_type,
          login_result: data.login_result,
          login_time: this.formatDate(data.login_time),
          nickname: data.user ? data.user.nickname : null,
        });
      }

      return {
        total: count,
        list,
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
   * 查询后台管理端(A/B端)登录日志列表
   * @param {Object} query 查询参数
   * @param {Object} adminUser 当前登录的管理员信息
   */
  async adminLoginLogs(query = {}, adminUser = null) {
    const { ctx, app } = this;
    const { username, login_result, login_ip, login_location, device_type, page = 1, page_size = 10, shop_id } = query;
    const { Op } = app.Sequelize;

    const where = {};
    if (username) where.username = { [Op.like]: `%${username}%` };
    if (login_result !== undefined && login_result !== '') where.login_result = Number(login_result);
    if (login_ip) where.login_ip = { [Op.like]: `%${login_ip}%` };
    if (login_location) where.login_location = { [Op.like]: `%${login_location}%` };
    if (device_type !== undefined && device_type !== '') where.device_type = Number(device_type);

    // 权限与数据隔离
    if (adminUser) {
      if (adminUser.user_type === 1) { // A端
        if (shop_id) {
          // A端想要查看指定店铺的登录日志 (只看该店铺的 B 端用户：店长 2 和 业务员 3)
          const shopUsers = await ctx.model.SysUser.findAll({
            where: { shop_id: Number(shop_id), user_type: { [Op.in]: [2, 3] } },
            attributes: ['user_id']
          });
          where.admin_id = { [Op.in]: shopUsers.map(u => u.user_id) };
        } else {
          // A端默认只看自己的 (A端管理员账号)
          where.login_type = 1;
        }
      } else { // B端
        // B端只能看本店子账号的登录日志
        const shopUsers = await ctx.model.SysUser.findAll({
          where: { shop_id: adminUser.shop_id, user_type: { [Op.in]: [2, 3] } },
          attributes: ['user_id']
        });
        where.admin_id = { [Op.in]: shopUsers.map(u => u.user_id) };
      }
    }

    const { count, rows } = await ctx.model.AdminLoginLog.findAndCountAll({
      where,
      order: [[ 'login_time', 'DESC' ]],
      offset: (page - 1) * page_size,
      limit: Number(page_size),
    });

    const list = [];
    for (const item of rows) {
      const data = item.toJSON();
      list.push({
        id: data.id,
        log_no: data.log_no,
        user_id: data.admin_id,
        username: data.username,
        login_ip: data.login_ip,
        login_location: data.login_location || await this.resolveIpLocation(data.login_ip),
        device_type: data.device_type,
        browser: data.browser,
        os: data.os,
        login_type: data.login_type,
        login_result: data.login_result,
        login_time: this.formatDate(data.login_time),
      });
    }

    return {
      total: count,
      list,
      page: Number(page),
      page_size: Number(page_size),
    };
  }

  /**
   * 查询 C端操作日志列表 (B端查询本店客户，A端可查询全平台)
   * @param {Object} query 查询参数
   * @param {Object} adminUser 当前登录的管理员信息
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
      attributes: [ 'nickname', 'shop_id', 'user_type' ],
    }];

    // 权限控制：A端(user_type=1)看全部，B端(user_type=2/3)只能看本店日志
    if (adminUser) {
      if (adminUser.user_type === 1) {
        if (query.shop_id) {
          where['$user.shop_id$'] = Number(query.shop_id);
        }
      } else {
        where['$user.shop_id$'] = adminUser.shop_id;
      }
    }

    const { count, rows } = await ctx.model.SysOperLog.findAndCountAll({
      where,
      include,
      order: [[ 'id', 'DESC' ]],
      offset: (page - 1) * page_size,
      limit: Number(page_size),
    });

    const list = [];
    for (const item of rows) {
      const data = item.toJSON();
      const typeMap = { 0: '新增', 1: '修改', 2: '删除', 3: '授权', 4: '导出', 5: '导入', 6: '强退', 7: '生成代码', 8: '清空数据', 9: '其他' };

      let params = {};
      try {
        params = data.oper_param ? (typeof data.oper_param === 'string' ? JSON.parse(data.oper_param) : data.oper_param) : {};
      } catch (e) {
        params = data.oper_param;
      }

      list.push({
        id: data.id,
        log_no: `OP${data.id}`,
        module: data.title,
        oper_type: data.business_type,
        oper_desc: `${data.title} - ${typeMap[data.business_type] || '操作'}`,
        oper_id: data.user_id,
        oper_user_type: data.user ? data.user.user_type : null,
        oper_name: data.username || (data.user ? data.user.nickname : '未知'),
        oper_ip: data.oper_ip,
        oper_location: data.oper_location || await this.resolveIpLocation(data.oper_ip),
        status: data.status,
        cost_time: data.cost_time !== undefined ? data.cost_time : (data.costTime !== undefined ? data.costTime : 0),
        oper_time: this.formatDate(data.oper_time),
        request_info: {
          req_module: data.title,
          req_url: data.oper_url,
          req_params: params,
          req_method: data.request_method,
          res_body: data.json_result,
          res_status: data.status,
          cost_time: data.cost_time !== undefined ? data.cost_time : (data.costTime !== undefined ? data.costTime : 0),
          req_desc: data.title,
        },
      });
    }

    return {
      total: count,
      list,
      page: Number(page),
      page_size: Number(page_size),
    };
  }

  /**
   * 查询后台管理端(A/B端)操作日志列表
   * A端可以查看A端和所有B端店铺的日志；B端只能查看本店及其子账号的日志
   * @param {Object} query 查询参数
   * @param {Object} adminUser 当前登录的管理员信息
   */
  async adminOperationLogs(query = {}, adminUser = null) {
    const { ctx, app } = this;
    const { module, oper_name, oper_type, status, page = 1, page_size = 10, shop_id } = query;
    const { Op } = app.Sequelize;

    const where = {};
    if (module) where.module = { [Op.like]: `%${module}%` };
    if (oper_name) where.username = { [Op.like]: `%${oper_name}%` };
    if (oper_type !== undefined && oper_type !== '') where.business_type = Number(oper_type);
    if (status !== undefined && status !== '') where.status = Number(status);

    // 权限与数据隔离
    if (adminUser) {
      if (adminUser.user_type === 1) { // A端
        if (shop_id) {
          // A端想要查看指定店铺的日志
          const shopUsers = await ctx.model.SysUser.findAll({
            where: { shop_id: Number(shop_id), user_type: { [Op.in]: [2, 3] } },
            attributes: ['user_id']
          });
          where.admin_id = { [Op.in]: shopUsers.map(u => u.user_id) };
        } else {
          // A端默认只看自己的 (oper_user_type = 1 代表 A 端操作)
          where.oper_type = 1;
        }
      } else { // B端
        // B端只能看本店的
        const shopUsers = await ctx.model.SysUser.findAll({
          where: { shop_id: adminUser.shop_id, user_type: { [Op.in]: [2, 3] } },
          attributes: ['user_id']
        });
        where.admin_id = { [Op.in]: shopUsers.map(u => u.user_id) };
      }
    }

    const { count, rows } = await ctx.model.AdminOperationLog.findAndCountAll({
      where,
      order: [[ 'oper_time', 'DESC' ]],
      offset: (page - 1) * page_size,
      limit: Number(page_size),
    });

    const list = [];
    for (const item of rows) {
      const data = item.toJSON();
      list.push({
        id: data.id,
        log_no: `AOP${data.id}`,
        module: data.title,
        oper_type: data.business_type,
        oper_desc: data.method,
        oper_id: data.admin_id,
        oper_user_type: data.oper_type,
        oper_name: data.username,
        oper_ip: data.oper_ip,
        oper_location: data.oper_location || await this.resolveIpLocation(data.oper_ip),
        device_type: data.device_type,
        browser: data.browser,
        os: data.os,
        status: data.status,
        cost_time: data.cost_time || 0,
        oper_time: this.formatDate(data.oper_time),
        request_info: {
          req_module: data.title,
          req_url: data.oper_url,
          req_params: data.oper_param ? JSON.parse(data.oper_param) : null,
          req_method: data.request_method,
          res_body: data.json_result,
          res_status: data.status,
          cost_time: data.cost_time || 0,
          req_desc: data.title,
        },
      });
    }

    return {
      total: count,
      list,
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
