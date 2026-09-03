// This file is created by egg-ts-helper@2.1.1
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
type AnyClass = new (...args: any[]) => any;
type AnyFunc<T = any> = (...args: any[]) => T;
type CanExportFunc = AnyFunc<Promise<any>> | AnyFunc<IterableIterator<any>>;
type AutoInstanceType<T, U = T extends CanExportFunc ? T : T extends AnyFunc ? ReturnType<T> : T> = U extends AnyClass ? InstanceType<U> : U;
import ExportAddress = require('../../../app/service/address');
import ExportAdminDashboard = require('../../../app/service/admin_dashboard');
import ExportAdminInnerUser = require('../../../app/service/admin_inner_user');
import ExportAdminUser = require('../../../app/service/admin_user');
import ExportBackMoney = require('../../../app/service/back_money');
import ExportBanner = require('../../../app/service/banner');
import ExportCart = require('../../../app/service/cart');
import ExportCategory = require('../../../app/service/category');
import ExportCustomerService = require('../../../app/service/customer_service');
import ExportFundRecord = require('../../../app/service/fund_record');
import ExportNotice = require('../../../app/service/notice');
import ExportOperationLog = require('../../../app/service/operation_log');
import ExportOrder = require('../../../app/service/order');
import ExportPermission = require('../../../app/service/permission');
import ExportProduct = require('../../../app/service/product');
import ExportRecharge = require('../../../app/service/recharge');
import ExportRechargeRequest = require('../../../app/service/recharge_request');
import ExportRechargeWay = require('../../../app/service/recharge_way');
import ExportRule = require('../../../app/service/rule');
import ExportStats = require('../../../app/service/stats');
import ExportStrategy = require('../../../app/service/strategy');
import ExportSysConfig = require('../../../app/service/sys_config');
import ExportTask = require('../../../app/service/task');
import ExportUpload = require('../../../app/service/upload');
import ExportUser = require('../../../app/service/user');
import ExportUserCredential = require('../../../app/service/user_credential');
import ExportWithdraw = require('../../../app/service/withdraw');
import ExportWithdrawConfig = require('../../../app/service/withdraw_config');
import ExportWithdrawWay = require('../../../app/service/withdraw_way');

declare module 'egg' {
  interface IService {
    address: AutoInstanceType<typeof ExportAddress>;
    adminDashboard: AutoInstanceType<typeof ExportAdminDashboard>;
    adminInnerUser: AutoInstanceType<typeof ExportAdminInnerUser>;
    adminUser: AutoInstanceType<typeof ExportAdminUser>;
    backMoney: AutoInstanceType<typeof ExportBackMoney>;
    banner: AutoInstanceType<typeof ExportBanner>;
    cart: AutoInstanceType<typeof ExportCart>;
    category: AutoInstanceType<typeof ExportCategory>;
    customerService: AutoInstanceType<typeof ExportCustomerService>;
    fundRecord: AutoInstanceType<typeof ExportFundRecord>;
    notice: AutoInstanceType<typeof ExportNotice>;
    operationLog: AutoInstanceType<typeof ExportOperationLog>;
    order: AutoInstanceType<typeof ExportOrder>;
    permission: AutoInstanceType<typeof ExportPermission>;
    product: AutoInstanceType<typeof ExportProduct>;
    recharge: AutoInstanceType<typeof ExportRecharge>;
    rechargeRequest: AutoInstanceType<typeof ExportRechargeRequest>;
    rechargeWay: AutoInstanceType<typeof ExportRechargeWay>;
    rule: AutoInstanceType<typeof ExportRule>;
    stats: AutoInstanceType<typeof ExportStats>;
    strategy: AutoInstanceType<typeof ExportStrategy>;
    sysConfig: AutoInstanceType<typeof ExportSysConfig>;
    task: AutoInstanceType<typeof ExportTask>;
    upload: AutoInstanceType<typeof ExportUpload>;
    user: AutoInstanceType<typeof ExportUser>;
    userCredential: AutoInstanceType<typeof ExportUserCredential>;
    withdraw: AutoInstanceType<typeof ExportWithdraw>;
    withdrawConfig: AutoInstanceType<typeof ExportWithdrawConfig>;
    withdrawWay: AutoInstanceType<typeof ExportWithdrawWay>;
  }
}
