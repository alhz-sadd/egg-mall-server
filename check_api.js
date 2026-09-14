const { app } = require('egg-mock/bootstrap');

async function test() {
  await app.ready();
  const ctx = app.mockContext();
  
  // mock currentUser
  const currentUser = {
    user_id: 1032,
    user_type: 3,
    shop_id: 20
  };
  
  const result = await ctx.service.adminOuterCustomer.getCustomerList({ page: 1, page_size: 10 }, currentUser);
  console.log('Customer list result:', JSON.stringify(result, null, 2));
}

test().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });