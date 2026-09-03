// This file is created by egg-ts-helper@2.1.1
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportAddress = require('../../../app/model/address');
import ExportAdminInnerUser = require('../../../app/model/admin_inner_user');
import ExportAdminLoginLog = require('../../../app/model/admin_login_log');
import ExportAdminOperationLog = require('../../../app/model/admin_operation_log');
import ExportAdminUser = require('../../../app/model/admin_user');
import ExportBanner = require('../../../app/model/banner');
import ExportCart = require('../../../app/model/cart');
import ExportCategory = require('../../../app/model/category');
import ExportCommissionRecord = require('../../../app/model/commission_record');
import ExportCustomerService = require('../../../app/model/customer_service');
import ExportIndex = require('../../../app/model/index');
import ExportLogisticsAddress = require('../../../app/model/logistics_address');
import ExportMenu = require('../../../app/model/menu');
import ExportNotice = require('../../../app/model/notice');
import ExportOrder = require('../../../app/model/order');
import ExportOrderItem = require('../../../app/model/orderItem');
import ExportPermission = require('../../../app/model/permission');
import ExportProduct = require('../../../app/model/product');
import ExportRechargeRecord = require('../../../app/model/recharge_record');
import ExportRechargeRequest = require('../../../app/model/recharge_request');
import ExportRechargeWay = require('../../../app/model/recharge_way');
import ExportRole = require('../../../app/model/role');
import ExportRoleMenu = require('../../../app/model/role_menu');
import ExportRolePermission = require('../../../app/model/role_permission');
import ExportRule = require('../../../app/model/rule');
import ExportStrategy = require('../../../app/model/strategy');
import ExportStrategyRule = require('../../../app/model/strategy_rule');
import ExportSysConfig = require('../../../app/model/sys_config');
import ExportTask = require('../../../app/model/task');
import ExportUser = require('../../../app/model/user');
import ExportUserCredential = require('../../../app/model/user_credential');
import ExportUserLoginLog = require('../../../app/model/user_login_log');
import ExportUserTask = require('../../../app/model/user_task');
import ExportVip = require('../../../app/model/vip');
import ExportWithdrawConfig = require('../../../app/model/withdraw_config');
import ExportWithdrawRecord = require('../../../app/model/withdraw_record');
import ExportWithdrawWay = require('../../../app/model/withdraw_way');

declare module 'egg' {
  interface IModel {
    Address: ReturnType<typeof ExportAddress>;
    AdminInnerUser: ReturnType<typeof ExportAdminInnerUser>;
    AdminLoginLog: ReturnType<typeof ExportAdminLoginLog>;
    AdminOperationLog: ReturnType<typeof ExportAdminOperationLog>;
    AdminUser: ReturnType<typeof ExportAdminUser>;
    Banner: ReturnType<typeof ExportBanner>;
    Cart: ReturnType<typeof ExportCart>;
    Category: ReturnType<typeof ExportCategory>;
    CommissionRecord: ReturnType<typeof ExportCommissionRecord>;
    CustomerService: ReturnType<typeof ExportCustomerService>;
    Index: ReturnType<typeof ExportIndex>;
    LogisticsAddress: ReturnType<typeof ExportLogisticsAddress>;
    Menu: ReturnType<typeof ExportMenu>;
    Notice: ReturnType<typeof ExportNotice>;
    Order: ReturnType<typeof ExportOrder>;
    OrderItem: ReturnType<typeof ExportOrderItem>;
    Permission: ReturnType<typeof ExportPermission>;
    Product: ReturnType<typeof ExportProduct>;
    RechargeRecord: ReturnType<typeof ExportRechargeRecord>;
    RechargeRequest: ReturnType<typeof ExportRechargeRequest>;
    RechargeWay: ReturnType<typeof ExportRechargeWay>;
    Role: ReturnType<typeof ExportRole>;
    RoleMenu: ReturnType<typeof ExportRoleMenu>;
    RolePermission: ReturnType<typeof ExportRolePermission>;
    Rule: ReturnType<typeof ExportRule>;
    Strategy: ReturnType<typeof ExportStrategy>;
    StrategyRule: ReturnType<typeof ExportStrategyRule>;
    SysConfig: ReturnType<typeof ExportSysConfig>;
    Task: ReturnType<typeof ExportTask>;
    User: ReturnType<typeof ExportUser>;
    UserCredential: ReturnType<typeof ExportUserCredential>;
    UserLoginLog: ReturnType<typeof ExportUserLoginLog>;
    UserTask: ReturnType<typeof ExportUserTask>;
    Vip: ReturnType<typeof ExportVip>;
    WithdrawConfig: ReturnType<typeof ExportWithdrawConfig>;
    WithdrawRecord: ReturnType<typeof ExportWithdrawRecord>;
    WithdrawWay: ReturnType<typeof ExportWithdrawWay>;
  }
}
