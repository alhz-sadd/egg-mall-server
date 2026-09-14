'use strict';

const Controller = require('egg').Controller;
const crypto = require('crypto');

class MobileUserIdentityController extends Controller {
  // 加密身份证号
  encryptIdCard(rawStr) {
    if (!rawStr) return rawStr;
    try {
      const algorithm = 'aes-256-cbc';
      const key = this.app.config.crypto ? this.app.config.crypto.key : 'default_secret_key_32_bytes_long!';
      const iv = this.app.config.crypto ? this.app.config.crypto.iv : '1234567890123456';

      const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), Buffer.from(iv));
      let encrypted = cipher.update(rawStr, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      this.ctx.logger.error('身份证加密失败:', error);
      return rawStr;
    }
  }

  // 解密身份证号
  decryptIdCard(encryptedStr) {
    if (!encryptedStr) return encryptedStr;
    try {
      const algorithm = 'aes-256-cbc';
      const key = this.app.config.crypto ? this.app.config.crypto.key : 'default_secret_key_32_bytes_long!';
      const iv = this.app.config.crypto ? this.app.config.crypto.iv : '1234567890123456';

      const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), Buffer.from(iv));
      let decrypted = decipher.update(encryptedStr, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.ctx.logger.error('身份证解密失败:', error);
      return encryptedStr;
    }
  }

  /**
   * C端获取实名认证状态及回显
   * GET /api/mobile/users/identity
   */
  async show() {
    const { ctx } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId; // 根据移动端 auth 中间件的挂载字段

    if (!userId) {
      ctx.throw(401, '未登录');
    }

    const identity = await ctx.model.UserIdentity.findOne({
      where: { user_id: userId, is_deleted: 0 },
      order: [[ 'create_time', 'DESC' ]], // 取最新的一条
    });

    if (!identity) {
      ctx.body = {
        code: 200,
        message: '获取成功',
        data: {
          audit_status: 0, // 未提交
          reject_reason: null,
          real_name: '',
          id_card_no: '',
          id_card_front: '',
          id_card_back: '',
          hand_id_card: '',
        },
      };
      return;
    }

    const data = identity.toJSON();
    data.id_card_no = this.decryptIdCard(data.id_card_no);

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        audit_status: data.audit_status,
        reject_reason: data.reject_reason,
        real_name: data.real_name,
        id_card_no: data.id_card_no,
        id_card_front: data.id_card_front,
        id_card_back: data.id_card_back,
        hand_id_card: data.hand_id_card,
      },
    };
  }

  /**
   * C端提交实名认证资料
   * POST /api/mobile/users/identity
   */
  async create() {
    const { ctx } = this;
    const userId = ctx.state.user.id || ctx.state.user.user_id || ctx.state.user.userId;

    if (!userId) {
      ctx.throw(401, '未登录');
    }

    const payload = ctx.request.body;
    ctx.validate({
      real_name: { type: 'string', required: true },
      id_card_no: { type: 'string', required: true },
      id_card_front: { type: 'string', required: true },
      id_card_back: { type: 'string', required: true },
      hand_id_card: { type: 'string', required: false },
    }, payload);

    // 检查是否已经存在待审核或已通过的记录
    const existIdentity = await ctx.model.UserIdentity.findOne({
      where: { user_id: userId, is_deleted: 0 },
      order: [[ 'create_time', 'DESC' ]],
    });

    if (existIdentity) {
      if (existIdentity.audit_status === 1) {
        ctx.throw(400, '实名认证资料正在审核中，请勿重复提交');
      }
      if (existIdentity.audit_status === 2) {
        ctx.throw(400, '实名认证已通过，请勿重复提交');
      }
      // 如果是驳回 (3)，则允许重新提交，可以将之前的记录软删除，或者直接更新（这里采用软删除旧记录插入新记录，保留历史更清晰）
      if (existIdentity.audit_status === 3) {
        await existIdentity.update({ is_deleted: 1 });
      }
    }

    const encryptedIdCard = this.encryptIdCard(payload.id_card_no);

    await ctx.model.UserIdentity.create({
      user_id: userId,
      real_name: payload.real_name,
      id_card_no: encryptedIdCard,
      id_card_front: payload.id_card_front,
      id_card_back: payload.id_card_back,
      hand_id_card: payload.hand_id_card || null,
      audit_status: 1, // 1待审核
    });

    ctx.body = {
      code: 200,
      message: '提交成功',
    };
  }
}

module.exports = MobileUserIdentityController;
