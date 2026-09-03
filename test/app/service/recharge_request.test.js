'use strict';

const { app, assert } = require('egg-mock/bootstrap');

function getUniquePhone() {
  return '18' + Date.now().toString().slice(-9);
}

async function createTestUser(ctx, phone, balance = 0) {
  return await ctx.model.User.create({
    username: phone,
    phone,
    password: await ctx.genHash('123456'),
    withdraw_password: '123456',
    nickname: '测试用户',
    balance,
    status: 1,
  });
}

describe('test/app/service/recharge_request.test.js', () => {
  let ctx;
  let testUser;

  beforeEach(async () => {
    ctx = app.mockContext();
  });

  afterEach(async () => {
    if (testUser) {
      await ctx.model.RechargeRequest.destroy({ where: { user_id: testUser.id } });
      await ctx.model.User.destroy({ where: { id: testUser.id } });
      testUser = null;
    }
  });

  describe('create()', () => {
    it('应成功创建充值请求', async () => {
      testUser = await createTestUser(ctx, getUniquePhone());
      const result = await ctx.service.rechargeRequest.create(testUser.id, {
        do_money: 500,
        pay_way: 9,
        remark: '单元测试充值',
      });

      assert(result.user_id === testUser.id);
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
        await ctx.service.rechargeRequest.create(testUser.id, { do_money: 0, pay_way: 9 });
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
        await ctx.service.rechargeRequest.create(testUser.id, { pay_way: 9 });
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
      const first = await ctx.service.rechargeRequest.create(testUser.id, { do_money: 100, pay_way: 9 });
      await ctx.model.RechargeRequest.update({ status: 1 }, { where: { id: first.id } });
      const second = await ctx.service.rechargeRequest.create(testUser.id, { do_money: 200, pay_way: 9 });
      assert(second.is_first === 0);
    });
  });
});
