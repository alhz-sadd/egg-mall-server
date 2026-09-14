const fs = require('fs');
const path = require('path');

const routerPath = path.join(__dirname, 'app/router.js');
let routerContent = fs.readFileSync(routerPath, 'utf-8');

const missingInnerRoutes = `
  // admin-inner 系统菜单
  router.get('/api/admin-inner/system/menu', adminInnerAuth, controller.adminInner.sysMenu.index);
  router.get('/api/admin-inner/system/menu/:id', adminInnerAuth, controller.adminInner.sysMenu.show);
  router.post('/api/admin-inner/system/menu', adminInnerAuth, controller.adminInner.sysMenu.create);
  router.put('/api/admin-inner/system/menu/:id', adminInnerAuth, controller.adminInner.sysMenu.update);
  router.delete('/api/admin-inner/system/menu/:id', adminInnerAuth, controller.adminInner.sysMenu.destroy);
  // 兼容前端的POST删除
  router.post('/api/admin-inner/system/menu/delete', adminInnerAuth, controller.adminInner.sysMenu.destroy);

  // admin-inner 系统角色
  router.get('/api/admin-inner/system/role', adminInnerAuth, controller.adminInner.sysRole.index);
  router.post('/api/admin-inner/system/role', adminInnerAuth, controller.adminInner.sysRole.create);
  router.put('/api/admin-inner/system/role/:id', adminInnerAuth, controller.adminInner.sysRole.update);
  router.delete('/api/admin-inner/system/role/:id', adminInnerAuth, controller.adminInner.sysRole.destroy);
  router.get('/api/admin-inner/system/role/:id/menus', adminInnerAuth, controller.adminInner.sysRole.getRoleMenus);
  router.put('/api/admin-inner/system/role/:id/menus', adminInnerAuth, controller.adminInner.sysRole.updateRoleMenus);

  // admin-inner 商品
  router.get('/api/admin-inner/goods', adminInnerAuth, controller.adminInner.goods.index);
  router.get('/api/admin-inner/goods/:id', adminInnerAuth, controller.adminInner.goods.show);
  router.post('/api/admin-inner/goods', adminInnerAuth, controller.adminInner.goods.create);
  router.put('/api/admin-inner/goods/:id', adminInnerAuth, controller.adminInner.goods.update);
  router.delete('/api/admin-inner/goods/:id', adminInnerAuth, controller.adminInner.goods.destroy);

  // admin-inner 员工
  router.get('/api/admin-inner/employees', adminInnerAuth, controller.adminInner.employee.index);
  router.get('/api/admin-inner/employees/:id', adminInnerAuth, controller.adminInner.employee.show);
  router.post('/api/admin-inner/employees', adminInnerAuth, controller.adminInner.employee.create);
  router.put('/api/admin-inner/employees/:id', adminInnerAuth, controller.adminInner.employee.update);
  router.delete('/api/admin-inner/employees/:id', adminInnerAuth, controller.adminInner.employee.destroy);
  router.get('/api/admin-inner/employees/:id/customers', adminInnerAuth, controller.adminInner.employee.listCustomers);
  router.get('/api/admin-inner/employees/:id/performance', adminInnerAuth, controller.adminInner.employee.performance);

  // admin-inner 客户
  router.get('/api/admin-inner/customers/active-info', adminInnerAuth, controller.adminInner.customer.activeInfo);
  router.get('/api/admin-inner/customers/:customerUserId/login-logs', adminInnerAuth, controller.adminInner.customer.loginLogList);

  // admin-inner 支付通道
  router.get('/api/admin-inner/pay-channels', adminInnerAuth, controller.adminInner.shopPayChannel.index);
  router.post('/api/admin-inner/pay-channels', adminInnerAuth, controller.adminInner.shopPayChannel.create);
  router.put('/api/admin-inner/pay-channels/:id', adminInnerAuth, controller.adminInner.shopPayChannel.update);
  router.delete('/api/admin-inner/pay-channels/:id', adminInnerAuth, controller.adminInner.shopPayChannel.destroy);

  // admin-inner H5配置
  router.get('/api/admin-inner/h5-config/banners', adminInnerAuth, controller.adminInner.h5Config.bannerList);
  router.post('/api/admin-inner/h5-config/banners', adminInnerAuth, controller.adminInner.h5Config.bannerAdd);
  router.put('/api/admin-inner/h5-config/banners/:id', adminInnerAuth, controller.adminInner.h5Config.bannerEdit);
  router.delete('/api/admin-inner/h5-config/banners/:id', adminInnerAuth, controller.adminInner.h5Config.bannerRemove);
  
  router.get('/api/admin-inner/h5-config/notices', adminInnerAuth, controller.adminInner.h5Config.noticeList);
  router.post('/api/admin-inner/h5-config/notices', adminInnerAuth, controller.adminInner.h5Config.noticeAdd);
  router.put('/api/admin-inner/h5-config/notices/:id', adminInnerAuth, controller.adminInner.h5Config.noticeEdit);
  router.delete('/api/admin-inner/h5-config/notices/:id', adminInnerAuth, controller.adminInner.h5Config.noticeRemove);

  router.get('/api/admin-inner/h5-config/rules', adminInnerAuth, controller.adminInner.h5Config.ruleList);
  router.post('/api/admin-inner/h5-config/rules', adminInnerAuth, controller.adminInner.h5Config.ruleAdd);
  router.put('/api/admin-inner/h5-config/rules/:id', adminInnerAuth, controller.adminInner.h5Config.ruleEdit);
  router.delete('/api/admin-inner/h5-config/rules/:id', adminInnerAuth, controller.adminInner.h5Config.ruleRemove);

  router.get('/api/admin-inner/h5-config/service-entries', adminInnerAuth, controller.adminInner.h5Config.serviceEntryList);
  router.post('/api/admin-inner/h5-config/service-entries', adminInnerAuth, controller.adminInner.h5Config.serviceEntryAdd);
  router.put('/api/admin-inner/h5-config/service-entries/:id', adminInnerAuth, controller.adminInner.h5Config.serviceEntryEdit);
  router.delete('/api/admin-inner/h5-config/service-entries/:id', adminInnerAuth, controller.adminInner.h5Config.serviceEntryRemove);

  // admin-inner H5客服配置
  router.get('/api/admin-inner/h5-services', adminInnerAuth, controller.adminInner.h5Service.list);
  router.post('/api/admin-inner/h5-services', adminInnerAuth, controller.adminInner.h5Service.add);
  router.put('/api/admin-inner/h5-services/:id', adminInnerAuth, controller.adminInner.h5Service.edit);
  router.delete('/api/admin-inner/h5-services/:id', adminInnerAuth, controller.adminInner.h5Service.remove);
`;

