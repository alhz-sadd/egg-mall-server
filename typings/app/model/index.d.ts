// This file is created by egg-ts-helper@2.1.1
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportCustomerRelation = require('../../../app/model/customer_relation');
import ExportGoods = require('../../../app/model/goods');
import ExportGoodsCategory = require('../../../app/model/goods_category');
import ExportGoodsTask = require('../../../app/model/goods_task');
import ExportSalesRechargeAddress = require('../../../app/model/sales_recharge_address');
import ExportShop = require('../../../app/model/shop');
import ExportShopConfig = require('../../../app/model/shop_config');
import ExportShopPayChannel = require('../../../app/model/shop_pay_channel');
import ExportShopTask = require('../../../app/model/shop_task');
import ExportShopTaskItem = require('../../../app/model/shop_task_item');
import ExportShopTaskUser = require('../../../app/model/shop_task_user');
import ExportShopTaskUserItemProgress = require('../../../app/model/shop_task_user_item_progress');
import ExportShopVipLevel = require('../../../app/model/shop_vip_level');
import ExportSysH5Config = require('../../../app/model/sys_h5_config');
import ExportSysH5Service = require('../../../app/model/sys_h5_service');
import ExportSysMenu = require('../../../app/model/sys_menu');
import ExportSysOperLog = require('../../../app/model/sys_oper_log');
import ExportSysRole = require('../../../app/model/sys_role');
import ExportSysRoleMenu = require('../../../app/model/sys_role_menu');
import ExportSysUser = require('../../../app/model/sys_user');
import ExportSysUserRole = require('../../../app/model/sys_user_role');
import ExportUserCommissionLog = require('../../../app/model/user_commission_log');
import ExportUserIdentity = require('../../../app/model/user_identity');
import ExportUserLoginLog = require('../../../app/model/user_login_log');
import ExportUserRecharge = require('../../../app/model/user_recharge');
import ExportUserTaskIncomeLog = require('../../../app/model/user_task_income_log');
import ExportUserTaskStat = require('../../../app/model/user_task_stat');
import ExportUserWallet = require('../../../app/model/user_wallet');
import ExportUserWalletLog = require('../../../app/model/user_wallet_log');
import ExportUserWithdraw = require('../../../app/model/user_withdraw');

declare module 'egg' {
  interface IModel {
    CustomerRelation: ReturnType<typeof ExportCustomerRelation>;
    Goods: ReturnType<typeof ExportGoods>;
    GoodsCategory: ReturnType<typeof ExportGoodsCategory>;
    GoodsTask: ReturnType<typeof ExportGoodsTask>;
    SalesRechargeAddress: ReturnType<typeof ExportSalesRechargeAddress>;
    Shop: ReturnType<typeof ExportShop>;
    ShopConfig: ReturnType<typeof ExportShopConfig>;
    ShopPayChannel: ReturnType<typeof ExportShopPayChannel>;
    ShopTask: ReturnType<typeof ExportShopTask>;
    ShopTaskItem: ReturnType<typeof ExportShopTaskItem>;
    ShopTaskUser: ReturnType<typeof ExportShopTaskUser>;
    ShopTaskUserItemProgress: ReturnType<typeof ExportShopTaskUserItemProgress>;
    ShopVipLevel: ReturnType<typeof ExportShopVipLevel>;
    SysH5Config: ReturnType<typeof ExportSysH5Config>;
    SysH5Service: ReturnType<typeof ExportSysH5Service>;
    SysMenu: ReturnType<typeof ExportSysMenu>;
    SysOperLog: ReturnType<typeof ExportSysOperLog>;
    SysRole: ReturnType<typeof ExportSysRole>;
    SysRoleMenu: ReturnType<typeof ExportSysRoleMenu>;
    SysUser: ReturnType<typeof ExportSysUser>;
    SysUserRole: ReturnType<typeof ExportSysUserRole>;
    UserCommissionLog: ReturnType<typeof ExportUserCommissionLog>;
    UserIdentity: ReturnType<typeof ExportUserIdentity>;
    UserLoginLog: ReturnType<typeof ExportUserLoginLog>;
    UserRecharge: ReturnType<typeof ExportUserRecharge>;
    UserTaskIncomeLog: ReturnType<typeof ExportUserTaskIncomeLog>;
    UserTaskStat: ReturnType<typeof ExportUserTaskStat>;
    UserWallet: ReturnType<typeof ExportUserWallet>;
    UserWalletLog: ReturnType<typeof ExportUserWalletLog>;
    UserWithdraw: ReturnType<typeof ExportUserWithdraw>;
  }
}
