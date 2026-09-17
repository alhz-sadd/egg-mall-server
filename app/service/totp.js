'use strict';

const Service = require('egg').Service;
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

class TotpService extends Service {
  /**
   * 加密密钥
   * @param {string} text 明文
   * @return {string} 密文
   */
  encrypt(text) {
    const { app } = this;
    const key = app.config.jwt.secret.substring(0, 32).padEnd(32, '0'); // 使用 jwt secret 衍生32位key
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * 解密密钥
   * @param {string} text 密文
   * @return {string} 明文
   */
  decrypt(text) {
    if (!text) return null;
    const { app } = this;
    const key = app.config.jwt.secret.substring(0, 32).padEnd(32, '0');
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * 生成恢复码
   * @param {number} count 数量
   * @return {string[]} 恢复码数组
   */
  generateRecoveryCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase()); // 8字符
    }
    return codes;
  }

  /**
   * 绑定前置：验证密码
   * @param {number} userId 用户ID
   * @param {string} inputPassword 输入的密码
   * @return {Promise<{bindToken: string}>}
   */
  async verifyPasswordForBind(userId, inputPassword) {
    const { ctx, app } = this;
    const user = await ctx.model.SysUser.findByPk(userId);
    ctx.assert(user, 401, '用户不存在');
    ctx.assert(user.totp_enable === 0, 422, '该账号已绑定谷歌验证码');

    const match = await ctx.compare(inputPassword, user.password);
    if (!match) {
      ctx.throw(422, '密码错误');
    }

    // 生成一次性 bind_token，用于串联获取二维码和确认绑定
    const bindToken = crypto.randomBytes(16).toString('hex');

    // 写入 Redis 授权标记，保存 userId
    const authKey = `totp:bind:auth:${bindToken}`;
    await app.redis.set(authKey, userId, 'EX', 300); // 5分钟过期
    
    return { bindToken };
  }

  /**
   * 绑定初始化：获取二维码
   * @param {string} bindToken 绑定Token
   * @return {Promise<{qrCodeUrl: string}>}
   */
  async bindInit(bindToken) {
    const { ctx, app } = this;
    const authKey = `totp:bind:auth:${bindToken}`;
    const userIdStr = await app.redis.get(authKey);
    ctx.assert(userIdStr, 403, '请先验证密码获取授权或授权已过期');

    const userId = Number(userIdStr);
    const user = await ctx.model.SysUser.findByPk(userId);
    ctx.assert(user, 401, '用户不存在');

    const secret = speakeasy.generateSecret({
      name: `EggMall(${user.username})`,
    });

    const tempKey = `totp:bind:temp:${bindToken}`;
    await app.redis.set(tempKey, secret.base32, 'EX', 300); // 5分钟过期

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return { qrCodeUrl };
  }

  /**
   * 确认绑定
   * @param {string} bindToken 绑定Token
   * @param {string} code 6位验证码
   * @return {Promise<{recoveryCodes: string[]}>}
   */
  async bindConfirm(bindToken, code) {
    const { ctx, app } = this;
    const authKey = `totp:bind:auth:${bindToken}`;
    const tempKey = `totp:bind:temp:${bindToken}`;

    const userIdStr = await app.redis.get(authKey);
    ctx.assert(userIdStr, 403, '请先验证密码获取授权或授权已过期');
    const userId = Number(userIdStr);

    const secretBase32 = await app.redis.get(tempKey);
    ctx.assert(secretBase32, 422, '绑定会话已过期，请重新获取二维码');

    const verified = speakeasy.totp.verify({
      secret: secretBase32,
      encoding: 'base32',
      token: code,
      window: 1, // 允许一定时间偏差
    });

    if (!verified) {
      ctx.throw(422, '谷歌验证码错误');
    }

    const user = await ctx.model.SysUser.findByPk(userId);
    ctx.assert(user, 401, '用户不存在');

    // 生成8组恢复码
    const recoveryCodes = this.generateRecoveryCodes(8);
    
    // AES加密临时密钥
    const encryptedSecret = this.encrypt(secretBase32);

    // 更新数据库
    await user.update({
      totp_secret: encryptedSecret,
      totp_enable: 1,
      totp_recovery_codes: recoveryCodes.join(','),
    });

    // 清空临时Redis
    await app.redis.del(authKey);
    await app.redis.del(tempKey);

    return { recoveryCodes };
  }

  /**
   * 登录验证
   * @param {number} userId 用户ID
   * @param {string} inputCode 6位TOTP或8位恢复码
   * @return {Promise<void>}
   */
  async loginVerify(userId, inputCode) {
    const { ctx } = this;
    const user = await ctx.model.SysUser.findByPk(userId);
    ctx.assert(user, 401, '用户不存在');
    ctx.assert(user.totp_enable === 1, 422, '未开启谷歌验证');

    const decryptedSecret = this.decrypt(user.totp_secret);

    let isValid = false;

    // 检查是否为恢复码
    if (inputCode && inputCode.length === 8) {
      const recoveryCodes = (user.totp_recovery_codes || '').split(',').filter(c => !!c);
      const codeIndex = recoveryCodes.indexOf(inputCode.toUpperCase());
      if (codeIndex > -1) {
        isValid = true;
        // 剔除已使用的恢复码
        recoveryCodes.splice(codeIndex, 1);
        await user.update({ totp_recovery_codes: recoveryCodes.join(',') });
      }
    } else {
      // 校验TOTP
      isValid = speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: 'base32',
        token: inputCode,
        window: 1,
      });
    }

    if (!isValid) {
      ctx.throw(422, '验证码错误');
    }
  }
}

module.exports = TotpService;
