'use strict';

/**
 * Swagger contract 统一导出
 * 用于 egg-swagger-doc 生成请求体和响应体 schema
 */
module.exports = {
  // 通用响应结构
  ApiResponse: {
    code: { type: 'integer', required: true, example: 200 },
    message: { type: 'string', required: true, example: 'success' },
    data: { type: 'object', required: false },
  },

  // 分页查询参数
  PaginationQuery: {
    page: { type: 'integer', required: false, example: 1, description: '页码' },
    page_size: { type: 'integer', required: false, example: 10, description: '每页数量' },
  },

  // 用户注册
  RegisterRequest: {
    phone: { type: 'string', required: true, example: '13800138000', description: '手机号' },
    password: { type: 'string', required: true, example: '123456', description: '密码' },
    confirm_password: { type: 'string', required: true, example: '123456', description: '确认密码' },
    invite_code: { type: 'string', required: true, example: 'ABC123', description: '邀请码' },
  },

  // 用户登录
  LoginRequest: {
    phone: { type: 'string', required: true, example: '13800138000', description: '手机号' },
    password: { type: 'string', required: true, example: '123456', description: '密码' },
  },

  // 修改密码
  UpdatePasswordRequest: {
    old_password: { type: 'string', required: true, example: '123456', description: '旧密码' },
    new_password: { type: 'string', required: true, example: '654321', description: '新密码' },
    confirm_password: { type: 'string', required: true, example: '654321', description: '确认密码' },
  },

  // 更新用户资料
  UpdateProfileRequest: {
    user_name: { type: 'string', required: false, example: '张三', description: '用户名' },
    user_avatar: { type: 'string', required: false, example: 'https://example.com/avatar.jpg', description: '头像' },
    user_email: { type: 'string', required: false, example: 'user@example.com', description: '邮箱' },
    user_phone: { type: 'string', required: false, example: '13800138000', description: '手机号' },
  },

  // VIP 等级更新
  UpdateVipLevelRequest: {
    user_vip: { type: 'integer', required: true, example: 2, description: 'VIP 等级（1-3）' },
  },

  // 物流地址
  LogisticsAddressRequest: {
    name: { type: 'string', required: true, example: '张三', description: '收件人姓名' },
    phone: { type: 'string', required: true, example: '13800138000', description: '手机号' },
    address: { type: 'string', required: true, example: '北京市朝阳区', description: '详细地址' },
  },

  // 获取订单详情
  OrderMsgRequest: {
    orderId: { type: 'string', required: true, example: 'O20260812102030ABCDEF', description: '订单号' },
  },

  // 支付订单
  FinishOrderRequest: {
    orderId: { type: 'string', required: true, example: 'O20260812102030ABCDEF', description: '订单号' },
  },

  // 创建/更新商品
  ProductRequest: {
    title: { type: 'string', required: true, example: 'iPhone 15', description: '商品名称' },
    type: { type: 'integer', required: true, example: 1, description: '商品类型：1移动设备 2家电 3电脑设备 4体育 5时尚' },
    price: { type: 'number', required: true, example: 5999.00, description: '售价' },
    stock: { type: 'integer', required: false, example: 100, description: '库存' },
    img: { type: 'string', required: false, example: 'https://example.com/iphone.jpg', description: '缩略图地址' },
    images: { type: 'array', required: false, itemType: 'string', description: '商品图片列表' },
    description: { type: 'string', required: false, example: '商品描述', description: '商品描述' },
    status: { type: 'integer', required: false, example: 1, description: '状态：1上架 0下架' },
  },

  // 创建/更新任务
  TaskRequest: {
    title: { type: 'string', required: true, example: '每日签到', description: '任务名称' },
    price: { type: 'number', required: true, example: 10.00, description: '任务奖励' },
    img: { type: 'string', required: false, example: 'https://example.com/task.jpg', description: '缩略图地址' },
    images: { type: 'array', required: false, itemType: 'string', description: '任务图片列表' },
    description: { type: 'string', required: false, example: '任务描述', description: '任务描述' },
    sort: { type: 'integer', required: false, example: 0, description: '排序' },
    status: { type: 'integer', required: false, example: 1, description: '状态：1启用 0禁用' },
  },

  // 创建/更新轮播图
  BannerRequest: {
    image: { type: 'string', required: true, example: 'https://example.com/banner.jpg', description: '图片地址' },
    title: { type: 'string', required: false, example: '活动banner', description: '标题' },
    link: { type: 'string', required: false, example: 'https://example.com/activity', description: '跳转链接' },
    sort: { type: 'integer', required: false, example: 0, description: '排序' },
    status: { type: 'integer', required: false, example: 1, description: '状态：1启用 0禁用' },
  },

  // 创建/更新公告
  NoticeRequest: {
    title: { type: 'string', required: true, example: '系统公告', description: '公告标题' },
    content: { type: 'string', required: true, example: '系统维护通知', description: '公告内容' },
    sort: { type: 'integer', required: false, example: 0, description: '排序' },
    status: { type: 'integer', required: false, example: 1, description: '状态：1启用 0禁用' },
  },

  // 创建/更新客服
  CustomerServiceRequest: {
    name: { type: 'string', required: true, example: '抖音客服', description: '客服名称' },
    avatar: { type: 'string', required: false, example: 'https://example.com/avatar.jpg', description: '头像' },
    link: { type: 'string', required: false, example: 'https://example.com/contact', description: '联系链接' },
    contact: { type: 'string', required: false, example: '13800138000', description: '联系方式' },
    sort: { type: 'integer', required: false, example: 0, description: '排序' },
    status: { type: 'integer', required: false, example: 1, description: '状态：1启用 0禁用' },
  },

  // 规则图片数组
  RuleRequest: {
    images: { type: 'array', required: true, itemType: 'string', example: [ 'https://example.com/rule1.jpg' ], description: '规则图片地址数组' },
  },

  // 用户凭证上传
  CredentialRequest: {
    real_name: { type: 'string', required: true, example: '张三', description: '真实姓名' },
    id_number: { type: 'string', required: true, example: '110101199001011234', description: '证件号' },
    front_image: { type: 'string', required: true, example: 'https://example.com/front.jpg', description: '证件正面图片地址' },
    back_image: { type: 'string', required: true, example: 'https://example.com/back.jpg', description: '证件反面图片地址' },
  },

  // 充值请求创建
  RechargeRequest: {
    do_money: { type: 'number', required: true, example: 1000, description: '发生金额' },
    pay_way: { type: 'integer', required: false, example: 1, description: '充值方式' },
    examine_type: { type: 'integer', required: false, example: 0, description: '审核类型：0用户自己充值 1代付' },
    remark: { type: 'string', required: false, example: '备注', description: '备注' },
  },

  // 充值请求审核成功
  RechargeAuditSuccessRequest: {
    recharge_id: { type: 'integer', required: true, example: 1923051712, description: '充值请求ID' },
    recharge_money: { type: 'number', required: true, example: 60, description: '充值金额' },
    recharge_user_arrive_money: { type: 'number', required: true, example: 60, description: '用户到账金额' },
    recharge_platform_arrive_money: { type: 'number', required: true, example: 60, description: '平台到账金额' },
    examine_type: { type: 'integer', required: true, example: 0, description: '审核类型：0真实充值 1虚拟充值' },
    remark: { type: 'string', required: true, example: '123', description: '备注' },
    google_code: { type: 'string', required: true, example: '123456', description: '谷歌验证码（二级密码）' },
  },

  // 充值请求审核失败
  RechargeAuditFailRequest: {
    recharge_id: { type: 'integer', required: true, example: 1909198464, description: '充值请求ID' },
    remark: { type: 'string', required: true, example: '321', description: '备注' },
    google_code: { type: 'string', required: true, example: '123456', description: '谷歌验证码（二级密码）' },
  },

  // 提现创建
  WithdrawCreateRequest: {
    amount: { type: 'number', required: true, example: 55542, description: '提现金额' },
    address: { type: 'string', required: false, example: '0x1234567890abcdef', description: '提现地址' },
    way: { type: 'integer', required: false, example: 0, description: '提现方式' },
    examine_status: { type: 'integer', required: false, example: 0, description: '审核类型：0用户提现 1代付' },
    remark: { type: 'string', required: false, example: '备注', description: '备注' },
    user_withdraw_password: { type: 'string', required: true, example: '123456', description: '提现密码' },
  },

  // 提现审核成功
  WithdrawAuditSuccessRequest: {
    withdrawId: { type: 'integer', required: true, example: 1978975520, description: '提现请求ID' },
    takeMoney: { type: 'number', required: false, example: 53875.74, description: '用户到账金额' },
    sxMoney: { type: 'number', required: false, example: 1666.26, description: '手续费' },
    money: { type: 'number', required: false, example: 55542, description: '提现金额' },
    examineType: { type: 'integer', required: false, example: 0, description: '检查类型：0真实提现 1虚拟提现' },
    remark: { type: 'string', required: false, example: '123', description: '备注' },
    googleCode: { type: 'string', required: false, example: '123456', description: '谷歌验证码' },
  },

  // 提现审核失败
  WithdrawAuditFailRequest: {
    withdrawId: { type: 'integer', required: true, example: 1978975520, description: '提现请求ID' },
    remark: { type: 'string', required: false, example: '321', description: '备注' },
    googleCode: { type: 'string', required: false, example: '123456', description: '谷歌验证码' },
  },

  // 提现方式创建
  WithdrawWayCreateRequest: {
    way: { type: 'string', required: true, example: '支付宝', description: '提现方式名称' },
    sort: { type: 'integer', required: false, example: 10, description: '排序' },
    remark: { type: 'string', required: false, example: '备注', description: '备注' },
    status: { type: 'integer', required: false, example: 0, description: '状态：0启用 1禁用' },
  },

  // 提现方式更新
  WithdrawWayUpdateRequest: {
    way: { type: 'string', required: false, example: '微信', description: '提现方式名称' },
    sort: { type: 'integer', required: false, example: 10, description: '排序' },
    remark: { type: 'string', required: false, example: '备注', description: '备注' },
    status: { type: 'integer', required: false, example: 0, description: '状态：0启用 1禁用' },
  },

  // 充值方式创建
  RechargeWayCreateRequest: {
    way: { type: 'string', required: true, example: '支付宝', description: '充值方式名称' },
    sort: { type: 'integer', required: false, example: 10, description: '排序' },
    remark: { type: 'string', required: false, example: '备注', description: '备注' },
    status: { type: 'integer', required: false, example: 0, description: '状态：0启用 1禁用' },
  },

  // 充值方式更新
  RechargeWayUpdateRequest: {
    way: { type: 'string', required: false, example: '微信', description: '充值方式名称' },
    sort: { type: 'integer', required: false, example: 10, description: '排序' },
    remark: { type: 'string', required: false, example: '备注', description: '备注' },
    status: { type: 'integer', required: false, example: 0, description: '状态：0启用 1禁用' },
  },

  // 购物车
  CartRequest: {
    product_id: { type: 'integer', required: true, example: 1, description: '商品ID' },
    quantity: { type: 'integer', required: true, example: 1, description: '数量' },
    selected: { type: 'boolean', required: false, example: true, description: '是否选中' },
  },

  // 更新购物车
  CartUpdateRequest: {
    quantity: { type: 'integer', required: false, example: 2, description: '数量' },
    selected: { type: 'boolean', required: false, example: true, description: '是否选中' },
  },

  // 收货地址
  AddressRequest: {
    name: { type: 'string', required: true, example: '张三', description: '收货人姓名' },
    phone: { type: 'string', required: true, example: '13800138000', description: '手机号' },
    province: { type: 'string', required: true, example: '北京市', description: '省份' },
    city: { type: 'string', required: true, example: '北京市', description: '城市' },
    district: { type: 'string', required: true, example: '朝阳区', description: '区县' },
    detail: { type: 'string', required: true, example: '某某街道 1 号', description: '详细地址' },
    is_default: { type: 'boolean', required: false, example: false, description: '是否默认' },
  },

  // 创建订单
  OrderCreateRequest: {
    address_id: { type: 'integer', required: true, example: 1, description: '收货地址ID' },
    remark: { type: 'string', required: false, example: '请尽快发货', description: '订单备注' },
  },

  // 管理员登录
  AdminLoginRequest: {
    username: { type: 'string', required: true, example: '333333', description: '管理员账号' },
    password: { type: 'string', required: true, example: '333333', description: '密码' },
    googleCode: { type: 'string', required: false, example: '123456', description: '谷歌验证码' },
  },

  // 管理员基础资料更新
  UpdateAdminProfileRequest: {
    nickName: { type: 'string', required: false, example: '管理员', description: '昵称' },
    phonenumber: { type: 'string', required: false, example: '13800138000', description: '手机号' },
    email: { type: 'string', required: false, example: 'admin@example.com', description: '邮箱' },
    sex: { type: 'string', required: false, example: '1', description: '性别: 0未知 1男 2女' },
  },

  // 生成谷歌验证码请求
  GenerateGoogleAuthRequest: {
    username: { type: 'string', required: true, example: 'admin', description: '当前登录账号' },
    password: { type: 'string', required: true, example: '123456', description: '当前登录密码（用于安全验证）' },
  },

  // 绑定谷歌验证码请求
  BindGoogleAuthRequest: {
    userName: { type: 'string', required: true, example: 'admin', description: '绑定的用户账号' },
    code: { type: 'string', required: true, example: '123456', description: '谷歌验证器上的6位验证码' },
  },

  // 解绑自己的谷歌验证码请求
  UnbindSelfGoogleAuthRequest: {
    username: { type: 'string', required: true, example: 'admin', description: '当前管理员的登录账号' },
    password: { type: 'string', required: true, example: '123456', description: '当前管理员的登录密码' },
  },

  // 管理员密码更新
  UpdateAdminPwdRequest: {
    oldPassword: { type: 'string', required: true, example: '123456', description: '旧密码' },
    newPassword: { type: 'string', required: true, example: '654321', description: '新密码' },
    confirmPassword: { type: 'string', required: false, example: '654321', description: '确认新密码' },
  },

  // 管理员密码重置（由上级操作）
  ResetAdminPwdRequest: {
    password: { type: 'string', required: true, example: '123456', description: '新登录密码' },
  },

  // 创建/更新管理员
  AdminUserRequest: {
    username: { type: 'string', required: true, example: 'test001', description: '账号' },
    password: { type: 'string', required: true, example: '123456', description: '密码' },
    nickname: { type: 'string', required: false, example: '测试员', description: '备注/昵称' },
    role: { type: 'integer', required: false, example: 2, description: '角色：1管理员 2主管 3业务员，未传时管理员默认创建主管，主管默认创建业务员' },
    status: { type: 'integer', required: false, example: 1, description: '状态：1启用 0禁用' },
  },

  // 创建/更新业务员/主管（红色*为必填项）
  SalespersonRequest: {
    nickname: { type: 'string', required: true, example: '张三', description: '用户昵称' },
    username: { type: 'string', required: true, example: 'sales001', description: '用户账号' },
    password: { type: 'string', required: true, example: '123456', description: '用户密码' },
    role: { type: 'integer', required: true, example: 3, description: '角色：2主管 3业务员' },
    gender: { type: 'integer', required: false, example: 1, description: '性别：0未知 1男 2女' },
    phone: { type: 'string', required: false, example: '13800138000', description: '手机号' },
    email: { type: 'string', required: false, example: 'test@example.com', description: '邮箱' },
    bind_salesperson_id: { type: 'integer', required: false, example: 1, description: '绑定业务员ID' },
    bindRechargeaddress: { type: 'string', required: false, example: '123456', description: '绑定充值地址' },
    remark: { type: 'string', required: false, example: '备注信息', description: '备注' },
    status: { type: 'integer', required: false, example: 1, description: '状态：1启用 0禁用' },
  },

  // 批量删除请求
  BatchDeleteRequest: {
    ids: { type: 'array', required: true, itemType: 'integer', example: [ 1, 2, 3 ], description: '待删除记录ID数组' },
  },

  // 创建/更新权限节点
  PermissionRequest: {
    parent_id: { type: 'integer', required: false, example: 0, description: '父权限ID，0为顶级节点' },
    title: { type: 'string', required: true, example: '权限管理', description: '权限标题' },
    name: { type: 'string', required: true, example: 'PermissionMgmt', description: '权限标识' },
    type: { type: 'string', required: false, example: '菜单', description: '权限类型：菜单/按钮' },
    sort: { type: 'integer', required: false, example: 0, description: '排序值' },
    status: { type: 'integer', required: false, example: 1, description: '状态：1启用 0禁用' },
  },


  // 管理端创建/更新上分明细
  AdminRechargeRequest: {
    user_id: { type: 'integer', required: true, example: 1, description: '用户ID' },
    amount: { type: 'number', required: true, example: 100.00, description: '操作金额' },
    type: { type: 'integer', required: false, example: 0, description: '操作类型：0赠送客户 1员工添加 2第三方充值' },
    operation_type: { type: 'integer', required: false, example: 0, description: '操作类型（同 type，兼容字段）：0赠送客户 1员工添加 2第三方充值' },
    order_id: { type: 'integer', required: false, example: 1001, description: '订单ID' },
    order_num: { type: 'string', required: false, example: 'O1234567890', description: '订单号' },
    status: { type: 'integer', required: false, example: 0, description: '状态：0待审核 1通过 2拒绝' },
    remark: { type: 'string', required: false, example: '后台上分', description: '备注' },
  },

  // 操作日志查询参数
  OperationLogQuery: {
    business_type: { type: 'integer', required: false, example: 0, description: '操作类型：0新增 1修改 2删除 3授权 4导出 5导入 6强退 7生成代码 8清空数据 9其他' },
    title: { type: 'string', required: false, example: '删除提现方式', description: '操作标题关键词' },
    oper_name: { type: 'string', required: false, example: '管理员', description: '操作人员名称关键词' },
    oper_url: { type: 'string', required: false, example: '/api/admin/withdraw-ways', description: '请求地址关键词' },
    status: { type: 'integer', required: false, example: 0, description: '操作状态：0成功 1失败' },
    start_time: { type: 'string', required: false, example: '2026-08-01 00:00:00', description: '开始时间' },
    end_time: { type: 'string', required: false, example: '2026-08-05 23:59:59', description: '结束时间' },
    page: { type: 'integer', required: false, example: 1, description: '页码' },
    page_size: { type: 'integer', required: false, example: 10, description: '每页数量' },
  },

  // 操作日志批量删除
  OperationLogBatchDeleteRequest: {
    ids: { type: 'array', required: true, itemType: 'integer', example: [ 1, 2, 3 ], description: '日志ID数组' },
  },

  // 登录日志批量删除
  LoginLogBatchDeleteRequest: {
    ids: { type: 'array', required: true, itemType: 'integer', example: [ 1, 2, 3 ], description: '日志ID数组' },
  },

  // 修改会员备注
  UpdateMemberRemarkRequest: {
    remark: { type: 'string', required: true, example: '重点客户', description: '会员备注' },
  },

  // 重置会员登录密码
  ResetMemberPasswordRequest: {
    userPassword: { type: 'string', required: true, example: '123456', description: '新登录密码' },
  },

  // 重置会员提现密码
  ResetMemberWithdrawPasswordRequest: {
    user_withdraw_password: { type: 'string', required: true, example: '123456', description: '新提现密码' },
  },

  // 修改会员状态
  UpdateMemberStatusRequest: {
    user_status: { type: 'integer', required: false, example: 0, description: '用户状态：0正常 1禁用' },
    is_real: { type: 'boolean', required: false, example: true, description: '是否真实用户：true真实用户 false虚拟用户' },
    withdrawal_status: { type: 'boolean', required: false, example: true, description: '提现状态：true可以提现 false不可提现' },
    temp_withdraw_status: { type: 'boolean', required: false, example: true, description: '临时提现状态：true开启 false关闭' },
  },

  // 修改会员提现地址
  ModifyWithdrawalAddressRequest: {
    user_id: { type: 'integer', required: true, example: 12345678901, description: '用户ID' },
    withdraw_address: { type: 'string', required: true, example: '0x1234567890abcdef1234567890abcdef12345678', description: '提现地址' },
  },

  // 修改会员 VIP 等级
  UpdateMemberVipLevelRequest: {
    vip_level: { type: 'integer', required: true, example: 2, description: 'VIP 等级（1-4）' },
  },

  // 创建/更新策略
  StrategyRequest: {
    name: { type: 'string', required: true, example: '新手策略', description: '策略名' },
    min_amount: { type: 'number', required: true, example: 100.00, description: '最低金额' },
    profit_rate: { type: 'number', required: true, example: 0.0500, description: '收益率' },
    parent_profit_rate: { type: 'number', required: false, example: 0.0100, description: '上级收益率' },
    type: { type: 'integer', required: true, example: 0, description: '类型：0默认 1自定义' },
    status: { type: 'integer', required: true, example: 0, description: '状态：0启用 1禁用' },
    verify_parent: { type: 'integer', required: true, example: 0, description: '是否验证上级：0验证 1不验证' },
    daily_task_update: { type: 'integer', required: true, example: 0, description: '每日任务更新：0手动 1自动' },
    lucky_order_team_reward: { type: 'integer', required: true, example: 0, description: '幸运订单团队奖励分配：0分配 1不分配' },
    task_count: { type: 'integer', required: true, example: 10, description: '任务单数' },
    min_usage_rate: { type: 'number', required: true, example: 0.1000, description: '余额最小使用率' },
    max_usage_rate: { type: 'number', required: true, example: 0.9000, description: '余额最大使用率' },
  },

  // 更新策略规则项
  StrategyRuleRequest: {
    ruleType: { type: 'string', required: false, example: '0', description: '规则类型' },
    matchType: { type: 'string', required: false, example: '1', description: '匹配类型' },
    waresId: { type: 'integer', required: false, example: 63696067, description: '商品ID' },
    adminSetWaresName: { type: 'string', required: false, example: '20000 mAh Mini Power Bank', description: '任务商品名称' },
    adminSetPrice: { type: 'number', required: false, example: 122, description: '金额' },
    backRate: { type: 'number', required: false, example: 0.006, description: '收益率' },
    backMoney: { type: 'number', required: false, example: 0.732, description: '返回上级的佣金' },
    isTrriger: { type: 'string', required: false, example: '0', description: '是否触发' },
    isRun: { type: 'string', required: false, example: '0', description: '是否执行' },
  },

  // 角色权限分配
  RolePermissionRequest: {
    permission_names: { type: 'array', required: true, itemType: 'string', example: [ 'Dashboard', 'MemberList' ], description: '权限标识列表' },
  },

  // 提现参数配置更新
  WithdrawConfigUpdateRequest: {
    min_money: { type: 'string', required: true, example: '10', description: '提现最小值' },
    need_task: { type: 'string', required: true, example: 'true', description: '首次提现是否需要完成任务：true/false' },
    sx_rate: { type: 'string', required: true, example: '0.03', description: '手续费比例' },
    googleCode: { type: 'string', required: true, example: '123456', description: '谷歌验证码（二级密码）' },
  },

  // 添加会员金额
  AddMemberBalanceRequest: {
    googleCode: { type: 'string', required: true, example: '123456', description: '谷歌验证码（二级密码）' },
    money: { type: 'string', required: true, example: '100', description: '添加金额' },
    remark: { type: 'string', required: false, example: '赠送金额', description: '备注' },
    type: { type: 'string', required: true, example: '0', description: '操作类型：0赠送 1员工添加 2通道充值' },
    user_id: { type: 'integer', required: true, example: 123456789, description: '用户ID' },
  },

  // 扣除会员金额
  DeductMemberBalanceRequest: {
    user_id: { type: 'integer', required: true, example: 123456789, description: '用户ID' },
    money: { type: 'string', required: true, example: '50', description: '扣除金额' },
    remark: { type: 'string', required: false, example: '违规扣除', description: '备注' },
    googleCode: { type: 'string', required: true, example: '123456', description: '谷歌验证码（二级密码）' },
  },

  // 订单轮播
  OrderCarouselRequest: {
    content: { type: 'string', required: true, example: '12*****54 抢了29个订单', description: '轮播内容' },
    sort: { type: 'integer', required: false, example: 0, description: '排序，数值越小越靠前' },
    status: { type: 'integer', required: false, example: 1, description: '状态：1启用 0禁用' },
  },

  // 系统配置修改
  SysConfigUpdatePayload: {
    config_key: { type: 'string', required: true, example: 'user.money.dai.gift', description: '参数键名' },
    config_value: { type: 'string', required: false, example: '100', description: '参数键值' },
    config_name: { type: 'string', required: false, example: '实名奖励代金', description: '参数名称' },
    remark: { type: 'string', required: false, example: '备注信息', description: '备注' },
  },
};
