const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const jwt = require('jsonwebtoken');

async function testUpload() {
  const token = jwt.sign({ adminInnerId: 1, username: 'admin', type: 'admin_inner' }, 'your_jwt_secret_change_in_production');
  const form = new FormData();
  // Strip quotes if any
  let imagePath = '"C:\\Users\\ROG\\Desktop\\商品\\2\\1\\1.jpg"'.replace(/^"|"$/g, '');
  form.append('file', fs.createReadStream(imagePath));
  
  try {
    const res = await axios.post('http://127.0.0.1:7001/api/admin-inner/upload/image', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: 'Bearer ' + token
      }
    });
    console.log(res.data);
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}

testUpload();
