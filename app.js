'use strict';

/* eslint-disable no-unused-vars, no-inner-declarations */

const DEFAULT_BANNER_IMAGE = 'https://shbaikal.com/data/upload/20240812/0ac77301590c926eb4c9ecfa38936caa.jpg';
const TableNames = require('./app/constant/table_names');

/**
 * 应用启动入口
 * @param {Egg.Application} app 应用实例
 */
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  configWillLoad() {
    // 在配置文件加载完成后，模型加载前，挂载常量到全局 app 对象
    this.app.TableNames = TableNames;
    
    // 强制开启代理信任，防止 Egg.js 丢弃 Nginx 传来的真实 IP (X-Real-IP)
    this.app.config.proxy = true;
    this.app.config.maxProxyCount = 1;
  }

  async beforeStart() {
    const app = this.app;
    // 应用启动后自动同步数据库模型（仅开发环境使用）
    // 生产环境建议使用 Sequelize CLI 迁移脚本管理数据库变更
    if (app.config.env === 'local') {
      app.logger.info('[app] 本地开发环境，准备同步数据库模型...');
      try {
        // 仅创建不存在的表，避免 SQLite alter 表结构时出现验证错误
        await app.model.sync();
        app.logger.info('[app] 数据库模型同步完成');

        // 同步 admin_users 表新增字段（兼容已存在的数据库）


        // 初始化默认数据 (已注释，不再自动生成)
        // await initDefaultUser(app);
        // await initDefaultTeamMembers(app);
        // await initDefaultAdmin(app);
        // await initDefaultPermissions(app);
        // await initDefaultRolePermissions(app);
        // await initDefaultDashboardData(app);
        // await initDefaultCategory(app);
        // await initDefaultProduct(app);
        // await initDefaultTask(app);
        // await initDefaultBanner(app);
        // await initDefaultNotice(app);
        // await initDefaultCustomerService(app);
        // await initDefaultRule(app);
        // await initDefaultOrder(app);
        // await initDefaultRecharge(app);
        // await initDefaultMenu(app);
        //
      } catch (err) {
        app.logger.error('[app] 数据库模型同步失败：', err.message);
        app.logger.error('[app] 请确认 MySQL 服务已启动且连接配置正确');
      }
    }
  }
}

module.exports = AppBootHook;

/**
 * 初始化默认测试用户
 * 仅在本地开发环境使用，方便前端联调
 * @param {Egg.Application} app 应用实例
 */
async function initDefaultUser(app) {
  const ctx = app.createAnonymousContext();
  const defaultPhone = '123456';
  const defaultPassword = '123456';

  try {
    const existUser = await ctx.model.SysUser.findOne({ where: { phone: defaultPhone, user_type: 4 } });
    if (existUser) {
      // 如果已存在但没有邀请码，补充生成
      if (!existUser.invite_code) {
        const inviteCode = await ctx.service.user.generateInviteCode();
        await existUser.update({ invite_code: inviteCode });
        app.logger.info('[app] 默认测试用户已补充邀请码：%s', inviteCode);
      } else {
        app.logger.info('[app] 默认测试用户已存在，跳过初始化');
      }
      return;
    }

    const hashedPassword = await ctx.genHash(defaultPassword);
    const user = await ctx.model.SysUser.create({
      username: defaultPhone,
      phone: defaultPhone,
      password: hashedPassword,
      nickname: '默认用户',
      status: 1,
      user_type: 4,
      invite_code: await ctx.service.user.generateInviteCode(),
    });

    app.logger.info('[app] 默认测试用户创建成功，手机号：%s', defaultPhone);
  } catch (err) {
    app.logger.error('[app] 默认测试用户创建失败：', err.message);
  }
}

/**
 * 初始化默认商品分类
 * @param {Egg.Application} app 应用实例
 */
async function initDefaultCategory(app) {
  const ctx = app.createAnonymousContext();
  const defaultName = '数码配件';

  try {
    const exist = await ctx.model.Category.findOne({ where: { name: defaultName } });
    if (exist) {
      app.logger.info('[app] 默认分类已存在，跳过初始化');
      return;
    }

    await ctx.model.Category.create({
      name: defaultName,
      sort: 100,
      status: 1,
    });

    app.logger.info('[app] 默认分类创建成功：%s', defaultName);
  } catch (err) {
    app.logger.error('[app] 默认分类创建失败：', err.message);
  }
}

/**
 * 初始化默认商品
 * @param {Egg.Application} app 应用实例
 */
async function initDefaultProduct(app) {
  const ctx = app.createAnonymousContext();
  const defaultTitle = '小米充电宝';

  try {
    const exist = await ctx.model.Product.findOne({ where: { title: defaultTitle } });
    if (exist) {
      app.logger.info('[app] 默认商品已存在，跳过初始化');
      return;
    }

    await ctx.model.Product.create({
      type: 1,
      title: defaultTitle,
      description: '小米原装充电宝，20000mAh 大容量，支持快充。',
      img: DEFAULT_BANNER_IMAGE,
      images: [ DEFAULT_BANNER_IMAGE ],
      price: 129.00,
      stock: 100,
      sales: 0,
      status: 1,
    });

    app.logger.info('[app] 默认商品创建成功：%s', defaultTitle);
  } catch (err) {
    app.logger.error('[app] 默认商品创建失败：', err.message);
  }
}

/**
 * 初始化默认任务
 * @param {Egg.Application} app 应用实例
 */
async function initDefaultTask(app) {
  const ctx = app.createAnonymousContext();
  const defaultName = '每日签到';

  try {
    const exist = await ctx.model.Task.findOne({ where: { title: defaultName } });
    if (exist) {
      app.logger.info('[app] 默认任务已存在，跳过初始化');
      return;
    }

    await ctx.model.Task.create({
      title: defaultName,
      description: '每日登录签到，即可获得奖励。',
      img: DEFAULT_BANNER_IMAGE,
      images: [ DEFAULT_BANNER_IMAGE ],
      price: 1.00,
      status: 1,
      sort: 100,
    });

    app.logger.info('[app] 默认任务创建成功：%s', defaultName);
  } catch (err) {
    app.logger.error('[app] 默认任务创建失败：', err.message);
  }
}

/**
 * 初始化默认轮播图
 * @param {Egg.Application} app 应用实例
 */
