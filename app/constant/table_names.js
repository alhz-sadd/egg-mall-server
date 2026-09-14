'use strict';

/**
 * 数据库表名统一映射常量
 * 用于避免在代码中硬编码字符串时出现拼写错误
 */
module.exports = {
  // --- 用户相关 ---
  SYS_USER: 'sys_user', // 用户主表 sys_uer：1=A端管理员，2=B端店长，3=B端业务员，4=C端普通用户
  CUSTOMER_RELATION: 'customer_relation', // 用户客户关系表
  USER_LOGIN_LOG: 'user_login_log', // 用户登录日志表
  USER_IDENTITY: 'user_identity', // 用户上传证件表
  USER_ORDER: 'user_order', // 用户订单表
  USER_RECHARGE: 'user_recharge', // 用户充值表
  USER_WITHDRAW: 'user_withdraw', // 用户提现表
  USER_WALLET: 'user_wallet', // 用户钱包表
  USER_WALLET_LOG: 'user_wallet_log', // 用户钱包日志表
  USER_COMMISSION_LOG: 'user_commission_log', // 业务员佣金明细表


  // --- 商店相关 ---
  SHOP: 'shop', // 商店主表
  SHOP_CONFIG: 'shop_config', // 商店配置表
  SHOP_GOODS: 'shop_goods', // 商店商品表
  SHOP_TASK: 'shop_task', // 商店任务表
  SHOP_TASK_ITEM: 'shop_task_item', // 商店任务项表
  SHOP_TASK_USER: 'shop_task_user', // 用户任务表
  SHOP_TASK_USER_ITEM_PROGRESS: 'shop_task_user_item_progress', // 用户任务子项进度表
  SHOP_VIP_LEVEL: 'shop_vip_level', // 商店会员等级表 对应sys_user表里的 vip_level字段
  SHOP_PAY_CHANNEL: 'shop_pay_channel', // 商店支付渠道表

  // 业务员相关
  SALES_RECHARGE_ADDRESS: 'sales_recharge_address', // 业务员充值地址表 对应sys_user表里的 recharge_address字段
  // --- 商品相关 ---
  GOODS: 'goods', // 商品表
  GOODS_CATEGORY: 'goods_category', // 商品分类表

  // --- 支付与充提相关 ---
  // --- 系统配置与日志 ---
  SYS_ROLE: 'sys_role', // 系统角色表
  SYS_MENU: 'sys_menu', // B系统菜单按钮表
  SYS_ROLE_MENU: 'sys_role_menu', // 角色-菜单中间表
  SYS_USER_ROLE: 'sys_user_role', // 用户-菜单中间表

  SYS_H5_CONFIG: 'sys_h5_config', // H5配置表
  SYS_H5_SERVICE: 'sys_h5_service', // H5服务表
  SYS_OPER_LOG: 'sys_oper_log', // 系统操作日志表
};
