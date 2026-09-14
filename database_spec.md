# 数据库规范文档 (Database Specification)

> **核心规则：**
> 1. 不可随意在线上创建表，创建表都需要停止并提示是否添加表。
> 2. ABC3端的所有用户必须存在 sys_user 表里，没有特定要求不新建表。
> 3. 如果代码里还有维护没有的表，就要标注给我询问，不准直接去创建表。
> 4. 严禁在未查看此文件的情况下主观臆断表结构，确保所有外键关联（如 user_id, shop_id, category_id）准确无误。
> 5. 如果在开发过程中新增了表，或修改了现有表的核心字段/关联关系，**必须同步更新本文件**，以保持架构文档的绝对一致性。
> 6. 任何涉及数据库结构修改、新表设计、接口重构的任务，**必须优先读取此文件**。

## 数据库表清单及主键/外键规则

### 表名: SequelizeMeta
- **功能**: 待补充
- **主键**: name
- **核心字段**: 
  - name (varchar(255)): 无

### 表名: customer_relation
- **功能**: 待补充
- **主键**: id
- **关联外键**: c_user_id, parent_customer_user_id, salesman_user_id, shop_id, root_salesman_user_id, root_shop_id, operator_user_id
- **核心字段**: 
  - id (bigint(20)): 主键
  - c_user_id (bigint(20)): C端用户id(sys_user.user_id type=4)
  - parent_customer_user_id (bigint(20)): 直接上级C用户ID
  - salesman_user_id (bigint(20)): 业务员账号id(sys_user.user_id type=3)
  - shop_id (bigint(20)): 店铺id shop.shop_id
  - root_salesman_user_id (bigint(20)): 源头业务员ID，仅用于页面展示、业绩统计，不参与返佣
  - root_shop_id (bigint(20)): 源头业务员所属店铺ID，冗余
  - bind_type (tinyint(4)): 绑定来源1业务员开拓 2平台分配 3扫码 4后台分配
  - status (tinyint(4)): 1有效，0解绑
  - bind_time (datetime): 绑定时间
  - unbind_time (datetime): 解绑时间
  - operator_user_id (bigint(20)): 操作人账号id
  - remark (varchar(500)): 备注
  - create_time (datetime): 创建时间
  - update_time (datetime): 更新时间
  - is_deleted (tinyint(4)): 软删除：0正常, 1删除

### 表名: goods
- **功能**: 待补充
- **主键**: goods_id
- **关联外键**: category_id, create_user_id, update_user_id
- **核心字段**: 
  - goods_id (bigint(20)): 主键自增
  - goods_name (varchar(255)): 商品名称
  - goods_no (varchar(64)): 商品编码，业务唯一编码
  - goods_type (tinyint(4)): 商品类型：1普通商品，2任务商品
  - category_id (bigint(20)): 关联 goods_category.category_id
  - cover_image (varchar(512)): 商品主图
  - images (text): 多张图JSON数组
  - price (decimal(12,2)): 商品价格
  - stock (int(11)): 库存数量
  - sales (int(11)): 销量
  - content (text): 商品详情富文本
  - sort (int(11)): 后台排序
  - status (tinyint(4)): 0下架，1上架
  - remark (varchar(500)): 后台备注
  - create_user_id (bigint(20)): 创建人ID
  - update_user_id (bigint(20)): 修改人ID
  - create_time (datetime): 创建时间
  - update_time (datetime): 更新时间
  - is_deleted (tinyint(4)): 软删除 0正常 1删除

