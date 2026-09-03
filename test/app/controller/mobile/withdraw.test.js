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

describe('test/app/controller/mobile/withdraw.test.js', () => {
  let testUser;
  let token;

  afterEach(async () => {
    if (testUser) {
      const ctx = app.mockContext();
      await ctx.model.WithdrawRecord.destroy({ where: { user_id: testUser.id } });
      await ctx.model.User.destroy({ where: { id: testUser.id } });
      testUser = null;
      token = null;
    }
  });

  describe('POST /api/mobile/withdraws', () => {
    it('应成功提交提现请求并扣除余额', async () => {
      const phone = getUniquePhone();
      testUser = await createTestUser(phone, 1000);
      token = await getToken(phone);

      const res = await app.httpRequest()
        .post('/api/mobile/withdraws')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 100,
          address: '测试地址',
          way: 9,
          user_withdraw_password: '123456',
        })
        .expect(200);

      assert(res.body.code === 200);
      assert(res.body.message === '提现请求已提交');
      assert(res.body.data.user_id === testUser.id);
      assert(Number(res.body.data.amount) === 100);
      assert(Number(res.body.data.sx_money) === 3);

      const ctx = app.mockContext();
      const updated = await ctx.model.User.findByPk(testUser.id);
      assert(Number(updated.balance) === 900);
    });

    it('余额不足时应返回 422', async () => {
      const phone = getUniquePhone();
      testUser = await createTestUser(phone, 50);
      token = await getToken(phone);

      const res = await app.httpRequest()
        .post('/api/mobile/withdraws')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 9999,
          address: '测试地址',
          way: 9,
          user_withdraw_password: '123456',
        })
        .expect(422);

      assert(res.body.code === 422);
      assert(res.body.message === '余额不足');
    });

    it('提现密码错误时应返回 422', async () => {
      const phone = getUniquePhone();
      testUser = await createTestUser(phone, 1000);
      token = await getToken(phone);

      const res = await app.httpRequest()
        .post('/api/mobile/withdraws')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 100,
          address: '测试地址',
          way: 9,
          user_withdraw_password: '000000',
        })
        .expect(422);

      assert(res.body.code === 422);
      assert(res.body.message === '提现密码错误');
    });

    it('未登录时应返回 401', async () => {
      await app.httpRequest()
        .post('/api/mobile/withdraws')
        .send({ amount: 100, way: 9, user_withdraw_password: '123456' })
        .expect(401);
    });
  });
});
