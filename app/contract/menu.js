'use strict';

module.exports = {
  CreateMenuRequest: {
    parent_id: { type: 'integer', required: false, description: '父级ID' },
    name: { type: 'string', required: true, description: '名称' },
    path: { type: 'string', required: true, description: '路径' },
    component: { type: 'string', required: false, description: '组件' },
    redirect: { type: 'string', required: false, description: '跳转' },
    hidden: { type: 'boolean', required: false, description: '是否隐藏' },
    alwaysShow: { type: 'boolean', required: false, description: '是否总是显示' },
    meta: { type: 'object', required: false, description: '元信息' },
  },
  UpdateMenuRequest: {
    parent_id: { type: 'integer', required: false, description: '父级ID' },
    name: { type: 'string', required: false, description: '名称' },
    path: { type: 'string', required: false, description: '路径' },
    component: { type: 'string', required: false, description: '组件' },
    redirect: { type: 'string', required: false, description: '跳转' },
    hidden: { type: 'boolean', required: false, description: '是否隐藏' },
    alwaysShow: { type: 'boolean', required: false, description: '是否总是显示' },
    meta: { type: 'object', required: false, description: '元信息' },
  },
};
