'use strict';

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
      } catch (err) {
        app.logger.error('[app] 数据库模型同步失败：', err.message);
        app.logger.error('[app] 请确认 MySQL 服务已启动且连接配置正确');
      }
    }
  }
}

module.exports = AppBootHook;
