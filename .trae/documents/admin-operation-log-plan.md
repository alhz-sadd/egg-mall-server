# 管理端操作日志接口实现计划

## 背景与目标

当前项目缺少统一的管理端操作日志记录能力。需要新增：
1. 操作日志列表查询接口
2. 操作日志批量删除接口
3. 操作日志清空接口

同时需要对所有管理端接口（`/api/admin/*`）的写操作进行自动记录，支持根据接口功能和请求方法自动识别操作类型（businessType）与系统模块标题（title）。

## 现状分析

- 已存在模型 `app/model/admin_operation_log.js`，但字段与用户要求不完全匹配。
- 已存在中间件 `app/middleware/request_log.js`，仅输出到日志文件，不持久化到数据库。
- 已存在 `app/middleware/admin_auth.js`，在路由中为管理端接口设置 `ctx.state.admin`。
- 已存在 `app/service/user.js` 中的 `resolveIpLocation` 方法，使用 `ip2region` 解析 IP 地区。
- 已存在 `app/contract/index.js` 用于 Swagger 请求体契约。

## 推荐方案

### 1. 扩展操作日志模型

修改 `app/model/admin_operation_log.js`，补充用户要求的字段，并启用时间戳：

保留字段：
- `id` -> `operId`
- `admin_id` -> 管理员ID
- `username` -> `operName`
- `module` -> 复用为 `title` 的冗余字段（也可废弃）
- `ip` -> `operIp`
- `location` -> `operLocation`
- `duration` -> `costTime`
- `status` -> 操作状态（0成功，1失败）

新增字段：
- `business_type`：操作类型（0新增 1修改 2删除 3授权 4导出 5导入 6强退 7生成代码 8清空数据 9其他）
- `title`：系统模块标题，如"删除提现方式"
- `oper_url`：请求地址
- `request_method`：请求方式 GET/POST/PUT/DELETE
- `oper_param`：请求参数字符串
- `json_result`：接口返回结果字符串
- `oper_time`：操作时间（北京时间）
- `operator_type`：操作账号权限等级（1管理员 2主管 3业务员）
- `request`：JSON 对象，汇总 method/url/params/response/costTime/operTime/status/module
- `remark`：备注

由于全局 Sequelize define 已启用 `timestamps: true`，会自动维护 `created_at`/`updated_at`，返回时格式化为 `createTime`/`updateTime`。

### 2. 新增操作日志服务层

创建 `app/service/operation_log.js`，提供：
- `adminList(query)`：分页列表，支持按 business_type、title、operName、operUrl、status、时间范围搜索。
- `batchDestroy(ids)`：根据 ID 数组批量删除。
- `clearAll()`：清空全部操作日志。
- `create(logData)`：创建单条日志（供中间件调用）。
- `resolveBusinessType(method, url)`：根据请求方法和 URL 匹配规则，返回 `{ businessType, title }`。
- `resolveIpLocation(ip)`：IP 转地区，复用现有 `ip2region` 逻辑。
- `filterSensitiveParams(params)`：过滤密码等敏感字段。

URL 规则映射示例（存储在服务层常量中）：
- `POST /api/admin/withdraw-ways` -> businessType=0, title="添加提现方式"
- `PUT /api/admin/withdraw-ways/:id` -> businessType=1, title="修改提现方式"
- `DELETE /api/admin/withdraw-ways/:id` -> businessType=2, title="删除提现方式"
- `POST /api/admin/withdraws/audit-success` -> businessType=3, title="提现审核通过"
- `GET /api/admin/*/export` -> businessType=4, title="导出数据"
- `POST /api/admin/*/import` -> businessType=5, title="导入数据"
- `POST /api/admin/logout` / `force-logout` -> businessType=6, title="强制退出"
- `POST /api/admin/generate-code` -> businessType=7, title="生成代码"
- `DELETE /api/admin/clear-*` -> businessType=8, title="清空数据"
- 未命中规则的写操作 -> businessType=9, title="其他操作"
- 普通 GET 查询操作默认不记录

### 3. 新增全局操作日志中间件

创建 `app/middleware/operation_log.js`：
- 注册到 `config.default.js` 的 `config.middleware` 中，放在 `requestLog` 之后。
- 仅对以 `/api/admin/` 开头的请求生效。
- 在 `await next()` 前后计算耗时，获取 `ctx.state.admin`、请求参数、响应结果。
- 调用 `ctx.service.operationLog.create()` 写入数据库。
- 使用 try-catch 包裹，确保日志记录失败不影响主请求。
- 过滤敏感字段（password、token、authorization）。

### 4. 新增管理端控制器

创建 `app/controller/admin/operation_log.js`：
- `index()`：GET `/api/admin/operation-logs` 列表
- `batchDestroy()`：DELETE `/api/admin/operation-logs/batch` 批量删除
- `clear()`：DELETE `/api/admin/operation-logs/clear` 清空

### 5. 路由与契约

在 `app/router.js` 添加：
- `GET /api/admin/operation-logs`：管理员/主管/业务员可访问
- `DELETE /api/admin/operation-logs/batch`：仅管理员
- `DELETE /api/admin/operation-logs/clear`：仅管理员

在 `app/contract/index.js` 添加：
- `OperationLogQuery`：列表查询参数
- `OperationLogBatchDeleteRequest`：批量删除请求体

### 6. 数据库同步

在 `app.js` 新增 `syncAdminOperationLogColumns(app)`：
- 兼容旧表结构，新增缺少的字段。
- 调用时机放在其他 sync 函数之后。

## 关键文件

- `app/model/admin_operation_log.js`：扩展模型字段
- `app/service/operation_log.js`：新增服务层
- `app/middleware/operation_log.js`：新增自动记录中间件
- `app/controller/admin/operation_log.js`：新增控制器
- `app/router.js`：新增路由
- `app/contract/index.js`：新增契约
- `config/config.default.js`：注册中间件
- `app.js`：添加字段同步函数

## 验证方式

1. 启动服务后访问 `GET /api/admin/operation-logs`，确认列表接口正常返回。
2. 执行一次 `POST /api/admin/withdraw-ways`，确认日志表中新增一条 businessType=0 的记录。
3. 执行一次 `PUT /api/admin/withdraw-ways/:id`，确认记录 businessType=1。
4. 执行一次 `DELETE /api/admin/withdraw-ways/:id`，确认记录 businessType=2。
5. 调用批量删除和清空接口，确认功能正常且自身也被记录为删除/清空操作。