### 表名: recharge_order
- **功能**: 待补充
- **主键**: id
- **关联外键**: shop_id, user_id, sales_user_id, audit_user_id
- **核心字段**: 
  - id (bigint(20)): 主键ID
  - order_no (varchar(64)): 充值订单号，唯一
  - shop_id (bigint(20)): 所属店铺ID
  - user_id (bigint(20)): C端用户ID，关联sys_user.user_id
  - sales_user_id (bigint(20)): 归属业务员ID，关联sys_user.user_id
  - channel_code (varchar(64)): 充值渠道编码 usdt_trc20 / usdt_erc20
  - channel_name (varchar(128)): 渠道展示名称
  - amount (decimal(18,6)): 用户填写转账原始金额
  - fee (decimal(18,6)): 充值手续费
  - system_receive_amount (decimal(18,6)): 系统实收金额 amount-fee
  - user_receive_amount (decimal(18,6)): 用户钱包实际到账金额
  - is_first_recharge (tinyint(4)): 是否首充 0否 1是
  - status (tinyint(4)): 订单状态：1待审核，2审核通过，3审核驳回，4已取消
  - voucher_img (varchar(255)): 用户转账凭证图片地址
  - audit_user_id (bigint(20)): 审核人ID
  - audit_time (datetime): 审核时间
  - remark (varchar(500)): 备注/审核驳回原因
  - create_time (datetime): 创建时间
  - update_time (datetime): 更新时间
  - is_deleted (tinyint(4)): 软删除标记

### 表名: recharge_ways
- **功能**: 待补充
- **主键**: id
- **关联外键**: admin_id
- **核心字段**: 
  - id (int(10) unsigned): ID
  - admin_id (int(10) unsigned): 店铺管理员ID
  - way (varchar(64)): 充值方式名称
  - address (varchar(255)): 充值地址/收款账号
  - sort (int(10) unsigned): 排序，数字越小越靠前
  - remark (varchar(255)): 备注
  - status (int(11)): 状态：0启用 1禁用
  - created_by (varchar(64)): 添加人
  - created_at (datetime): 无
  - updated_at (datetime): 无

### 表名: sales_recharge_address
- **功能**: 待补充
- **主键**: id
- **关联外键**: sales_user_id, shop_id
- **核心字段**: 
  - id (bigint(20)): 无
  - sales_user_id (bigint(20)): 无
  - shop_id (bigint(20)): 无
  - channel_code (varchar(50)): 无
  - channel_name (varchar(100)): 无
  - address (varchar(255)): 无
  - qr_code (varchar(255)): 无
  - remark (varchar(255)): 无
  - is_enable (tinyint(4)): 无
  - sort (tinyint(4)): 无
  - create_time (datetime): 无
  - update_time (datetime): 无
  - is_deleted (tinyint(4)): 软删除 0正常 1删除

### 表名: shop
- **功能**: 待补充
- **主键**: shop_id
- **关联外键**: create_user_id, update_user_id
- **核心字段**: 
  - shop_id (bigint(20)): 主键 自增
  - shop_name (varchar(128)): 店铺名称，必填
  - shop_no (varchar(64)): 店铺业务编号，唯一编码，如 SH20260905001
  - contact_person (varchar(64)): 店铺联系人
  - contact_phone (varchar(20)): 店铺联系电话
  - province (varchar(32)): 省份
  - city (varchar(32)): 城市
  - district (varchar(32)): 区县
  - address (varchar(255)): 详细地址
  - logo (varchar(255)): 店铺logo地址，可为null
  - business_scope (varchar(500)): 经营范围，可为null
  - expire_time (datetime): 服务到期时间；null=永久有效
  - status (tinyint(4)): 店铺状态：0禁用，1启用
  - settlement_type (tinyint(4)): 结算类型，业务用，可为null
  - remark (varchar(500)): 备注
  - create_user_id (bigint(20)): 创建人user_id（平台管理员sys_user.user_id）
  - update_user_id (bigint(20)): 修改人user_id
  - create_time (datetime): 创建时间
  - update_time (datetime): 更新时间
  - is_deleted (tinyint(4)): 软删除：0正常，1删除

