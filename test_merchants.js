const egg = require('egg');

async function test() {
  const app = await egg.start({
    baseDir: __dirname,
    mode: 'single',
  });

  const ctx = app.createAnonymousContext();

  const merchants = await ctx.model.AdminUser.findAll({
    where: { role: 1 },
    attributes: [ 'id', 'username', 'role', 'bind_admin_id' ],
    raw: true,
  });

  const allSubs = await ctx.model.AdminUser.findAll({
    where: { role: { [app.Sequelize.Op.ne]: 1 } },
    attributes: [ 'id', 'username', 'role', 'bind_admin_id' ],
    raw: true,
  });

  console.log('商家数据 (role=1):', merchants);
  console.log('所有下级数据 (role!=1):', allSubs);

  const buildTree = parentId => {
    const children = allSubs.filter(sub => String(sub.bind_admin_id) === String(parentId));
    let allChildren = [ ...children ];
    children.forEach(child => {
      const grandChildren = buildTree(child.id);
      allChildren = allChildren.concat(grandChildren);
    });
    return allChildren;
  };

  for (const merchant of merchants) {
    const children = buildTree(merchant.id);
    console.log(`商家 [${merchant.id}] ${merchant.username} 的下级:`, children);
  }

  await app.close();
}

test().catch(console.error);
