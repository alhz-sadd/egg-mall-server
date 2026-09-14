# admin-inner H5 页面配置接口文档

本文档详细记录了 `admin-inner` 平台管理端关于 H5 页面配置（Banner、公告、规则、商品挂载、服务入口）及客服管理的 API 接口。

## 1. 业务说明
- **存储机制**：采用 `sys_h5_config`（行存储配置）和 `sys_h5_service`（独立客服表）实现。
- **权限边界**：仅限 A 端平台管理员操作，B 端商户无权访问。
- **公共访问**：H5 移动端通过 `/api/mobile/public/...` 系列接口获取已启用的配置。

---

## 2. H5 页面配置管理 (sys_h5_config)

所有配置项通用字段说明：
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | Long | 主键 (编辑/删除时必填) |
| title | String | 标题/名称 |
| image | String | 封面图/Banner图地址 (主字段) |
| linkUrl | String | 跳转地址 (仅 Banner 模块返回) |
| goods | Object | 商品信息 (仅首页/任务商品挂载返回) |
| sort | Integer | 排序 (越小越靠前) |
| status | Integer | 状态 (1启用, 0禁用) |
| creator | Object | 创建人信息 (`nickname`, `username`) |

### 2.1 Banner 管理
- **列表**：`GET /api/admin-inner/h5Config/banner/list`
  - **精简返回**：已移除冗余字段 `config_type`, `content`, `cover_image`, `extra`, `imageUrl`。
  - 返回示例：
    ```json
    {
      "code": 200,
      "data": {
        "list": [
          {
            "id": 1,
            "title": "夏季大促",
            "image": "http://.../1.jpg",
            "linkUrl": "/pages/goods/list",
            "sort": 1,
            "status": 1,
            "creator": { "nickname": "管理员", "username": "admin" }
          }
        ]
      }
    }
    ```
- **新增**：`POST /api/admin-inner/h5Config/banner/add`
  - 支持 `multipart/form-data` 上传文件（字段名 `file`）
  - 也支持 JSON 传入 `image` 或 `imageUrl`
  - `extra`: `{"linkUrl": "/pages/index"}`
- **编辑**：`PUT /api/admin-inner/h5Config/banner/edit` (Body 需带 `id`)
- **删除**：`DELETE /api/admin-inner/h5Config/banner/remove?id=xxx`

### 2.2 公告管理
- **列表**：`GET /api/admin-inner/h5Config/notice/list`
- **新增**：`POST /api/admin-inner/h5Config/notice/add`
  - `content`: 富文本正文
- **编辑**：`PUT /api/admin-inner/h5Config/notice/edit`
- **删除**：`DELETE /api/admin-inner/h5Config/notice/remove?id=xxx`

### 2.3 规则管理
- **列表**：`GET /api/admin-inner/h5Config/rule/list`
- **新增/编辑/删除**：路径同上，对应 `rule` 模块。

### 2.4 首页商品挂载
- **列表**：`GET /api/admin-inner/h5Config/homeGoods/list`
- **新增参数示例**：
  ```json
  {
    "title": "爆款手机",
    "extra": { "goodsId": 1001 },
    "sort": 1
  }
  ```

### 2.5 任务商品挂载
- **列表**：`GET /api/admin-inner/h5Config/taskGoods/list`
- **说明**：关联 `goods_type=2` 的任务商品。

### 2.6 服务入口管理
- **列表**：`GET /api/admin-inner/h5Config/serviceEntry/list`

---

## 3. 客服管理 (sys_h5_service)

独立于配置表，支持多条客服记录。

### 3.1 客服列表
- **接口路径**：`GET /api/admin-inner/h5Service/list`
- **返回数据**：
  ```json
  {
    "code": 200,
    "data": {
      "list": [
        {
          "id": 1,
          "service_name": "在线客服",
          "avatar": "url",
          "contact_type": 1,
          "contact_value": "wx123",
          "jump_url": "/pages/chat",
          "status": 1
        }
      ]
    }
  }
  ```

### 3.2 新增客服
- **接口路径**：`POST /api/admin-inner/h5Service/add`
- **请求参数**：
  - `service_name`: 客服名称
  - `avatar`: 头像地址 (兼容 `image` / `imageUrl`)
  - `contact_type`: 1-微信, 2-QQ, 3-手机号
  - `contact_value`: 具体联系值
  - `jump_url`: 跳转链接 (可选)

### 3.3 编辑客服
- **接口路径**：`PUT /api/admin-inner/h5Service/edit`
- **请求参数**：需带 `id` 及其余修改字段。

### 3.4 删除客服
- **接口路径**：`DELETE /api/admin-inner/h5Service/remove?id=xxx`

---

## 4. H5 移动端公开接口 (免登录)
- `GET /api/mobile/public/banners`
- `GET /api/mobile/public/notices`
- `GET /api/mobile/public/rules`
- `GET /api/mobile/public/home-products`
- `GET /api/mobile/public/task-products`
- `GET /api/mobile/public/customer-services`
