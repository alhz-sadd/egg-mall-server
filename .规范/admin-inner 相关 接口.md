比如

# admin-inner 相关接口文档

**基础说明**：

- **前缀**：所有接口统一前缀为 `/api/admin-inner`
- **鉴权方式**：除登录接口外，其他接口均需要在请求头（Headers）中携带 `Authorization: Bearer <token>`
- **统一返回格式**：
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {} // 或 []
  }
  ```

---

## 1. 内部系统登录

- **接口路径**：`/api/admin-inner/login`
- **请求方式**：`POST`
- **接口描述**：用于内部人员登录，获取专属 Token。默认账号 `admin`，密码 `admin518`。如果账号已绑定谷歌验证码，则必须传入 `googleCode`。
- **请求参数 (Body, JSON)**：| 字段名     | 类型   | 必填 | 说明                               |
  | ---------- | ------ | ---- | ---------------------------------- |
  | username   | String | 是   | 登录账号                           |
  | password   | String | 是   | 登录密码                           |
  | googleCode | String | 否   | 谷歌验证码（如果账号已绑定则必填） |
- **响应示例**：
  ```json
  {
    "code": 200,
    "message": "登录成功",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5c...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5c..."
    }
  }
  ```

---

## 2. 退出登录

- **接口路径**：`/api/admin-inner/logout`
- **请求方式**：`POST`
- **鉴权要求**：需携带 Token (`Authorization: Bearer <token>`)
- **接口描述**：退出登录（前端需清除本地 Token）。
- **请求参数**：无
- **响应示例**：
  ```json
  {
    "code": 200,
    "message": "退出成功",
    "data": null
  }
  ```

---

## 19. 获取下级业绩统计

- **接口路径**：`/api/admin-inner/salesperson/performance`
- **请求方式**：`GET`
- **鉴权要求**：需携带 Token (`Authorization: Bearer <token>`)
- **接口描述**：返回所有业务员（role=2），以及该业务员下级所有用户（H5用户）的业绩统计数据。
- **返回字段说明**：

  - `user_count`: 用户数量
  - `top_up_count`: 上分次数（包含所有类型的加款记录）
  - `top_up_amount`: 上分金额（包含所有类型的加款金额）
  - `real_recharge_count`: 用户真实充值笔数（仅计算从移动端发起并成功的充值，`operation_type = 2`）
  - `real_recharge_amount`: 用户真实充值金额
  - `mock_recharge_count`: 用户模拟充值笔数（计算系统赠送和员工添加，`operation_type = 0 或 1`）
  - `mock_recharge_amount`: 用户模拟充值金额
- **响应示例**：

  ```json
  {
    "code": 200,
    "message": "success",
    "data": [
      {
        "salesperson_id": 13,
        "salesperson_username": "salesperson_01",
        "salesperson_nickname": "业务员张三",
        "user_count": 150,
        "top_up_count": 200,
        "top_up_amount": 50000.00,
        "real_recharge_amount": 40000.00,
        "real_recharge_count": 120,
        "mock_recharge_amount": 10000.00,
        "mock_recharge_count": 80
      }
    ]
  }
  ```

---

## 3. 刷新 Token

- **接口路径**：`/api/admin-inner/auth/refresh`
- **请求方式**：`POST`
- **接口描述**：使用 `refreshToken` 获取新的 `accessToken` 和 `refreshToken`。
- **请求参数 (Body, JSON)**：| 字段名       | 类型   | 必填 | 说明                 |
  | ------------ | ------ | ---- | -------------------- |
  | refreshToken | String | 是   | 登录时获取的刷新令牌 |
- **响应示例**：
  ```json
  {
    "code": 200,
    "message": "刷新成功",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5c...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5c..."
    }
  }
  ```

---

## 4. 获取当前登录用户信息

- **接口路径**：`/api/admin-inner/current`
- **请求方式**：`GET`
- **鉴权要求**：需携带 Token (`Authorization: Bearer <token>`)
- **接口描述**：解析 Token 获取当前登录的内部账号信息，包含个人资料字段。
- **请求参数**：无
- **响应示例**：
  ```json
  {
    "code": 200,
    "message": "获取成功",
    "data": {
      "adminInnerId": 1,
      "username": "admin",
      "isBindGoogle": false,
      "nickname": "超级管理员",
      "phone": "13800138000",
      "email": "admin@example.com",
      "gender": 1,
      "remark": "这是备注"
    }
  }
  ```

---

## 5. 账号资料修改

### 5.1 修改个人资料

- **接口路径**：`/api/admin-inner/profile`
- **请求方式**：`PUT`
- **鉴权要求**：需携带 Token (`Authorization: Bearer <token>`)
- **接口描述**：修改当前登录内部账号的基础资料。
- **请求参数 (Body, JSON)**：| 字段名   | 类型   | 必填 | 说明                |
  | -------- | ------ | ---- | ------------------- |
  | nickname | String | 否   | 昵称/用户昵称       |
  | phone    | String | 否   | 手机号              |
  | email    | String | 否   | 邮箱                |
  | gender   | Number | 否   | 性别：0未知 1男 2女 |
  | remark   | String | 否   | 备注                |
- **响应示例**：
  ```json
  {
    "code": 200,
    "message": "修改个人资料成功",
    "data": null
  }
  ```

### 5.2 修改登录密码

- **接口路径**：`/api/admin-inner/profile/updatePwd`
- **请求方式**：`PUT`
- **鉴权要求**：需携带 Token (`Authorization: Bearer <token>`)
- **接口描述**：修改当前登录内部账号的登录密码。
- **请求参数 (Body, JSON)**：| 字段名          | 类型   | 必填 | 说明                         |
  | --------------- | ------ | ---- | ---------------------------- |
  | oldPassword     | String | 是   | 旧密码                       |
  | newPassword     | String | 是   | 新密码                       |
  | confirmPassword | String | 是   | 确认密码（必须与新密码一致） |
- **响应示例**：
  ```json
  {
    "code": 200,
    "message": "密码修改成功",
    "data": null
  }
  ```

### 5.3 重置谷歌验证码

- **接口路径**：`/api/admin-inner/profile/resetGoogle`
- **请求方式**：`POST`
- **鉴权要求**：需携带 Token (`Authorization: Bearer <token>`)
- **接口描述**：强制清空当前登录内部账号的谷歌验证码绑定。
- **请求参数**：无
- **响应示例**：
  ```json
  {
    "code": 200,
    "message": "谷歌验证码重置成功",
    "data": null
  }
  ```

---

## 6. 谷歌验证码相关接口

### 5.1 生成谷歌验证码二维码

- **接口路径**：`/api/admin-inner/generate-google-auth`
- **请求方式**：`POST`
- **接口描述**：仅生成密钥并返回二维码，用于绑定前准备（有效期5分钟）。
- **请求参数 (Body, JSON)**：| 字段名   | 类型   | 必填 | 说明     |
  | -------- | ------ | ---- | -------- |
  | username | String | 是   | 登录账号 |
  | password | String | 是   | 登录密码 |
- **响应示例**：
  ```json
  {
    "code": 200,
    "message": "生成成功，请进行扫码并验证绑定",
    "data": {
      "qrCodeUrl": "data:image/png;base64,..."
    }
  }
  ```

### 5.2 绑定谷歌验证码

- **接口路径**：`/api/admin-inner/bindGoogle`
- **请求方式**：`POST`
- **接口描述**：校验手机验证器上的 6 位验证码并完成绑定。
- **请求参数 (Body, JSON)**：| 字段名   | 类型   | 必填 | 说明                |
  | -------- | ------ | ---- | ------------------- |
  | userName | String | 是   | 登录账号            |
  | code     | String | 是   | 验证器上的6位验证码 |
- **响应示例**：
  ```json
  {
    "code": 200,
    "message": "谷歌验证码绑定成功",
    "data": null
  }
  ```

### 5.3 管理员自行解绑谷歌验证码

- **接口路径**：`/api/admin-inner/unbindGoogle`
- **请求方式**：`POST`
- **鉴权要求**：需携带 Token (`Authorization: Bearer <token>`)
- **接口描述**：验证密码后解除自身的谷歌验证码绑定。
- **请求参数 (Body, JSON)**：| 字段名   | 类型   | 必填 | 说明     |
  | -------- | ------ | ---- | -------- |
  | username | String | 是   | 登录账号 |
  | password | String | 是   | 登录密码 |
- **响应示例**：
  ```json
  {
    "code": 200,
    "message": "解绑成功，下次登录将不再需要验证码",
    "data": null
  }
  ```

---

## 7. 获取所有商家及下级列表 (不分页)

- **接口路径**：`/api/admin-inner/merchants/all`
- **请求方式**：`GET`
- **鉴权要求**：需携带 Token (`Authorization: Bearer <token>`)
- **接口描述**：获取系统中所有商家及下级（主管、业务员等所有 `admin_user` 表中的账号），不进行分页。**只返回商家(role=1)的数据，商家下级(主管、业务员)放在商家的 `children` 数组内。**
- **请求参数**：无
- **响应示例**：
  ```json
  {
    "code": 200,
    "message": "success",
    "data": [
      {
        "id": 10,
        "admin_code": 123456789,
        "username": "merchant_01",
        "nickname": "测试商家1",
        "role": 1,
        "status": 1,
        "children": [
          {
            "id": 11,
            "username": "sub_01",
            "role": 2
          },
          {
            "id": 12,
            "username": "sub_02",
            "role": 3
          }
        ]
      }
    ]
  }
  ```

---

## 8. 获取商家列表 (分页筛选)

- **接口路径**：`/api/admin-inner/merchants`
- **请求方式**：`GET`
- **接口描述**：分页获取并筛选商家/管理员账号列表。**只返回商家(role=1)的数据，商家下级(主管、业务员)放在商家的 `children` 数组内。**
- **请求参数 (Query)**：| 字段名    | 类型   | 必填 | 说明                      |
  | --------- | ------ | ---- | ------------------------- |
  | page      | Number | 否   | 页码，默认 1              |
  | page_size | Number | 否   | 每页数量，默认 10         |
  | keyword   | String | 否   | 关键词，模糊匹配 username |
  | status    | Number | 否   | 账号状态：1启用，0禁用    |
- **响应示例**：
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "list": [
        {
          "id": 10,
          "username": "merchant_01",
          "nickname": "测试商家1",
          "role": 1,
          "status": 1,
          "children": [
            {
              "id": 11,
              "username": "sub_01",
              "role": 2
            },
            {
              "id": 12,
              "username": "sub_02",
              "role": 2
            }
          ]
        }
      ],
      "pagination": {
        "total": 1,
        "page": 1,
        "page_size": 10,
        "total_pages": 1
      }
    }
  }
  ```