async function initDefaultBanner(app) {
  const ctx = app.createAnonymousContext();

  try {
    const count = await ctx.model.Banner.count({ where: { status: 1 } });
    if (count > 0) {
      app.logger.info('[app] 默认轮播图已存在，跳过初始化');
      return;
    }

    await ctx.model.Banner.bulkCreate([
      { title: '轮播图一', image: DEFAULT_BANNER_IMAGE, link: '', sort: 30 },
      { title: '轮播图二', image: DEFAULT_BANNER_IMAGE, link: '', sort: 20 },
      { title: '轮播图三', image: DEFAULT_BANNER_IMAGE, link: '', sort: 10 },
    ]);

    app.logger.info('[app] 默认轮播图创建成功，共 3 张');
  } catch (err) {
    app.logger.error('[app] 默认轮播图创建失败：', err.message);
  }
}

/**
 * 初始化默认公告
 * @param {Egg.Application} app 应用实例
 */
async function initDefaultNotice(app) {
  const ctx = app.createAnonymousContext();

  const defaultNotices = [
    {
      title: '系统维护通知',
      content: '平台将于今日凌晨进行系统维护，维护期间部分功能可能无法使用，请提前安排。',
      sort: 30,
    },
    {
      title: '活动上线公告',
      content: '暑期邀请活动已正式上线，邀请好友即可获得额外奖励。',
      sort: 20,
    },
    {
      title: '充值通道调整',
      content: '为提升到账速度，部分充值通道已升级，请选择推荐方式充值。',
      sort: 10,
    },
  ];

  try {
    const count = await ctx.model.Notice.count({ where: { status: 1 } });
    if (count > 0) {
      app.logger.info('[app] 默认公告已存在，跳过初始化');
      return;
    }

    await ctx.model.Notice.bulkCreate(defaultNotices);
    app.logger.info('[app] 默认公告创建成功，共 %s 条', defaultNotices.length);
  } catch (err) {
    app.logger.error('[app] 默认公告创建失败：', err.message);
  }
}

/**
 * 初始化默认客服
 * 默认添加一条抖音客服数据
 * @param {Egg.Application} app 应用实例
 */
async function initDefaultCustomerService(app) {
  const ctx = app.createAnonymousContext();

  try {
    const count = await ctx.model.CustomerService.count({ where: { status: 1 } });
    if (count > 0) {
      app.logger.info('[app] 默认客服已存在，跳过初始化');
      return;
    }

    await ctx.model.CustomerService.create({
      name: '抖音客服',
      avatar: '',
      link: 'https://www.douyin.com',
      contact: '抖音官方客服',
      sort: 100,
      status: 1,
    });

    app.logger.info('[app] 默认抖音客服创建成功');
  } catch (err) {
    app.logger.error('[app] 默认客服创建失败：', err.message);
  }
}

/**
 * 初始化默认规则
 * 全站仅一条规则记录，初始为空图片数组
 * @param {Egg.Application} app 应用实例
 */
async function initDefaultRule(app) {
  const ctx = app.createAnonymousContext();

  try {
    const exist = await ctx.model.Rule.findOne({ where: { status: 1 } });
    if (exist) {
      app.logger.info('[app] 默认规则已存在，跳过初始化');
      return;
    }

    await ctx.model.Rule.create({ images: [] });
    app.logger.info('[app] 默认规则创建成功');
  } catch (err) {
    app.logger.error('[app] 默认规则创建失败：', err.message);
  }
}

/**
 * 初始化默认订单数据
 * 为默认测试用户创建一条示例订单，便于管理端订单列表展示
 * @param {Egg.Application} app 应用实例
 */
async function initDefaultOrder(app) {
  const ctx = app.createAnonymousContext();

  try {
    const user = await ctx.model.SysUser.findOne({ where: { phone: '123456', user_type: 4 } });
    if (!user) {
      app.logger.info('[app] 默认用户不存在，跳过默认订单初始化');
      return;
    }

    const product = await ctx.model.Product.findOne({ where: { title: '小米充电宝' } });
    if (!product) {
      app.logger.info('[app] 默认商品不存在，跳过默认订单初始化');
      return;
    }

    const existOrder = await ctx.model.Order.findOne({ where: { user_id: user.id } });
    if (existOrder) {
      app.logger.info('[app] 默认订单已存在，跳过初始化');
      return;
    }

    // 确保默认用户存在收货地址
    let address = await ctx.model.Address.findOne({ where: { user_id: user.id } });
    if (!address) {
      address = await ctx.model.Address.create({
        user_id: user.id,
        receiver: '默认收件人',
        phone: user.user_phone,
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        detail: '科技园南路88号',
        is_default: 1,
      });
      app.logger.info('[app] 默认收货地址创建成功');
    }

    const totalAmount = Number(product.price);
    const order = await ctx.model.Order.create({
      order_no: `O${Date.now()}`,
      user_id: user.id,
      address_id: address.id,
      total_amount: totalAmount,
      freight_amount: 0,
      discount_amount: 0,
      pay_amount: totalAmount,
      static_commission: 0.00000000,
      dynamic_commission: 0.00000000,
      status: 1,
      pay_time: new Date(),
      remark: '默认示例订单',
    });

    await ctx.model.OrderItem.create({
      order_id: order.id,
      product_id: product.id,
      product_name: product.title,
      product_image: product.img,
      price: product.price,
      quantity: 1,
      total_amount: totalAmount,
    });

    app.logger.info('[app] 默认订单创建成功，订单编号：%s', order.order_no);
  } catch (err) {
    app.logger.error('[app] 默认订单创建失败：', err.message);
  }
}

/**
 * 初始化默认充值明细数据
 * 为默认测试用户创建一条示例充值记录，便于管理端充值明细列表展示
 * @param {Egg.Application} app 应用实例
 */
