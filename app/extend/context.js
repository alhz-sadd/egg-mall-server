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
};
