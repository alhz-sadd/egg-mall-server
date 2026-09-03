# VIP 管理接口文档

## 基础信息

- **基础路径**: `/api/admin/vips`
- **鉴权**: 需管理端登录 (`Authorization: Bearer <token>`)
- **权限**: 仅管理员(Role 1)和主管(Role 2)可访问

---

## 1. 获取 VIP 列表

获取 VIP 列表，支持分页，支持按名称和等级搜索。

- **接口地址**: `/api/admin/vips`
- **请求方式**: `GET`
- **请求参数** (Query):

| 参数名  | 类型   | 必填 | 说明                |
| ------- | ------ | ---- | ------------------- |
| page    | Number | 否   | 页码，默认 1        |
| limit   | Number | 否   | 每页数量，默认 10   |
| vipName | String | 否   | VIP名称（模糊搜索） |
| vipLv   | Number | 否   | VIP等级（精确搜索） |

- **返回数据示例**:
```json
{
  "code": 200,
  "msg": "获取成功",
  "total": 1,
  "list": [
    {
      "id": 1,
      "vipName": "vip1",
      "vipLv": 1,
      "policyName": "默认策略",
      "policyId": 56,
      "created_at": "2023-10-25T10:00:00.000Z",
      "updated_at": "2023-10-25T10:00:00.000Z"
    }
  ]
}
```

---

## 2. 获取 VIP 详情

获取单个 VIP 详细信息。

- **接口地址**: `/api/admin/vips/:id`
- **请求方式**: `GET`
- **请求参数** (Path):

| 参数名 | 类型   | 必填 | 说明   |
| ------ | ------ | ---- | ------ |
| id     | Number | 是   | VIP ID |

- **返回数据示例**:

```json
{
  "code": 200,
  "msg": "获取成功",
  "data": {
    "id": 1,
    "vipName": "vip1",
    "vipLv": 1,
    "policyName": "默认策略",
    "policyId": 56,
    "created_at": "2023-10-25T10:00:00.000Z",
    "updated_at": "2023-10-25T10:00:00.000Z"
  }
}
```

---

## 3. 新增 VIP

创建一个新的 VIP 等级。

- **接口地址**: `/api/admin/vips`
- **请求方式**: `POST`
- **请求参数** (Body JSON):

| 参数名     | 类型   | 必填 | 说明                            |
| ---------- | ------ | ---- | ------------------------------- |
| vipName    | String | 是   | VIP名称                         |
| vipLv      | Number | 是   | VIP等级                         |
| policyName | String | 否   | 绑定的策略名称，默认 "默认策略" |
| policyId   | Number | 否   | 绑定的策略ID，默认 0            |

- **返回数据示例**:

```json
{
  "code": 200,
  "msg": "创建成功",
  "data": {
    "id": 2,
    "vipName": "vip2",
    "vipLv": 2,
    "policyName": "高级策略",
    "policyId": 57,
    "created_at": "2023-10-25T10:05:00.000Z",
    "updated_at": "2023-10-25T10:05:00.000Z"
  }
}
```

*(注：当 `vipName` 或 `vipLv` 已存在时，会返回 400 错误 "VIP名称或等级已存在")*


---

## 4. 修改 VIP 详情

更新现有 VIP 的信息。

- **接口地址**: `/api/admin/vips/:id`
- **请求方式**: `PUT`
- **请求参数** (Path & Body JSON):

**Path 参数**:

| 参数名 | 类型   | 必填 | 说明   |
| ------ | ------ | ---- | ------ |
| id     | Number | 是   | VIP ID |

**Body 参数**:

| 参数名     | 类型   | 必填 | 说明           |
| ---------- | ------ | ---- | -------------- |
| vipName    | String | 否   | VIP名称        |
| vipLv      | Number | 否   | VIP等级        |
| policyName | String | 否   | 绑定的策略名称 |
| policyId   | Number | 否   | 绑定的策略ID   |

- **返回数据示例**:

```json
{
  "code": 200,
  "msg": "更新成功",
  "data": {
    "id": 1,
    "vipName": "vip1_new",
    "vipLv": 1,
    "policyName": "新策略",
    "policyId": 99,
    "created_at": "2023-10-25T10:00:00.000Z",
    "updated_at": "2023-10-25T10:10:00.000Z"
  }
}
```

---

## 5. 删除 VIP

删除指定的 VIP。

- **接口地址**: `/api/admin/vips/:id`
- **请求方式**: `DELETE`
- **请求参数** (Path):

| 参数名 | 类型   | 必填 | 说明   |
| ------ | ------ | ---- | ------ |
| id     | Number | 是   | VIP ID |

- **返回数据示例**:

```json
{
  "code": 200,
  "msg": "删除成功"
}
```
