// This file is created by egg-ts-helper@2.1.1
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportAdminInnerAuth = require('../../../app/controller/admin_inner/auth');
import ExportAdminInnerBanner = require('../../../app/controller/admin_inner/banner');
import ExportAdminInnerConfig = require('../../../app/controller/admin_inner/config');
import ExportAdminInnerCustomer = require('../../../app/controller/admin_inner/customer');
import ExportAdminInnerCustomerService = require('../../../app/controller/admin_inner/customer_service');
import ExportAdminInnerDashboard = require('../../../app/controller/admin_inner/dashboard');
import ExportAdminInnerEmployee = require('../../../app/controller/admin_inner/employee');
import ExportAdminInnerGoods = require('../../../app/controller/admin_inner/goods');
import ExportAdminInnerGoodsTask = require('../../../app/controller/admin_inner/goods_task');
import ExportAdminInnerH5Config = require('../../../app/controller/admin_inner/h5_config');
import ExportAdminInnerH5Service = require('../../../app/controller/admin_inner/h5_service');
import ExportAdminInnerLoginLog = require('../../../app/controller/admin_inner/login_log');
import ExportAdminInnerMerchant = require('../../../app/controller/admin_inner/merchant');
import ExportAdminInnerNotice = require('../../../app/controller/admin_inner/notice');
import ExportAdminInnerOperationLog = require('../../../app/controller/admin_inner/operation_log');
import ExportAdminInnerPayChannel = require('../../../app/controller/admin_inner/pay_channel');
import ExportAdminInnerPoints = require('../../../app/controller/admin_inner/points');
import ExportAdminInnerProduct = require('../../../app/controller/admin_inner/product');
import ExportAdminInnerRule = require('../../../app/controller/admin_inner/rule');
import ExportAdminInnerSalesperson = require('../../../app/controller/admin_inner/salesperson');
import ExportAdminInnerShop = require('../../../app/controller/admin_inner/shop');
import ExportAdminInnerShopPayChannel = require('../../../app/controller/admin_inner/shop_pay_channel');
import ExportAdminInnerSysMenu = require('../../../app/controller/admin_inner/sys_menu');
import ExportAdminInnerSysRole = require('../../../app/controller/admin_inner/sys_role');
import ExportAdminInnerTask = require('../../../app/controller/admin_inner/task');
import ExportAdminInnerUpload = require('../../../app/controller/admin_inner/upload');
import ExportAdminInnerVipLevel = require('../../../app/controller/admin_inner/vip_level');
import ExportAdminOuterAuth = require('../../../app/controller/admin_outer/auth');
import ExportAdminOuterCustomer = require('../../../app/controller/admin_outer/customer');
import ExportAdminOuterDashboard = require('../../../app/controller/admin_outer/dashboard');
import ExportAdminOuterEmployee = require('../../../app/controller/admin_outer/employee');
import ExportAdminOuterGoods = require('../../../app/controller/admin_outer/goods');
import ExportAdminOuterLoginLog = require('../../../app/controller/admin_outer/login_log');
import ExportAdminOuterOperationLog = require('../../../app/controller/admin_outer/operation_log');
import ExportAdminOuterOrder = require('../../../app/controller/admin_outer/order');
import ExportAdminOuterPayChannel = require('../../../app/controller/admin_outer/pay_channel');
import ExportAdminOuterPoints = require('../../../app/controller/admin_outer/points');
import ExportAdminOuterRecharge = require('../../../app/controller/admin_outer/recharge');
import ExportAdminOuterSalesRechargeAddress = require('../../../app/controller/admin_outer/sales_recharge_address');
import ExportAdminOuterShop = require('../../../app/controller/admin_outer/shop');
import ExportAdminOuterShopSetting = require('../../../app/controller/admin_outer/shop_setting');
import ExportAdminOuterTask = require('../../../app/controller/admin_outer/task');
import ExportAdminOuterUpload = require('../../../app/controller/admin_outer/upload');
import ExportAdminOuterUserIdentity = require('../../../app/controller/admin_outer/user_identity');
import ExportAdminOuterVipLevel = require('../../../app/controller/admin_outer/vip_level');
import ExportAdminOuterWithdraw = require('../../../app/controller/admin_outer/withdraw');
import ExportCommonAuth = require('../../../app/controller/common/auth');
import ExportMobileAddress = require('../../../app/controller/mobile/address');
import ExportMobileBackMoney = require('../../../app/controller/mobile/back_money');
import ExportMobileBanner = require('../../../app/controller/mobile/banner');
import ExportMobileCategory = require('../../../app/controller/mobile/category');
import ExportMobileCustomerService = require('../../../app/controller/mobile/customer_service');
import ExportMobileHome = require('../../../app/controller/mobile/home');
import ExportMobileInvite = require('../../../app/controller/mobile/invite');
import ExportMobileNotice = require('../../../app/controller/mobile/notice');
import ExportMobileOrder = require('../../../app/controller/mobile/order');
import ExportMobilePayChannel = require('../../../app/controller/mobile/pay_channel');
import ExportMobileProduct = require('../../../app/controller/mobile/product');
import ExportMobilePublicConfig = require('../../../app/controller/mobile/public_config');
import ExportMobileRecharge = require('../../../app/controller/mobile/recharge');
import ExportMobileRule = require('../../../app/controller/mobile/rule');
import ExportMobileSalesRechargeAddress = require('../../../app/controller/mobile/sales_recharge_address');
import ExportMobileShopPayChannel = require('../../../app/controller/mobile/shop_pay_channel');
import ExportMobileTask = require('../../../app/controller/mobile/task');
import ExportMobileUpload = require('../../../app/controller/mobile/upload');
import ExportMobileUser = require('../../../app/controller/mobile/user');
import ExportMobileUserIdentity = require('../../../app/controller/mobile/user_identity');
import ExportMobileVipLevel = require('../../../app/controller/mobile/vip_level');
import ExportMobileWithdraw = require('../../../app/controller/mobile/withdraw');
import ExportMobileWithdrawWay = require('../../../app/controller/mobile/withdraw_way');