### 表名: shop_config
- **功能**: 待补充
- **主键**: config_id
- **关联外键**: shop_id
- **核心字段**: 
  - config_id (bigint(20)): 主键ID
  - shop_id (bigint(20)): 关联 shop.shop_id
  - real_name_reward (decimal(16,2)): 实名奖励金额，发放虚拟金额
  - order_pay_timeout_switch (tinyint(4)): 0=关闭支付超时，1=开启支付超时开关
  - order_pay_timeout (int(11)): 支付超时时间，单位秒
  - withdraw_min_amount (decimal(16,2)): 提现最小金额
  - withdraw_fee_type (tinyint(4)): 1=固定金额手续费，2=百分比手续费
  - withdraw_fee_value (decimal(16,2)): 提现佣金；固定填金额；百分比填数字
  - withdraw_first_need_task (tinyint(4)): 0=首次提现不需要完成任务，1=首次提现需要完成任务
  - withdraw_first_need_identity (tinyint(4)): 0=首次提现不需要身份认证，1=首次提现必须身份认证审核通过
  - create_time (datetime): 创建时间
  - update_time (datetime): 更新时间

### 表名: shop_goods
- **功能**: 待补充
- **主键**: goods_id
- **关联外键**: shop_id, category_id
- **核心字段**: 
  - goods_id (bigint(20)): 无
  - shop_id (bigint(20)): 无
  - goods_name (varchar(255)): 无
  - goods_type (tinyint(4)): 1普通商品 2任务商品
  - price (decimal(16,2)): 无
  - cover_image (varchar(255)): 无
  - redirect_url (varchar(500)): 无
  - status (tinyint(4)): 无
  - create_time (datetime): 无
  - update_time (datetime): 无
  - category_id (bigint(20)): 关联 goods_category.category_id
  - is_deleted (tinyint(4)): 软删除：0正常，1删除
  - goods_no (varchar(64)): 商品编码

### 表名: shop_pay_channel
- **功能**: 待补充
- **主键**: id
- **关联外键**: shop_id
- **核心字段**: 
  - id (bigint(20)): 主键
  - shop_id (bigint(20)): 归属店铺ID。0代表A端设置的全局模板
  - channel_type (tinyint(4)): 渠道类型：1充值 2提现
  - channel_code (varchar(64)): 渠道编码
  - channel_name (varchar(128)): 渠道展示名称
  - is_platform_default (tinyint(4)): 是否是平台默认模板复制来的 (1是 0否)。B端不可删除=1的记录
  - is_enable (tinyint(4)): 是否启用 (1启用 0禁用)
  - sort (int(11)): 排序，越小越靠前
  - remark (varchar(500)): 备注
  - create_time (datetime): 创建时间
  - update_time (datetime): 更新时间

### 表名: shop_task
- **功能**: 待补充
- **主键**: task_id
- **关联外键**: shop_id
- **核心字段**: 
  - task_id (bigint(20)): 主键
  - shop_id (bigint(20)): 归属店铺ID
  - task_name (varchar(128)): 任务名称
  - min_amount (decimal(16,2)): 最低金额
  - yield_rate (decimal(10,4)): 收益率
  - parent_yield_rate (decimal(10,4)): 上级收益率
  - task_count (int(11)): 任务单数
  - balance_min_rate (decimal(10,4)): 余额最小使用率
  - balance_max_rate (decimal(10,4)): 余额最大使用率
  - task_type (tinyint(4)): 类型 0:默认, 1:自定义
  - status (tinyint(4)): 状态 0:停用, 1:启用
  - check_parent (tinyint(4)): 是否校验上级 0:不校验, 1:校验
  - daily_update_type (tinyint(4)): 每日任务更新 0:手动, 1:自动
  - lucky_team_assign (tinyint(4)): 幸运单团队分配 0:不分配, 1:分配
  - create_time (datetime): 无
  - update_time (datetime): 无
  - is_deleted (tinyint(4)): 无

### 表名: shop_task_item
- **功能**: 待补充
- **主键**: item_id
- **关联外键**: task_id
- **核心字段**: 
  - item_id (bigint(20)): 主键
  - task_id (bigint(20)): 关联shop_task.task_id
  - item_type (tinyint(4)): 任务类型 1:普通订单任务, 2:幸运订单任务
  - sort (int(11)): 任务执行顺序
  - require_count (int(11)): 需要完成的笔数
  - create_time (datetime): 无
  - update_time (datetime): 无
  - is_deleted (tinyint(4)): 无
  - yield_rate (decimal(10,2)): 子项独立收益率
  - is_lucky_order (tinyint(1)): 是否幸运订单 0否 1是
  - append_amount (decimal(10,2)): 追加金额
  - goods_price (decimal(10,2)): 商品价格