---

## 9. 获取商家详情

- **接口路径**：`/api/admin-inner/merchants/:id`
- **请求方式**：`GET`
- **接口描述**：根据 ID 获取商家账号详细信息。
- **请求参数 (Path)**：| 字段名 | 类型   | 必填 | 说明    |
  | ------ | ------ | ---- | ------- |
  | id     | Number | 是   | 商家 ID |
- **响应示例**：
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "id": 10,
      "admin_code": 123456789,
      "username": "merchant_01",
      "nickname": "测试商家1",
      "role": 1,
      "status": 1
    }
  }
  ```

---

## 10. 创建商家账号

- **接口路径**：`/api/admin-inner/merchants`
- **请求方式**：`POST`
- **接口描述**：创建一个新的商家账号（底层会自动写入 `admin_users` 表，若不传 `role` 默认设定为 `1` 即商家）。
- **请求参数 (Body, JSON)**：| 字段名   | 类型   | 必填 | 说明                   |
  | -------- | ------ | ---- | ---------------------- |
  | username | String | 是   | 登录账号               |
  | password | String | 是   | 登录密码               |
  | nickname | String | 否   | 昵称                   |
  | phone    | String | 否   | 手机号                 |
  | email    | String | 否   | 邮箱                   |
  | remark   | String | 否   | 备注信息               |
  | role     | Number | 否   | 角色，默认为 1（商家） |
- **响应示例**：
  ```json
  {
    "code": 200,
    "message": "创建成功",
    "data": {
      "id": 11,
      "username": "merchant_new",
      "nickname": "新商家",
      "role": 1,
      "status": 1
    }
  }
  ```

---

## 11. 更新商家账号

- **接口路径**：`/api/admin-inner/merchants/:id`
- **请求方式**：`PUT`
- **接口描述**：修改指定商家账号的信息（密码、状态、昵称等）。
- **请求参数 (Path)**：

  | 字段名 | 类型   | 必填 | 说明    |
  | ------ | ------ | ---- | ------- |
  | id     | Number | 是   | 商家 ID |
- **请求参数 (Body, JSON)**：

  | 字段名   | 类型   | 必填 | 说明                       |
  | -------- | ------ | ---- | -------------------------- |
  | password | String | 否   | 新登录密码（不传则不修改） |
  | nickname | String | 否   | 昵称                       |
  | phone    | String | 否   | 手机号                     |
  | email    | String | 否   | 邮箱                       |
  | status   | Number | 否   | 状态：1启用，0禁用         |
  | remark   | String | 否   | 备注信息                   |
- **响应示例**：

  ```json
  {
    "code": 200,
    "message": "更新成功",
    "data": {
      "id": 11,
      "username": "merchant_new",
      "nickname": "新商家修改后",
      "role": 1,
      "status": 1
    }
  }
  ```

---

## 12. 删除商家账号

- **接口路径**：`/api/admin-inner/merchants/:id`
- **请求方式**：`DELETE`
- **接口描述**：删除指定的商家账号，底层会自动清理与该账号关联的相关日志数据并进行物理删除。
- **请求参数 (Path)**：| 字段名 | 类型   | 必填 | 说明    |
  | ------ | ------ | ---- | ------- |
  | id     | Number | 是   | 商家 ID |
- **响应示例**：
  ```json
  {
    "code": 200,
    "message": "删除成功",
    "data": null
  }
  ```

---

## 13. 获取店铺总数据统计

- **接口路径**：`/api/admin-inner/merchants/:id/statistics`
- **请求方式**：`GET`
- **鉴权要求**：需携带 Token (`Authorization: Bearer <token>`)
- **接口描述**：获取当前店铺的综合统计数据，包括业务员数、H5注册用户数、真实/模拟充值数据、身份验证及订单统计等。
- **请求参数 (Path)**：

  | 字段名 | 类型   | 必填 | 说明          |
  | ------ | ------ | ---- | ------------- |
  | id     | Number | 是   | 商家(店铺) ID |
- **返回字段说明**：

  - `salesperson_count`: 总业务员数量
  - `h5_register_count`: 总h5注册数量
  - `real_recharge_count`: 所有用户真实充值次数（走H5充值并成功通过审核）
  - `real_recharge_amount`: 所有用户真实充值金额
  - `mock_recharge_count`: 所有用户模拟充值次数（如代金、员工添加、后台加款）
  - `mock_recharge_amount`: 所有用户模拟充值金额
  - `total_recharge_count`: 所有用户模拟+真实充值次数
  - `total_recharge_amount`: 所有用户模拟+真实充值金额
  - `kyc_verified_count`: 身份验证成功数量
  - `kyc_reward_amount`: 身份验证成功奖励金额（人数 × 该店铺的实名奖励代金配置）
  - `order_count`: 所有订单数（完成任务且支付成功的订单）
- **响应示例**：

  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "salesperson_count": 5,
      "h5_register_count": 120,
      "real_recharge_count": 50,
      "real_recharge_amount": 15000.00,
      "mock_recharge_count": 30,
      "mock_recharge_amount": 3000.00,
      "total_recharge_count": 80,
      "total_recharge_amount": 18000.00,
      "kyc_verified_count": 90,
      "kyc_reward_amount": 9000.00,
      "order_count": 200
    }
  }
  ```

