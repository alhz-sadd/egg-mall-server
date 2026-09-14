const { app } = require('egg-mock/bootstrap');
app.ready(async () => {
  const ctx = app.mockContext();
  try {
    const roles = await ctx.model.query('SELECT * FROM sys_user_role', { type: ctx.model.QueryTypes.SELECT });
    console.log('sys_user_role:', roles);
  } catch (e) {
    console.log('error:', e.message);
  }
  process.exit(0);
});
