'use strict';

const Controller = require('egg').Controller;

class ConfigController extends Controller {
  /**
   * @summary 获取店铺参数设置接口
   * @description admin-inner 获取店铺各项配置参数
   * @router get /api/admin-inner/merchants/:id/configs
   * @request header string Authorization Bearer admin token
   */
  async getStoreConfig() {
    const { ctx } = this;
    const { id } = ctx.params;

    // 1. 获取 sys_config
    const sysConfigs = await ctx.model.SysConfig.findAll({
      where: { admin_id: id },
      raw: true,
    });
    const configMap = {};
    sysConfigs.forEach(item => {
      configMap[item.config_key] = item.config_value;
    });

    // 2. 获取 withdraw_config
    let withdrawConfig = await ctx.model.WithdrawConfig.findOne({
      where: { admin_id: id },
      raw: true,
    });
    if (!withdrawConfig) {
      withdrawConfig = {
        min_money: 20,
        sx_rate: '0.03',
        need_task: false,
      };
    }

    const data = {
      realNameConfig: {
        giftConfig: {
          name: '实名奖励代金配置',
          msg: '实名认证审核通过后奖励的代金数量（设置值必须为数字）',
          config_value: configMap['user.money.dai.gift'] !== undefined ? Number(configMap['user.money.dai.gift']) : 100,
        },
      },
      payConfig: {
        timeoutEnable: {
          name: '支付超时任务开关',
          msg: '控制是否启用订单支付超时检查任务（true为开启；false为关闭）',
          config_value: configMap['order.pay.timeout.enable'] === 'true',
        },
        timeoutTime: {
          name: '支付超时默认时间',
          msg: '设置订单支付超时时间（单位：分钟；设置的值必须为整数）',
          config_value: configMap['order.pay.timeout.time'] !== undefined ? Number(configMap['order.pay.timeout.time']) : 600,
        },
      },
      withdrawConfig: {
        minMoney: {
          name: '最小提现金额',
          msg: '最小提现金额（设置值必须为数字）',
          config_value: Number(withdrawConfig.min_money) || 20,
        },
        commissionRate: {
          name: '提现佣金',
          msg: '提现佣金设置（百分比，输入值就好，比如0.03）',
          config_value: Number(withdrawConfig.sx_rate) || 0.03,
        },
        firstWithdrawNeedTask: {
          name: '首次提现是否需要完成任务',
          msg: '是否需要完成任务才能体现（true需要；false不需要）',
          config_value: !!withdrawConfig.need_task,
        },
      },
    };

    ctx.body = {
      code: 200,
      message: 'success',
      data,
    };
  }

  /**
   * @summary 更新店铺参数设置接口
   * @description admin-inner 更新店铺各项配置参数
   * @router put /api/admin-inner/merchants/:id/configs
   * @request header string Authorization Bearer admin token
   */
  async updateStoreConfig() {
    const { ctx } = this;
    const { id } = ctx.params;
    const body = ctx.request.body;

    const transaction = await ctx.model.transaction();
    try {
      // 解析 sys_config 相关配置
      const sysConfigUpdates = [];
      if (body.realNameConfig && body.realNameConfig.giftConfig && body.realNameConfig.giftConfig.config_value !== undefined) {
        sysConfigUpdates.push({
          config_key: 'user.money.dai.gift',
          config_value: String(body.realNameConfig.giftConfig.config_value),
          config_name: '实名奖励代金配置',
        });
      }

      if (body.payConfig) {
        if (body.payConfig.timeoutEnable && body.payConfig.timeoutEnable.config_value !== undefined) {
          sysConfigUpdates.push({
            config_key: 'order.pay.timeout.enable',
            config_value: String(body.payConfig.timeoutEnable.config_value),
            config_name: '支付超时任务开关',
          });
        }
        if (body.payConfig.timeoutTime && body.payConfig.timeoutTime.config_value !== undefined) {
          sysConfigUpdates.push({
            config_key: 'order.pay.timeout.time',
            config_value: String(body.payConfig.timeoutTime.config_value),
            config_name: '支付超时默认时间',
          });
        }
      }

      // 更新 sys_config
      for (const item of sysConfigUpdates) {
        const exist = await ctx.model.SysConfig.findOne({
          where: { admin_id: id, config_key: item.config_key },
          transaction,
        });
        if (exist) {
          await exist.update({ config_value: item.config_value }, { transaction });
        } else {
          await ctx.model.SysConfig.create({
            admin_id: id,
            config_key: item.config_key,
            config_value: item.config_value,
            config_name: item.config_name,
          }, { transaction });
        }
      }

      // 解析提现相关配置
      if (body.withdrawConfig) {
        const withdrawConfig = await ctx.model.WithdrawConfig.findOne({
          where: { admin_id: id },
          transaction,
        });

        const updateData = {};
        if (body.withdrawConfig.minMoney && body.withdrawConfig.minMoney.config_value !== undefined) {
          updateData.min_money = Number(body.withdrawConfig.minMoney.config_value);
        }
        if (body.withdrawConfig.commissionRate && body.withdrawConfig.commissionRate.config_value !== undefined) {
          updateData.sx_rate = String(body.withdrawConfig.commissionRate.config_value);
        }
        if (body.withdrawConfig.firstWithdrawNeedTask && body.withdrawConfig.firstWithdrawNeedTask.config_value !== undefined) {
          updateData.need_task = Boolean(body.withdrawConfig.firstWithdrawNeedTask.config_value);
        }

        // 仅在有更新数据时操作
        if (Object.keys(updateData).length > 0) {
          if (withdrawConfig) {
            await withdrawConfig.update(updateData, { transaction });
          } else {
            await ctx.model.WithdrawConfig.create({
              admin_id: id,
              ...updateData,
            }, { transaction });
          }
        }
      }

      await transaction.commit();

      ctx.body = {
        code: 200,
        message: '更新成功',
        data: null,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = ConfigController;
