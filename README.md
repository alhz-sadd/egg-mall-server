# egg-mall-server

基于 Egg.js 的商城后端服务。

## 技术栈

- Node.js >= 16.x
- Egg.js ^3.17.0
- MySQL 5.7+ / 8.0
- Sequelize 6
- Redis 5.0+
- JWT
- bcrypt

## 核心模块

- 用户模块：注册、登录、JWT 认证、个人信息
- 商品分类模块：分类列表、树形分类
- 商品模块：商品列表、详情、搜索、分页
- 购物车模块：增删改查、选中状态
- 订单模块：创建订单、取消、模拟支付
- 地址模块：收货地址管理

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 准备数据库

**本地开发**：项目已默认配置 SQLite（`config/config.local.js`），无需安装 MySQL 即可直接启动。

**生产环境**：建议使用 MySQL 5.7+ / 8.0，创建数据库：

```sql
CREATE DATABASE egg_mall CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

生产环境数据库连接信息通过环境变量注入，参考 `config/config.prod.js`。

### 3. 启动服务

```bash
npm run dev
```

服务默认运行在 `http://127.0.0.1:7001`。

本地开发环境下，应用启动时会自动同步 Sequelize 模型到数据库。

### 4. Redis 说明

Redis 插件默认禁用。如需启用缓存、会话等功能，请将 `config/plugin.js` 中 `redis.enable` 设为 `true`，并配置 Redis 连接。

### 5. 接口测试

```bash
# 健康检查
curl http://127.0.0.1:7001/

# 用户注册
curl -X POST http://127.0.0.1:7001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456","phone":"13800138000"}'

# 用户登录
curl -X POST http://127.0.0.1:7001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}'
```

## 项目结构

```text
├── app
│   ├── controller    # 控制器
│   ├── service       # 业务逻辑层
│   ├── model         # Sequelize 数据模型
│   ├── middleware    # 中间件
│   ├── router.js     # 路由配置
│   └── extend        # 扩展
├── config            # 配置文件
├── database          # 迁移脚本
└── test              # 测试用例
```

## 注意事项

- 生产环境务必将 JWT secret、数据库密码等敏感信息放入环境变量。
- 跨域配置 `origin: '*'` 仅适用于开发环境，生产环境应配置具体域名白名单。
- 订单库存扣减已使用数据库事务处理，生产环境建议结合分布式锁或乐观锁进一步防止超卖。
