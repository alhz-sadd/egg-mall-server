# BFF 模式接口拆分计划

## 一、背景与目标

当前项目接口统一挂在 `/api/xxx` 与 `/api/admin/xxx` 下，移动端与管理端共用一个 Controller，仅通过不同方法区分（如 `product.index` 与 `product.adminList`）。随着移动端与管理端需求差异加大，这种方式会导致：

- 同一个 Controller 既要处理移动端过滤/脱敏逻辑，又要处理管理端全量/管理逻辑，职责混杂。
- 路由可读性差，无法一眼识别接口所属前端。
- 不利于后续为不同前端独立扩展字段、缓存策略、限流规则。

本次改造目标：**按 BFF（Backend for Frontend）模式将移动端与管理端接口彻底拆分为独立目录和独立路由前缀**，实现职责清晰、可独立演进。

## 二、总体设计

### 2.1 路由前缀

| 前端 | 前缀 | 示例 |
|---|---|---|
| 移动端 BFF | `/api/mobile/` | `/api/mobile/products`、`/api/mobile/users/login` |
| 管理端 BFF | `/api/admin/` | `/api/admin/products`、`/api/admin/users/login` |

- 原有 `/api/xxx` 路径全部移除，不保留兼容。
- 健康检查 `/` 保持不变。

### 2.2 目录结构

```
app/controller/
├── base.js                 # 通用 Controller 基类（可选，放置公共工具方法）
├── mobile/                 # 移动端 BFF Controller
│   ├── home.js
│   ├── user.js
│   ├── product.js
│   ├── task.js
│   ├── banner.js
│   ├── notice.js
│   ├── customer_service.js
│   ├── rule.js
│   ├── category.js
│   ├── cart.js
│   ├── address.js
│   ├── order.js
│   └── upload.js
└── admin/                  # 管理端 BFF Controller
    ├── admin_user.js
    ├── admin_dashboard.js
    ├── product.js
    ├── task.js
    ├── banner.js
    ├── notice.js
    ├── customer_service.js
    ├── rule.js
    ├── upload.js
    └── user.js（按需）
```

### 2.3 拆分原则

1. **按前端职责拆分方法**：
   - 移动端 Controller 只保留用户端需要的方法（如商品列表、详情、登录、购物车等）。
   - 管理端 Controller 只保留后台管理方法（如管理端列表、创建、编辑、删除、登录日志等）。

2. **原 `/api/products` 等增删改接口迁移到管理端 BFF**：
   - 商品/任务/Banner/公告/客服/规则的创建、更新、删除从移动端 Controller 移出，统一由 `admin` 目录下的 Controller 提供。
   - 路由从 `/api/products` 改为 `/api/admin/products`。
   - 鉴权从 `auth` 升级为 `adminAuth + adminRole([3])`。

3. **服务层复用**：
   - `app/service/*.js` 不变，mobile 与 admin Controller 调用同一 Service。
   - 已有 `list / adminList`、`index / adminGet` 等区分逻辑继续生效。

4. **公共辅助方法处理**：
   - 图片上传解析、字段兼容（`main_image`/`mainImage`、`image`/`imageUrl`）等辅助方法，随 Controller 一起复制到对应目录。
   - 若重复代码较多，可在 `app/controller/base.js` 中沉淀通用逻辑，mobile/admin Controller 继承基类。

## 三、关键文件变更

### 3.1 新增移动端 Controller

从现有 Controller 提取移动端方法到以下路径：

- `app/controller/mobile/home.js`：健康检查/首页。
- `app/controller/mobile/user.js`：注册、登录、当前用户、资料修改、密码修改、团队、任务、余额、物流地址、凭证等。
- `app/controller/mobile/product.js`：`index`、`show`（仅返回 status=1 的商品）。
- `app/controller/mobile/task.js`：`index`、`show`（仅返回 status=1 的任务）。
- `app/controller/mobile/banner.js`：`index`、`show`（仅返回 status=1 的轮播图）。
- `app/controller/mobile/notice.js`：`index`、`show`（仅返回 status=1 的公告）。
- `app/controller/mobile/customer_service.js`：`index`、`show`（仅返回 status=1 的客服）。
- `app/controller/mobile/rule.js`：`index`（仅返回启用规则图片）。
- `app/controller/mobile/category.js`：`index`、`tree`。
- `app/controller/mobile/cart.js`：购物车 CRUD。
- `app/controller/mobile/address.js`：收货地址 CRUD。
- `app/controller/mobile/order.js`：订单创建、列表、详情、取消、支付。
- `app/controller/mobile/upload.js`：图片上传。