async function initDefaultRecharge(app) {
  const ctx = app.createAnonymousContext();

  try {
    const user = await ctx.model.SysUser.findOne({ where: { phone: '123456', user_type: 4 } });
    if (!user) {
      app.logger.info('[app] 默认用户不存在，跳过默认充值明细初始化');
      return;
    }

    const admin = await ctx.model.AdminUser.findOne({ where: { username: '333333' } });
    const operatorId = admin ? admin.id : null;

    const existRecord = await ctx.model.RechargeRecord.findOne({
      where: { user_id: user.id, operation_type: 1 },
    });
    if (existRecord) {
      app.logger.info('[app] 默认充值明细已存在，跳过初始化');
      return;
    }

    await ctx.model.RechargeRecord.create({
      user_id: user.id,
      operator_id: operatorId,
      operation_type: 1,
      amount: 100.00,
      recharge_type: 2,
      status: 1,
      recharge_date: new Date(),
      remark: '默认示例充值（员工添加）',
    });

    app.logger.info('[app] 默认充值明细创建成功');
  } catch (err) {
    app.logger.error('[app] 默认充值明细创建失败：', err.message);
  }
}

/**
 * 初始化默认团队下级用户
 * 为默认测试用户创建三条测试下级数据，邀请收入均为 10
 * @param {Egg.Application} app 应用实例
 */
async function initDefaultTeamMembers(app) {
  const ctx = app.createAnonymousContext();

  const members = [
    { phone: '13800138001', nickname: '测试下级1', recharge_amount: 100 },
    { phone: '13800138002', nickname: '测试下级2', recharge_amount: 200 },
    { phone: '13800138003', nickname: '测试下级3', recharge_amount: 300 },
  ];

  try {
    const parent = await ctx.model.SysUser.findOne({ where: { phone: '123456', user_type: 4 } });
    if (!parent) {
      app.logger.info('[app] 默认用户不存在，跳过团队测试数据初始化');
      return;
    }

    const existCount = await ctx.model.SysUser.count({
      where: { inviter_user_id: parent.user_id, status: 1, user_type: 4 },
    });
    if (existCount > 0) {
      app.logger.info('[app] 团队测试数据已存在，跳过初始化');
      return;
    }

    const defaultPassword = await ctx.genHash('123456');
    const defaultWithdrawPassword = await ctx.genHash('123456');

    for (let i = 0; i < members.length; i++) {
      const item = members[i];
      const user = await ctx.model.SysUser.create({
        username: item.phone,
        password: defaultPassword,
        phone: item.phone,
        nickname: item.nickname,
        inviter_user_id: parent.user_id,
        vip_level: 1,
        status: 1,
        user_type: 4,
        invite_code: await ctx.service.user.generateInviteCode(),
      });
      // 注意：withdraw_password，total_recharge_amount 等现在应存入 user_wallet 或通过统计获取
    }

    app.logger.info('[app] 团队测试数据创建成功，共 %s 条', members.length);
  } catch (err) {
    app.logger.error('[app] 团队测试数据创建失败：', err.message);
  }
}

/**
 * 初始化默认管理员账号
 * 账号：admin，密码：admin333003，角色：管理员
 * @param {Egg.Application} app 应用实例
 */
async function initDefaultAdmin(app) {
  const ctx = app.createAnonymousContext();
  const defaultUsername = 'admin';
  const defaultPassword = 'admin333003';

  try {
    const exist = await ctx.model.AdminUser.findOne({ where: { username: defaultUsername } });
    if (exist) {
      app.logger.info('[app] 默认管理员已存在，跳过初始化');
      return;
    }

    const hashedPassword = await ctx.genHash(defaultPassword);
    await ctx.model.AdminUser.create({
      username: defaultUsername,
      password: hashedPassword,
      nickname: '默认管理员',
      role: 1,
      status: 1,
    });

    app.logger.info('[app] 默认管理员创建成功，账号：%s', defaultUsername);
  } catch (err) {
    app.logger.error('[app] 默认管理员创建失败：', err.message);
  }
}

/**
 * 默认权限树
 * 与前端权限树结构保持一致
 */
const DEFAULT_PERMISSION_TREE = [
  { id: 1, parent_id: 0, title: '系统管理', name: 'System', type: '菜单', sort: 1 },
  { id: 11, parent_id: 1, title: '业务员管理', name: 'UserMgmt', type: '菜单', sort: 1 },
  { id: 12, parent_id: 1, title: '角色管理', name: 'RoleMgmt', type: '菜单', sort: 2 },
  { id: 13, parent_id: 1, title: '日志管理', name: 'Log', type: '菜单', sort: 3 },
  { id: 131, parent_id: 13, title: '操作日志', name: 'Operlog', type: '菜单', sort: 1 },
  { id: 132, parent_id: 13, title: '登录日志', name: 'Loginlog', type: '菜单', sort: 2 },
  { id: 2, parent_id: 0, title: '权限管理', name: 'Permission', type: '菜单', sort: 2 },
  { id: 21, parent_id: 2, title: '管理员权限', name: 'PermissionAdmin', type: '菜单', sort: 1 },
  { id: 22, parent_id: 2, title: '主管权限', name: 'PermissionSupervisor', type: '菜单', sort: 2 },
  { id: 23, parent_id: 2, title: '业务员权限', name: 'PermissionSalesperson', type: '菜单', sort: 3 },
  { id: 3, parent_id: 0, title: '会员管理', name: 'Member', type: '菜单', sort: 3 },
  { id: 31, parent_id: 3, title: '会员列表', name: 'MemberList', type: '菜单', sort: 1 },
  { id: 32, parent_id: 3, title: '充值明细', name: 'RechargeDetail', type: '菜单', sort: 2 },
  { id: 33, parent_id: 3, title: '订单列表', name: 'OrderList', type: '菜单', sort: 3 },
  { id: 34, parent_id: 3, title: '粉丝去重', name: 'FanDedup', type: '菜单', sort: 4 },
  { id: 35, parent_id: 3, title: '会员提现地址', name: 'MemberWithdrawAddress', type: '菜单', sort: 5 },
  { id: 4, parent_id: 0, title: '策略管理', name: 'Strategy', type: '菜单', sort: 4 },
  { id: 41, parent_id: 4, title: '策略列表管理', name: 'StrategyList', type: '菜单', sort: 1 },
  { id: 42, parent_id: 4, title: '身份认证管理', name: 'AuthMgmt', type: '菜单', sort: 2 },
  { id: 5, parent_id: 0, title: '充提管理', name: 'Finance', type: '菜单', sort: 5 },
  { id: 51, parent_id: 5, title: '充值列表', name: 'RechargeList', type: '菜单', sort: 1 },
  { id: 52, parent_id: 5, title: '提现列表', name: 'WithdrawList', type: '菜单', sort: 2 },
  { id: 53, parent_id: 5, title: '提现方式管理', name: 'WithdrawMethodMgmt', type: '菜单', sort: 3 },
  { id: 54, parent_id: 5, title: '充值方式管理', name: 'RechargeMethodMgmt', type: '菜单', sort: 4 },
  { id: 55, parent_id: 5, title: '充值地址管理', name: 'RechargeAddressMgmt', type: '菜单', sort: 5 },
  { id: 6, parent_id: 0, title: '商城管理', name: 'Mall', type: '菜单', sort: 6 },
  { id: 61, parent_id: 6, title: 'Banner管理', name: 'BannerMgmt', type: '菜单', sort: 1 },
  { id: 62, parent_id: 6, title: '客服管理', name: 'CustomerServiceMgmt', type: '菜单', sort: 2 },
  { id: 63, parent_id: 6, title: '公告管理', name: 'NoticeMgmt', type: '菜单', sort: 3 },
  { id: 64, parent_id: 6, title: '规则管理', name: 'RuleMgmt', type: '菜单', sort: 4 },
  { id: 65, parent_id: 6, title: '首页商品管理', name: 'HomeProductMgmt', type: '菜单', sort: 5 },
  { id: 66, parent_id: 6, title: '任务商品管理', name: 'TaskProductMgmt', type: '菜单', sort: 6 },
];