### 表名: shop_task_order_rel
- **功能**: 待补充
- **主键**: id
- **关联外键**: task_id, order_id
- **核心字段**: 
  - id (bigint(20)): 无
  - task_id (bigint(20)): 无
  - order_id (bigint(20)): 无
  - order_type (varchar(20)): 无
  - create_time (datetime): 无

### 表名: shop_task_reward
- **功能**: 待补充
- **主键**: id
- **关联外键**: task_id
- **核心字段**: 
  - id (bigint(20)): 无
  - task_id (bigint(20)): 无
  - reward_type (tinyint(4)): 无
  - reward_amount (decimal(16,2)): 无
  - create_time (datetime): 无

### 表名: shop_task_user
- **功能**: 待补充
- **主键**: id
- **关联外键**: user_id, task_id
- **核心字段**: 
  - id (bigint(20)): 无
  - user_id (bigint(20)): 无
  - task_id (bigint(20)): 无
  - status (tinyint(4)): 无
  - create_time (datetime): 无
  - update_time (datetime): 无

### 表名: shop_vip_level
- **功能**: 待补充
- **主键**: id
- **关联外键**: shop_id
- **核心字段**: 
  - id (bigint(20)): 主键ID
  - shop_id (bigint(20)): 所属店铺ID，关联shop.id
  - level (tinyint(4)): VIP等级数字，例如1、2、3，数字越大等级越高
  - level_name (varchar(100)): VIP等级名称，如VIP1、黄金会员
  - need_total_recharge (decimal(18,6)): 升级所需累计充值金额
  - benefit (text): 权益描述，文本存储，后台填写展示
  - sort (int(11)): 排序号
  - is_enable (tinyint(4)): 是否启用：0禁用，1启用
  - create_time (datetime): 创建时间
  - update_time (datetime): 更新时间

### 表名: sys_dict
- **功能**: 待补充
- **主键**: dict_id
- **核心字段**: 
  - dict_id (bigint(20)): 无
  - dict_name (varchar(100)): 无
  - dict_type (varchar(100)): 无
  - status (tinyint(4)): 无
  - remark (varchar(500)): 无
  - create_time (datetime): 无
  - update_time (datetime): 无

### 表名: sys_file
- **功能**: 待补充
- **主键**: file_id
- **核心字段**: 
  - file_id (bigint(20)): 无
  - file_name (varchar(255)): 无
  - file_url (varchar(500)): 无
  - file_size (bigint(20)): 无
  - file_type (varchar(50)): 无
  - create_time (datetime): 无

### 表名: sys_h5_config
- **功能**: 待补充
- **主键**: id
- **关联外键**: create_user_id, update_user_id
- **核心字段**: 
  - id (bigint(20)): 主键自增
  - config_type (tinyint(4)): 类型：1-Banner, 2-公告, 3-规则管理, 4-首页商品, 5-任务商品
  - title (varchar(255)): 标题：banner标题、公告标题、规则名称、商品显示名称
  - cover_image (varchar(512)): 封面图；banner图、商品封面图；可为null
  - content (text): 内容：公告正文、规则富文本内容
  - extra (text): 扩展JSON字段
  - sort (int(11)): 排序，数字越小越靠前
  - status (tinyint(4)): 0禁用，1启用
  - remark (varchar(500)): 后台备注
  - create_user_id (bigint(20)): 创建人ID
  - update_user_id (bigint(20)): 修改人ID
  - create_time (datetime): 创建时间
  - update_time (datetime): 更新时间
  - is_deleted (tinyint(4)): 软删除：0正常 1删除