const missingOuterRoutes = `
  // admin-outer 客户管理
  router.get('/api/admin-outer/customers', adminOuterAuth, controller.adminOuter.customer.index);
  router.post('/api/admin-outer/customers', adminOuterAuth, controller.adminOuter.customer.create);
  router.put('/api/admin-outer/customers/:id', adminOuterAuth, controller.adminOuter.customer.update);
  router.get('/api/admin-outer/customers/active-info', adminOuterAuth, controller.adminOuter.customer.activeInfo);
  router.get('/api/admin-outer/customers/:customerUserId/login-logs', adminOuterAuth, controller.adminOuter.customer.loginLogList);
  router.get('/api/admin-outer/customers/:customerUserId/relation-tree', adminOuterAuth, controller.adminOuter.customer.relationTree);

  // admin-outer 员工管理
  router.get('/api/admin-outer/employees', adminOuterAuth, controller.adminOuter.employee.index);
  router.get('/api/admin-outer/employees/:id', adminOuterAuth, controller.adminOuter.employee.show);
  router.post('/api/admin-outer/employees', adminOuterAuth, controller.adminOuter.employee.create);
  router.put('/api/admin-outer/employees/:id', adminOuterAuth, controller.adminOuter.employee.update);
  router.delete('/api/admin-outer/employees/:id', adminOuterAuth, controller.adminOuter.employee.destroy);
  router.post('/api/admin-outer/employees/:id/reset-password', adminOuterAuth, controller.adminOuter.employee.resetPassword);

  // admin-outer 支付通道
  router.get('/api/admin-outer/pay-channels', adminOuterAuth, controller.adminOuter.payChannel.index);
  router.post('/api/admin-outer/pay-channels', adminOuterAuth, controller.adminOuter.payChannel.create);
  router.put('/api/admin-outer/pay-channels/:id', adminOuterAuth, controller.adminOuter.payChannel.update);
  router.delete('/api/admin-outer/pay-channels/:id', adminOuterAuth, controller.adminOuter.payChannel.destroy);

  // admin-outer 充值管理
  router.get('/api/admin-outer/recharges', adminOuterAuth, controller.adminOuter.recharge.index);

  // admin-outer 提现管理
  router.get('/api/admin-outer/withdraws', adminOuterAuth, controller.adminOuter.withdraw.index);
  router.post('/api/admin-outer/withdraws/:id/audit-success', adminOuterAuth, controller.adminOuter.withdraw.auditSuccess);
  router.post('/api/admin-outer/withdraws/:id/audit-fail', adminOuterAuth, controller.adminOuter.withdraw.auditFail);

  // admin-outer 店铺信息与设置
  router.get('/api/admin-outer/shop/info', adminOuterAuth, controller.adminOuter.shop.show);
  router.get('/api/admin-outer/shop/settings', adminOuterAuth, controller.adminOuter.shopSetting.show);
  router.put('/api/admin-outer/shop/settings', adminOuterAuth, controller.adminOuter.shopSetting.update);

  // admin-outer 任务管理
  router.get('/api/admin-outer/tasks', adminOuterAuth, controller.adminOuter.task.index);
  router.post('/api/admin-outer/tasks', adminOuterAuth, controller.adminOuter.task.create);
  router.put('/api/admin-outer/tasks/:id', adminOuterAuth, controller.adminOuter.task.update);
  router.delete('/api/admin-outer/tasks/:id', adminOuterAuth, controller.adminOuter.task.destroy);

  // admin-outer 操作日志
  router.get('/api/admin-outer/operation-logs', adminOuterAuth, controller.adminOuter.operationLog.index);
  router.delete('/api/admin-outer/operation-logs/batch', adminOuterAuth, controller.adminOuter.operationLog.batchDestroy);
  router.delete('/api/admin-outer/operation-logs/clear', adminOuterAuth, controller.adminOuter.operationLog.clear);
`;

// Insert admin-outer routes right after admin-outer/current
routerContent = routerContent.replace(
  /router\.get\('\/api\/admin-outer\/current', adminOuterAuth, controller\.adminOuter\.auth\.current\);/,
  "router.get('/api/admin-outer/current', adminOuterAuth, controller.adminOuter.auth.current);\n" + missingOuterRoutes,
);

// Insert admin-inner routes right before admin-outer definition
routerContent = routerContent.replace(
  /\/\/ ==================== B端\/外层管理系统 \(admin-outer\) ====================/,
  missingInnerRoutes + '\n\n  // ==================== B端/外层管理系统 (admin-outer) ====================',
);

fs.writeFileSync(routerPath, routerContent);
console.log('Routes added successfully!');
