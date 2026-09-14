const mock = require('egg-mock');
async function run() {
  const app = mock.app({
    baseDir: process.cwd(),
  });
  await app.ready();
  const ctx = app.mockContext();

  // mock user
  const currentUser = { user_id: 2, shop_id: 2, username: 'admin', user_type: 2 };

  try {
    console.log('Attempting update with allow_withdraw=false...');
    await ctx.service.adminOuterCustomer.updateCustomer(20, { allow_withdraw: false, temp_withdraw_status: false }, currentUser);
    console.log('Update success');
  } catch (e) {
    console.error('Update failed:', e);
  }

  const stat = await ctx.model.CustomerStat.findOne({ where: { customer_user_id: 20 } });
  console.log('DB stat after:', stat.toJSON());

  await app.close();
}
run();