### 表名: sys_h5_service
- **功能**: 待补充
- **主键**: id
- **关联外键**: create_user_id, update_user_id
- **核心字段**: 
  - id (bigint(20)): 主键自增
  - service_name (varchar(128)): 客服昵称/名称
  - avatar (varchar(512)): 客服头像图片地址
  - contact_type (tinyint(4)): 1-微信，2-QQ，3-手机号
  - contact_value (varchar(512)): 对应联系方式字符串
  - jump_url (varchar(512)): 跳转地址
  - sort (int(11)): 排序，数值越小越靠前
  - status (tinyint(4)): 0禁用，1启用
  - remark (varchar(500)): 后台备注
  - create_user_id (bigint(20)): 创建人ID
  - update_user_id (bigint(20)): 修改人ID
  - create_time (datetime): 创建时间
  - update_time (datetime): 更新时间
  - is_deleted (tinyint(4)): 软删除：0正常 1删除

### 表名: sys_menu
- **功能**: 待补充
- **主键**: menu_id
- **关联外键**: parent_id
- **核心字段**: 
  - menu_id (bigint(20)): 主键
  - parent_id (bigint(20)): 父ID；0代表一级目录
  - menu_name (varchar(100)): 菜单/按钮名称
  - route_path (varchar(255)): 前端路由；outer端要用；inner端填空
  - component (varchar(255)): 前端组件；outer端要用；inner端填空
  - api_tag (varchar(20)): inner=内部后台；outer=店铺外部后台
  - perms (varchar(255)): 权限标识字符串，例如：withdraw:audit、user:list；接口鉴权核心
  - menu_type (tinyint(4)): 1目录，2菜单页面，3按钮
  - sort (int(11)): 排序号
  - enable (tinyint(4)): 0禁用 1启用
  - create_time (datetime): 无
  - update_time (datetime): 无
  - icon (varchar(255)): 菜单图标

### 表名: sys_oper_log
- **功能**: 待补充
- **主键**: id
- **关联外键**: user_id
- **核心字段**: 
  - id (bigint(20)): 无
  - title (varchar(64)): 无
  - business_type (tinyint(4)): 无
  - method (varchar(128)): 无
  - request_method (varchar(16)): 无
  - user_id (bigint(20)): 无
  - username (varchar(64)): 无
  - oper_url (varchar(255)): 无
  - oper_ip (varchar(64)): 无
  - oper_location (varchar(255)): 无
  - oper_param (text): 无
  - json_result (text): 无
  - status (tinyint(4)): 无
  - error_msg (text): 无
  - oper_time (datetime): 无

### 表名: sys_role
- **功能**: 待补充
- **主键**: role_id
- **核心字段**: 
  - role_id (bigint(20)): 主键
  - role_name (varchar(64)): 角色中文名称
  - role_code (varchar(64)): 角色编码，唯一：platform_admin / shop_owner / shop_salesman
  - remark (varchar(500)): 备注
  - create_time (datetime): 无
  - update_time (datetime): 无
  - is_deleted (tinyint(4)): 软删除：0正常，1删除

### 表名: sys_role_menu
- **功能**: 待补充
- **主键**: role_id, menu_id
- **核心字段**: 
  - role_id (bigint(20)): 无
  - menu_id (bigint(20)): 菜单ID
  - create_time (datetime): 创建时间

