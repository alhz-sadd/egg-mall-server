'use strict';

const { app, assert } = require('egg-mock/bootstrap');

function getUniquePhone() {
  return '18' + Date.now().toString().slice(-9);
}

async function createTestUser(phone, balance = 0) {
  const ctx = app.mockContext();
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

async function getToken(phone) {
  const res = await app.httpRequest()
    .post('/api/mobile/users/login')
    .send({ phone, password: '123456' })
    .expect(200);
  return res.body.data.token;
}

describe('test/app/controller/mobile/recharge.test.js', () => {
  let testUser;
  let token;

  afterEach(async () => {
    if (testUser) {
      const ctx = app.mockContext();
      await ctx.model.RechargeRequest.destroy({ where: { user_id: testUser.id } });
      await ctx.model.User.destroy({ where: { id: testUser.id } });
      testUser = null;
      token = null;
    }
  });

  describe('POST /api/mobile/recharges', () => {
    it('应成功提交充值请求', async () => {
      const phone = getUniquePhone();
      testUser = await createTestUser(phone);
      token = await getToken(phone);

      const res = await app.httpRequest()
        .post('/api/mobile/recharges')
        .set('Authorization', `Bearer ${token}`)
        .send({ do_money: 300, pay_way: 9 })
        .expect(200);

      assert(res.body.code === 200);
      assert(res.body.message === '充值请求已提交');
      assert(res.body.data.user_id === testUser.id);
      assert(Number(res.body.data.do_money) === 300);
    });

    it('未登录时应返回 401', async () => {
      await app.httpRequest()
        .post('/api/mobile/recharges')
        .send({ do_money: 300, pay_way: 9 })
        .expect(401);
    });

    it('充值金额为 0 时应返回 422', async () => {
      const phone = getUniquePhone();
      testUser = await createTestUser(phone);
      token = await getToken(phone);

      const res = await app.httpRequest()
        .post('/api/mobile/recharges')
        .set('Authorization', `Bearer ${token}`)
        .send({ do_money: 0, pay_way: 9 })
        .expect(422);

      assert(res.body.code === 422);
      assert(res.body.message === '充值金额必须大于0');
    });
  });
});