/**
 * 初始化默认权限树
 * @param {Egg.Application} app 应用实例
 */
async function initDefaultPermissions(app) {
  const ctx = app.createAnonymousContext();

  try {
    const existingNames = await ctx.model.Permission.findAll({ attributes: [ 'name' ], raw: true })
      .then(rows => rows.map(item => item.name));
    const newNames = DEFAULT_PERMISSION_TREE.map(item => item.name);
    const needReset = existingNames.length !== newNames.length || !newNames.every(name => existingNames.includes(name));

    if (!needReset) {
      app.logger.info('[app] 默认权限树已存在且结构一致，跳过初始化');
      return;
    }

    // 权限树结构发生变化时清空旧数据并重新初始化
    app.logger.info('[app] 默认权限树结构发生变化，准备重新初始化...');
    await ctx.model.RolePermission.destroy({ where: {} });
    await ctx.model.Permission.destroy({ where: {} });

    await ctx.model.Permission.bulkCreate(DEFAULT_PERMISSION_TREE);
    app.logger.info('[app] 默认权限树创建成功，共 %d 个节点', DEFAULT_PERMISSION_TREE.length);
  } catch (err) {
    app.logger.error('[app] 默认权限树创建失败：', err.message);
  }
}

/**
 * 初始化默认角色权限
 * @param {Egg.Application} app 应用实例
 */
async function initDefaultRolePermissions(app) {
  const ctx = app.createAnonymousContext();

  try {
    const count = await ctx.model.RolePermission.count();
    if (count > 0) {
      app.logger.info('[app] 默认角色权限已存在，跳过初始化');
      return;
    }

    const allNames = DEFAULT_PERMISSION_TREE.map(item => item.name);

    // role=1 管理员：全部权限
    const adminPermissions = allNames.map(name => ({ role: 1, permission_name: name }));

    // role=2 主管：业务员管理 + 角色管理 + 日志 + 会员（不含提现地址） + 策略 + 充提
    const supervisorNames = [
      'System',
      'UserMgmt',
      'RoleMgmt',
      'Log',
      'Operlog',
      'Loginlog',
      'Permission',
      'PermissionSupervisor',
      'Member',
      'MemberList',
      'RechargeDetail',
      'OrderList',
      'FanDedup',
      'MemberWithdrawAddress',
      'Strategy',
      'StrategyList',
      'AuthMgmt',
      'Finance',
      'RechargeList',
      'WithdrawList',
      'WithdrawMethodMgmt',
      'RechargeMethodMgmt',
      'RechargeAddressMgmt',
    ];
    const supervisorPermissions = supervisorNames.map(name => ({ role: 2, permission_name: name }));

    // role=3 业务员：日志 + 会员 + 策略 + 充提（不含充值方式管理）
    const salespersonNames = [
      'System',
      'Log',
      'Operlog',
      'Loginlog',
      'Member',
      'MemberList',
      'RechargeDetail',
      'OrderList',
      'FanDedup',
      'Strategy',
      'StrategyList',
      'AuthMgmt',
      'Finance',
      'RechargeList',
      'WithdrawList',
      'WithdrawMethodMgmt',
      'RechargeAddressMgmt',
    ];
    const salespersonPermissions = salespersonNames.map(name => ({ role: 3, permission_name: name }));

    await ctx.model.RolePermission.bulkCreate([
      ...adminPermissions,
      ...supervisorPermissions,
      ...salespersonPermissions,
    ]);

    app.logger.info('[app] 默认角色权限创建成功');
  } catch (err) {
    app.logger.error('[app] 默认角色权限创建失败：', err.message);
  }
}

/**
 * 初始化首页统计数据
 * 为默认用户插入今日充值、提现、佣金记录，便于管理端首页展示
 * @param {Egg.Application} app 应用实例
 */
async function initDefaultDashboardData(app) {
  const ctx = app.createAnonymousContext();
  const today = new Date().toISOString().slice(0, 10);

  try {
    const user = await ctx.model.SysUser.findOne({ where: { phone: '123456', user_type: 4 } });
    if (!user) {
      app.logger.info('[app] 默认用户不存在，跳过首页测试数据初始化');
      return;
    }

    const rechargeCount = await ctx.model.RechargeRecord.count({ where: { recharge_date: today } });
    if (rechargeCount > 0) {
      app.logger.info('[app] 首页测试数据已存在，跳过初始化');
      return;
    }

    await ctx.model.RechargeRecord.bulkCreate([
      { user_id: user.id, amount: 100, recharge_type: 1, status: 1, recharge_date: today },
      { user_id: user.id, amount: 200, recharge_type: 2, status: 1, recharge_date: today },
      { user_id: user.id, amount: 300, recharge_type: 2, status: 0, recharge_date: today },
    ]);

    await ctx.model.WithdrawRecord.bulkCreate([
      { user_id: user.id, amount: 50, status: 1, withdraw_date: today },
      { user_id: user.id, amount: 80, status: 0, withdraw_date: today },
    ]);

    await ctx.model.CommissionRecord.bulkCreate([
      { user_id: user.id, source_user_id: 2, amount: 10, commission_date: today },
      { user_id: user.id, source_user_id: 3, amount: 10, commission_date: today },
    ]);

    app.logger.info('[app] 首页测试数据创建成功');
  } catch (err) {
    app.logger.error('[app] 首页测试数据创建失败：', err.message);
  }
}

