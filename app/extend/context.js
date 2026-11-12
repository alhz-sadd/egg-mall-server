'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  /**
   * 生成密码哈希
   * @param {string} plainText 原始密码明文
   * @return {Promise<string>} 密码哈希值
   */
  async genHash(plainText) {
    const saltRounds = this.app.config.bcrypt ? this.app.config.bcrypt.saltRounds : 10;
    return await bcrypt.hash(plainText, saltRounds);
  },

  /**
   * 比较密码
   * @param {string} plainText 原始密码明文
   * @param {string} hash 密码哈希值
   * @return {Promise<boolean>} 是否匹配
   */
  async compare(plainText, hash) {
    if (!plainText || !hash) return false;
    // 如果是以 $2a$ 开头（bcryptjs生成的），也兼容处理
    return await bcrypt.compare(plainText, hash);
  },

  /**
   * 获取客户端真实 IP
   * 穿透 Cloudflare WARP 和 Apple iCloud Private Relay
   * 优先级: CF-Connecting-IP -> True-Client-IP -> ctx.ip (Egg.js 安全解析) -> X-Forwarded-For
   * @return {string} 真实客户端 IP
   */
  get realIp() {
    const req = this.request;
    
    // 1. Cloudflare 专用请求头 (由受信任的 CDN 节点设置，最高优先级)
    // 注意：如果是直接暴露在公网，这些头可能被伪造。但由于之前配置了 Nginx 代理和 CDN，
    // CDN 会覆盖用户自己传的假头，因此在 CDN 架构下这是安全的。
    const cfIp = req.header['cf-connecting-ip'] || req.header['true-client-ip'];
    if (cfIp) {
      // 提取第一个非空的 IP
      const ip = cfIp.split(',')[0].trim();
      if (ip) return ip;
    }

    // 2. 优先使用 Egg.js 自带的 ctx.ip
    // Egg.js 内部结合了 config.maxIpsCount (当前配置为 2)，
    // 会从右向左安全地剥离可信代理 IP，防止最左侧的 IP 被恶意伪造 (IP Spoofing)
    if (this.ip) {
      return this.ip;
    }

    // 3. 如果以上都没有，再尝试兜底的 X-Forwarded-For (风险较高，但作为最后的 Fallback)
    const forwardedFor = req.header['x-forwarded-for'];
    if (forwardedFor) {
      const ip = forwardedFor.split(',')[0].trim();
      if (ip) return ip;
    }

    return req.ip || this.ips[0] || '127.0.0.1';
  },

  /**
   * 清除字符串中的不可见字符和两端空格
   * @param {string} str 待处理字符串
   * @return {string} 处理后的字符串
   */
  cleanString(str) {
    if (typeof str !== 'string') return str;
    // 移除不可见字符 (Unicode 中的控制字符、格式控制符等)
    // \u200B-\u200D: 零宽字符
    // \uFEFF: 零宽不换行空格
    // \u200E-\u200F: 左右方向标记 (用户提到的 \u200F 在此范围内)
    // \u202A-\u202E: 方向控制字符
    // \u00A0: 不换行空格 (Non-breaking space)
    // \u0000-\u001F: 控制字符
    // \u007F-\u009F: 控制字符
    return str.replace(/[\u0000-\u001F\u007F-\u009F\u00A0\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '').trim();
  },

  /**
   * 彻底清除字符串中的所有空格（包括中间的）和不可见字符
   * 适用于手机号、用户名等不应包含空格的字段
   * @param {string} str 待处理字符串
   * @return {string} 处理后的字符串
   */
  cleanAllSpaces(str) {
    if (typeof str !== 'string') return str;
    // \s 匹配所有空白字符
    return str.replace(/[\s\u0000-\u001F\u007F-\u009F\u00A0\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '');
  },

  /**
   * 严格清理手机号/账号字段
   * 仅保留数字和加号，移除所有其他字符（包括空格、括号、横线、不可见字符）
   * @param {string} str 待处理字符串
   * @return {string} 处理后的字符串
   */
  cleanPhone(str) {
    if (typeof str !== 'string') return str;
    // 1. 先清理不可见字符
    const noInvisible = str.replace(/[\u0000-\u001F\u007F-\u009F\u00A0\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '');
    // 2. 只保留数字和加号，移除其他所有字符（包括空格）
    return noInvisible.replace(/[^\d+]/g, '');
  },
};