### 表名: sys_user
- **功能**: 待补充
- **主键**: user_id
- **关联外键**: inviter_user_id, shop_id, role_id, create_user_id
- **核心字段**: 
  - user_id (bigint(20)): 主键，自增
  - username (varchar(64)): 登录账号，后台账号用账号登录，C端可以手机号当username
  - password (varchar(128)): 加密后的密码（bcrypt）；C端第三方登录可允许为空
  - nickname (varchar(64)): 昵称，展示名称
  - phone (varchar(20)): 手机号，可以为空
  - invite_code (varchar(20)): 个人专属邀请码，全局唯一，用于C端或业务员拉新
  - inviter_user_id (bigint(20)): 直接邀请我的C用户ID，快捷冗余字段
  - avatar (varchar(255)): 头像地址
  - user_type (tinyint(4)): 账号类型：1=A平台管理员，2=B店家，3=B业务员，4=C普通用户
  - shop_id (bigint(20)): 所属店铺ID，关联shop.shop_id
  - role_id (bigint(20)): 角色ID，关联sys_role.role_id
  - email (varchar(128)): 邮箱，可选
  - status (tinyint(4)): 账号状态：0禁用，1启用
  - last_login_time (datetime): 最后登录时间
  - last_login_ip (varchar(50)): 最后登录IP
  - create_user_id (bigint(20)): 创建人user_id，哪个账号创建的这条记录
  - remark (varchar(500)): 账号备注
  - create_time (datetime): 创建时间
  - update_time (datetime): 更新时间
  - is_deleted (tinyint(4)): 软删除：0正常，1已删除
  - totp_secret (varchar(64)): TOTP底层密钥，生成二维码、校验验证码靠它，只存后端
  - totp_enable (tinyint(4)): 开关：0未开启；1已成功绑定启用
  - totp_recovery_codes (varchar(500)): 恢复码集合，逗号分隔
  - has_withdraw (tinyint(4)): 0=首次提现, 1=已提现过
  - is_recharged (tinyint(4)): 0未充值 1已充值；冗余展示，权威数据以充值订单为准
  - is_real_user (tinyint(4)): 真实/虚拟用户（0虚拟/机器人，1真实注册用户）
  - withdraw_pwd (varchar(128)): 提现密码，加密哈希，C端专用；B端账号为NULL
  - withdraw_pwd_salt (varchar(64)): 提现密码盐值
  - vip_level (tinyint(4)): C端用户VIP等级数字
  - withdraw_password (varchar(128)): 提现密码
  - recharge_address (varchar(255)): 业务员专用的收款地址（C端充值时获取绑定业务员的该地址）

### 表名: sys_user_role
- **功能**: 待补充
- **主键**: id
- **关联外键**: user_id, role_id
- **核心字段**: 
  - id (bigint(20)): 主键
  - user_id (bigint(20)): sys_user.user_id
  - role_id (bigint(20)): sys_role.role_id

### 表名: user_identity
- **功能**: 待补充
- **主键**: identity_id
- **关联外键**: user_id, audit_user_id
- **核心字段**: 
  - identity_id (bigint(20)): 主键自增
  - user_id (bigint(20)): 关联 sys_user.user_id，一个用户最多一条有效认证记录
  - real_name (varchar(64)): 真实姓名
  - id_card_no (varchar(255)): 身份证号码；加密存储
  - id_card_front (varchar(512)): 身份证正面图片地址
  - id_card_back (varchar(512)): 身份证反面图片地址
  - hand_id_card (varchar(512)): 手持身份证照片，可为null
  - audit_status (tinyint(4)): 0未提交，1待审核，2审核通过，3审核驳回
  - audit_user_id (bigint(20)): 平台审核管理员ID
  - audit_time (datetime): 审核时间
  - reject_reason (varchar(500)): 驳回原因
  - create_time (datetime): 提交时间
  - update_time (datetime): 更新时间
  - is_deleted (tinyint(4)): 软删除 0正常，1删除

### 表名: user_login_log
- **功能**: 待补充
- **主键**: id
- **关联外键**: user_id
- **核心字段**: 
  - id (bigint(20)): 自增主键
  - log_no (varchar(64)): 登录日志业务编号，对外溯源展示
  - user_id (bigint(20)): 关联sys_user.id
  - username (varchar(64)): 账号冗余保存
  - login_ip (varchar(64)): 登录原始IP地址
  - login_location (varchar(128)): IP解析地理位置，程序解析后存入，解析失败为NULL
  - user_agent (text): 原始UA完整字符串
  - device_type (tinyint(4)): 设备类型：1 PC电脑 2安卓 3 iOS苹果 4其他设备
  - browser (varchar(64)): 浏览器名称：Chrome / Edge / Safari / 微信内置浏览器等
  - os (varchar(64)): 操作系统：Windows11、MacOS、Android14、iOS18
  - login_type (tinyint(4)): 1:A平台端 2:B店铺后台 3:C端H5
  - login_result (tinyint(4)): 0登录失败 1登录成功
  - remark (varchar(256)): 操作备注信息
  - login_time (datetime): 登录发生时间

