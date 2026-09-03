// This file is created by egg-ts-helper@2.1.1
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportAdminAuth = require('../../../app/middleware/admin_auth');
import ExportAdminInnerAuth = require('../../../app/middleware/admin_inner_auth');
import ExportAdminRole = require('../../../app/middleware/admin_role');
import ExportAuth = require('../../../app/middleware/auth');
import ExportErrorHandler = require('../../../app/middleware/error_handler');
import ExportI18nResponse = require('../../../app/middleware/i18n_response');
import ExportOperationLog = require('../../../app/middleware/operation_log');
import ExportRequestLog = require('../../../app/middleware/request_log');

declare module 'egg' {
  interface IMiddleware {
    adminAuth: typeof ExportAdminAuth;
    adminInnerAuth: typeof ExportAdminInnerAuth;
    adminRole: typeof ExportAdminRole;
    auth: typeof ExportAuth;
    errorHandler: typeof ExportErrorHandler;
    i18nResponse: typeof ExportI18nResponse;
    operationLog: typeof ExportOperationLog;
    requestLog: typeof ExportRequestLog;
  }
}
