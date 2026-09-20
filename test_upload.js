const mm = require('egg-mock');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function testUpload() {
  const app = mm.app();
  await app.ready();
  
  const token = app.mockContext().app.jwt.sign({ id: 1056, user_id: 1056 }, app.config.jwt.secret);
  
  app.mockCsrf();
  
  const fakeImgPath = path.join(__dirname, 'test.jpg');
  fs.writeFileSync(fakeImgPath, 'fake image data');
  
  const res = await app.httpRequest()
    .post('/api/mobile/upload/image')
    .set('Authorization', `Bearer ${token}`)
    .attach('file', fakeImgPath)
    .expect(200);
    
  console.log(res.body);
  
  fs.unlinkSync(fakeImgPath);
  await app.close();
}

testUpload().catch(console.error);