### 表名: user_login_logs
- **功能**: 待补充
- **主键**: id
- **关联外键**: admin_id, user_id
- **核心字段**: 
  - id (int(10) unsigned): ID
  - admin_id (int(10) unsigned): 店铺管理员ID
  - user_id (int(10) unsigned): 用户ID
  - username (varchar(64)): 登录账号
  - ip (varchar(64)): IP地址
  - location (varchar(255)): 登录地点
  - device (varchar(128)): 设备信息
  - browser (varchar(128)): 浏览器信息
  - os (varchar(64)): 操作系统
  - operation (varchar(64)): 操作信息：登录成功/退出成功/登录失败：密码错误/登录失败：用户不存在/账号已禁用
  - duration (int(11)): 消耗时间（毫秒）
  - status (int(11)): 状态：0登录成功 1登录失败
  - remark (varchar(500)): 备注
  - created_at (datetime): 无
  - updated_at (datetime): 无

### 表名: user_operate_log
- **功能**: 待补充
- **主键**: id
- **关联外键**: user_id, shop_id
- **核心字段**: 
  - id (bigint(20)): 主键ID
  - user_id (bigint(20)): C端用户ID，关联sys_user
  - shop_id (bigint(20)): 所属店铺ID
  - operate_type (varchar(50)): 操作类型：login 登录、submit_recharge 提交充值、submit_withdraw 提交提现、modify_withdraw_pwd 修改提现密码
  - operate_content (varchar(500)): 操作描述
  - ip (varchar(100)): 用户IP地址
  - user_agent (varchar(1000)): 浏览器/设备UA信息
  - create_time (datetime): 操作时间

### 表名: user_recharge
- **功能**: 待补充
- **主键**: id
- **关联外键**: shop_id, user_id, sales_user_id, audit_user_id
- **核心字段**: 
  - id (bigint(20)): 主键ID
  - order_no (varchar(64)): 充值订单号，唯一
  - shop_id (bigint(20)): 所属店铺ID
  - user_id (bigint(20)): C端用户ID，关联sys_user.id
  - sales_user_id (bigint(20)): 归属业务员ID，关联sys_user.id
  - channel_code (varchar(64)): 充值渠道编码
  - channel_name (varchar(128)): 渠道展示名称
  - amount (decimal(18,6)): 用户填写转账原始金额
  - fee (decimal(18,6)): 充值手续费
  - system_receive_amount (decimal(18,6)): 系统实际到账金额 (amount - fee)
  - user_receive_amount (decimal(18,6)): 用户钱包实际增加金额
  - is_first_recharge (tinyint(4)): 是否为首充：1是，0否
  - status (tinyint(4)): 订单状态：1待审核，2审核通过，3审核驳回，4已取消
  - audit_type (tinyint(4)): 审核类型：1真实充值，2虚拟充值 (通过审核时由业务员选择)
  - voucher_img (varchar(255)): 用户转账凭证图片地址
  - audit_user_id (bigint(20)): 审核人ID（B端操作人sys_user.id）
  - audit_time (datetime): 审核时间
  - reject_reason (varchar(500)): 驳回原因
  - remark (varchar(500)): 备注
  - create_time (datetime): 创建时间
  - update_time (datetime): 更新时间

### 表名: user_tasks
- **功能**: 待补充
- **主键**: id
- **关联外键**: admin_id, user_id, task_id
- **核心字段**: 
  - id (int(10) unsigned): ID
  - admin_id (int(10) unsigned): 店铺管理员ID
  - user_id (int(10) unsigned): 用户ID
  - task_id (int(10) unsigned): 任务ID
  - reward (decimal(10,2)): 任务收益
  - task_date (date): 任务完成日期
  - status (int(11)): 状态：1完成 0取消
  - created_at (datetime): 无
  - updated_at (datetime): 无