### 3.2 新增管理端 Controller

从现有 Controller 提取管理端方法到以下路径：

- `app/controller/admin/admin_user.js`：管理员登录、当前管理员、菜单、管理员 CRUD、登录日志、操作日志。
- `app/controller/admin/admin_dashboard.js`：首页统计。
- `app/controller/admin/product.js`：`adminList`、`create`、`update`、`destroy`。
- `app/controller/admin/task.js`：`adminList`、`create`、`update`、`destroy`。
- `app/controller/admin/banner.js`：`adminList`、`create`、`update`、`destroy`。
- `app/controller/admin/notice.js`：`adminList`、`create`、`update`、`destroy`。
- `app/controller/admin/customer_service.js`：`adminList`、`create`、`update`、`destroy`。
- `app/controller/admin/rule.js`：`adminGet`、`create`、`update`、`destroy`。
- `app/controller/admin/upload.js`：图片上传（管理端也可能需要上传）。

### 3.3 删除旧 Controller

拆分完成后删除原 `app/controller/*.js` 顶层 Controller 文件：

`home.js`、`user.js`、`product.js`、`task.js`、`banner.js`、`notice.js`、`customer_service.js`、`rule.js`、`category.js`、`cart.js`、`address.js`、`order.js`、`upload.js`、`admin_user.js`、`admin_dashboard.js`。

### 3.4 路由重构

重写 `app/router.js`：

- 移动端路由统一以 `/api/mobile/` 开头，使用 `auth` 中间件保护需登录接口。
- 管理端路由统一以 `/api/admin/` 开头，使用 `adminAuth` + `adminRole` 保护。
- 删除所有旧 `/api/xxx` 路由。

示例：

```javascript
// 移动端 BFF
router.get('/api/mobile/products', controller.mobile.product.index);
router.get('/api/mobile/products/:id', controller.mobile.product.show);
router.post('/api/mobile/carts', auth, controller.mobile.cart.create);

// 管理端 BFF
router.get('/api/admin/products', adminAuth, adminRole([3]), controller.admin.product.adminList);
router.post('/api/admin/products', adminAuth, adminRole([3]), controller.admin.product.create);
```

### 3.5 Swagger 注释更新

- 所有 Controller 文件中的 `@router` 路径从 `/api/xxx` 更新为 `/api/mobile/xxx` 或 `/api/admin/xxx`。
- `@Controller` Tag 名称更新为 `移动端-xxx` / `管理端-xxx`，便于 Swagger UI 分组展示。

### 3.6 文档更新

更新 `1.md`：

- 所有接口路径更新为 `/api/mobile/xxx` 或 `/api/admin/xxx`。
- 接口总数统计不变，仅路径前缀调整。
- 在文档开头说明 BFF 双入口设计。

## 四、潜在影响与注意事项

1. **前端调用地址需同步修改**：由于不保留 `/api/xxx` 兼容，前端所有接口地址需改为 `/api/mobile/xxx` 或 `/api/admin/xxx`。
2. **商品/任务等增删改接口权限提升**：迁移到管理端 BFF 后，这些接口需要管理员 token，普通用户 token 不再能调用。
3. **Swagger 自动生成**：由于 Controller 目录变化，egg-swagger-doc 的 `dirScanner` 需要更新为 `'./app/controller/mobile','./app/controller/admin'`，或改为 `'./app/controller'` 让其递归扫描子目录（视插件支持情况而定）。
4. **typings 自动生成**：Egg.js 的 `egg-ts-helper` 会重新生成 `typings/app/controller/index.d.ts`，无需手动修改。

## 五、验证步骤

1. 完成文件迁移和路由重构后，运行 `node -c` 检查所有新增/修改的 JS 文件语法。
2. 删除旧的顶层 Controller 文件。
3. 运行 `npm run dev` 启动服务。
4. 确认服务正常监听 7001 端口，无 `EADDRINUSE` 冲突。
5. 访问 Swagger UI：`http://localhost:7001/swagger-ui.html`。
   - 确认接口按 "移动端-xxx" / "管理端-xxx" 分组。
   - 确认路径前缀正确。
6. 使用工具或 curl 调用关键接口验证：
   - `GET /api/mobile/products` 返回启用状态商品。
   - `GET /api/admin/products` 需要 admin token，返回全部状态商品。
   - `POST /api/admin/products` 需要 admin 权限。
   - `POST /api/mobile/users/login` 登录后获取用户 token。
7. 更新并检查 `1.md` 接口文档路径一致性。
