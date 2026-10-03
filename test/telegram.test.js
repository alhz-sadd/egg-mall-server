const { app, mock } = require('egg-mock/bootstrap');

describe('test/telegram.test.js', () => {
  it('should send a test message to telegram', async () => {
    // 强制使用你提供的 Token 和 一个店铺ID进行测试
    // 这里我们直接调用 app.createAnonymousContext() 创建上下文来测试 Service
    const ctx = app.createAnonymousContext();
    
    // 你可以根据实际情况修改这里的 shopId
    // 如果你想测试刚配置的店铺，把 shopId 换成你配置的那个店铺的 ID
    const testShopId = 0; // 或者 1, 2, 等等

    const msg = `🔧 <b>系统连通性测试</b>\n\n⏰ 时间: ${new Date().toLocaleString()}\n✅ 状态: 你的 Telegram 机器人配置已成功生效！`;
    
    // 调用我们写的 Telegram Service
    await ctx.service.telegram.sendMessage(msg, testShopId);
    
    // 稍等一小会，让异步请求发出去
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('测试脚本执行完毕，请检查 Telegram 群组是否收到消息。');
  });
});
