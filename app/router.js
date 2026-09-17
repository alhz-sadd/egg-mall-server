'use strict';

/**
 * 路由配置
 * 采用 BFF 模式：移动端前缀 /api/mobile/，管理端前缀 /api/admin-inner/ 或 /api/admin-outer/
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
  router.get('/api/mobile/public/home-products', controller.mobile.product.index);
  // 商品详情（只读公开）
  router.get('/api/mobile/public/home-products/:id', controller.mobile.product.show);

  // 轮播图（只读公开）
  router.get('/api/mobile/public/banners', controller.mobile.banner.index);

  // 公告（只读公开）
  router.get('/api/mobile/public/notices', controller.mobile.notice.index);

  // 客服（只读公开）
  router.get('/api/mobile/public/customer-services', controller.mobile.customerService.index);

  // 规则（只读公开）
  router.get('/api/mobile/public/rules', controller.mobile.rule.index);

  // 充值方式列表（公开）
  // 提现方式列表（公开）
  router.get('/api/mobile/withdraw-ways', controller.mobile.withdrawWay.index);

  // 以下接口需要登录鉴权
  const auth = app.middleware.auth();

  // 当前用户
  router.get('/api/mobile/users/current', auth, controller.mobile.user.current);
  router.get('/api/mobile/vip-levels', auth, controller.mobile.vipLevel.index);
  router.get('/api/mobile/getUserTaskInfo', auth, controller.mobile.task.getUserTaskInfo);
  router.get('/api/mobile/invite/info', auth, controller.mobile.invite.info);
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
  router.get('/api/mobile/users/receipt', auth, controller.mobile.user.getReceipt); // 新增：获取收货信息
  router.put('/api/mobile/users/receipt', auth, controller.mobile.user.updateReceipt); // 新增：更新收货信息
  router.get('/api/mobile/users/receipt-info', auth, controller.mobile.user.getReceiptInfo);
  router.put('/api/mobile/users/receipt-info', auth, controller.mobile.user.updateReceiptInfo);
  router.put('/api/mobile/users/password', auth, controller.mobile.user.updatePassword);
  router.put('/api/mobile/users/withdraw-password', auth, controller.mobile.user.updateWithdrawPassword);
  router.put('/api/mobile/users/profile', auth, controller.mobile.user.updateProfile);
  router.post('/api/mobile/users/logout', auth, controller.mobile.user.logout);
  router.get('/api/mobile/getUserRevenue', auth, controller.mobile.user.getUserRevenue);

  // 实名认证
  router.get('/api/mobile/users/identity', auth, controller.mobile.userIdentity.show);
  router.post('/api/mobile/users/identity', auth, controller.mobile.userIdentity.create);

  // 充值请求
  router.post('/api/mobile/recharge/submit', auth, controller.mobile.recharge.create);
  router.get('/api/mobile/recharges', auth, controller.mobile.recharge.list);
  router.get('/api/mobile/recharge/sales-address', auth, controller.mobile.recharge.address);

  // 提现请求
  router.post('/api/mobile/withdraw/submit', auth, controller.mobile.withdraw.create);
  router.get('/api/mobile/withdraw/list', auth, controller.mobile.withdraw.list);
  router.get('/api/mobile/withdraw/config', auth, controller.mobile.withdraw.getConfig);

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

  // C端 充提渠道获取
  router.get('/api/mobile/pay-channels', auth, controller.mobile.payChannel.list);
  
  // 业务员默认充值地址获取 (C端)
  router.get('/api/mobile/sales-address/default', auth, controller.mobile.salesRechargeAddress.getDefaultAddress);

  // === C端(Mobile) 任务相关 ===
  router.get('/api/mobile/tasks/search', auth, controller.mobile.task.search); // 搜索/获取可接任务
  router.get('/api/mobile/tasks/:id', auth, controller.mobile.task.show); // 获取任务详情
  router.get('/api/mobile/tasks', auth, controller.mobile.task.index); // 任务列表

  // ==================== 管理端 BFF ====================

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
  router.post('/api/admin-inner/totp/unbind', adminInnerAuth, controller.adminInner.auth.unbindGoogle);

  // 谷歌验证码相关 (A端)
  router.post('/api/admin-inner/totp/verify-password', controller.adminInner.auth.verifyPasswordForBind);
  router.post('/api/admin-inner/totp/bind-init', controller.adminInner.auth.bindInit);
  router.post('/api/admin-inner/totp/bind-confirm', controller.adminInner.auth.bindConfirm);
  router.post('/api/admin-inner/totp/login-verify', controller.adminInner.auth.loginVerify);

  // admin-inner 给其他用户修改密码和重置谷歌
  router.put('/api/admin-inner/users/reset-pwd', adminInnerAuth, controller.adminInner.auth.resetUserPwd);
  router.put('/api/admin-inner/users/reset-google', adminInnerAuth, controller.adminInner.auth.resetUserGoogle);

  // admin-inner VIP 等级管理
  router.get('/api/admin-inner/vip-levels', adminInnerAuth, controller.adminInner.vipLevel.index);
  router.get('/api/admin-inner/shop-vip-levels', adminInnerAuth, controller.adminInner.vipLevel.index);
  router.post('/api/admin-inner/vip-levels', adminInnerAuth, controller.adminInner.vipLevel.create);
  router.post('/api/admin-inner/shop-vip-levels', adminInnerAuth, controller.adminInner.vipLevel.create);
  router.put('/api/admin-inner/vip-levels/:id', adminInnerAuth, controller.adminInner.vipLevel.update);
  router.put('/api/admin-inner/shop-vip-levels/:id', adminInnerAuth, controller.adminInner.vipLevel.update);
  router.delete('/api/admin-inner/vip-levels/:id', adminInnerAuth, controller.adminInner.vipLevel.destroy);
  router.delete('/api/admin-inner/shop-vip-levels/:id', adminInnerAuth, controller.adminInner.vipLevel.destroy);
  router.post('/api/admin-inner/vip-levels/bind-shop', adminInnerAuth, controller.adminInner.vipLevel.bindShop);
  router.post('/api/admin-inner/shop-vip-levels/bind-shop', adminInnerAuth, controller.adminInner.vipLevel.bindShop);


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

  // admin-inner 店铺管理
  router.get('/api/admin-inner/shops/all', adminInnerAuth, controller.adminInner.shop.all);
  router.get('/api/admin-inner/shops', adminInnerAuth, controller.adminInner.shop.index);
  router.get('/api/admin-inner/shops/:id', adminInnerAuth, controller.adminInner.shop.show);
  router.get('/api/admin-inner/shops/:shop_id/setting', adminInnerAuth, controller.adminInner.shop.getSetting);
  router.put('/api/admin-inner/shops/:shop_id/setting', adminInnerAuth, controller.adminInner.shop.updateSetting);
  router.put('/api/admin-inner/shops/:shop_id/config', adminInnerAuth, controller.adminInner.config.updateShopConfig);

  // admin-inner 系统基础参数
  router.get('/api/admin-inner/system/config', adminInnerAuth, controller.adminInner.config.getGlobalConfig);
  router.put('/api/admin-inner/system/config', adminInnerAuth, controller.adminInner.config.updateGlobalConfig);

  // admin-inner 业务员管理 (根据admin_user表)
  router.get('/api/admin-inner/salespersons', adminInnerAuth, controller.adminInner.salesperson.index);
  router.post('/api/admin-inner/salespersons', adminInnerAuth, controller.adminInner.salesperson.create);
  router.put('/api/admin-inner/salespersons/:id', adminInnerAuth, controller.adminInner.salesperson.update);
  router.delete('/api/admin-inner/salespersons/:id', adminInnerAuth, controller.adminInner.salesperson.destroy);

  // admin-inner 代理商/主管管理 (为了兼容前端调用的operators接口)
  router.post('/api/admin-inner/operators', adminInnerAuth, controller.adminInner.salesperson.create);
  router.put('/api/admin-inner/operators/:id', adminInnerAuth, controller.adminInner.salesperson.update);
  router.delete('/api/admin-inner/operators/:id', adminInnerAuth, controller.adminInner.salesperson.destroy);

  // admin-inner 公告管理 (全平台公告，不隔离店铺)
  router.get('/api/admin-inner/notices', adminInnerAuth, controller.adminInner.h5Config.noticeList);
  router.get('/api/admin-inner/notices/:id', adminInnerAuth, controller.adminInner.h5Config.noticeList); // show logic handled by list or similar
  router.post('/api/admin-inner/notices', adminInnerAuth, controller.adminInner.h5Config.noticeAdd);
  router.put('/api/admin-inner/notices/:id', adminInnerAuth, controller.adminInner.h5Config.noticeEdit);
  router.delete('/api/admin-inner/notices/:id', adminInnerAuth, controller.adminInner.h5Config.noticeRemove);

  // admin-inner 轮播图管理 (全平台轮播，不隔离店铺)
  router.get('/api/admin-inner/banners', adminInnerAuth, controller.adminInner.h5Config.bannerList);
  router.post('/api/admin-inner/banners', adminInnerAuth, controller.adminInner.h5Config.bannerAdd);
  router.put('/api/admin-inner/banners/:id', adminInnerAuth, controller.adminInner.h5Config.bannerEdit);
  router.delete('/api/admin-inner/banners/:id', adminInnerAuth, controller.adminInner.h5Config.bannerRemove);

  // admin-inner 客服管理 (全平台客服，不隔离店铺)
  router.get('/api/admin-inner/customer-services', adminInnerAuth, controller.adminInner.h5Service.list);
  router.post('/api/admin-inner/customer-services', adminInnerAuth, controller.adminInner.h5Service.add);
  router.put('/api/admin-inner/customer-services/:id', adminInnerAuth, controller.adminInner.h5Service.edit);
  router.delete('/api/admin-inner/customer-services/:id', adminInnerAuth, controller.adminInner.h5Service.remove);

  // admin-inner 首页商品管理 (全平台商品)
  router.get('/api/admin-inner/products', adminInnerAuth, controller.adminInner.goods.index);
  router.post('/api/admin-inner/products', adminInnerAuth, controller.adminInner.goods.create);
  router.put('/api/admin-inner/products/:id', adminInnerAuth, controller.adminInner.goods.update);
  router.delete('/api/admin-inner/products/:id', adminInnerAuth, controller.adminInner.goods.destroy);

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


  // admin-inner 系统菜单
  router.get('/api/admin-inner/system/menu', adminInnerAuth, controller.adminInner.sysMenu.index);
  router.get('/api/admin-inner/system/menu/:id', adminInnerAuth, controller.adminInner.sysMenu.show);
  router.post('/api/admin-inner/system/menu', adminInnerAuth, controller.adminInner.sysMenu.create);
  router.put('/api/admin-inner/system/menu/:id', adminInnerAuth, controller.adminInner.sysMenu.update);
  router.delete('/api/admin-inner/system/menu/:id', adminInnerAuth, controller.adminInner.sysMenu.destroy);
  router.post('/api/admin-inner/system/menu/delete', adminInnerAuth, controller.adminInner.sysMenu.destroy);

  // admin-inner 仪表盘
  router.get('/api/admin-inner/dashboard/stats', adminInnerAuth, controller.adminInner.dashboard.stats);

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
  router.put('/api/admin-inner/customers/:id/withdraw-password', adminInnerAuth, controller.adminInner.customer.updateWithdrawPassword);
  router.get('/api/admin-inner/customers/:customerUserId/login-log/list', adminInnerAuth, controller.adminInner.customer.loginLogList);
  router.get('/api/admin-inner/customers/:customerUserId/relation-tree', adminInnerAuth, controller.adminInner.customer.relationTree);
  router.get('/api/admin-inner/customers/:id/fund-details', adminInnerAuth, controller.adminInner.customer.fundDetails);

  // admin-inner H5配置
  router.get('/api/admin-inner/h5-config/banners', adminInnerAuth, controller.adminInner.h5Config.bannerList);
  router.post('/api/admin-inner/h5-config/banners', adminInnerAuth, controller.adminInner.h5Config.bannerAdd);
  router.put('/api/admin-inner/h5-config/banners/:id', adminInnerAuth, controller.adminInner.h5Config.bannerEdit);
  router.delete('/api/admin-inner/h5-config/banners/:id', adminInnerAuth, controller.adminInner.h5Config.bannerRemove);

  router.get('/api/admin-inner/h5-config/notices', adminInnerAuth, controller.adminInner.h5Config.noticeList);
  router.post('/api/admin-inner/h5-config/notices', adminInnerAuth, controller.adminInner.h5Config.noticeAdd);
  router.put('/api/admin-inner/h5-config/notices/:id', adminInnerAuth, controller.adminInner.h5Config.noticeEdit);
  router.delete('/api/admin-inner/h5-config/notices/:id', adminInnerAuth, controller.adminInner.h5Config.noticeRemove);

  router.get('/api/admin-inner/h5-config/rules', adminInnerAuth, controller.adminInner.rule.adminGet);
  router.post('/api/admin-inner/h5-config/rules', adminInnerAuth, controller.adminInner.rule.create);
  router.put('/api/admin-inner/h5-config/rules/:id', adminInnerAuth, controller.adminInner.rule.update);
  router.put('/api/admin-inner/h5-config/rules/:id/status', adminInnerAuth, controller.adminInner.rule.updateStatus);
  router.put('/api/admin-inner/h5-config/rules', adminInnerAuth, controller.adminInner.rule.update); // 兼容不带id的调用
  router.delete('/api/admin-inner/h5-config/rules/:id', adminInnerAuth, controller.adminInner.rule.destroy);
  router.delete('/api/admin-inner/h5-config/rules', adminInnerAuth, controller.adminInner.rule.destroy); // 兼容不带id的调用

  router.get('/api/admin-inner/h5-config/service-entries', adminInnerAuth, controller.adminInner.h5Config.serviceEntryList);
  router.post('/api/admin-inner/h5-config/service-entries', adminInnerAuth, controller.adminInner.h5Config.serviceEntryAdd);
  router.put('/api/admin-inner/h5-config/service-entries/:id', adminInnerAuth, controller.adminInner.h5Config.serviceEntryEdit);
  router.delete('/api/admin-inner/h5-config/service-entries/:id', adminInnerAuth, controller.adminInner.h5Config.serviceEntryRemove);

  // admin-inner H5客服配置
  router.get('/api/admin-inner/h5-services', adminInnerAuth, controller.adminInner.h5Service.list);
  router.post('/api/admin-inner/h5-services', adminInnerAuth, controller.adminInner.h5Service.add);
  router.put('/api/admin-inner/h5-services/:id', adminInnerAuth, controller.adminInner.h5Service.edit);
  router.delete('/api/admin-inner/h5-services/:id', adminInnerAuth, controller.adminInner.h5Service.remove);


  // ==================== B端/外层管理系统 (admin-outer) ====================
  const adminOuterAuth = app.middleware.adminOuterAuth();

  router.post('/api/admin-outer/login', controller.adminOuter.auth.login);
  router.post('/api/admin-outer/logout', adminOuterAuth, controller.adminOuter.auth.logout);
  router.post('/api/admin-outer/auth/refresh', controller.common.auth.refresh);
  router.get('/api/admin-outer/current', adminOuterAuth, controller.adminOuter.auth.current);
  router.get('/api/admin-outer/getUserInfo', adminOuterAuth, controller.adminOuter.auth.current); // 兼容旧版路由
  router.get('/api/admin-outer/getMenu', adminOuterAuth, controller.adminOuter.auth.getMenu); // 兼容旧版路由

  // admin-outer 账号资料修改
  router.put('/api/admin-outer/profile', adminOuterAuth, controller.adminOuter.auth.updateProfile);
  router.put('/api/admin-outer/profile/updatePwd', adminOuterAuth, controller.adminOuter.auth.updatePwd);
  router.post('/api/admin-outer/totp/unbind', adminOuterAuth, controller.adminOuter.auth.unbindGoogle);

  // 谷歌验证码相关 (B端)
  router.post('/api/admin-outer/totp/verify-password', controller.adminOuter.auth.verifyPasswordForBind);
  router.post('/api/admin-outer/totp/bind-init', controller.adminOuter.auth.bindInit);
  router.post('/api/admin-outer/totp/bind-confirm', controller.adminOuter.auth.bindConfirm);
  router.post('/api/admin-outer/totp/login-verify', controller.adminOuter.auth.loginVerify);

  // admin-inner 人工资金调整 (上分/下分)
  router.get('/api/admin-inner/points-give/list', adminInnerAuth, controller.adminInner.points.giveList);
  router.post('/api/admin-inner/points-give/create', adminInnerAuth, controller.adminInner.points.giveCreate);
  router.get('/api/admin-inner/points-deduct/list', adminInnerAuth, controller.adminInner.points.deductList);
  router.post('/api/admin-inner/points-deduct/create', adminInnerAuth, controller.adminInner.points.deductCreate);

  // admin-outer 给其他用户修改密码和重置谷歌
  router.put('/api/admin-outer/users/reset-pwd', adminOuterAuth, controller.adminOuter.auth.resetUserPwd);
  router.put('/api/admin-outer/users/reset-google', adminOuterAuth, controller.adminOuter.auth.resetUserGoogle);

  // admin-outer 客户管理
  router.get('/api/admin-outer/customers/statistics', adminOuterAuth, controller.adminOuter.customer.statistics);
  router.get('/api/admin-outer/customers', adminOuterAuth, controller.adminOuter.customer.index);
  router.post('/api/admin-outer/customers', adminOuterAuth, controller.adminOuter.customer.create);
  router.put('/api/admin-outer/customers/:id', adminOuterAuth, controller.adminOuter.customer.update);
  router.get('/api/admin-outer/customers/active-info', adminOuterAuth, controller.adminOuter.customer.activeInfo);
  router.get('/api/admin-outer/customers/:customerUserId/login-log/list', adminOuterAuth, controller.adminOuter.customer.loginLogList);
  router.get('/api/admin-outer/customers/:customerUserId/relation-tree', adminOuterAuth, controller.adminOuter.customer.relationTree);
  router.get('/api/admin-outer/customers/:id/fund-details', adminOuterAuth, controller.adminOuter.customer.fundDetails);
  router.get('/api/admin-outer/customers/:id/policy', adminOuterAuth, controller.adminOuter.customer.policy);
  router.put('/api/admin-outer/customers/:id/reset-password', adminOuterAuth, controller.adminOuter.customer.resetPassword); // B端给C端用户重置密码
  router.put('/api/admin-outer/customers/:id/withdraw-password', adminOuterAuth, controller.adminOuter.customer.updateWithdrawPassword); // B端给C端用户重置提现密码

  // admin-outer 人工资金调整 (上分/下分)
  router.get('/api/admin-outer/points-give/list', adminOuterAuth, controller.adminOuter.points.giveList);
  router.post('/api/admin-outer/points-give/create', adminOuterAuth, controller.adminOuter.points.giveCreate);
  router.get('/api/admin-outer/points-deduct/list', adminOuterAuth, controller.adminOuter.points.deductList);
  router.post('/api/admin-outer/points-deduct/create', adminOuterAuth, controller.adminOuter.points.deductCreate);

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

  // admin-outer VIP 等级管理
  router.get('/api/admin-outer/vip-levels', adminOuterAuth, controller.adminOuter.vipLevel.index);
  router.post('/api/admin-outer/vip-levels', adminOuterAuth, controller.adminOuter.vipLevel.create);
  router.put('/api/admin-outer/vip-levels/:id', adminOuterAuth, controller.adminOuter.vipLevel.update);
  router.delete('/api/admin-outer/vip-levels/:id', adminOuterAuth, controller.adminOuter.vipLevel.destroy);
  router.put('/api/admin-outer/vip-levels/user/update', adminOuterAuth, controller.adminOuter.vipLevel.updateUserVip);

  // admin-outer 充值管理
  router.get('/api/admin-outer/recharge/stats', adminOuterAuth, controller.adminOuter.recharge.stats);
  router.get('/api/admin-outer/recharge/list', adminOuterAuth, controller.adminOuter.recharge.index);
  router.post('/api/admin-outer/recharge/:id/audit-success', adminOuterAuth, controller.adminOuter.recharge.auditSuccess);
  router.post('/api/admin-outer/recharge/:id/audit-fail', adminOuterAuth, controller.adminOuter.recharge.auditFail);

  // admin-outer 提现管理
  router.get('/api/admin-outer/withdraw/stats', adminOuterAuth, controller.adminOuter.withdraw.stats);
  router.get('/api/admin-outer/withdraw/list', adminOuterAuth, controller.adminOuter.withdraw.index);
  router.put('/api/admin-outer/withdraw/:id/address', adminOuterAuth, controller.adminOuter.withdraw.updateAddress);
  router.post('/api/admin-outer/withdraw/:id/audit-success', adminOuterAuth, controller.adminOuter.withdraw.auditSuccess);
  router.post('/api/admin-outer/withdraw/:id/audit-fail', adminOuterAuth, controller.adminOuter.withdraw.auditFail);

  // admin-outer 店铺信息与设置
  router.get('/api/admin-outer/shop/info', adminOuterAuth, controller.adminOuter.shop.show);
  router.get('/api/admin-outer/shop/settings', adminOuterAuth, controller.adminOuter.shopSetting.show);
  router.put('/api/admin-outer/shop/settings', adminOuterAuth, controller.adminOuter.shopSetting.update);

  // admin-outer 仪表盘
  router.get('/api/admin-outer/dashboard/stats', adminOuterAuth, controller.adminOuter.dashboard.stats);

  // admin-outer 任务管理
  router.get('/api/admin-outer/tasks', adminOuterAuth, controller.adminOuter.task.index);
  router.get('/api/admin-outer/tasks/:id', adminOuterAuth, controller.adminOuter.task.show);
  router.post('/api/admin-outer/tasks', adminOuterAuth, controller.adminOuter.task.create);
  router.put('/api/admin-outer/tasks/:id', adminOuterAuth, controller.adminOuter.task.update);
  router.delete('/api/admin-outer/tasks/:id', adminOuterAuth, controller.adminOuter.task.destroy);
  router.put('/api/admin-outer/tasks/items/:item_id', adminOuterAuth, controller.adminOuter.task.updateItem);
  router.put('/api/admin-outer/tasks/user-items/:id', adminOuterAuth, controller.adminOuter.task.updateUserItem);
  router.post('/api/admin-outer/tasks/bind-user', adminOuterAuth, controller.adminOuter.task.bindUser);
  router.post('/api/admin-outer/tasks/start-user', adminOuterAuth, controller.adminOuter.task.startUserTask);

  // admin-outer 订单管理 (B端订单列表)
  router.get('/api/admin-outer/orders', adminOuterAuth, controller.adminOuter.order.index);

  // admin-outer 操作日志
  router.get('/api/admin-outer/operation-logs', adminOuterAuth, controller.adminOuter.operationLog.index);
  router.delete('/api/admin-outer/operation-logs/batch', adminOuterAuth, controller.adminOuter.operationLog.batchDestroy);
  router.delete('/api/admin-outer/operation-logs/clear', adminOuterAuth, controller.adminOuter.operationLog.clear);

  // admin-outer 登录日志
  router.get('/api/admin-outer/login-logs', adminOuterAuth, controller.adminOuter.loginLog.index);
  router.delete('/api/admin-outer/login-logs/batch', adminOuterAuth, controller.adminOuter.loginLog.batchDestroy);
  router.delete('/api/admin-outer/login-logs/clear', adminOuterAuth, controller.adminOuter.loginLog.clear);

  // admin-outer 实名认证
  router.get('/api/admin-outer/user-identities', adminOuterAuth, controller.adminOuter.userIdentity.index);
  router.post('/api/admin-outer/user-identities/:id/audit-success', adminOuterAuth, controller.adminOuter.userIdentity.auditSuccess);
  router.post('/api/admin-outer/user-identities/:id/audit-fail', adminOuterAuth, controller.adminOuter.userIdentity.auditFail);

  // TEMPORARY: Get JWT Secret (REMOVE AFTER USE)
  router.get('/api/dev/jwt-secret', controller.adminInner.auth.getJwtSecret);

  // TEMPORARY: Create Outer Admin User (REMOVE AFTER USE)
  router.post('/api/dev/create-outer-admin', controller.adminOuter.auth.createOuterAdminUser);

  // TEMPORARY: Create C-end User (REMOVE AFTER USE)
  router.post('/api/dev/create-mobile-user', controller.mobile.user.createMobileUser);

  // A端 充提渠道管理
  router.get('/api/admin-inner/pay-channels', adminInnerAuth, controller.adminInner.payChannel.index);
  router.post('/api/admin-inner/pay-channels', adminInnerAuth, controller.adminInner.payChannel.create);
  router.put('/api/admin-inner/pay-channels/:id', adminInnerAuth, controller.adminInner.payChannel.update);
  router.delete('/api/admin-inner/pay-channels/:id', adminInnerAuth, controller.adminInner.payChannel.destroy);
  router.post('/api/admin-inner/pay-channels/bind-shop', adminInnerAuth, controller.adminInner.payChannel.bindShop);

  // B端 充提渠道管理
  router.get('/api/admin-outer/pay-channels', adminOuterAuth, controller.adminOuter.payChannel.index);
  router.post('/api/admin-outer/pay-channels', adminOuterAuth, controller.adminOuter.payChannel.create);
  router.put('/api/admin-outer/pay-channels/:id', adminOuterAuth, controller.adminOuter.payChannel.update);
  router.delete('/api/admin-outer/pay-channels/:id', adminOuterAuth, controller.adminOuter.payChannel.destroy);

  // 业务员充值收款地址管理 (B端)
  router.get('/api/admin-outer/sales-address', adminOuterAuth, controller.adminOuter.salesRechargeAddress.index);
  router.post('/api/admin-outer/sales-address', adminOuterAuth, controller.adminOuter.salesRechargeAddress.create);
  router.put('/api/admin-outer/sales-address/:id', adminOuterAuth, controller.adminOuter.salesRechargeAddress.update);
  router.delete('/api/admin-outer/sales-address/:id', adminOuterAuth, controller.adminOuter.salesRechargeAddress.destroy);

};