/**
 * 同步 admin_users 表新增字段
 * 兼容已存在旧表结构的数据库，避免手动执行 ALTER
 * @param {Egg.Application} app 应用实例
 */
async function syncAdminUserColumns(app) {
  const queryInterface = app.model.queryInterface;
  const { Sequelize } = app;
  const tableName = 'admin_users';

  try {
    const columns = await queryInterface.describeTable(tableName);

    const columnDefs = {
      gender: { type: Sequelize.INTEGER, defaultValue: 0, comment: '性别：0未知 1男 2女' },
      phone: { type: Sequelize.STRING(20), comment: '手机号' },
      email: { type: Sequelize.STRING(128), comment: '邮箱' },
      bind_salesperson_id: { type: Sequelize.INTEGER.UNSIGNED, comment: '绑定业务员ID' },
      remark: { type: Sequelize.STRING(255), comment: '备注' },
    };

    for (const [ name, def ] of Object.entries(columnDefs)) {
      if (!columns[name]) {
        await queryInterface.addColumn(tableName, name, def);
        app.logger.info(`[app] admin_users 表新增字段：${name}`);
      }
    }
  } catch (err) {
    app.logger.error('[app] 同步 strategy_rules 字段失败：', err.message);
    // 不影响启动流程，仅记录错误
  }
}

/**
 * 初始化默认菜单
 * @param {Egg.Application} app 应用实例
 */
async function initDefaultMenu(app) {
  const ctx = app.createAnonymousContext();

  try {
    const count = await ctx.model.Menu.count();
    if (count > 0) {
      app.logger.info('[app] 默认菜单已存在，跳过初始化');
      return;
    }

    const DEFAULT_MENU_DATA = [
      {
        path: '/system',
        component: 'Layout',
        redirect: '/system/user',
        name: 'System',
        meta: {
          title: '系统管理',
          icon: 'el-icon-s-tools',
          roles: [ 'supervisor', 'salesperson', 'mallAdmin' ],
        },
        children: [
          {
            path: 'user',
            name: 'UserMgmt',
            component: 'system/user/index',
            meta: { title: '业务员管理', icon: 'user', menu: 'user' },
          },
          {
            path: 'role',
            name: 'RoleMgmt',
            component: 'system/role/index',
            meta: { title: '角色管理', icon: 'peoples', menu: 'role' },
          },
          {
            path: 'menu',
            name: 'MenuMgmt',
            component: 'system/menu/index',
            meta: { title: '菜单管理', icon: 'tree-table', menu: 'menu' },
          },
          {
            path: 'log',
            name: 'Log',
            redirect: '/system/log/operlog',
            component: 'system/log/index',
            meta: { title: '日志管理', icon: 'documentation' },
            children: [
              {
                path: 'operlog',
                name: 'Operlog',
                component: 'system/log/operlog',
                meta: { title: '操作日志', icon: 'form', menu: 'operation-log' },
              },
              {
                path: 'loginlog',
                name: 'Loginlog',
                component: 'system/log/loginlog',
                meta: { title: '登录日志', icon: 'logininfor', menu: 'login-log' },
              },
            ],
          },
        ],
      },
      {
        path: '/member',
        component: 'Layout',
        redirect: '/member/list',
        name: 'Member',
        meta: {
          title: '会员管理',
          icon: 'peoples',
          roles: [ 'supervisor', 'salesperson', 'mallAdmin' ],
        },
        children: [
          {
            path: 'list',
            name: 'MemberList',
            component: 'member/list/index',
            meta: { title: '会员列表', icon: 'user', menu: 'member' },
          },
          {
            path: 'recharge-detail',
            name: 'RechargeDetail',
            component: 'member/recharge-detail/index',
            meta: { title: '上分明细', icon: 'money', menu: 'recharge-detail' },
          },
          {
            path: 'order-list',
            name: 'OrderList',
            component: 'member/order-list/index',
            meta: { title: '订单列表', icon: 'list', menu: 'order-list' },
          },
          {
            path: 'fan-dedup',
            name: 'FanDedup',
            component: 'member/fan-dedup/index',
            meta: { title: '粉丝去重', icon: 'star', menu: 'fan-dedup' },
          },
          {
            path: 'withdraw-address',
            name: 'MemberWithdrawAddress',
            component: 'member/withdraw-address/index',
            meta: { title: '会员提现地址', icon: 'guide', menu: 'member-withdraw-address' },
          },
        ],
      },
      {
        path: '/strategy',
        component: 'Layout',
        redirect: '/strategy/list',
        name: 'Strategy',
        meta: {
          title: '策略管理',
          icon: 'tree',
          roles: [ 'mallAdmin' ],
        },
        children: [
          {
            path: 'list',
            name: 'StrategyList',
            component: 'strategy/list/index',
            meta: { title: '策略列表管理', icon: 'list', menu: 'strategy' },
          },
          {
            path: 'auth',
            name: 'AuthMgmt',
            component: 'strategy/auth/index',
            meta: { title: '身份认证管理', icon: 'user', menu: 'auth' },
          },
        ],
      },
      {
        path: '/finance',
        component: 'Layout',
        redirect: '/finance/recharge',
        name: 'Finance',
        meta: {
          title: '充提管理',
          icon: 'money',
          roles: [ 'supervisor', 'salesperson', 'mallAdmin' ],
        },
        children: [
          {
            path: 'recharge',
            name: 'RechargeList',
            component: 'finance/recharge-list/index',
            meta: { title: '充值列表', icon: 'table', menu: 'recharge-list' },
          },
          {
            path: 'withdraw',
            name: 'WithdrawList',
            component: 'finance/withdraw-list/index',
            meta: { title: '提现列表', icon: 'tree', menu: 'withdraw-list' },
          },
          {
            path: 'withdraw-method',
            name: 'WithdrawMethodMgmt',
            component: 'finance/withdraw-method/index',
            meta: { title: '提现方式管理', icon: 'guide', menu: 'withdraw-method' },
          },
          {
            path: 'recharge-method',
            name: 'RechargeMethodMgmt',
            component: 'finance/recharge-method/index',
            meta: { title: '充值方式管理', icon: 'guide', menu: 'recharge-method' },
          },
        ],
      },
      {
        path: '/mall',
        component: 'Layout',
        redirect: '/mall/banner',
        name: 'Mall',
        meta: {
          title: '商城管理',
          icon: 'shopping',
          roles: [ 'mallAdmin' ],
        },
        children: [
          {
            path: 'banner',
            name: 'BannerMgmt',
            component: 'mall/banner',
            meta: { title: 'Banner管理', icon: 'component', menu: 'banner' },
          },
          {
            path: 'customer-service',
            name: 'CustomerServiceMgmt',
            component: 'mall/customer-service',
            meta: { title: '客服管理', icon: 'message', menu: 'customer-service' },
          },
          {
            path: 'notice',
            name: 'NoticeMgmt',
            component: 'mall/notice',
            meta: { title: '公告管理', icon: 'documentation', menu: 'notice' },
          },
          {
            path: 'rule',
            name: 'RuleMgmt',
            component: 'mall/rule',
            meta: { title: '规则管理', icon: 'edit', menu: 'rule' },
          },
          {
            path: 'home-product',
            name: 'HomeProductMgmt',
            component: 'mall/home-product',
            meta: { title: '首页商品管理', icon: 'shopping', menu: 'product' },
          },
          {
            path: 'task-product',
            name: 'TaskProductMgmt',
            component: 'mall/task-product',
            meta: { title: '任务商品管理', icon: 'list', menu: 'task' },
          },
        ],
      },
    ];

    async function insertMenu(menus, parentId = null) {
      for (const menu of menus) {
        const created = await ctx.model.Menu.create({
          parent_id: parentId,
          name: menu.name,
          path: menu.path,
          component: menu.component || '',
          redirect: menu.redirect || '',
          hidden: menu.hidden || false,
          alwaysShow: menu.alwaysShow || false,
          meta: menu.meta || {},
        });
        if (menu.children && menu.children.length > 0) {
          await insertMenu(menu.children, created.id);
        }
      }
    }

    await insertMenu(DEFAULT_MENU_DATA);
    app.logger.info('[app] 默认菜单初始化成功，共初始化 %d 个主菜单', DEFAULT_MENU_DATA.length);
  } catch (err) {
    app.logger.error('[app] 默认菜单初始化失败：', err.message);
  }
}

