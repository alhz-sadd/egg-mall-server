const Sequelize = require('sequelize');
const sequelize = new Sequelize('egg_mall', 'egg_mall', 'rW5fnfCwJe3nrfHb', {
  host: '127.0.0.1',
  dialect: 'mysql',
  logging: false,
});

sequelize.query('SELECT * FROM shop_pay_channel').then(([results]) => {
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
