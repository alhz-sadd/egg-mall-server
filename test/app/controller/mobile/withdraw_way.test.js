'use strict';

const { app, assert } = require('egg-mock/bootstrap');

function getUniquePhone() {
  return '18' + Date.now().toString().slice(-9);
}

async function createTestUser(phone) {
  const ctx = app.mockContext();
  return await ctx.model.SysUser.create({
    username: phone,
    phone,
    password: await ctx.genHash('123456'),
    nickname: '测试用户',
    status: 1,
    user_type: 4,
  });
}

async function getToken(phone) {
  const res = await app.httpRequest()
    .post('/api/mobile/users/login')
    .send({ phone, password: '123456' })
    .expect(200);
  return res.body.data.token;
}

describe('test/app/controller/mobile/withdraw_way.test.js', () => {
  let testUser;
  let token;
  let testWayIds = [];

  afterEach(async () => {
    if (testUser) {
      const ctx = app.mockContext();
      await ctx.model.SysUser.destroy({ where: { user_id: testUser.user_id } });
      testUser = null;
      token = null;
    }
    if (testWayIds.length > 0) {
      const ctx = app.mockContext();
      await ctx.model.WithdrawWay.destroy({ where: { id: testWayIds } });
      testWayIds = [];
    }
  });

  describe('GET /api/mobile/withdraw-ways', () => {
    it('应仅返回启用的提现方式', async () => {
      const ctx = app.mockContext();
      const enabled = await ctx.model.WithdrawWay.create({ way: '启用方式', sort: 1, status: 0 });
      const disabled = await ctx.model.WithdrawWay.create({ way: '禁用方式', sort: 2, status: 1 });
      testWayIds = [ enabled.id, disabled.id ];

      const phone = getUniquePhone();
      testUser = await createTestUser(phone);
      token = await getToken(phone);

      const res = await app.httpRequest()
        .get('/api/mobile/withdraw-ways')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      assert(res.body.code === 200);
      assert(res.body.data.list.length >= 1);
      assert(res.body.data.list.every(item => item.status === 0));
      const ids = res.body.data.list.map(item => item.id);
      assert(ids.includes(enabled.id));
      assert(!ids.includes(disabled.id));
    });

    it('未登录时应返回 401', async () => {
      await app.httpRequest()
        .get('/api/mobile/withdraw-ways')
        .expect(401);
    });
  });
});