/**
 * 同步 tasks 表新增字段
 * 兼容已存在旧表结构的数据库，避免手动执行 ALTER
 * @param {Egg.Application} app 应用实例
 */
async function syncTaskColumns(app) {
  const queryInterface = app.model.queryInterface;
  const { Sequelize } = app;
  const tableName = 'tasks';

  try {
    const columns = await queryInterface.describeTable(tableName);

    const columnDefs = {
      audit_status: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, comment: '审核状态：0待审核 1审核通过 2审核失败' },
    };

    for (const [ name, def ] of Object.entries(columnDefs)) {
      if (!columns[name]) {
        await queryInterface.addColumn(tableName, name, def);
        app.logger.info(`[app] tasks 表新增字段：${name}`);
      }
    }
  } catch (err) {
    app.logger.error('[app] 同步 tasks 字段失败：', err.message);
    // 不影响启动流程，仅记录错误
  }
}

/**
 * 同步 users 表新增任务状态字段
 * @param {Egg.Application} app 应用实例
 */
async function syncUserTaskStartedColumn(app) {
  const queryInterface = app.model.queryInterface;
  const { Sequelize } = app;
  const tableName = 'users';

  try {
    const columns = await queryInterface.describeTable(tableName);
    if (!columns.is_task_started) {
      await queryInterface.addColumn(tableName, 'is_task_started', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '任务是否开启：false-未开启 true-已开启',
      });
      app.logger.info('[app] users 表新增字段：is_task_started');
    }
  } catch (err) {
    app.logger.error('[app] 同步 users 表任务状态字段失败：', err.message);
  }
}

/**
 * 同步 recharge_ways 表新增 address 字段
 * @param {Egg.Application} app 应用实例
 */
async function syncRechargeWayAddressColumn(app) {
  const queryInterface = app.model.queryInterface;
  const { Sequelize } = app;
  const tableName = 'recharge_ways';

  try {
    const columns = await queryInterface.describeTable(tableName);
    if (!columns.address) {
      await queryInterface.addColumn(tableName, 'address', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: '充值地址/收款账号',
      });
      app.logger.info('[app] recharge_ways 表新增字段：address');
    }
  } catch (err) {
    app.logger.error('[app] 同步 recharge_ways 表 address 字段失败：', err.message);
  }
}

/**
 * 同步 user_credentials 表字段
 * 兼容已存在旧表结构的数据库，避免手动执行 ALTER
 * @param {Egg.Application} app 应用实例
 */
async function syncUserCredentialColumns(app) {
  const queryInterface = app.model.queryInterface;
  const { Sequelize } = app;
  const tableName = 'user_credentials';

  try {
    const columns = await queryInterface.describeTable(tableName);
    const col = columns.status;
    if (col) {
      await queryInterface.changeColumn(tableName, 'status', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '状态：0审核中 1已通过 2审核失败',
      });
      app.logger.info('[app] user_credentials 表 status 字段已同步，默认值：0');
    }
  } catch (err) {
    app.logger.error('[app] 同步 user_credentials 字段失败：', err.message);
    // 不影响启动流程，仅记录错误
  }
}

/**
 * 同步 withdraw_records 表新增字段
 * 兼容已存在旧表结构的数据库，避免手动执行 ALTER
 * @param {Egg.Application} app 应用实例
 */
