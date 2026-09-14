'use strict';

/**
 * 路由配置
 * 采用 BFF 模式：移动端前缀 /api/mobile/，管理端前缀 /api/admin/
 * @param {Egg.Application} app 应用实例
 */
module.exports = app => {
  const { router, controller } = app;

  // 健康检查
  router.get('/', controller.mobile.home.index);

  // ==================== 移动端 BFF ====================

  // 用户相关（公开接口）
  router.post('/api/mobile/users/register', controller.mobile.user.register);
  router.post('/api/mobile/users/login', controller.mobile.user.login);
  router.post('/api/mobile/auth/refresh', controller.common.auth.refresh); // 移动端刷新 Token

  // 商品分类（公开接口）
  router.get('/api/mobile/categories', controller.mobile.category.index);
  router.get('/api/mobile/categories/tree', controller.mobile.category.tree);

  // 商品（只读公开）
  router.get('/api/mobile/products', controller.mobile.product.index);
  router.get('/api/mobile/products/:id', controller.mobile.product.show);

  // 以下接口需要登录鉴权
  const auth = app.middleware.auth();

  // 任务搜索 (需登录，且必须在 /api/mobile/tasks/:id 之前定义以免被拦截)
  router.get('/api/mobile/tasks/search', auth, controller.mobile.task.search);

  // 任务（只读公开）
  router.get('/api/mobile/tasks', controller.mobile.task.index);
  router.get('/api/mobile/tasks/:id', controller.mobile.task.show);

  // 轮播图（只读公开）
  router.get('/api/mobile/banners', controller.mobile.banner.index);

  // 公告（只读公开）
  router.get('/api/mobile/notices', controller.mobile.notice.index);

  // 客服（只读公开）
  router.get('/api/mobile/customer-services', controller.mobile.customerService.index);

  // 规则（只读公开）
  router.get('/api/mobile/rules', controller.mobile.rule.index);

  // 充值方式列表（公开）
  // router.get('/api/mobile/recharge-ways', controller.mobile.rechargeWay.index);

  // 提现方式列表（公开）
  router.get('/api/mobile/withdraw-ways', controller.mobile.withdrawWay.index);

  // 当前用户
  router.get('/api/mobile/users/current', auth, controller.mobile.user.current);
  router.get('/api/mobile/getUserTaskInfo', auth, controller.mobile.task.getUserTaskInfo);
  router.get('/api/mobile/users/invite-code', auth, controller.mobile.user.inviteCode);
  router.put('/api/mobile/users/vip-level', auth, controller.mobile.user.updateVipLevel);
  router.get('/api/mobile/users/balance', auth, controller.mobile.user.balance);
  router.get('/api/mobile/users/logistics-address', auth, controller.mobile.user.logisticsAddress);
  router.put('/api/mobile/users/logistics-address', auth, controller.mobile.user.saveLogisticsAddress);
  router.delete('/api/mobile/users/logistics-address', auth, controller.mobile.user.deleteLogisticsAddress);
  router.post('/api/mobile/users/credential', auth, controller.mobile.user.uploadCredential);
  router.delete('/api/mobile/users/credential', auth, controller.mobile.user.deleteCredential);
  router.get('/api/mobile/users/my-tasks', auth, controller.mobile.user.myTasks);
  router.get('/api/mobile/users/team', auth, controller.mobile.user.team);
  router.get('/api/mobile/users/capital-logs', auth, controller.mobile.user.capitalLogs);
  router.put('/api/mobile/users/password', auth, controller.mobile.user.updatePassword);
  router.put('/api/mobile/users/withdraw-password', auth, controller.mobile.user.updateWithdrawPassword);
  router.put('/api/mobile/users/profile', auth, controller.mobile.user.updateProfile);
  router.post('/api/mobile/users/logout', auth, controller.mobile.user.logout);
  router.get('/api/mobile/getUserRevenue', auth, controller.mobile.user.getUserRevenue);

  // 充值请求
  router.post('/api/mobile/recharges', auth, controller.mobile.recharge.create);
  router.get('/api/mobile/recharges', auth, controller.mobile.recharge.list);
  router.get('/api/mobile/recharge-address', auth, controller.mobile.recharge.address);

  // 提现请求
  router.post('/api/mobile/withdraws', auth, controller.mobile.withdraw.create);
  router.get('/api/mobile/withdraws', auth, controller.mobile.withdraw.list);

  // 购物车
  // router.get('/api/mobile/carts', auth, controller.mobile.cart.index);
  // router.post('/api/mobile/carts', auth, controller.mobile.cart.create);
  // router.put('/api/mobile/carts/:id', auth, controller.mobile.cart.update);
  // router.delete('/api/mobile/carts/:id', auth, controller.mobile.cart.destroy);

  // 收货地址
  router.get('/api/mobile/addresses', auth, controller.mobile.address.index);
  router.post('/api/mobile/addresses', auth, controller.mobile.address.create);
  router.get('/api/mobile/addresses/:id', auth, controller.mobile.address.show);
  router.put('/api/mobile/addresses/:id', auth, controller.mobile.address.update);
  router.delete('/api/mobile/addresses/:id', auth, controller.mobile.address.destroy);
  router.put('/api/mobile/addresses/:id/default', auth, controller.mobile.address.setDefault);

  // 订单
  router.get('/api/mobile/orders', auth, controller.mobile.order.index);
  router.post('/api/mobile/orders', auth, controller.mobile.order.create);
  router.get('/api/mobile/orders/:id', auth, controller.mobile.order.show);
  router.put('/api/mobile/orders/:id/cancel', auth, controller.mobile.order.cancel);
  router.post('/api/mobile/orders/:id/pay', auth, controller.mobile.order.pay);
  router.post('/api/mobile/orderMsg', auth, controller.mobile.order.orderMsg);
  router.post('/api/mobile/finishOrder', auth, controller.mobile.order.finishOrder);

  // 用户返款统计
  router.get('/api/mobile/getUserBackMoney', auth, controller.mobile.backMoney.getUserBackMoney);

  // 文件上传
  router.post('/api/mobile/upload/image', auth, controller.mobile.upload.image);

  // ==================== 管理端 BFF ====================
  const adminAuth = app.middleware.adminOuterAuth();
  const adminRole = app.middleware.adminRole;

  // ==================== 内部系统 (admin-inner) ====================
  const adminInnerAuth = app.middleware.adminInnerAuth();

  router.post('/api/admin-inner/login', controller.adminInner.auth.login);
  router.post('/api/admin-inner/logout', adminInnerAuth, controller.adminInner.auth.logout);
  router.post('/api/admin-inner/auth/refresh', controller.common.auth.refresh);
  router.get('/api/admin-inner/current', adminInnerAuth, controller.adminInner.auth.current);

  // admin-inner 账号资料修改
  router.put('/api/admin-inner/profile', adminInnerAuth, controller.adminInner.auth.updateProfile);
  router.put('/api/admin-inner/profile/updatePwd', adminInnerAuth, controller.adminInner.auth.updatePwd);
  router.post('/api/admin-inner/profile/resetGoogle', adminInnerAuth, controller.adminInner.auth.resetGoogle);

  // 谷歌验证码相关
  router.post('/api/admin-inner/generate-google-auth', controller.adminInner.auth.generateGoogleAuth);
  router.post('/api/admin-inner/bindGoogle', controller.adminInner.auth.bindGoogle);
  router.post('/api/admin-inner/unbindGoogle', adminInnerAuth, controller.adminInner.auth.unbindSelfGoogle);

  // 商家(admin_user)增删改查
  router.get('/api/admin-inner/merchants', adminInnerAuth, controller.adminInner.merchant.index);
  router.get('/api/admin-inner/merchants/all', adminInnerAuth, controller.adminInner.merchant.allMerchants);
  router.get('/api/admin-inner/merchants/:id', adminInnerAuth, controller.adminInner.merchant.show);
  router.get('/api/admin-inner/merchants/:id/statistics', adminInnerAuth, controller.adminInner.merchant.statistics);
  router.get('/api/admin-inner/merchants/:id/roles', adminInnerAuth, controller.adminInner.merchant.roles);
  router.get('/api/admin-inner/merchants/:id/configs', adminInnerAuth, controller.adminInner.config.getStoreConfig);
  router.put('/api/admin-inner/merchants/:id/configs', adminInnerAuth, controller.adminInner.config.updateStoreConfig);
  router.get('/api/admin-inner/merchants/:id/salespersons', adminInnerAuth, controller.adminInner.salesperson.listByMerchant);
  router.post('/api/admin-inner/merchants', adminInnerAuth, controller.adminInner.merchant.create);
  router.put('/api/admin-inner/merchants/:id', adminInnerAuth, controller.adminInner.merchant.update);
  router.delete('/api/admin-inner/merchants/:id', adminInnerAuth, controller.adminInner.merchant.destroy);

  // admin-inner 业务员管理 (根据admin_user表)
  router.get('/api/admin-inner/salesperson/performance', adminInnerAuth, controller.adminInner.salesperson.performance);
  router.get('/api/admin-inner/salespersons', adminInnerAuth, controller.adminInner.salesperson.index);
  router.post('/api/admin-inner/salespersons', adminInnerAuth, controller.adminInner.salesperson.create);
  router.put('/api/admin-inner/salespersons/:id', adminInnerAuth, controller.adminInner.salesperson.update);
  router.delete('/api/admin-inner/salespersons/:id', adminInnerAuth, controller.adminInner.salesperson.destroy);

  // admin-inner 代理商/主管管理 (为了兼容前端调用的operators接口)
  router.post('/api/admin-inner/operators', adminInnerAuth, controller.adminInner.salesperson.create);
  router.put('/api/admin-inner/operators/:id', adminInnerAuth, controller.adminInner.salesperson.update);
  router.delete('/api/admin-inner/operators/:id', adminInnerAuth, controller.adminInner.salesperson.destroy);

  // admin-inner 公告管理 (全平台公告，不隔离店铺)
  router.get('/api/admin-inner/notices', adminInnerAuth, controller.adminInner.notice.index);
  router.get('/api/admin-inner/notices/:id', adminInnerAuth, controller.adminInner.notice.show);
  router.post('/api/admin-inner/notices', adminInnerAuth, controller.adminInner.notice.create);
  router.put('/api/admin-inner/notices/:id', adminInnerAuth, controller.adminInner.notice.update);
  router.delete('/api/admin-inner/notices/:id', adminInnerAuth, controller.adminInner.notice.destroy);

  // admin-inner 规则管理 (全平台规则，不隔离店铺)
  router.get('/api/admin-inner/rules', adminInnerAuth, controller.adminInner.rule.adminGet);
  router.post('/api/admin-inner/rules', adminInnerAuth, controller.adminInner.rule.create);
  router.put('/api/admin-inner/rules', adminInnerAuth, controller.adminInner.rule.update);
  router.delete('/api/admin-inner/rules', adminInnerAuth, controller.adminInner.rule.destroy);

  // admin-inner 轮播图管理 (全平台轮播，不隔离店铺)
  router.get('/api/admin-inner/banners', adminInnerAuth, controller.adminInner.banner.adminList);
  router.post('/api/admin-inner/banners', adminInnerAuth, controller.adminInner.banner.create);
  router.put('/api/admin-inner/banners/:id', adminInnerAuth, controller.adminInner.banner.update);
  router.delete('/api/admin-inner/banners/:id', adminInnerAuth, controller.adminInner.banner.destroy);

  // admin-inner 客服管理 (全平台客服，不隔离店铺)
  router.get('/api/admin-inner/customer-services', adminInnerAuth, controller.adminInner.customerService.adminList);
  router.post('/api/admin-inner/customer-services', adminInnerAuth, controller.adminInner.customerService.create);
  router.put('/api/admin-inner/customer-services/:id', adminInnerAuth, controller.adminInner.customerService.update);
  router.delete('/api/admin-inner/customer-services/:id', adminInnerAuth, controller.adminInner.customerService.destroy);

  // admin-inner 首页商品管理 (全平台商品)
  router.get('/api/admin-inner/products', adminInnerAuth, controller.adminInner.product.adminList);
  router.post('/api/admin-inner/products', adminInnerAuth, controller.adminInner.product.create);
  router.put('/api/admin-inner/products/:id', adminInnerAuth, controller.adminInner.product.update);
  router.delete('/api/admin-inner/products/:id', adminInnerAuth, controller.adminInner.product.destroy);

  // admin-inner 任务商品管理 (全平台任务商品)
  router.get('/api/admin-inner/tasks', adminInnerAuth, controller.adminInner.task.adminList);
  router.post('/api/admin-inner/tasks', adminInnerAuth, controller.adminInner.task.create);
  router.put('/api/admin-inner/tasks/:id', adminInnerAuth, controller.adminInner.task.update);
  router.delete('/api/admin-inner/tasks/:id', adminInnerAuth, controller.adminInner.task.destroy);

  // admin-inner 文件上传
  router.post('/api/admin-inner/upload/image', adminInnerAuth, controller.adminInner.upload.image);

  // admin-inner 操作日志管理
  router.get('/api/admin-inner/operation-logs', adminInnerAuth, controller.adminInner.operationLog.index);
  router.delete('/api/admin-inner/operation-logs/batch', adminInnerAuth, controller.adminInner.operationLog.batchDestroy);
  router.delete('/api/admin-inner/operation-logs/clear', adminInnerAuth, controller.adminInner.operationLog.clear);

  // admin-inner 登录日志管理
  router.get('/api/admin-inner/login-logs', adminInnerAuth, controller.adminInner.loginLog.index);
  router.delete('/api/admin-inner/login-logs/batch', adminInnerAuth, controller.adminInner.loginLog.batchDestroy);
  router.delete('/api/admin-inner/login-logs/clear', adminInnerAuth, controller.adminInner.loginLog.clear);

  // 管理端公开接口
  router.post('/api/admin/login', controller.admin.adminUser.login);
  router.post('/api/admin/auth/refresh', controller.common.auth.refresh); // 管理端刷新 Token
  router.post('/api/admin/generate-google-auth', controller.admin.adminUser.generateGoogleAuth);
  router.post('/api/admin/bindGoogle', controller.admin.adminUser.bindGoogle);

  // 以下接口需要管理系统登录鉴权
  router.post('/api/admin/logout', adminAuth, controller.admin.adminUser.logout);

  // 个人中心相关
  router.get('/api/admin/system/user/profile', adminAuth, controller.admin.adminUser.profile);
  router.put('/api/admin/system/user/profile', adminAuth, controller.admin.adminUser.updateProfile);
  router.put('/api/admin/system/user/profile/updatePwd', adminAuth, controller.admin.adminUser.updatePwd);
  router.post('/api/admin/unbindGoogle', adminAuth, controller.admin.adminUser.unbindSelfGoogle);

  router.get('/api/admin/menus', adminAuth, controller.admin.adminUser.menus);
  router.get('/api/admin/getInfo', adminAuth, controller.admin.adminUser.getInfo);
  router.get('/api/admin/getRouters', adminAuth, controller.admin.adminUser.getRouters);
  router.get('/api/admin/current', adminAuth, controller.admin.adminUser.current);
  router.get('/api/admin/dashboard/stats', adminAuth, controller.admin.adminDashboard.stats);
  router.get('/api/admin/login-logs', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.adminUser.loginLogs);
  router.delete('/api/admin/login-logs/batch', adminAuth, adminRole([ 1 ]), controller.admin.adminUser.batchDestroyLoginLogs);
  router.delete('/api/admin/login-logs/clear', adminAuth, adminRole([ 1 ]), controller.admin.adminUser.clearLoginLogs);

  // 管理员账号管理（管理员和主管可管理，业务员无权限）
  router.get('/api/admin/users', adminAuth, adminRole([ 1, 2 ]), controller.admin.adminUser.index);
  router.get('/api/admin/users/:id', adminAuth, adminRole([ 1, 2 ]), controller.admin.adminUser.show);
  router.post('/api/admin/users', adminAuth, adminRole([ 1, 2 ]), controller.admin.adminUser.create);
  router.put('/api/admin/users/:id', adminAuth, adminRole([ 1, 2 ]), controller.admin.adminUser.update);
  router.delete('/api/admin/users/:id', adminAuth, adminRole([ 1, 2 ]), controller.admin.adminUser.destroy);
  router.post('/api/admin/users/:id/reset-google-auth', adminAuth, adminRole([ 1, 2 ]), controller.admin.adminUser.resetGoogleAuth);
  router.post('/api/admin/users/:id/reset-password', adminAuth, adminRole([ 1, 2 ]), controller.admin.adminUser.resetPassword);

  // 业务员管理（管理员和主管可管理，业务员无权限）
  router.get('/api/admin/salespersons', adminAuth, adminRole([ 1, 2 ]), controller.admin.salesperson.index);
  router.get('/api/admin/salespersons/:id', adminAuth, adminRole([ 1, 2 ]), controller.admin.salesperson.show);
  router.post('/api/admin/salespersons', adminAuth, adminRole([ 1, 2 ]), controller.admin.salesperson.create);
  router.put('/api/admin/salespersons/:id', adminAuth, adminRole([ 1, 2 ]), controller.admin.salesperson.update);
  router.delete('/api/admin/salespersons/:id', adminAuth, adminRole([ 1, 2 ]), controller.admin.salesperson.destroy);
  router.post('/api/admin/salespersons/batch-delete', adminAuth, adminRole([ 1, 2 ]), controller.admin.salesperson.destroyBatch);
  router.post('/api/admin/salespersons/:id/reset-password', adminAuth, adminRole([ 1, 2 ]), controller.admin.salesperson.resetPassword);

  // 菜单管理
  router.get('/api/admin/system/menu/getAllMenuTree', adminAuth, adminRole([ 1, 2 ]), controller.admin.menu.getAllMenuTree);
  router.post('/api/admin/system/menu', adminAuth, adminRole([ 1, 2 ]), controller.admin.menu.create);
  router.put('/api/admin/system/menu/:id', adminAuth, adminRole([ 1, 2 ]), controller.admin.menu.update);
  router.delete('/api/admin/system/menu/:id', adminAuth, adminRole([ 1, 2 ]), controller.admin.menu.destroy);

  // 角色管理 (RESTful CRUD)
  router.get('/api/admin/system/role/getRoleMenuIds', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.roles.getRoleMenuIds);
  router.get('/api/admin/role', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.roles.index);
  router.get('/api/admin/role/:id', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.roles.show);
  router.post('/api/admin/role', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.roles.create);
  router.put('/api/admin/role/:id', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.roles.update);
  router.delete('/api/admin/role/:id', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.roles.destroy);

  // 会员管理（管理员、主管、业务员均可访问）
  router.get('/api/admin/members', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.member.index);

  // VIP管理 (管理员、主管可访问)
  router.get('/api/admin/vips', adminAuth, adminRole([ 1, 2 ]), controller.admin.vip.index);
  router.get('/api/admin/vips/:id', adminAuth, adminRole([ 1, 2 ]), controller.admin.vip.show);
  router.post('/api/admin/vips', adminAuth, adminRole([ 1, 2 ]), controller.admin.vip.create);
  router.put('/api/admin/vips/:id', adminAuth, adminRole([ 1, 2 ]), controller.admin.vip.update);
  router.delete('/api/admin/vips/:id', adminAuth, adminRole([ 1, 2 ]), controller.admin.vip.destroy);

  router.get('/api/admin/members/statistics', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.member.statistics);
  router.put('/api/admin/members/:id/remark', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.member.updateRemark);
  router.put('/api/admin/members/:id/status', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.member.updateStatus);
  router.put('/api/admin/members/:id/vip-level', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.member.updateVipLevel);
  router.get('/api/admin/members/:id/fund-details', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.member.fundDetails);
  router.post('/api/admin/members/:id/reset-password', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.member.resetPassword);
  router.post('/api/admin/members/:id/reset-withdraw-password', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.member.resetWithdrawPassword);
  router.get('/api/admin/members/:id/active-logs', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.member.activeLogs);

  // 管理端-修改用户提现地址 (管理员、主管、业务员均可访问)
  router.post('/api/admin/ModifyUserWithdrawalAddress', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.member.modifyWithdrawalAddress);

  // 会员资金操作（管理员、主管可操作，需要 googleCode 验证）
  router.post('/api/admin/members/add-balance', adminAuth, controller.admin.member.addBalance);
  router.post('/api/admin/members/deduct-balance', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.member.deductBalance);

  // 用户凭证管理（管理员和主管可操作）
  router.get('/api/admin/user-credentials', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.userCredential.index);
  router.delete('/api/admin/user-credentials/:id', adminAuth, adminRole([ 1, 2 ]), controller.admin.userCredential.destroy);
  router.post('/api/admin/user-credentials/:id/audit-success', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.userCredential.auditSuccess);
  router.post('/api/admin/user-credentials/:id/audit-fail', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.userCredential.auditFail);

  // 订单管理（管理员、主管、业务员均可访问）
  router.get('/api/admin/orders', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.order.index);
  router.delete('/api/admin/orders/:id', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.order.destroy);

  // 充值明细管理（管理员、主管、业务员均可访问）
  router.get('/api/admin/recharges', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.recharge.index);
  router.post('/api/admin/recharges', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.recharge.create);
  router.put('/api/admin/recharges/:id', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.recharge.update);
  router.delete('/api/admin/recharges/:id', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.recharge.destroy);

  // 充值请求管理（管理员、主管、业务员均可访问）
  router.get('/api/admin/recharge-requests', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.rechargeRequest.index);
  router.post('/api/admin/recharge-requests/audit-success', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.rechargeRequest.auditSuccess);
  router.post('/api/admin/recharge-requests/audit-fail', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.rechargeRequest.auditFail);

  // 提现管理（管理员、主管、业务员均可访问）
  router.get('/api/admin/withdraws', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.withdraw.index);
  router.post('/api/admin/withdraws/audit-success', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.withdraw.auditSuccess);
  router.post('/api/admin/withdraws/audit-fail', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.withdraw.auditFail);

  // 提现方式管理（管理员、主管、业务员均可访问）
  router.get('/api/admin/withdraw-ways', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.withdrawWay.index);
  router.post('/api/admin/withdraw-ways', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.withdrawWay.create);
  router.put('/api/admin/withdraw-ways/:id', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.withdrawWay.update);
  router.delete('/api/admin/withdraw-ways/:id', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.withdrawWay.destroy);

  // 提现参数配置（仅管理员可操作）
  router.get('/api/admin/withdraw-config', adminAuth, adminRole([ 1 ]), controller.admin.withdrawConfig.get);
  router.get('/api/admin/withdraw-config/detail', adminAuth, adminRole([ 1 ]), controller.admin.withdrawConfig.adminGet);
  router.put('/api/admin/withdraw-config', adminAuth, adminRole([ 1 ]), controller.admin.withdrawConfig.update);

  // 充值方式管理（管理员、主管、业务员均可访问）
  router.get('/api/admin/recharge-ways', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.rechargeWay.index);
  router.post('/api/admin/recharge-ways', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.rechargeWay.create);
  router.put('/api/admin/recharge-ways/:id', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.rechargeWay.update);
  router.delete('/api/admin/recharge-ways/:id', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.rechargeWay.destroy);

  // 业务统计（管理员、主管、业务员均可访问）
  router.get('/api/admin/stats/recharge', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.stats.recharge);
  router.get('/api/admin/stats/withdraw', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.stats.withdraw);

  // 操作日志管理（列表：管理员、主管、业务员均可访问；删除/清空：仅管理员）
  router.get('/api/admin/operation-logs', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.operationLog.index);
  router.delete('/api/admin/operation-logs/batch', adminAuth, adminRole([ 1 ]), controller.admin.operationLog.batchDestroy);
  router.delete('/api/admin/operation-logs/clear', adminAuth, adminRole([ 1 ]), controller.admin.operationLog.clear);

  // 策略管理（管理员、主管、业务员均可访问）
  router.get('/api/admin/strategies', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.strategy.index);
  router.get('/api/admin/getUserPolicy', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.strategy.getUserPolicy);
  router.post('/api/admin/bindUserPolicy', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.strategy.bindUserPolicy);
  router.post('/api/admin/startUserTask', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.strategy.startUserTask);
  router.get('/api/admin/getUserTaskStatus', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.strategy.getUserTaskStatus);
  router.get('/api/admin/strategies/:id', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.strategy.show);
  router.post('/api/admin/strategies', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.strategy.create);
  router.put('/api/admin/strategies/:id', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.strategy.update);
  router.delete('/api/admin/strategies/:id', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.strategy.destroy);
  router.put('/api/admin/strategies/:id/rules/:ruleModelId', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.strategy.updateRule);

  // 权限树与角色权限分配（仅管理员可操作）
  router.get('/api/admin/permissions/tree', adminAuth, adminRole([ 1 ]), controller.admin.permission.tree);
  router.get('/api/admin/permissions', adminAuth, adminRole([ 1 ]), controller.admin.permission.index);
  router.post('/api/admin/permissions', adminAuth, adminRole([ 1 ]), controller.admin.permission.create);
  router.put('/api/admin/permissions/:id', adminAuth, adminRole([ 1 ]), controller.admin.permission.update);
  router.delete('/api/admin/permissions/:id', adminAuth, adminRole([ 1 ]), controller.admin.permission.destroy);
  router.get('/api/admin/roles/:role/permissions', adminAuth, adminRole([ 1 ]), controller.admin.permission.rolePermissions);
  router.put('/api/admin/roles/:role/permissions', adminAuth, adminRole([ 1 ]), controller.admin.permission.assignRolePermissions);

  // 商城管理相关接口（仅管理员可操作）
  router.get('/api/admin/notices', adminAuth, adminRole([ 1 ]), controller.admin.notice.adminList);
  router.post('/api/admin/notices', adminAuth, adminRole([ 1 ]), controller.admin.notice.create);
  router.put('/api/admin/notices/:id', adminAuth, adminRole([ 1 ]), controller.admin.notice.update);
  router.delete('/api/admin/notices/:id', adminAuth, adminRole([ 1 ]), controller.admin.notice.destroy);

  router.get('/api/admin/rules', adminAuth, adminRole([ 1 ]), controller.admin.rule.adminGet);
  router.post('/api/admin/rules', adminAuth, adminRole([ 1 ]), controller.admin.rule.create);
  router.put('/api/admin/rules', adminAuth, adminRole([ 1 ]), controller.admin.rule.update);
  router.delete('/api/admin/rules', adminAuth, adminRole([ 1 ]), controller.admin.rule.destroy);

  // 系统配置管理
  router.get('/api/admin/sys-config/getDaiMoneyConfig', adminAuth, adminRole([ 1 ]), controller.admin.sysConfig.getDaiMoneyConfig);
  router.put('/api/admin/sys-config/updateConfig', adminAuth, adminRole([ 1 ]), controller.admin.sysConfig.updateConfig);

  // 管理端文件上传
  router.post('/api/admin/upload/image', adminAuth, adminRole([ 1, 2, 3 ]), controller.admin.upload.image);
};

