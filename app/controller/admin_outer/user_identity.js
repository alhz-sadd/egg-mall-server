'use strict';

const Controller = require('egg').Controller;
const crypto = require('crypto');

class AdminOuterUserIdentityController extends Controller {
  // 简单的 AES 解密函数 (需与加密函数匹配，若项目中已有统一封装请替换)
  decryptIdCard(encryptedStr) {
    if (!encryptedStr) return encryptedStr;
    try {
      const algorithm = 'aes-256-cbc';
      const key = this.app.config.crypto ? this.app.config.crypto.key : 'default_secret_key_32_bytes_long!'; // 替换为项目实际配置
      const iv = this.app.config.crypto ? this.app.config.crypto.iv : '1234567890123456';

      const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), Buffer.from(iv));
      let decrypted = decipher.update(encryptedStr, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.ctx.logger.error('身份证解密失败:', error);
      return encryptedStr; // 解密失败原样返回，防止程序崩溃
    }
  }

  /**
   * B端获取本店实名认证列表
   * GET /api/admin-outer/user-identities
   */
  async index() {
    const { ctx, app } = this;
    const { Op } = app.Sequelize;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未登录或未绑定店铺');
    }

    const { page = 1, page_size = 10, audit_status, real_name, username } = ctx.query;
    const limit = parseInt(page_size);
    const offset = (parseInt(page) - 1) * limit;

    // 1. 先通过 customer_relation 查出本店铺下所有的 C 端用户 ID
    const relations = await ctx.model.CustomerRelation.findAll({
      where: { shop_id: adminOuter.shop_id },
      attributes: [ 'c_user_id' ],
      raw: true,
    });

    if (relations.length === 0) {
      ctx.body = {
        code: 200,
        message: '获取成功',
        data: { list: [], total: 0, page: parseInt(page), page_size: limit },
      };
      return;
    }

    const customerUserIds = relations.map(r => r.c_user_id);

    // 2. 构建查询条件
    const where = {
      user_id: { [Op.in]: customerUserIds },
      is_deleted: 0,
    };

    if (audit_status !== undefined && audit_status !== '') {
      where.audit_status = parseInt(audit_status);
    }
    if (real_name) {
      where.real_name = { [Op.like]: `%${real_name}%` };
    }

    const include = [{
      model: ctx.model.SysUser,
      as: 'user',
      attributes: [ 'username', 'nickname', 'phone' ],
    }];

    // 如果传了 username 搜索，则在 include 的 where 里增加条件
    if (username) {
      include[0].where = {
        username: { [Op.like]: `%${username}%` },
      };
    }

    // 3. 执行查询
    const { count, rows } = await ctx.model.UserIdentity.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [[ 'create_time', 'DESC' ]],
    });

    // 4. 解密处理
    const list = rows.map(row => {
      const data = row.toJSON();
      data.id_card_no = this.decryptIdCard(data.id_card_no);
      return data;
    });

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        list,
        total: count,
        page: parseInt(page),
        page_size: limit,
      },
    };
  }

  /**
   * B端审核通过实名认证
   * POST /api/admin-outer/user-identities/:id/audit-success
   */
  async auditSuccess() {
    const { ctx } = this;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未登录或未绑定店铺');
    }

    const id = ctx.params.id;

    // 开启事务，因为涉及到钱包金额的变更
    const transaction = await ctx.model.transaction();

    try {
      const identity = await ctx.model.UserIdentity.findOne({
        where: { identity_id: id, is_deleted: 0 },
        transaction,
      });

      if (!identity) {
        throw new Error('认证记录不存在');
      }
      if (identity.audit_status !== 1) {
        throw new Error('只有待审核状态才能进行审核操作');
      }

      // 验证该用户是否属于本店
      const relation = await ctx.model.CustomerRelation.findOne({
        where: { c_user_id: identity.user_id, shop_id: adminOuter.shop_id },
        transaction,
      });

      if (!relation) {
        throw new Error('无权操作非本店用户的实名认证');
      }

      // 更新状态为审核通过 (2)
      await identity.update({
        audit_status: 2,
        audit_user_id: adminOuter.id,
        audit_time: new Date(),
      }, { transaction });

      // 查询店铺配置的实名奖励
      const shopConfig = await ctx.model.ShopConfig.findOne({
        where: { shop_id: adminOuter.shop_id },
        transaction,
      });

      // 如果有奖励金额且大于0
      if (shopConfig && shopConfig.real_name_reward > 0) {
        const rewardAmount = parseFloat(shopConfig.real_name_reward);

        // 查找用户钱包
        let wallet = await ctx.model.UserWallet.findOne({
          where: { user_id: identity.user_id },
          transaction,
        });

        if (!wallet) {
          // 如果没有钱包，初始化一个
          wallet = await ctx.model.UserWallet.create({
            user_id: identity.user_id,
            balance: 0,
            voucher_balance: 0,
          }, { transaction });
        }

        const beforeBalance = parseFloat(wallet.voucher_balance);
        const afterBalance = beforeBalance + rewardAmount;

        // 增加代金券余额
        await wallet.update({
          voucher_balance: afterBalance,
        }, { transaction });

        // 记录资金流水
        await ctx.model.UserWalletLog.create({
          user_id: identity.user_id,
          currency_type: 2, // 1:现金 2:代金券
          log_type: 7, // 假设 7 代表实名奖励，具体视规范而定
          amount: rewardAmount,
          before_balance: beforeBalance,
          after_balance: afterBalance,
          remark: '实名认证通过奖励',
          related_order_id: identity.identity_id,
        }, { transaction });
      }

      await transaction.commit();

      ctx.body = {
        code: 200,
        message: '审核通过操作成功',
      };

    } catch (error) {
      await transaction.rollback();
      ctx.logger.error('实名认证审核通过失败:', error);
      ctx.throw(500, error.message || '审核操作失败');
    }
  }

  /**
   * B端审核驳回实名认证
   * POST /api/admin-outer/user-identities/:id/audit-fail
   */
  async auditFail() {
    const { ctx } = this;
    const adminOuter = ctx.state.adminOuter;

    if (!adminOuter || !adminOuter.shop_id) {
      ctx.throw(401, '未登录或未绑定店铺');
    }

    const { reject_reason } = ctx.request.body;
    if (!reject_reason) {
      ctx.throw(422, '驳回原因不能为空');
    }

    const id = ctx.params.id;

    const identity = await ctx.model.UserIdentity.findOne({
      where: { identity_id: id, is_deleted: 0 },
    });

    if (!identity) {
      ctx.throw(404, '认证记录不存在');
    }
    if (identity.audit_status !== 1) {
      ctx.throw(400, '只有待审核状态才能进行审核操作');
    }

    // 验证该用户是否属于本店
    const relation = await ctx.model.CustomerRelation.findOne({
      where: { c_user_id: identity.user_id, shop_id: adminOuter.shop_id },
    });

    if (!relation) {
      ctx.throw(403, '无权操作非本店用户的实名认证');
    }

    // 更新状态为审核驳回 (3)
    await identity.update({
      audit_status: 3,
      audit_user_id: adminOuter.id,
      audit_time: new Date(),
      reject_reason,
    });

    ctx.body = {
      code: 200,
      message: '驳回操作成功',
    };
  }
}

module.exports = AdminOuterUserIdentityController;