async function syncWithdrawColumns(app) {
  const queryInterface = app.model.queryInterface;
  const { Sequelize } = app;
  const tableName = 'withdraw_records';

  try {
    const columns = await queryInterface.describeTable(tableName);

    // 旧字段 withdraw_date 改为允许 NULL，避免插入时报错
    if (columns.withdraw_date && columns.withdraw_date.allowNull === false) {
      await queryInterface.changeColumn(tableName, 'withdraw_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: '提现日期（旧字段，已弃用）',
      });
      app.logger.info('[app] withdraw_records 表 withdraw_date 已改为允许 NULL');
    }

    const columnDefs = {
      admin_id: { type: Sequelize.INTEGER.UNSIGNED, comment: '业务员ID' },
      admin_name: { type: Sequelize.STRING(64), comment: '业务员名称' },
      order_num: { type: Sequelize.STRING(64), comment: '订单号' },
      address: { type: Sequelize.STRING(255), comment: '提现地址' },
      sx_money: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.00, comment: '手续费' },
      take_money: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.00, comment: '用户到账金额' },
      way: { type: Sequelize.INTEGER, defaultValue: 0, comment: '提现方式' },
      examine_status: { type: Sequelize.INTEGER, defaultValue: 0, comment: '审核类型：0用户提现 1代付' },
      country: { type: Sequelize.STRING(64), comment: '国家/地区' },
      is_show_address: { type: Sequelize.INTEGER, defaultValue: 0, comment: '是否显示地址：0否 1是' },
      created_at: { type: Sequelize.DATE, comment: '创建时间' },
      updated_at: { type: Sequelize.DATE, comment: '更新时间' },
    };

    for (const [ columnName, columnDef ] of Object.entries(columnDefs)) {
      if (!columns[columnName]) {
        await queryInterface.addColumn(tableName, columnName, columnDef);
        app.logger.info('[app] withdraw_records 表新增字段：%s', columnName);
      }
    }

    app.logger.info('[app] withdraw_records 表字段同步完成');
  } catch (err) {
    app.logger.error('[app] 同步 withdraw_records 字段失败：', err.message);
  }
}

/**
 * 同步 recharge_records 表新增字段及旧数据映射
 * 兼容已存在旧表结构的数据库
 * @param {Egg.Application} app 应用实例
 */
async function syncRechargeRecordColumns(app) {
  const queryInterface = app.model.queryInterface;
  const { Sequelize } = app;
  const tableName = 'recharge_records';

  try {
    const columns = await queryInterface.describeTable(tableName);

    const columnDefs = {
      order_id: { type: Sequelize.INTEGER.UNSIGNED, comment: '订单ID' },
      order_num: { type: Sequelize.STRING(64), comment: '订单号' },
      created_at: { type: Sequelize.DATE, comment: '创建时间' },
      updated_at: { type: Sequelize.DATE, comment: '更新时间' },
    };

    for (const [ columnName, columnDef ] of Object.entries(columnDefs)) {
      if (!columns[columnName]) {
        await queryInterface.addColumn(tableName, columnName, columnDef);
        app.logger.info('[app] recharge_records 表新增字段：%s', columnName);
      }
    }

    // 兼容旧数据：将 operation_type 从 1/2 映射为 0/1
    // 旧：1=赠送客户，2=员工添加；新：0=赠送客户，1=员工添加，2=第三方充值
    const [ records ] = await app.model.query(`SELECT id, operation_type FROM ${tableName} WHERE operation_type IN (1, 2)`);
    if (records && records.length > 0) {
      for (const record of records) {
        const newType = record.operation_type === 1 ? 0 : 1;
        await app.model.query(`UPDATE ${tableName} SET operation_type = ${newType} WHERE id = ${record.id}`);
      }
      app.logger.info('[app] recharge_records 表 operation_type 旧数据映射完成，共 %s 条', records.length);
    }

    app.logger.info('[app] recharge_records 表字段同步完成');
  } catch (err) {
    app.logger.error('[app] 同步 recharge_records 字段失败：', err.message);
  }
}

/**
 * 同步 admin_operation_logs 表新增字段
 * 兼容已存在旧表结构的数据库
 * @param {Egg.Application} app 应用实例
 */
async function syncAdminOperationLogColumns(app) {
  const queryInterface = app.model.queryInterface;
  const { Sequelize } = app;
  const tableName = 'admin_operation_logs';

  try {
    const columns = await queryInterface.describeTable(tableName);

    const columnDefs = {
      oper_name: { type: Sequelize.STRING(64), comment: '操作人员名称' },
      operator_type: { type: Sequelize.INTEGER, comment: '账号权限等级：1管理员 2主管 3业务员' },
      title: { type: Sequelize.STRING(128), comment: '系统模块/操作标题' },
      business_type: { type: Sequelize.INTEGER, defaultValue: 9, comment: '操作类型：0新增 1修改 2删除 3授权 4导出 5导入 6强退 7生成代码 8清空数据 9其他' },
      oper_url: { type: Sequelize.STRING(255), comment: '请求地址' },
      request_method: { type: Sequelize.STRING(16), comment: '请求方式' },
      oper_param: { type: Sequelize.TEXT, comment: '请求参数' },
      json_result: { type: Sequelize.TEXT, comment: '接口返回结果' },
      request: { type: Sequelize.TEXT, comment: '请求信息汇总（JSON）' },
      oper_time: { type: Sequelize.DATE, comment: '操作时间' },
      remark: { type: Sequelize.STRING(500), comment: '备注' },
      created_at: { type: Sequelize.DATE, comment: '创建时间' },
      updated_at: { type: Sequelize.DATE, comment: '更新时间' },
    };

    for (const [ columnName, columnDef ] of Object.entries(columnDefs)) {
      if (!columns[columnName]) {
        await queryInterface.addColumn(tableName, columnName, columnDef);
        app.logger.info('[app] admin_operation_logs 表新增字段：%s', columnName);
      }
    }

    app.logger.info('[app] admin_operation_logs 表字段同步完成');
  } catch (err) {
    app.logger.error('[app] 同步 admin_operation_logs 字段失败：', err.message);
  }
}

/**
 * 同步 admin_login_logs 表新增字段及旧状态映射
 * 兼容已存在旧表结构的数据库
 * @param {Egg.Application} app 应用实例
 */
