'use strict';

const Service = require('egg').Service;
const { Op } = require('sequelize');

/**
 * 用户凭证服务层
 * 处理管理端凭证列表查询、删除等操作
 */
class UserCredentialService extends Service {
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
   * 根据角色获取可查看的用户ID列表
   * @param {Object} operator 当前操作人 { id, role }
   * @return {Array|null} 用户ID列表 (null表示可以查看当前店铺下的所有用户)
   */
  async getVisibleUserIds(operator) {
    const { ctx } = this;
    const { id: operatorId, role: operatorRole } = operator;

    // 商家（店铺超级管理员）：可以查看自己店铺下的所有用户
    if (operatorRole === 1) {
      return null;
    }

    if (operatorRole === 2) {
      // 业务员：查看自己绑定的用户 + 通过 parent_id 关联的下级用户
      const linkedUsers = await ctx.model.SysUser.findAll({
        attributes: [ 'user_id' ],
        where: { admin_id: operatorId, user_type: 4 },
        raw: true,
      });
      const linkedUserIds = linkedUsers.map(u => u.user_id);

      const orConditions = [
        { admin_id: operatorId },
      ];
      if (linkedUserIds.length > 0) {
        orConditions.push({ user_referral_id: { [Op.in]: linkedUserIds } });
      }

      const users = await ctx.model.SysUser.findAll({
        attributes: [ 'user_id' ],
        where: { [Op.or]: orConditions, user_type: 4 },
        raw: true,
      });
      return users.map(u => u.user_id);
    }

    return [];
  }

  /**
   * 管理端获取用户凭证列表
   * @param {Object} query 查询参数
   * @param {Object} operator 当前操作人 { id, role, merchantId }
   * @return {Object} 分页结果
   */
  async adminList(query = {}, operator = {}) {
    const { ctx } = this;
    const { uid, user_uid, status, page = 1, page_size = 10 } = query;
    const { role: operatorRole, id: operatorId, merchantId } = operator;

    const where = {};
    const userWhere = {};

    // 根据 merchantId 过滤店铺（如果存在）
    if (merchantId) {
      // 找出当前店铺及店铺下的所有业务员
      const allRelatedAdminIds = await ctx.service.adminUser.getAllRelatedAdminIds(merchantId);
      userWhere.admin_id = { [Op.in]: allRelatedAdminIds };
    }

    // 权限过滤：根据角色筛选可查看的凭证（业务员只能看自己名下）
    if (operatorRole && operatorId) {
      const visibleUserIds = await this.getVisibleUserIds({ id: operatorId, role: operatorRole });
      if (visibleUserIds !== null) {
        if (visibleUserIds.length === 0) {
          return { total: 0, list: [] };
        }
        where.user_id = { [Op.in]: visibleUserIds };
      }
    }

    if (uid !== undefined && uid !== '') {
      where.id = Number(uid);
    }
    if (user_uid !== undefined && user_uid !== '') {
      userWhere.user_id = String(user_uid);
    }
    if (status !== undefined && status !== '') {
      where.status = Number(status);
    }

    const offset = (Number(page) - 1) * Number(page_size);
    const limit = Number(page_size);

    const { count, rows } = await ctx.model.UserCredential.findAndCountAll({
      where,
      include: [
        {
          model: ctx.model.SysUser,
          as: 'user',
          attributes: [ 'user_id', 'username', 'nickname' ],
          where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
          required: Object.keys(userWhere).length > 0, // 如果有 user 的查询条件，设为 INNER JOIN
        },
      ],
      order: [[ 'id', 'DESC' ]],
      offset,
      limit,
    });

    return {
      total: count,
      list: rows.map(item => {
        const cTime = this.formatDate(item.created_at);
        const uTime = this.formatDate(item.updated_at);
        const user = item.user || {};
        return {
          id: item.id,
          userId: user.user_id || item.user_id,
          userName: user.nickname || user.username || '',
          userPhone: user.username || '',
          real_name: item.real_name,
          id_number: item.id_number,
          front_image: item.front_image,
          back_image: item.back_image,
          status: item.status,
          cTime,
          uTime,
        };
      }),
    };
  }

  /**
   * 管理端删除用户凭证（物理删除）
   * @param {number} id 凭证ID
   */
  async adminDestroy(id) {
    const { ctx } = this;
    const credential = await ctx.model.UserCredential.findByPk(id);
    if (!credential) {
      ctx.throw(404, '凭证不存在');
    }

    await credential.destroy();
  }

  /**
   * 审核凭证通过
   * @param {number} id 凭证ID
   * @return {Object} 更新后的凭证
   */
  async auditSuccess(id) {
    const { ctx } = this;
    const credential = await ctx.model.UserCredential.findByPk(id);
    if (!credential) {
      ctx.throw(404, '凭证不存在');
    }

    await credential.update({ status: 1 });
    return credential.toJSON();
  }

  /**
   * 审核凭证失败
   * @param {number} id 凭证ID
   * @return {Object} 更新后的凭证
   */
  async auditFail(id) {
    const { ctx } = this;
    const credential = await ctx.model.UserCredential.findByPk(id);
    if (!credential) {
      ctx.throw(404, '凭证不存在');
    }

    await credential.update({ status: 2 });
    return credential.toJSON();
  }
}

module.exports = UserCredentialService;
