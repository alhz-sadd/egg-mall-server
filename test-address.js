const { app } = require('egg-mock/bootstrap');

describe('test address', () => {
  it('should get address', async () => {
    const ctx = app.mockContext();
    const cUser = await ctx.model.SysUser.findOne({ where: { user_type: 4, is_deleted: 0 } });
    if (!cUser) {
      console.log('No C user found');
      return;
    }
    console.log('C User:', cUser.user_id, cUser.username);
    const { adminId } = await ctx.service.rechargeRequest.resolveSalespersonAdmin(cUser.user_id);
    console.log('adminId:', adminId);

    if (adminId) {
      const config = await ctx.service.salesmanConfig.getDefaultAddress(adminId);
      console.log('config:', config);
    }
  });
});
