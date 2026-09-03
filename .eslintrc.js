'use strict';

module.exports = {
  extends: 'eslint-config-egg',
  parserOptions: {
    ecmaVersion: 2020,
  },
  rules: {
    // 允许使用 console（开发环境调试用）
    'no-console': 'off',
    // 数组和对象末尾逗号
    'comma-dangle': [ 'error', 'always-multiline' ],
  },
};
