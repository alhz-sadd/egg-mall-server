const xlsx = require('xlsx');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const EXCEL_PATH = 'c:\\Users\\ROG\\Desktop\\egg_mall_server\\.gf\\商品\\商品-家电.xlsx';
const API_BASE = 'http://127.0.0.1:7001';
const JWT_SECRET = 'your_jwt_secret_change_in_production';

async function processImagePath(imagePath, token) {
  const cleanPath = String(imagePath).replace(/^"|"$/g, '').trim();
  if (!cleanPath) return [];
  
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return [cleanPath];
  }
  
  if (!fs.existsSync(cleanPath)) {
    console.warn(`[WARN] Path not found: ${cleanPath}`);
    return [];
  }
  
  const stat = fs.statSync(cleanPath);
  const urls = [];
  
  if (stat.isDirectory()) {
    const files = fs.readdirSync(cleanPath);
    for (const file of files) {
      const fullPath = require('path').join(cleanPath, file);
      if (fs.statSync(fullPath).isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(file)) {
        const url = await uploadSingleFile(fullPath, token);
        if (url) urls.push(url);
      }
    }
  } else {
    const url = await uploadSingleFile(cleanPath, token);
    if (url) urls.push(url);
  }
  
  return urls;
}

async function uploadSingleFile(filePath, token) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  
  try {
    const res = await axios.post(`${API_BASE}/api/admin-inner/upload/image`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: 'Bearer ' + token
      }
    });
    if (res.data && res.data.code === 200) {
      return res.data.data.url;
    } else {
      console.error(`[ERROR] Upload failed for ${filePath}:`, res.data);
      return null;
    }
  } catch(e) {
    console.error(`[ERROR] Upload exception for ${filePath}:`, e.response ? e.response.data : e.message);
    return null;
  }
}

async function checkGoodsExist(goodsName, token) {
  try {
    const res = await axios.get(`${API_BASE}/api/admin-inner/goods`, {
      params: { goods_name: goodsName },
      headers: { Authorization: 'Bearer ' + token }
    });
    if (res.data && res.data.code === 200 && res.data.data && res.data.data.list) {
      // API uses LIKE query, so we do exact match check in JS
      return res.data.data.list.some(item => item.goods_name === goodsName);
    }
    return false;
  } catch(e) {
    console.error(`[ERROR] Check goods exist exception for ${goodsName}:`, e.message);
    return false;
  }
}

async function createGoods(goodsData, token) {
  try {
    const res = await axios.post(`${API_BASE}/api/admin-inner/goods`, goodsData, {
      headers: {
        Authorization: 'Bearer ' + token
      }
    });
    if (res.data && res.data.code === 200) {
      console.log(`[SUCCESS] Created goods: ${goodsData.goods_name}`);
    } else {
      console.error(`[ERROR] Create goods failed for ${goodsData.goods_name}:`, res.data);
    }
  } catch(e) {
    console.error(`[ERROR] Create goods exception for ${goodsData.goods_name}:`, e.response ? e.response.data : e.message);
  }
}

async function main() {
  const token = jwt.sign({ adminInnerId: 1, username: 'admin', type: 'admin_inner' }, JWT_SECRET);
  
  console.log('[INFO] Reading Excel file...');
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const keys = Object.keys(row);
    
    const goods_name = row['商品名称'] || row[keys[0]];
    const price = row['价格'] || row[keys[1]];
    const category_id = row['分类'] !== undefined ? row['分类'] : 2;
    
    console.log(`\n[INFO] Processing item ${i + 1}/${data.length}: ${goods_name}`);
    
    // Check if goods already exists
    const exists = await checkGoodsExist(goods_name, token);
    if (exists) {
      console.log(`[INFO] Goods "${goods_name}" already exists, skipping.`);
      continue;
    }
    
    const imageUrls = [];
    for (const key of keys) {
      if (key.includes('图片') || key.toLowerCase().includes('image')) {
        const imgVal = row[key];
        if (imgVal) {
          const urls = await processImagePath(imgVal, token);
          imageUrls.push(...urls);
        }
      }
    }
    
    const goodsData = {
      goods_name: goods_name,
      category_id: Number(category_id) || 2,
      price: Number(price) || 0,
      images: imageUrls
    };
    
    await createGoods(goodsData, token);
  }
  
  console.log('\n[INFO] All done!');
}

main();
