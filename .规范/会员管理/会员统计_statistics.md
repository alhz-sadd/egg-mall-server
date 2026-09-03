# 会员统计接口文档

## 基础信息
- **接口地址**: `/api/admin/members/statistics`
- **请求方式**: `GET`
- **鉴权**: 需管理端登录 (`Authorization: Bearer <token>`)
- **权限范围**: 
  - 业务员 (Role 3): 仅统计自己绑定的会员数据
  - 主管 (Role 2): 统计自己及下级所有业务员绑定的会员数据
  - 管理员 (Role 1): 统计全站所有会员数据

---

## 响应数据结构与字段说明

接口返回的数据 (`data` 对象) 包含以下字段，用于在管理端控制台或会员管理页面展示各项统计指标：

| 字段名 | 类型 | 说明 | 业务含义 |
| :--- | :--- | :--- | :--- |
| `total_users` | Number | **总注册量** | 权限范围内的所有已注册会员总数 |
| `today_new` | Number | **今日新增** | 今日 00:00:00 至今注册的新会员数量 |
| `yesterday_new` | Number | **昨日新增** | 昨日全天（00:00:00 - 23:59:59）注册的新会员数量 |
| `recharge_users` | Number | **累计充值人数** | 历史至今有过充值记录（不论金额）的排重会员总人数 |
| `recharge_count` | Number | **累计充值笔数** | 历史至今产生的所有充值记录总笔数（不去重） |
| `withdraw_users` | Number | **累计提现人数** | 历史至今有过提现记录的排重会员总人数 |
| `withdraw_count` | Number | **累计提现笔数** | 历史至今产生的所有提现记录总笔数（不去重） |
| `today_recharge_users` | Number | **今日充值人数** | 今日有过充值记录的排重会员人数 |
| `today_recharge_count` | Number | **今日充值笔数** | 今日产生的所有充值记录总笔数 |
| `yesterday_recharge_users` | Number | **昨日充值人数** | 昨日有过充值记录的排重会员人数 |
| `yesterday_recharge_count` | Number | **昨日充值笔数** | 昨日产生的所有充值记录总笔数 |
| `today_withdraw_users` | Number | **今日提现人数** | 今日有过提现记录的排重会员人数 |
| `today_withdraw_count` | Number | **今日提现笔数** | 今日产生的所有提现记录总笔数 |
| `yesterday_withdraw_users` | Number | **昨日提现人数** | 昨日有过提现记录的排重会员人数 |
| `yesterday_withdraw_count` | Number | **昨日提现笔数** | 昨日产生的所有提现记录总笔数 |

---

## 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total_users": 1500,
    "yesterday_new": 45,
    "today_new": 20,
    
    "recharge_users": 800,
    "recharge_count": 2100,
    "withdraw_users": 650,
    "withdraw_count": 1800,
    
    "today_recharge_users": 50,
    "today_recharge_count": 75,
    "yesterday_recharge_users": 120,
    "yesterday_recharge_count": 150,
    
    "today_withdraw_users": 30,
    "today_withdraw_count": 35,
    "yesterday_withdraw_users": 90,
    "yesterday_withdraw_count": 100
  }
}
```
