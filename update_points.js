const fs = require('fs');
const path = require('path');

const outerPath = path.join(__dirname, 'app/controller/admin_outer/points.js');
let outerCode = fs.readFileSync(outerPath, 'utf8');

// 修改 giveList 中的 include
outerCode = outerCode.replace(
  /const include = \[\];[\s\S]*?const result = await ctx\.model\.UserWalletLog\.findAndCountAll\(\{/m,
  `const include = [];
    include.push({
      model: ctx.model.SysUser,
      as: 'operator',
      attributes: [ 'user_id', 'username', 'nickname' ],
    });

    if (username) {
      include.push({
        model: ctx.model.SysUser,
        as: 'user',
        where: { username: { [Op.like]: \`%\${username}%\` } },
        attributes: [ 'user_id', 'username', 'nickname' ],
      });
    } else {
      include.push({
        model: ctx.model.SysUser,
        as: 'user',
        attributes: [ 'user_id', 'username', 'nickname' ],
      });
    }

    const result = await ctx.model.UserWalletLog.findAndCountAll({`
);

// 修改 giveList 中的 返回数据
outerCode = outerCode.replace(
  /ctx\.body = \{\s*code: 200,\s*message: '获取成功',\s*data: \{\s*total: result\.count,\s*list: result\.rows,\s*\},\s*\};/m,
  `const formattedList = result.rows.map(item => {
      const operator = item.operator || {};
      const user = item.user || {};
      return {
        id: item.id,
        operator_id: item.operator_id,
        operator_name: operator.nickname || operator.username || '',
        user_id: item.user_id,
        user_name: user.nickname || user.username || '',
        balance_type: item.balance_type,
        amount: item.amount,
        remark: item.remark,
        create_time: item.create_time,
      };
    });

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        total: result.count,
        list: formattedList,
      },
    };`
);

// 修改 giveCreate 中的 operator_id, log_no 等
outerCode = outerCode.replace(
  /const \{ shop_id \} = ctx\.state\.adminOuter \|\| \{\};/m,
  `const { shop_id, user_id: operator_id } = ctx.state.adminOuter || {};`
);

outerCode = outerCode.replace(
  /await ctx\.model\.UserWalletLog\.create\(\{[\s\S]*?\}, \{ transaction \}\);/m,
  `await ctx.model.UserWalletLog.create({
        user_id: final_user_id,
        operator_id,
        log_no,
        biz_type: 8, // 人工上分
        amount: Number(final_amount),
        balance_type: final_balance_type, // 1=代金资产
        before_balance,
        after_balance,
        remark: remark || 'B端人工上分',
      }, { transaction });`
);

// deductList 修改
outerCode = outerCode.replace(
  /const include = \[\];[\s\S]*?const result = await ctx\.model\.UserWalletLog\.findAndCountAll\(\{/g,
  function(match, offset, string) {
      if (offset > 3000) {
        return `const include = [];
    include.push({
      model: ctx.model.SysUser,
      as: 'operator',
      attributes: [ 'user_id', 'username', 'nickname' ],
    });

    if (username) {
      include.push({
        model: ctx.model.SysUser,
        as: 'user',
        where: { username: { [Op.like]: \`%\${username}%\` } },
        attributes: [ 'user_id', 'username', 'nickname' ],
      });
    } else {
      include.push({
        model: ctx.model.SysUser,
        as: 'user',
        attributes: [ 'user_id', 'username', 'nickname' ],
      });
    }

    const result = await ctx.model.UserWalletLog.findAndCountAll({`;
      }
      return match;
  }
);

outerCode = outerCode.replace(
  /ctx\.body = \{\s*code: 200,\s*message: '获取成功',\s*data: \{\s*total: result\.count,\s*list: result\.rows,\s*\},\s*\};\s*\}\s*\/\/\s*B端 人工扣款/m,
  `const formattedList = result.rows.map(item => {
      const operator = item.operator || {};
      const user = item.user || {};
      return {
        id: item.id,
        operator_id: item.operator_id,
        operator_name: operator.nickname || operator.username || '',
        user_id: item.user_id,
        user_name: user.nickname || user.username || '',
        balance_type: item.balance_type,
        amount: item.amount,
        remark: item.remark,
        create_time: item.create_time,
      };
    });

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        total: result.count,
        list: formattedList,
      },
    };
  }

  // B端 人工扣款`
);

outerCode = outerCode.replace(
  /const \{ user_id, amount, remark \} = ctx\.request\.body;/m,
  `const { user_id, amount, remark } = ctx.request.body;\n    const operator_id = ctx.state.adminOuter ? ctx.state.adminOuter.user_id : null;`
);

outerCode = outerCode.replace(
  /await ctx\.model\.UserWalletLog\.create\(\{\s*user_id,\s*biz_type: 9, \/\/ 人工下分\s*amount: -Number\(amount\),\s*balance_after: Number\(wallet\.voucher_balance\) - Number\(amount\),\s*remark: remark \|\| 'B端人工下分',\s*\}, \{ transaction \}\);/m,
  `await ctx.model.UserWalletLog.create({
        user_id,
        operator_id,
        log_no: \`B_DD_\${Date.now()}\`,
        biz_type: 9, // 人工下分
        amount: -Number(amount),
        balance_type: 4, // 假设 4=扣款
        before_balance: Number(wallet.voucher_balance),
        after_balance: Number(wallet.voucher_balance) - Number(amount),
        remark: remark || 'B端人工下分',
      }, { transaction });`
);

fs.writeFileSync(outerPath, outerCode, 'utf8');

// ====================== Admin Inner ======================

const innerPath = path.join(__dirname, 'app/controller/admin_inner/points.js');
let innerCode = fs.readFileSync(innerPath, 'utf8');

// giveList
innerCode = innerCode.replace(
  /const include = \[\];[\s\S]*?const result = await ctx\.model\.UserWalletLog\.findAndCountAll\(\{/m,
  `const include = [];
    include.push({
      model: ctx.model.SysUser,
      as: 'operator',
      attributes: [ 'user_id', 'username', 'nickname' ],
    });

    if (username) {
      include.push({
        model: ctx.model.SysUser,
        as: 'user',
        where: { username: { [Op.like]: \`%\${username}%\` } },
        attributes: [ 'user_id', 'username', 'nickname' ],
      });
    } else {
      include.push({
        model: ctx.model.SysUser,
        as: 'user',
        attributes: [ 'user_id', 'username', 'nickname' ],
      });
    }

    const result = await ctx.model.UserWalletLog.findAndCountAll({`
);

innerCode = innerCode.replace(
  /ctx\.body = \{\s*code: 200,\s*message: '获取成功',\s*data: \{\s*total: result\.count,\s*list: result\.rows,\s*\},\s*\};/m,
  `const formattedList = result.rows.map(item => {
      const operator = item.operator || {};
      const user = item.user || {};
      return {
        id: item.id,
        operator_id: item.operator_id,
        operator_name: operator.nickname || operator.username || '',
        user_id: item.user_id,
        user_name: user.nickname || user.username || '',
        balance_type: item.balance_type,
        amount: item.amount,
        remark: item.remark,
        create_time: item.create_time,
      };
    });

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        total: result.count,
        list: formattedList,
      },
    };`
);

// giveCreate
innerCode = innerCode.replace(
  /const \{ user_id, amount, remark \} = ctx\.request\.body;/m,
  `const { user_id, amount, remark, balance_type } = ctx.request.body;\n    const operator_id = ctx.state.adminInner ? ctx.state.adminInner.adminInnerId : null;`
);

innerCode = innerCode.replace(
  /await ctx\.model\.UserWalletLog\.create\(\{\s*user_id,\s*biz_type: 8, \/\/ 人工上分\s*amount: Number\(amount\),\s*balance_after: Number\(wallet\.voucher_balance\) \+ Number\(amount\),\s*remark: remark \|\| 'A端人工上分',\s*\}, \{ transaction \}\);/m,
  `await ctx.model.UserWalletLog.create({
        user_id,
        operator_id,
        log_no: \`A_GV_\${Date.now()}\`,
        biz_type: 8, // 人工上分
        amount: Number(amount),
        balance_type: balance_type || 1, // 1=增送客户
        before_balance: Number(wallet.voucher_balance),
        after_balance: Number(wallet.voucher_balance) + Number(amount),
        remark: remark || 'A端人工上分',
      }, { transaction });`
);

// deductList
innerCode = innerCode.replace(
  /const include = \[\];[\s\S]*?const result = await ctx\.model\.UserWalletLog\.findAndCountAll\(\{/g,
  function(match, offset) {
      if (offset > 2000) {
        return `const include = [];
    include.push({
      model: ctx.model.SysUser,
      as: 'operator',
      attributes: [ 'user_id', 'username', 'nickname' ],
    });

    if (username) {
      include.push({
        model: ctx.model.SysUser,
        as: 'user',
        where: { username: { [Op.like]: \`%\${username}%\` } },
        attributes: [ 'user_id', 'username', 'nickname' ],
      });
    } else {
      include.push({
        model: ctx.model.SysUser,
        as: 'user',
        attributes: [ 'user_id', 'username', 'nickname' ],
      });
    }

    const result = await ctx.model.UserWalletLog.findAndCountAll({`;
      }
      return match;
  }
);

innerCode = innerCode.replace(
  /ctx\.body = \{\s*code: 200,\s*message: '获取成功',\s*data: \{\s*total: result\.count,\s*list: result\.rows,\s*\},\s*\};\s*\}\s*\/\/\s*A端 人工扣款/m,
  `const formattedList = result.rows.map(item => {
      const operator = item.operator || {};
      const user = item.user || {};
      return {
        id: item.id,
        operator_id: item.operator_id,
        operator_name: operator.nickname || operator.username || '',
        user_id: item.user_id,
        user_name: user.nickname || user.username || '',
        balance_type: item.balance_type,
        amount: item.amount,
        remark: item.remark,
        create_time: item.create_time,
      };
    });

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        total: result.count,
        list: formattedList,
      },
    };
  }

  // A端 人工扣款`
);

// deductCreate
innerCode = innerCode.replace(
  /const \{ user_id, amount, remark \} = ctx\.request\.body;/g,
  function(match, offset) {
      if (offset > 3000) {
        return `const { user_id, amount, remark } = ctx.request.body;\n    const operator_id = ctx.state.adminInner ? ctx.state.adminInner.adminInnerId : null;`;
      }
      return match;
  }
);

innerCode = innerCode.replace(
  /await ctx\.model\.UserWalletLog\.create\(\{\s*user_id,\s*biz_type: 9, \/\/ 人工下分\s*amount: -Number\(amount\),\s*balance_after: Number\(wallet\.voucher_balance\) - Number\(amount\),\s*remark: remark \|\| 'A端人工下分',\s*\}, \{ transaction \}\);/m,
  `await ctx.model.UserWalletLog.create({
        user_id,
        operator_id,
        log_no: \`A_DD_\${Date.now()}\`,
        biz_type: 9, // 人工下分
        amount: -Number(amount),
        balance_type: 4, // 扣款
        before_balance: Number(wallet.voucher_balance),
        after_balance: Number(wallet.voucher_balance) - Number(amount),
        remark: remark || 'A端人工下分',
      }, { transaction });`
);

fs.writeFileSync(innerPath, innerCode, 'utf8');
console.log('Update points controller done.');
