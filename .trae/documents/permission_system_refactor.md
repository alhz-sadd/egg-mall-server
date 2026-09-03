# 管理后台权限体系改造计划

## 背景与目标

当前管理后台采用硬编码角色菜单（`app/service/admin_user.js` 中的 `getMenusByRole`），无法动态配置，也无法按角色分配细粒度权限。随着前端权限树结构确定，需要：

1. 将权限树持久化到数据库，支持动态维护。
2. 按角色分配权限，登录时返回该角色拥有的权限标识列表。
3. 重新定义角色语义，与前端权限等级对齐：
   - `role=1`：管理员（最高权限，可管理主管/业务员账号）
   - `role=2`：主管（可管理业务员账号）
   - `role=3`：业务员（仅业务操作，无账号管理权限）
4. 根据新角色语义，调整管理员账号的增删改查权限控制。

## 关键设计决策

### 1. 数据模型

新增两张表：

- `permissions`：存储权限树节点，字段与前端结构对齐
  - `id`：主键
  - `parent_id`：父节点ID，0表示一级
  - `title`：显示标题（如"权限管理"）
  - `name`：权限标识（如 `PermissionMgmt`）
  - `type`：类型（菜单/按钮）
  - `sort`：排序
  - `status`：1启用 0禁用

- `role_permissions`：角色与权限的映射
  - `id`：主键
  - `role`：角色值（1/2/3）
  - `permission_name`：权限标识

`admin_users` 表保持不变，不新增 `permissions` 字段，权限通过角色关联。

### 2. 角色语义调整

现有代码中 `role=1` 主管、`role=2` 业务员、`role=3` 管理员。本次统一调整为：

| 角色值 | 新语义 | 可管理的账号 |
|--------|--------|--------------|
| 1      | 管理员 | 管理员、主管、业务员（全部） |
| 2      | 主管   | 业务员 |
| 3      | 业务员 | 无 |

涉及调整：
- `app/model/admin_user.js` 注释更新
- `app.js` 默认管理员初始化 `role` 改为 `1`
- `app/router.js` 所有 `adminRole([...])` 的角色数组更新
- `app/service/admin_user.js` 中 create/list/destroy 的角色判断逻辑更新

### 3. 管理员账号管理权限

- 管理员（role=1）：可查看/创建/更新/删除任意角色管理员账号
- 主管（role=2）：可查看/创建/更新/删除业务员（role=3）账号
- 业务员（role=3）：无账号管理接口权限

创建账号时的角色限制：
- 管理员可创建任意角色账号
- 主管只能创建业务员（role=3）账号

### 4. 权限树接口

- `GET /api/admin/permissions/tree`：返回完整权限树（默认返回全部，含禁用）
- `GET /api/admin/permissions`：返回扁平权限列表
- `POST /api/admin/permissions`：创建权限节点（仅管理员）
- `PUT /api/admin/permissions/:id`：更新权限节点（仅管理员）
- `DELETE /api/admin/permissions/:id`：删除权限节点（仅管理员）

### 5. 角色权限分配接口

- `GET /api/admin/roles/:role/permissions`：获取某角色拥有的权限标识列表
- `PUT /api/admin/roles/:role/permissions`：为角色分配权限，接收 `{ permission_names: [] }`

仅管理员可调用。

### 6. 登录菜单返回

修改 `app/service/admin_user.js` 的 `getMenusByRole`：
- 从 `role_permissions` 表查询当前角色拥有的权限标识
- 若未配置，返回该角色的默认权限列表（向后兼容）
- 管理员角色默认返回全部权限标识

## 待修改文件清单

### 新增文件

- `app/model/permission.js`：权限树模型
- `app/model/role_permission.js`：角色权限关联模型
- `app/service/permission.js`：权限树服务（CRUD、树构建）
- `app/controller/admin/permission.js`：权限树控制器

### 修改文件

- `app/model/admin_user.js`：更新角色注释
- `app/service/admin_user.js`：
  - `getMenusByRole` 改为查询数据库
  - `create` 角色限制调整
  - `list` 角色可见范围调整
  - `destroy` 删除限制调整
- `app/controller/admin/admin_user.js`：Swagger 注释更新
- `app/router.js`：
  - 更新 `adminRole([...])` 角色数组
  - 新增权限树和角色权限路由
- `app.js`：
  - 默认管理员 `role` 改为 `1`
  - 初始化权限树默认数据
  - 初始化角色权限默认数据
- `app/contract/index.js`：新增 PermissionRequest、RolePermissionRequest 等契约
- `typings/app/model/index.d.ts`：运行 `npm run dev` 后自动生成

### 数据库

由于新增表和修改默认管理员角色，需要删除 `database/egg_mall_dev.sqlite` 后重新同步。

## 默认权限数据

按前端提供的权限树结构初始化 `permissions` 表：

- Dashboard（首页）
- System（系统管理）
  - Log（日志管理）
    - Operlog
    - Loginlog
  - SupervisorAccountMgmt（账号管理）
  - PermissionMgmt（权限管理）
    - PermissionList
    - PermissionAdmin
    - PermissionSupervisor
    - PermissionSalesperson
- Member（会员管理）
  - MemberList
  - RechargeDetail
  - OrderList
  - FanDedup
- Strategy（策略管理）
  - StrategyList
  - AuthMgmt
- Finance（充值管理）
  - RechargeList
  - WithdrawList
- Mall（商城管理）
  - BannerMgmt
  - CustomerServiceMgmt
  - NoticeMgmt
  - RuleMgmt
  - HomeProductMgmt
  - TaskProductMgmt

默认角色权限分配：
- role=1（管理员）：全部权限
- role=2（主管）：Dashboard、System 下的 SupervisorAccountMgmt、Log，Member、Strategy、Finance、Mall 等业务权限
- role=3（业务员）：Dashboard、Member、Strategy、Finance、Mall 等业务权限，无 System 管理权限

## 验证方案

1. 删除数据库后启动服务，确认表 `permissions`、`role_permissions` 创建成功。
2. 调用 `GET /api/admin/permissions/tree`，确认返回完整权限树。
3. 管理员登录 `333333/333333`，确认返回的 `menus` 包含全部权限标识。
4. 调用 `PUT /api/admin/roles/2/permissions` 为主管分配权限，再创建主管账号登录，确认返回菜单正确。
5. 测试管理员账号 CRUD：
   - 管理员创建主管账号、业务员账号
   - 主管只能创建业务员账号
   - 业务员无账号管理接口权限
