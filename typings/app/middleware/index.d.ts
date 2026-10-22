// This file is created by egg-ts-helper@2.1.1
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportAdminInnerAuth = require('../../../app/middleware/admin_inner_auth');
import ExportAdminOuterAuth = require('../../../app/middleware/admin_outer_auth');
import ExportAuth = require('../../../app/middleware/auth');
import ExportBlockCn = require('../../../app/middleware/block_cn');
import ExportErrorHandler = require('../../../app/middleware/error_handler');
import ExportFormatImageUrl = require('../../../app/middleware/format_image_url');
import ExportI18nResponse = require('../../../app/middleware/i18n_response');
import ExportMobileNoCache = require('../../../app/middleware/mobile_no_cache');
import ExportOperationLog = require('../../../app/middleware/operation_log');
import ExportRequestLog = require('../../../app/middleware/request_log');

declare module 'egg' {
  interface IMiddleware {
    adminInnerAuth: typeof ExportAdminInnerAuth;
    adminOuterAuth: typeof ExportAdminOuterAuth;
    auth: typeof ExportAuth;
    blockCn: typeof ExportBlockCn;
    errorHandler: typeof ExportErrorHandler;
    formatImageUrl: typeof ExportFormatImageUrl;
    i18nResponse: typeof ExportI18nResponse;
    mobileNoCache: typeof ExportMobileNoCache;
    operationLog: typeof ExportOperationLog;
    requestLog: typeof ExportRequestLog;
  }
}