async function syncAdminLoginLogColumns(app) {
  const queryInterface = app.model.queryInterface;
  const { Sequelize } = app;
  const tableName = 'admin_login_logs';

  try {
    const columns = await queryInterface.describeTable(tableName);

    const columnDefs = {
      location: { type: Sequelize.STRING(255), comment: '登录地点' },
      remark: { type: Sequelize.STRING(500), comment: '备注' },
      created_at: { type: Sequelize.DATE, comment: '创建时间' },
      updated_at: { type: Sequelize.DATE, comment: '更新时间' },
    };

    for (const [ columnName, columnDef ] of Object.entries(columnDefs)) {
      if (!columns[columnName]) {
        await queryInterface.addColumn(tableName, columnName, columnDef);
        app.logger.info('[app] admin_login_logs 表新增字段：%s', columnName);
      }
    }

    // 兼容旧数据：status 语义从 1=成功/0=失败 改为 0=成功/1=失败
    const [ records ] = await app.model.query(`SELECT id, status FROM ${tableName} WHERE status IN (0, 1)`);
    if (records && records.length > 0) {
      for (const record of records) {
        const newStatus = record.status === 1 ? 0 : 1;
        await app.model.query(`UPDATE ${tableName} SET status = ${newStatus} WHERE id = ${record.id}`);
      }
      app.logger.info('[app] admin_login_logs 表 status 旧数据映射完成，共 %s 条', records.length);
    }

    app.logger.info('[app] admin_login_logs 表字段同步完成');
  } catch (err) {
    app.logger.error('[app] 同步 admin_login_logs 字段失败：', err.message);
  }
}

/**
 * 同步 user_login_log 表新增字段
 * 兼容已存在旧表结构的数据库
 * @param {Egg.Application} app 应用实例
 */
async function syncUserLoginLogColumns(app) {
  const queryInterface = app.model.queryInterface;
  const { Sequelize } = app;
  const tableName = 'user_login_log';

  try {
    const columns = await queryInterface.describeTable(tableName);

    const columnDefs = {
      login_location: { type: Sequelize.STRING(128), comment: '登录地点' },
      remark: { type: Sequelize.STRING(256), comment: '备注' },
    };

    for (const [ columnName, columnDef ] of Object.entries(columnDefs)) {
      if (!columns[columnName]) {
        await queryInterface.addColumn(tableName, columnName, columnDef);
        app.logger.info('[app] user_login_log 表新增字段：%s', columnName);
      }
    }

    app.logger.info('[app] user_login_log 表字段同步完成');
  } catch (err) {
    app.logger.error('[app] 同步 user_login_log 字段失败：', err.message);
  }
}

/**
 * 初始化默认角色
 * @param app
 */
async function initDefaultRoles(app) {}
async function syncRoleMenuTable(app) {}
async function syncUserColumns(app) {
  const queryInterface = app.model.queryInterface;
  const { Sequelize } = app;
  const tableName = 'users';

  try {
    const columns = await queryInterface.describeTable(tableName);

    const columnDefs = {
      user_level: { type: Sequelize.INTEGER.UNSIGNED, defaultValue: 1, comment: '用户层级' },
      strategy_id: { type: Sequelize.INTEGER.UNSIGNED, defaultValue: 0, comment: '绑定的策略ID' },
    };

    for (const [ name, def ] of Object.entries(columnDefs)) {
      if (!columns[name]) {
        await queryInterface.addColumn(tableName, name, def);
        app.logger.info(`[app] users 表新增字段：${name}`);
      }
    }
  } catch (err) {
    app.logger.error('[app] 同步 users 字段失败：', err.message);
    // 不影响启动流程，仅记录错误
  }
}

/**
 * 同步主管/业务员账号到移动端用户表
 * 确保历史管理员账号也能在移动端登录
 * @param {Egg.Application} app 应用实例
 */
async function syncAdminUserToMobile(app) {
  const ctx = app.createAnonymousContext();

  try {
    const admins = await ctx.model.AdminUser.findAll({
      where: { role: { [app.Sequelize.Op.in]: [ 2, 3 ] } },
      raw: true,
    });

    const syncedCount = 0;
    for (const admin of admins) {
      // 在 sys_user 表中，admin 的记录直接就存在了，因此不再需要同步到独立的移动端用户表。
      // 下面的逻辑已作废。
      continue;
    }

    if (syncedCount > 0) {
      app.logger.info('[app] 已同步 %s 个主管/业务员账号到移动端用户表', syncedCount);
    } else {
      app.logger.info('[app] 主管/业务员移动端账号已存在，跳过同步');
    }
  } catch (err) {
    app.logger.error('[app] 同步主管/业务员到移动端失败：', err.message);
  }
}

/**
 * 同步 strategy_rules 表新增字段
 * 兼容已存在旧表结构的数据库，避免手动执行 ALTER
 * @param {Egg.Application} app 应用实例
 */
async function syncStrategyRuleColumns(app) {
  const queryInterface = app.model.queryInterface;
  const { Sequelize } = app;
  const tableName = 'strategy_rules';

  try {
    const columns = await queryInterface.describeTable(tableName);

    // 新增字段
    const columnDefs = {
      add_money: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0.00, comment: '加佣金额' },
      remark: { type: Sequelize.STRING(500), comment: '备注' },
    };

    for (const [ name, def ] of Object.entries(columnDefs)) {
      if (!columns[name]) {
        await queryInterface.addColumn(tableName, name, def);
        app.logger.info(`[app] strategy_rules 表新增字段：${name}`);
      }
    }

    // 把 rule_type、match_type 从字符串类型改为整数类型，并转换现有数据
    const intColumnDefs = {
      rule_type: { type: Sequelize.INTEGER, defaultValue: 0, comment: '规则类型：0普通订单 1幸运订单' },
      match_type: { type: Sequelize.INTEGER, defaultValue: 0, comment: '匹配类型：0手动匹配 1智能匹配' },
    };

    for (const [ name, def ] of Object.entries(intColumnDefs)) {
      const col = columns[name];
      if (col) {
        if (!col.type.toUpperCase().includes('INT')) {
          // 先转换现有字符串数据为整数
          await app.model.queryInterface.sequelize.query(
            `UPDATE \`${tableName}\` SET \`${name}\` = CAST(\`${name}\` AS UNSIGNED) WHERE \`${name}\` IS NOT NULL`,
            { type: Sequelize.QueryTypes.UPDATE },
          );
        }
        // 同步列类型和默认值
        await queryInterface.changeColumn(tableName, name, def);
        app.logger.info(`[app] strategy_rules 表字段 ${name} 已同步为整数类型，默认值：${def.defaultValue}`);
      }
    }
  } catch (err) {
    app.logger.error('[app] 同步 strategy_rules 字段失败：', err.message);
    // 不影响启动流程，仅记录错误
  }
}
