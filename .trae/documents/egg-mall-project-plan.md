# Egg.js 后端商城项目实现计划

## 一、上下文与目标

**目标**：在 `c:\Users\ROG\Desktop\hou` 目录下新建一个基于 Node.js + Egg.js 的后端商场项目。

**当前状态**：目标目录为空，无现有代码或项目结构，适合从零初始化。

**预期成果**：完成项目初始化、核心模块搭建、数据库模型设计、路由与中间件配置，项目可本地启动并通过基础接口验证。

---

## 二、推荐方案

采用 **手动搭建 Egg.js 3.x 项目**（不依赖 `egg-init` 模板），便于完全控制目录结构与依赖版本，后续扩展更灵活。

### 2.1 技术栈

| 组件 | 版本/说明 |
|------|-----------|
| Node.js | >= 16.x（当前环境 v20.12.2 已满足） |
| Egg.js | ^3.17.0 |
| 数据库 | MySQL 5.7+ / 8.0 |
| ORM | egg-sequelize ^6.0.0 + mysql2 ^3.9.0 |
| 缓存 | Redis 5.0+（通过 egg-redis） |
| 认证 | JWT（通过 egg-jwt） |
| 密码加密 | bcrypt（通过 egg-bcrypt） |
| 跨域 | egg-cors |

### 2.2 项目目录结构

```text
c:\Users\ROG\Desktop\hou
├── app
│   ├── controller          # 控制器
│   │   ├── user.js
│   │   ├── category.js
│   │   ├── product.js
│   │   ├── cart.js
│   │   ├── order.js
│   │   └── address.js
│   ├── service             # 业务逻辑层
│   │   ├── user.js
│   │   ├── category.js
│   │   ├── product.js
│   │   ├── cart.js
│   │   ├── order.js
│   │   └── address.js
│   ├── model               # Sequelize 数据模型
│   │   ├── user.js
│   │   ├── category.js
│   │   ├── product.js
│   │   ├── cart.js
│   │   ├── order.js
│   │   ├── orderItem.js
│   │   └── address.js
│   ├── middleware          # 中间件
│   │   ├── error_handler.js
│   │   ├── auth.js
│   │   └── request_log.js
│   ├── router.js           # 路由定义
│   ├── extend
│   │   ├── context.js
│   │   ├── helper.js
│   │   └── application.js
│   └── validate            # 参数校验规则
│       └── user.js
├── config
│   ├── config.default.js
│   ├── config.local.js
│   ├── config.prod.js
│   ├── config.test.js
│   └── plugin.js
├── database
│   ├── config.json
│   └── migrations
├── test
│   └── app
│       ├── controller
│       │   └── user.test.js
│       └── service
│           └── user.test.js
├── .eslintrc.js
├── .eslintignore
├── .gitignore
├── jsconfig.json
├── package.json
└── README.md
```

### 2.3 核心模块

1. **用户模块**：注册、登录、JWT 认证、获取/更新当前用户信息。
2. **商品分类模块**：分类列表、树形分类。
3. **商品模块**：商品列表、详情、按分类筛选、分页、搜索。
4. **购物车模块**：加入购物车、列表、更新数量、删除、切换选中状态。
5. **订单模块**：创建订单、列表、详情、取消、模拟支付。
6. **地址模块**：新增、列表、详情、更新、删除、设置默认地址。

### 2.4 数据库表设计

- `users`：用户表
- `categories`：商品分类表
- `products`：商品表
- `carts`：购物车表
- `orders`：订单表
- `order_items`：订单商品表
- `addresses`：收货地址表

### 2.5 中间件

- `errorHandler`：统一错误处理，规范返回格式。
- `auth`：JWT 鉴权。
- `requestLog`：请求日志记录。
- `cors`：跨域支持（插件）。

---

## 三、关键文件清单

以下文件是执行过程中会优先创建和配置的核心文件：

