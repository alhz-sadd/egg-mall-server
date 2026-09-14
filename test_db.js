const { app } = require('egg-mock/bootstrap');

async function test() {
  await app.ready();
  const ctx = app.mockContext();

  const transaction = await ctx.model.transaction();

  try {
    const newWallet = await ctx.model.UserWallet.create({
      user_id: 99997, // 测试用户
      balance: '1111.00',
      total_recharge_amount: '1111.00',
    }, { transaction });

    await newWallet.increment({
      voucher_balance: '100',
      total_recharge_amount: '100',
    }, { transaction });

    await transaction.commit();
    console.log('Increment success');
  } catch (err) {
    await transaction.rollback();
    console.error('Error:', err);
  }

  const walletAfter = await ctx.model.UserWallet.findOne({ where: { user_id: 99997 } });
  if (walletAfter) {
    console.log('After increment:', walletAfter.toJSON());
    await walletAfter.destroy();
  }
}

test().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
