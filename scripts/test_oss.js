const mm = require('egg-mock');
require('dotenv').config();

async function testOSS() {
  const app = mm.app();
  await app.ready();
  const ctx = app.mockContext();
  
  try {
    const list = await ctx.oss.list({ 'max-keys': 1 });
    console.log('OSS connection successful. Bucket list:', list);
  } catch (err) {
    console.error('OSS connection failed:', err);
  }
  
  await app.close();
}

testOSS();