### 表名: user_wallet
- **功能**: 待补充
- **主键**: wallet_id
- **关联外键**: user_id
- **核心字段**: 
  - wallet_id (bigint(20)): 主键
  - user_id (bigint(20)): 关联 sys_user.user_id，唯一索引，一个用户1条钱包
  - voucher_balance (decimal(18,2)): 代金资产
  - static_income (decimal(18,2)): 静态收益
  - dynamic_income (decimal(18,2)): 动态收益
  - freeze_voucher_balance (decimal(18,2)): 冻结-代金资产
  - freeze_static_income (decimal(18,2)): 冻结-静态收益
  - freeze_dynamic_income (decimal(18,2)): 冻结-动态收益
  - total_recharge_amount (decimal(18,2)): 累计充值金额
  - total_withdraw_amount (decimal(18,2)): 累计提现金额
  - create_time (datetime): 无
  - update_time (datetime): 无
  - total_invite_commission (decimal(18,2)): 邀请累计总收益（仅用于C端页面展示，无明细）

### 表名: user_wallet_log
- **功能**: 待补充
- **主键**: id
- **关联外键**: user_id, related_order_id
- **核心字段**: 
  - id (bigint(20)): 无
  - user_id (bigint(20)): C用户ID
  - log_no (varchar(64)): 流水编号
  - biz_type (tinyint(4)): 业务类型：1充值 2提现申请 3提现驳回退回 4静态收益发放 5动态收益发放 6资产扣减 7其他
  - amount (decimal(18,2)): 变动金额；正数增加，负数扣减
  - balance_type (tinyint(4)): 1代金资产 2静态收益 3动态收益
  - before_balance (decimal(18,2)): 变动前余额
  - after_balance (decimal(18,2)): 变动后余额
  - related_order_id (bigint(20)): 关联订单ID，充值/提现订单id
  - remark (varchar(512)): 备注说明
  - create_time (datetime): 无

### 表名: user_withdraw
- **功能**: 待补充
- **主键**: id
- **关联外键**: shop_id, user_id, audit_user_id, sales_user_id
- **核心字段**: 
  - id (bigint(20)): 主键ID
  - order_no (varchar(64)): 提现订单号，唯一
  - shop_id (bigint(20)): 所属店铺ID
  - user_id (bigint(20)): C端用户ID，关联sys_user.id
  - channel_code (varchar(64)): 提现渠道编码 usdt_trc20 / usdt_erc20
  - channel_name (varchar(128)): 提现渠道名称
  - withdraw_address (varchar(255)): 用户填写的提现钱包地址
  - amount (decimal(18,6)): 用户申请提现金额（钱包扣减金额）
  - fee (decimal(18,6)): 提现手续费
  - actual_receive_amount (decimal(18,6)): 用户链上实际收到金额 = amount - fee
  - status (tinyint(4)): 订单状态：1待审核，2审核通过，3审核驳回，4已取消
  - audit_type (tinyint(4)): 审核类型：1真实提现，2虚拟提现
  - audit_user_id (bigint(20)): 审核人ID（B端操作人sys_user.id）
  - sales_user_id (bigint(20)): 归属业务员ID
  - audit_time (datetime): 审核时间
  - reject_reason (varchar(500)): 驳回原因
  - remark (varchar(500)): 备注
  - create_time (datetime): 创建时间
  - update_time (datetime): 更新时间

### 表名: withdraw_ways
- **功能**: 待补充
- **主键**: id
- **关联外键**: admin_id
- **核心字段**: 
  - id (int(10) unsigned): ID
  - admin_id (int(10) unsigned): 店铺管理员ID
  - way (varchar(64)): 提现方式名称
  - sort (int(10) unsigned): 排序，数字越小越靠前
  - remark (varchar(255)): 备注
  - status (int(11)): 状态：0启用 1禁用
  - created_by (varchar(64)): 添加人
  - created_at (datetime): 无
  - updated_at (datetime): 无