---

## 14. 获取店铺参数设置

- **接口路径**：`/api/admin-inner/merchants/:id/configs`
- **请求方式**：`GET`
- **鉴权要求**：需携带 Token (`Authorization: Bearer <token>`)
- **接口描述**：根据店铺 ID 获取该店铺相关的各项配置参数，包括实名奖励、支付超时、提现设置等。
- **请求参数 (Path)**：

  | 字段名 | 类型   | 必填 | 说明          |
  | ------ | ------ | ---- | ------------- |
  | id     | Number | 是   | 商家(店铺) ID |
- **响应示例**：

  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "realNameConfig": {
        "giftConfig": {
          "name": "实名奖励代金配置",
          "msg": "实名认证审核通过后奖励的代金数量（设置值必须为数字）",
          "config_value": 100
        }
      },
      "payConfig": {
        "timeoutEnable": {
          "name": "支付超时任务开关",
          "msg": "控制是否启用订单支付超时检查任务（true为开启；false为关闭）",
          "config_value": false
        },
        "timeoutTime": {
          "name": "支付超时默认时间",
          "msg": "设置订单支付超时时间（单位：分钟；设置的值必须为整数）",
          "config_value": 600
        }
      },
      "withdrawConfig": {
        "minMoney": {
          "name": "最小提现金额",
          "msg": "最小提现金额（设置值必须为数字）",
          "config_value": 20
        },
        "commissionRate": {
          "name": "提现佣金",
          "msg": "提现佣金设置（百分比，输入值就好，比如0.03）",
          "config_value": 0.03
        },
        "firstWithdrawNeedTask": {
          "name": "首次提现是否需要完成任务",
          "msg": "是否需要完成任务才能体现（true需要；false不需要）",
          "config_value": false
        }
      }
    }
  }
  ```

---

## 15. 更新店铺参数设置

- **接口路径**：`/api/admin-inner/merchants/:id/configs`
- **请求方式**：`PUT`
- **鉴权要求**：需携带 Token (`Authorization: Bearer <token>`)
- **接口描述**：更新该店铺相关的各项配置参数，包括实名奖励、支付超时、提现设置等。
- **请求参数 (Path)**：

  | 字段名 | 类型   | 必填 | 说明          |
  | ------ | ------ | ---- | ------------- |
  | id     | Number | 是   | 商家(店铺) ID |
- **请求参数 (Body, JSON)**：与获取接口的返回 `data` 格式一致。
- **响应示例**：

  ```json
  {
    "code": 200,
    "message": "更新成功",
    "data": null
  }
  ```

---

## 16. 创建下级业务员账号

- **接口路径**：`/api/admin-inner/salespersons`
- **请求方式**：`POST`
- **鉴权要求**：需携带 Token (`Authorization: Bearer <token>`)
- **接口描述**：创建一个新的下级业务员账号。
- **请求参数 (Body, JSON)**：

  | 字段名              | 类型   | 必填 | 说明                                    |
  | ------------------- | ------ | ---- | --------------------------------------- |
  | username            | String | 是   | 登录账号                                |
  | password            | String | 是   | 登录密码                                |
  | nickname            | String | 否   | 昵称                                    |
  | phone               | String | 否   | 手机号                                  |
  | email               | String | 否   | 邮箱                                    |
  | bind_admin_id       | Number | 否   | 绑定的上级管理员 ID（默认为当前操作者） |
  | remark              | String | 否   | 备注信息                                |
  | bindRechargeaddress | String | 否   | 绑定充值地址                            |
- **响应示例**：

  ```json
  {
    "code": 200,
    "message": "创建成功",
    "data": {
      "id": 13,
      "username": "salesperson_new",
      "nickname": "新业务员",
      "role": 2,
      "status": 1
    }
  }
  ```

---

## 17. 更新下级业务员账号

- **接口路径**：`/api/admin-inner/salespersons/:id`
- **请求方式**：`PUT`
- **鉴权要求**：需携带 Token (`Authorization: Bearer <token>`)
- **接口描述**：修改指定下级业务员账号的信息（密码、状态、昵称等）。
- **请求参数 (Path)**：

  | 字段名 | 类型   | 必填 | 说明      |
  | ------ | ------ | ---- | --------- |
  | id     | Number | 是   | 业务员 ID |
- **请求参数 (Body, JSON)**：

  | 字段名              | 类型   | 必填 | 说明                       |
  | ------------------- | ------ | ---- | -------------------------- |
  | password            | String | 否   | 新登录密码（不传则不修改） |
  | nickname            | String | 否   | 昵称                       |
  | phone               | String | 否   | 手机号                     |
  | email               | String | 否   | 邮箱                       |
  | status              | Number | 否   | 状态：1启用，0禁用         |
  | bind_admin_id       | Number | 否   | 绑定的上级管理员 ID        |
  | remark              | String | 否   | 备注信息                   |
  | bindRechargeaddress | String | 否   | 绑定充值地址               |
- **响应示例**：

  ```json
  {
    "code": 200,
    "message": "更新成功",
    "data": {
      "id": 13,
      "username": "salesperson_new",
      "nickname": "新业务员修改后",
      "role": 2,
      "status": 1
    }
  }
  ```

---

## 18. 删除下级业务员账号

- **接口路径**：`/api/admin-inner/salespersons/:id`
- **请求方式**：`DELETE`
- **鉴权要求**：需携带 Token (`Authorization: Bearer <token>`)
- **接口描述**：删除指定的下级业务员账号，底层会自动清理与该账号关联的相关日志数据并进行物理删除。
- **请求参数 (Path)**：

  | 字段名 | 类型   | 必填 | 说明      |
  | ------ | ------ | ---- | --------- |
  | id     | Number | 是   | 业务员 ID |
- **响应示例**：

  ```json
  {
    "code": 200,
    "message": "删除成功",
    "data": null
  }
  ```
