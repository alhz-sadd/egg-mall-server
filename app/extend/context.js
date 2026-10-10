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
};
