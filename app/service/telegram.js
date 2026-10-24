'use strict';

const Service = require('egg').Service;

class TelegramService extends Service {
  /**
   * 发送 TG 消息
   * @param {String} message 消息文本
   * @param {Number} shopId 店铺ID (如果你们支持多店铺各自配置TG机器人，可传入此参数查数据库)
   */
  async sendMessage(message, shopId = 0) {
    const { ctx } = this;

    // 默认使用平台配置
    let botToken = null;
    let chatId = null;

    if (shopId !== 0) {
      // 查询店铺配置
      const shopConfig = await ctx.model.ShopConfig.findOne({
        where: { shop_id: shopId },
      });
      if (shopConfig && shopConfig.telegram_bot_token && shopConfig.telegram_chat_id) {
        botToken = shopConfig.telegram_bot_token;
        chatId = shopConfig.telegram_chat_id;
      }
    }

    // 如果店铺未配置，或 shopId 为 0，则使用系统全局配置
    if (!botToken || !chatId) {
      // 假设 sys_config 中有一个 type 为 telegram 的配置，这里做个简单示例，如果需要可以后续完善
      // 由于当前 sys_config 表可能没有特定结构，为了不报错，先从配置文件中读取或者直接提示未配置
      botToken = ctx.app.config.telegram ? ctx.app.config.telegram.token : null;
      chatId = ctx.app.config.telegram ? ctx.app.config.telegram.chatId : null;
    }

    if (!botToken || !chatId) {
      ctx.logger.warn(`[Telegram] 店铺 ${shopId} 未配置 BotToken 或 ChatId，取消发送`);
      return;
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
    // 使用 ctx.runInBackground 将请求放入后台执行（即“Fire and Forget”）
    // 从而避免由于网络问题阻塞或超时影响主线程及客户端响应速度
    ctx.runInBackground(async () => {
      try {
        await ctx.curl(url, {
          method: 'POST',
          contentType: 'json',
          data: {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML', // 支持 HTML 标签加粗、斜体等
          },
          dataType: 'json',
          // 缩短超时时间，[连接超时, 读写超时]
          timeout: [3000, 5000],
        });
        // 使用 app.logger 避免在后台任务中打印带有原请求上下文(5000ms耗时)的日志，引起误解
        ctx.app.logger.info(`[Telegram] 消息发送成功，店铺ID: ${shopId}`);
      } catch (err) {
        // 捕获错误，只打印简短的 message，不要打印完整的 err 对象，避免 urllib 打印带有堆栈和请求上下文的超长日志
        ctx.app.logger.error(`[Telegram] 发送消息失败 (店铺ID: ${shopId}): ${err.message || err.name}`);
      }
    });

      // 立即返回成功状态给调用方
      return;
    } catch (err) {
      // 捕获错误，防止 TG 接口不通导致系统崩溃
      ctx.logger.error('[Telegram] 发送消息失败:', err);
    }
  }
}

module.exports = TelegramService;
