'use strict';

const Controller = require('egg').Controller;

/**
 * @Controller 管理端-系统配置
 * 管理端通用系统参数配置控制器
 */
class SysConfigController extends Controller {
  /**
   * @summary 获取实名奖励代金配置
   * @description 获取键名为 user.money.dai.gift 的配置信息
   * @router get /api/admin/sys-config/getDaiMoneyConfig
   * @request header string Authorization Bearer admin token
   * @response 200 ApiResponse 配置详情
   */
  async getDaiMoneyConfig() {
    const { ctx, service } = this;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;
    const configKey = 'user.money.dai.gift';
    const data = await service.sysConfig.getConfigByKey(configKey, adminId);

    ctx.body = {
      code: 200,
      message: 'success',
      data,
    };
  }

  /**
   * @summary 修改系统配置
   * @description 根据键名修改参数配置信息
   * @router put /api/admin/sys-config/updateConfig
   * @request header string Authorization Bearer admin token
   * @request body SysConfigUpdatePayload *body 配置参数
   * @response 200 ApiResponse 更新成功
   */
  async updateConfig() {
    const { ctx, service } = this;
    const admin = ctx.state.admin;
    const adminId = admin ? admin.id : undefined;
    const { config_key, config_value, config_name, remark } = ctx.request.body;

    ctx.assert(config_key, 422, '参数键名不能为空');

    const payload = {};
    if (config_value !== undefined) payload.config_value = config_value;
    if (config_name !== undefined) payload.config_name = config_name;
    if (remark !== undefined) payload.remark = remark;

    const success = await service.sysConfig.updateConfigByKey(config_key, payload, adminId);

    if (!success) {
      ctx.body = {
        code: 404,
        message: '未找到该配置参数',
      };
      return;
    }

    ctx.body = {
      code: 200,
      message: '更新成功',
    };
  }
}

module.exports = SysConfigController;