declare module 'egg' {
  interface IController {
    adminInner: {
      auth: ExportAdminInnerAuth;
      banner: ExportAdminInnerBanner;
      config: ExportAdminInnerConfig;
      customer: ExportAdminInnerCustomer;
      customerService: ExportAdminInnerCustomerService;
      dashboard: ExportAdminInnerDashboard;
      employee: ExportAdminInnerEmployee;
      goods: ExportAdminInnerGoods;
      goodsTask: ExportAdminInnerGoodsTask;
      h5Config: ExportAdminInnerH5Config;
      h5Service: ExportAdminInnerH5Service;
      loginLog: ExportAdminInnerLoginLog;
      merchant: ExportAdminInnerMerchant;
      notice: ExportAdminInnerNotice;
      operationLog: ExportAdminInnerOperationLog;
      payChannel: ExportAdminInnerPayChannel;
      points: ExportAdminInnerPoints;
      product: ExportAdminInnerProduct;
      rule: ExportAdminInnerRule;
      salesperson: ExportAdminInnerSalesperson;
      shop: ExportAdminInnerShop;
      shopPayChannel: ExportAdminInnerShopPayChannel;
      sysMenu: ExportAdminInnerSysMenu;
      sysRole: ExportAdminInnerSysRole;
      task: ExportAdminInnerTask;
      upload: ExportAdminInnerUpload;
      vipLevel: ExportAdminInnerVipLevel;
    }
    adminOuter: {
      auth: ExportAdminOuterAuth;
      customer: ExportAdminOuterCustomer;
      dashboard: ExportAdminOuterDashboard;
      employee: ExportAdminOuterEmployee;
      goods: ExportAdminOuterGoods;
      loginLog: ExportAdminOuterLoginLog;
      operationLog: ExportAdminOuterOperationLog;
      order: ExportAdminOuterOrder;
      payChannel: ExportAdminOuterPayChannel;
      points: ExportAdminOuterPoints;
      recharge: ExportAdminOuterRecharge;
      salesRechargeAddress: ExportAdminOuterSalesRechargeAddress;
      shop: ExportAdminOuterShop;
      shopSetting: ExportAdminOuterShopSetting;
      task: ExportAdminOuterTask;
      upload: ExportAdminOuterUpload;
      userIdentity: ExportAdminOuterUserIdentity;
      vipLevel: ExportAdminOuterVipLevel;
      withdraw: ExportAdminOuterWithdraw;
    }
    common: {
      auth: ExportCommonAuth;
    }
    mobile: {
      address: ExportMobileAddress;
      backMoney: ExportMobileBackMoney;
      banner: ExportMobileBanner;
      category: ExportMobileCategory;
      customerService: ExportMobileCustomerService;
      home: ExportMobileHome;
      invite: ExportMobileInvite;
      notice: ExportMobileNotice;
      order: ExportMobileOrder;
      payChannel: ExportMobilePayChannel;
      product: ExportMobileProduct;
      publicConfig: ExportMobilePublicConfig;
      recharge: ExportMobileRecharge;
      rule: ExportMobileRule;
      salesRechargeAddress: ExportMobileSalesRechargeAddress;
      shopPayChannel: ExportMobileShopPayChannel;
      task: ExportMobileTask;
      upload: ExportMobileUpload;
      user: ExportMobileUser;
      userIdentity: ExportMobileUserIdentity;
      vipLevel: ExportMobileVipLevel;
      withdraw: ExportMobileWithdraw;
      withdrawWay: ExportMobileWithdrawWay;
    }
  }
}
