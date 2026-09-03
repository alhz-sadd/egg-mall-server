// This file is created by egg-ts-helper@2.1.1
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportAdminAdminDashboard = require('../../../app/controller/admin/admin_dashboard');
import ExportAdminAdminUser = require('../../../app/controller/admin/admin_user');
import ExportAdminMember = require('../../../app/controller/admin/member');
import ExportAdminMenu = require('../../../app/controller/admin/menu');
import ExportAdminNotice = require('../../../app/controller/admin/notice');
import ExportAdminOperationLog = require('../../../app/controller/admin/operation_log');
import ExportAdminOrder = require('../../../app/controller/admin/order');
import ExportAdminPermission = require('../../../app/controller/admin/permission');
import ExportAdminRecharge = require('../../../app/controller/admin/recharge');
import ExportAdminRechargeRequest = require('../../../app/controller/admin/recharge_request');
import ExportAdminRechargeWay = require('../../../app/controller/admin/recharge_way');
import ExportAdminRoles = require('../../../app/controller/admin/roles');
import ExportAdminRule = require('../../../app/controller/admin/rule');
import ExportAdminSalesperson = require('../../../app/controller/admin/salesperson');
import ExportAdminStats = require('../../../app/controller/admin/stats');
import ExportAdminStrategy = require('../../../app/controller/admin/strategy');
import ExportAdminSysConfig = require('../../../app/controller/admin/sys_config');
import ExportAdminUpload = require('../../../app/controller/admin/upload');
import ExportAdminUserCredential = require('../../../app/controller/admin/user_credential');
import ExportAdminVip = require('../../../app/controller/admin/vip');
import ExportAdminWithdraw = require('../../../app/controller/admin/withdraw');
import ExportAdminWithdrawConfig = require('../../../app/controller/admin/withdraw_config');
import ExportAdminWithdrawWay = require('../../../app/controller/admin/withdraw_way');
import ExportAdminInnerAuth = require('../../../app/controller/admin_inner/auth');
import ExportAdminInnerBanner = require('../../../app/controller/admin_inner/banner');
import ExportAdminInnerCustomerService = require('../../../app/controller/admin_inner/customer_service');
import ExportAdminInnerLoginLog = require('../../../app/controller/admin_inner/login_log');
import ExportAdminInnerMerchant = require('../../../app/controller/admin_inner/merchant');
import ExportAdminInnerNotice = require('../../../app/controller/admin_inner/notice');
import ExportAdminInnerOperationLog = require('../../../app/controller/admin_inner/operation_log');
import ExportAdminInnerProduct = require('../../../app/controller/admin_inner/product');
import ExportAdminInnerRule = require('../../../app/controller/admin_inner/rule');
import ExportAdminInnerSalesperson = require('../../../app/controller/admin_inner/salesperson');
import ExportAdminInnerTask = require('../../../app/controller/admin_inner/task');
import ExportCommonAuth = require('../../../app/controller/common/auth');
import ExportMobileAddress = require('../../../app/controller/mobile/address');
import ExportMobileBackMoney = require('../../../app/controller/mobile/back_money');
import ExportMobileBanner = require('../../../app/controller/mobile/banner');
import ExportMobileCart = require('../../../app/controller/mobile/cart');
import ExportMobileCategory = require('../../../app/controller/mobile/category');
import ExportMobileCustomerService = require('../../../app/controller/mobile/customer_service');
import ExportMobileHome = require('../../../app/controller/mobile/home');
import ExportMobileNotice = require('../../../app/controller/mobile/notice');
import ExportMobileOrder = require('../../../app/controller/mobile/order');
import ExportMobileProduct = require('../../../app/controller/mobile/product');
import ExportMobileRecharge = require('../../../app/controller/mobile/recharge');
import ExportMobileRechargeWay = require('../../../app/controller/mobile/recharge_way');
import ExportMobileRule = require('../../../app/controller/mobile/rule');
import ExportMobileTask = require('../../../app/controller/mobile/task');
import ExportMobileUpload = require('../../../app/controller/mobile/upload');
import ExportMobileUser = require('../../../app/controller/mobile/user');
import ExportMobileWithdraw = require('../../../app/controller/mobile/withdraw');
import ExportMobileWithdrawWay = require('../../../app/controller/mobile/withdraw_way');

declare module 'egg' {
  interface IController {
    admin: {
      adminDashboard: ExportAdminAdminDashboard;
      adminUser: ExportAdminAdminUser;
      member: ExportAdminMember;
      menu: ExportAdminMenu;
      notice: ExportAdminNotice;
      operationLog: ExportAdminOperationLog;
      order: ExportAdminOrder;
      permission: ExportAdminPermission;
      recharge: ExportAdminRecharge;
      rechargeRequest: ExportAdminRechargeRequest;
      rechargeWay: ExportAdminRechargeWay;
      roles: ExportAdminRoles;
      rule: ExportAdminRule;
      salesperson: ExportAdminSalesperson;
      stats: ExportAdminStats;
      strategy: ExportAdminStrategy;
      sysConfig: ExportAdminSysConfig;
      upload: ExportAdminUpload;
      userCredential: ExportAdminUserCredential;
      vip: ExportAdminVip;
      withdraw: ExportAdminWithdraw;
      withdrawConfig: ExportAdminWithdrawConfig;
      withdrawWay: ExportAdminWithdrawWay;
    }
    adminInner: {
      auth: ExportAdminInnerAuth;
      banner: ExportAdminInnerBanner;
      customerService: ExportAdminInnerCustomerService;
      loginLog: ExportAdminInnerLoginLog;
      merchant: ExportAdminInnerMerchant;
      notice: ExportAdminInnerNotice;
      operationLog: ExportAdminInnerOperationLog;
      product: ExportAdminInnerProduct;
      rule: ExportAdminInnerRule;
      salesperson: ExportAdminInnerSalesperson;
      task: ExportAdminInnerTask;
    }
    common: {
      auth: ExportCommonAuth;
    }
    mobile: {
      address: ExportMobileAddress;
      backMoney: ExportMobileBackMoney;
      banner: ExportMobileBanner;
      cart: ExportMobileCart;
      category: ExportMobileCategory;
      customerService: ExportMobileCustomerService;
      home: ExportMobileHome;
      notice: ExportMobileNotice;
      order: ExportMobileOrder;
      product: ExportMobileProduct;
      recharge: ExportMobileRecharge;
      rechargeWay: ExportMobileRechargeWay;
      rule: ExportMobileRule;
      task: ExportMobileTask;
      upload: ExportMobileUpload;
      user: ExportMobileUser;
      withdraw: ExportMobileWithdraw;
      withdrawWay: ExportMobileWithdrawWay;
    }
  }
}
