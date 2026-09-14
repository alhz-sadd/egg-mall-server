const { app } = require('egg-mock/bootstrap');

describe('test', () => {
  it('should test getCustomerList', async () => {
    const ctx = app.mockContext();
    try {
      const result = await ctx.service.adminOuterCustomer.getCustomerList({ page: 1, page_size: 10 }, { user_id: 1, user_type: 2, shop_id: 1 });
      console.log('Success!', result.list.length);
    } catch (e) {
      console.error('Error:', e);
    }
  });
});