- `c:\Users\ROG\Desktop\hou\package.json`
- `c:\Users\ROG\Desktop\hou\config\config.default.js`
- `c:\Users\ROG\Desktop\hou\config\plugin.js`
- `c:\Users\ROG\Desktop\hou\config\config.local.js`
- `c:\Users\ROG\Desktop\hou\app\router.js`
- `c:\Users\ROG\Desktop\hou\app.js`
- `c:\Users\ROG\Desktop\hou\app\middleware\error_handler.js`
- `c:\Users\ROG\Desktop\hou\app\middleware\auth.js`
- `c:\Users\ROG\Desktop\hou\app\middleware\request_log.js`
- `c:\Users\ROG\Desktop\hou\app\model\user.js`
- `c:\Users\ROG\Desktop\hou\app\model\category.js`
- `c:\Users\ROG\Desktop\hou\app\model\product.js`
- `c:\Users\ROG\Desktop\hou\app\model\cart.js`
- `c:\Users\ROG\Desktop\hou\app\model\order.js`
- `c:\Users\ROG\Desktop\hou\app\model\orderItem.js`
- `c:\Users\ROG\Desktop\hou\app\model\address.js`
- `c:\Users\ROG\Desktop\hou\app\service\user.js`
- `c:\Users\ROG\Desktop\hou\app\service\category.js`
- `c:\Users\ROG\Desktop\hou\app\service\product.js`
- `c:\Users\ROG\Desktop\hou\app\service\cart.js`
- `c:\Users\ROG\Desktop\hou\app\service\order.js`
- `c:\Users\ROG\Desktop\hou\app\service\address.js`
- `c:\Users\ROG\Desktop\hou\app\controller\user.js`
- `c:\Users\ROG\Desktop\hou\app\controller\category.js`
- `c:\Users\ROG\Desktop\hou\app\controller\product.js`
- `c:\Users\ROG\Desktop\hou\app\controller\cart.js`
- `c:\Users\ROG\Desktop\hou\app\controller\order.js`
- `c:\Users\ROG\Desktop\hou\app\controller\address.js`
- `c:\Users\ROG\Desktop\hou\README.md`
- `c:\Users\ROG\Desktop\hou\.eslintrc.js`
- `c:\Users\ROG\Desktop\hou\.gitignore`

---

## 四、实施步骤

1. **初始化项目**：创建 `package.json` 并安装 Egg.js 核心依赖与插件。
2. **创建基础配置**：编写 `config/plugin.js`、`config/config.default.js`、`config/config.local.js` 等。
3. **创建中间件**：实现错误处理、JWT 鉴权、请求日志中间件。
4. **创建数据模型**：使用 Sequelize 定义用户、分类、商品、购物车、订单、订单商品、地址模型。
5. **创建 Service 层**：实现各模块业务逻辑。
6. **创建 Controller 层**：实现 API 接口。
7. **配置路由**：在 `app/router.js` 中定义 RESTful API 路由。
8. **编写项目说明**：创建 `README.md`、`.gitignore`、`.eslintrc.js` 等。
9. **本地验证**：安装依赖，启动项目，验证接口可用性。

---

## 五、验证计划

1. 执行 `npm install` 成功安装所有依赖。
2. 执行 `npm run dev` 项目能在 `http://127.0.0.1:7001` 启动。
3. 使用 curl 或 Postman 测试注册接口返回成功。
4. 使用 curl 或 Postman 测试登录接口返回 JWT Token。
5. 使用 Token 访问需鉴权的接口（如获取当前用户）返回正确数据。

---

## 六、风险与注意事项

- 生产环境需将 JWT secret、数据库密码等敏感信息放入环境变量，禁止硬编码。
- 跨域配置 `origin: '*'` 仅适用于开发环境，生产环境应配置具体域名白名单。
- 订单库存扣减需使用数据库事务，防止并发超卖。
- 密码必须使用 bcrypt 加密后存储，禁止明文。
- 数据库字符集统一使用 utf8mb4。
