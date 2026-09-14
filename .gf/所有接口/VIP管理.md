# VIP 等级管理 (Admin-Inner / Admin-Outer)

VIP 模板在 A端(Admin-Inner)进行基础预设，新建店铺时会自动将 A端的模板绑定给新店铺。B端(Admin-Outer)可以修改自己店铺绑定的 VIP 模板，也可以给指定用户修改 VIP 等级。C端用户的 VIP 等级会根据归属店铺的 VIP 配置自动升级，C端可通过个人信息接口直接查看。

数据库使用：`shop_vip_level`

## A端 (Admin-Inner)

### 1. 获取平台VIP模板列表

- **路径**: `GET /api/admin-inner/vip-levels`
- **描述**: 获取平台预设的VIP模板列表 (shop_id = 0)
- **请求头**: `Authorization`: `Bearer <token>`

### 2. 新增平台VIP模板

- **路径**: `POST /api/admin-inner/vip-levels`
- **描述**: 新增平台预设的VIP模板
- **请求参数 (Body)**:
  - `level`: (int, 必填) VIP等级数字，如 1, 2, 3
  - `level_name`: (string, 必填) VIP等级名称，如 VIP1, VIP2
  - `need_total_recharge`: (number, 否) 升级所需累计充值金额，默认 0
  - `benefit`: (string, 否) 权益描述
  - `sort`: (int, 否) 排序，默认 0
  - `is_enable`: (int, 否) 是否启用 1启用 0禁用，默认 1

### 3. 修改平台VIP模板

- **路径**: `PUT /api/admin-inner/vip-levels/:id`
- **描述**: 修改平台预设的VIP模板
- **请求参数 (Body)**: 同新增接口（均为选填）

### 4. 删除平台VIP模板

- **路径**: `DELETE /api/admin-inner/vip-levels/:id`
- **描述**: 删除平台预设的VIP模板

### 5. 同步平台模板到指定店铺

- **路径**: `POST /api/admin-inner/vip-levels/bind-shop`
- **描述**: 将当前平台最新的 VIP 模板强行同步(覆盖)给指定的店铺
- **请求参数 (Body)**:
  - `shop_id`: (int, 必填) 目标店铺ID

---

## B端 (Admin-Outer)

### 1. 获取本店铺VIP模板列表

- **路径**: `GET /api/admin-outer/vip-levels`
- **描述**: 获取当前登录店铺绑定的 VIP 模板列表
- **请求头**: `Authorization`: `Bearer <token>`

### 2. 新增本店铺VIP模板

- **路径**: `POST /api/admin-outer/vip-levels`
- **描述**: 为当前店铺新增自定义 VIP 模板
- **请求参数 (Body)**: 同 A端新增接口

### 3. 修改本店铺VIP模板

- **路径**: `PUT /api/admin-outer/vip-levels/:id`
- **描述**: 修改当前店铺的 VIP 模板
- **请求参数 (Body)**: 同 A端修改接口

### 4. 删除本店铺VIP模板

- **路径**: `DELETE /api/admin-outer/vip-levels/:id`
- **描述**: 删除当前店铺的 VIP 模板

### 5. 修改指定用户的VIP等级

- **路径**: `PUT /api/admin-outer/vip-levels/user/update`
- **描述**: B端修改归属于自己店铺的指定用户的 VIP 等级
- **请求头**: `Authorization`: `Bearer <token>`
- **请求参数 (Body)**:
  - `user_id`: (int, 必填) 用户ID
  - `vip_level`: (int, 必填) 新的VIP等级数字

---

## C端 (Mobile)

> C端无需独立接口。用户的 VIP 等级由其归属店铺的 VIP 配置自动判定升级。C端用户可通过**获取个人信息接口**直接查看自己当前的 `vip_level` 及对应的权益描述。
