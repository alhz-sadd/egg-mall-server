const axios = require('axios');
const jwt = require('jsonwebtoken');
const config = require('./config/config.default')({ name: 'egg_mall', baseDir: __dirname });

const token = jwt.sign(
  { id: 2459, userId: 2459, user_id: 2459, user_phone: '44723349567', type: 'user' },
  config.jwt.secret,
  { expiresIn: '1h' }
);

async function test() {
  try {
    const res1 = await axios.get('http://127.0.0.1:7001/api/mobile/account/info', {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('Account Info:', JSON.stringify(res1.data, null, 2));

    const res2 = await axios.get('http://127.0.0.1:7001/api/mobile/getUserTaskInfo', {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('Task Info:', JSON.stringify(res2.data, null, 2));
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}
test();
