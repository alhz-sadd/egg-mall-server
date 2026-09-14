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

describe('test/app/service/recharge_request.test.js', () => {
  let ctx;
  let testUser;

  beforeEach(async () => {
    ctx = app.mockContext();
  });

  afterEach(async () => {
    if (testUser) {
      await ctx.model.RechargeRequest.destroy({ where: { user_id: testUser.user_id } });
      await ctx.model.UserWallet.destroy({ where: { user_id: testUser.user_id } });
      await ctx.model.SysUser.destroy({ where: { user_id: testUser.user_id } });
      testUser = null;
    }
  });

  describe('create()', () => {
    it('应成功创建充值请求', async () => {
      testUser = await createTestUser(ctx, getUniquePhone());
      const result = await ctx.service.rechargeRequest.create(testUser.user_id, {
        do_money: 500,
        pay_way: 9,
        remark: '单元测试充值',
      });

      assert(result.user_id === testUser.user_id);
      assert(Number(result.do_money) === 500);
      assert(Number(result.pay_way) === 9);
      assert(result.status === 0);
      assert(result.order_num);
      assert(result.is_first === 1);
    });

    it('充值金额为 0 时应抛出错误', async () => {
      testUser = await createTestUser(ctx, getUniquePhone());
      let err;
      try {
        await ctx.service.rechargeRequest.create(testUser.user_id, { do_money: 0, pay_way: 9 });
      } catch (e) {
        err = e;
      }
      assert(err);
      assert(err.status === 422);
      assert(err.message === '充值金额必须大于0');
    });

    it('缺少充值金额时应抛出错误', async () => {
      testUser = await createTestUser(ctx, getUniquePhone());
      let err;
      try {
        await ctx.service.rechargeRequest.create(testUser.user_id, { pay_way: 9 });
      } catch (e) {
        err = e;
      }
      assert(err);
      assert(err.status === 422);
      assert(err.message === '充值金额不能为空');
    });

    it('用户不存在时应抛出错误', async () => {
      let err;
      try {
        await ctx.service.rechargeRequest.create(999999, { do_money: 100, pay_way: 9 });
      } catch (e) {
        err = e;
      }
      assert(err);
      assert(err.status === 422);
      assert(err.message === '用户不存在');
    });

    it('已存在审核通过的充值请求后 is_first 应为 0', async () => {
      testUser = await createTestUser(ctx, getUniquePhone());
      const first = await ctx.service.rechargeRequest.create(testUser.user_id, { do_money: 100, pay_way: 9 });
      await ctx.model.RechargeRequest.update({ status: 1 }, { where: { id: first.id } });
      const second = await ctx.service.rechargeRequest.create(testUser.user_id, { do_money: 200, pay_way: 9 });
      assert(second.is_first === 0);
    });
  });
});
