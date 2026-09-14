'use strict';

const { app, assert } = require('egg-mock/bootstrap');

function getUniquePhone() {
  return '18' + Date.now().toString().slice(-9);
}

async function createTestUser(ctx, phone, balance = 0) {
  const sysUser = await ctx.model.SysUser.create({
    username: phone,
    phone,
    password: await ctx.genHash('123456'),
    nickname: '测试用户',
    status: 1,
    user_type: 4,
  });
  await ctx.model.UserWallet.create({
    user_id: sysUser.user_id,
    voucher_balance: balance,
  });
  return sysUser;
}

describe('test/app/service/withdraw.test.js', () => {
  let ctx;
  let testUser;

  beforeEach(async () => {
    ctx = app.mockContext();
  });

  afterEach(async () => {
    if (testUser) {
      await ctx.model.WithdrawRecord.destroy({ where: { user_id: testUser.user_id } });
      await ctx.model.UserWallet.destroy({ where: { user_id: testUser.user_id } });
      await ctx.model.SysUser.destroy({ where: { user_id: testUser.user_id } });
      testUser = null;
    }
  });

  describe('create()', () => {
    it('应成功创建提现请求并扣除余额', async () => {
      testUser = await createTestUser(ctx, getUniquePhone(), 1000);
      const result = await ctx.service.withdraw.create(testUser.user_id, {
        amount: 100,
        address: '测试地址',
        way: 9,
        user_withdraw_password: '123456',
      });

      assert(result.user_id === testUser.user_id);
      assert(Number(result.amount) === 100);
      assert(Number(result.sx_money) === 3);
      assert(Number(result.take_money) === 97);
      assert(result.status === 0);
      assert(result.order_num);

      const updated = await ctx.model.UserWallet.findOne({ where: { user_id: testUser.user_id } });
      assert(Number(updated.voucher_balance) === 900);
    });

    it('提现金额大于余额时应抛出余额不足错误', async () => {
      testUser = await createTestUser(ctx, getUniquePhone(), 100);
      let err;
      try {
        await ctx.service.withdraw.create(testUser.user_id, {
          amount: 9999,
          address: '测试地址',
          way: 9,
          user_withdraw_password: '123456',
        });
      } catch (e) {
        err = e;
      }
      assert(err);
      assert(err.status === 422);
      assert(err.message === '余额不足');

      const updated = await ctx.model.UserWallet.findOne({ where: { user_id: testUser.user_id } });
      assert(Number(updated.voucher_balance) === 100);
    });

    it('提现密码错误时应抛出错误', async () => {
      testUser = await createTestUser(ctx, getUniquePhone(), 1000);
      let err;
      try {
        await ctx.service.withdraw.create(testUser.user_id, {
          amount: 100,
          address: '测试地址',
          way: 9,
          user_withdraw_password: '000000',
        });
      } catch (e) {
        err = e;
      }
      assert(err);
      assert(err.status === 422);
      assert(err.message === '提现密码错误');
    });

    it('提现金额为 0 时应抛出错误', async () => {
      testUser = await createTestUser(ctx, getUniquePhone(), 1000);
      let err;
      try {
        await ctx.service.withdraw.create(testUser.user_id, {
          amount: 0,
          address: '测试地址',
          way: 9,
          user_withdraw_password: '123456',
        });
      } catch (e) {
        err = e;
      }
      assert(err);
      assert(err.status === 422);
      assert(err.message === '提现金额必须大于0');
    });

    it('缺少提现金额时应抛出错误', async () => {
      testUser = await createTestUser(ctx, getUniquePhone(), 1000);
      let err;
      try {
        await ctx.service.withdraw.create(testUser.user_id, {
          address: '测试地址',
          way: 9,
          user_withdraw_password: '123456',
        });
      } catch (e) {
        err = e;
      }
      assert(err);
      assert(err.status === 422);
      assert(err.message === '提现金额不能为空');
    });

    it('缺少提现密码时应抛出错误', async () => {
      testUser = await createTestUser(ctx, getUniquePhone(), 1000);
      let err;
      try {
        await ctx.service.withdraw.create(testUser.user_id, {
          amount: 100,
          address: '测试地址',
          way: 9,
        });
      } catch (e) {
        err = e;
      }
      assert(err);
      assert(err.status === 422);
      assert(err.message === '提现密码不能为空');
    });

    it('用户不存在时应抛出错误', async () => {
      let err;
      try {
        await ctx.service.withdraw.create(999999, {
          amount: 100,
          address: '测试地址',
          way: 9,
          user_withdraw_password: '123456',
        });
      } catch (e) {
        err = e;
      }
      assert(err);
      assert(err.status === 422);
      assert(err.message === '用户不存在');
    });
  });
});
