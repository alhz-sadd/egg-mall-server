const fs = require('fs');
const path = require('path');
const axios = require('axios');
const xlsx = require('xlsx');

const rawData = [
  {
    "createBy": null,
    "createTime": null,
    "updateBy": null,
    "updateTime": null,
    "remark": null,
    "ids": null,
    "googleCode": null,
    "sortId": null,
    "waresId": 63703360,
    "sortName": null,
    "waresName": "Galaxy S22 Ultra, Certified Re-Newed 256GB",
    "waresPrice": 869,
    "picUrl": "[\"/profile/waresPic/63703330.jpg\"]",
    "priority": null,
    "picUrlList": [
      "/profile/waresPic/63703330.jpg"
    ]
  },
  {
    "createBy": null,
    "createTime": null,
    "updateBy": null,
    "updateTime": null,
    "remark": null,
    "ids": null,
    "googleCode": null,
    "sortId": null,
    "waresId": 63703392,
    "sortName": null,
    "waresName": "\"iPhone 14 256G 6.1-inch display1\"",
    "waresPrice": 899,
    "picUrl": "[\"/profile/waresPic/63703361.jpg\",\"/profile/waresPic/63703362.jpg\",\"/profile/waresPic/63703363.jpg\"]",
    "priority": null,
    "picUrlList": [
      "/profile/waresPic/63703361.jpg",
      "/profile/waresPic/63703362.jpg",
      "/profile/waresPic/63703363.jpg"
    ]
  },
  {
    "createBy": null,
    "createTime": null,
    "updateBy": null,
    "updateTime": null,
    "remark": null,
    "ids": null,
    "googleCode": null,
    "sortId": null,
    "waresId": 63703425,
    "sortName": null,
    "waresName": "iPhone 14 Pro 128GB 6.1-inch display",
    "waresPrice": 999,
    "picUrl": "[\"/profile/waresPic/63703393.jpg\",\"/profile/waresPic/63703394.jpg\",\"/profile/waresPic/63703424.jpg\"]",
    "priority": null,
    "picUrlList": [
      "/profile/waresPic/63703393.jpg",
      "/profile/waresPic/63703394.jpg",
      "/profile/waresPic/63703424.jpg"
    ]
  },
  {
    "createBy": null,
    "createTime": null,
    "updateBy": null,
    "updateTime": null,
    "remark": null,
    "ids": null,
    "googleCode": null,
    "sortId": null,
    "waresId": 63703456,
    "sortName": null,
    "waresName": "Galaxy S23+",
    "waresPrice": 999.99,
    "picUrl": "[\"/profile/waresPic/63703426.jpg\"]",
    "priority": null,
    "picUrlList": [
      "/profile/waresPic/63703426.jpg"
    ]
  },
  {
    "createBy": null,
    "createTime": null,
    "updateBy": null,
    "updateTime": null,
    "remark": null,
    "ids": null,
    "googleCode": null,
    "sortId": null,
    "waresId": 63703488,
    "sortName": null,
    "waresName": "iPhone 14 Pro 256GB 6.1-inch display",
    "waresPrice": 1099,
    "picUrl": "[\"/profile/waresPic/63703457.jpg\",\"/profile/waresPic/63703458.jpg\",\"/profile/waresPic/63703459.jpg\"]",
    "priority": null,
    "picUrlList": [
      "/profile/waresPic/63703457.jpg",
      "/profile/waresPic/63703458.jpg",
      "/profile/waresPic/63703459.jpg"
    ]
  },
  {
    "createBy": null,
    "createTime": null,
    "updateBy": null,
    "updateTime": null,
    "remark": null,
    "ids": null,
    "googleCode": null,
    "sortId": null,
    "waresId": 63704929,
    "sortName": null,
    "waresName": "iPhone 14 512G 6.1-inch display1\"",
    "waresPrice": 1099,
    "picUrl": "[\"/profile/waresPic/63704864.jpg\",\"/profile/waresPic/63704896.jpg\",\"/profile/waresPic/63704928.jpg\"]",
    "priority": null,
    "picUrlList": [
      "/profile/waresPic/63704864.jpg",
      "/profile/waresPic/63704896.jpg",
      "/profile/waresPic/63704928.jpg"
    ]
  },
  {
    "createBy": null,
    "createTime": null,
    "updateBy": null,
    "updateTime": null,
    "remark": null,
    "ids": null,
    "googleCode": null,
    "sortId": null,
    "waresId": 63704960,
    "sortName": null,
    "waresName": "Galaxy S23 Ultra",
    "waresPrice": 1199.99,
    "picUrl": "[\"/profile/waresPic/63704930.jpg\"]",
    "priority": null,
    "picUrlList": [
      "/profile/waresPic/63704930.jpg"
    ]
  },
  {
    "createBy": null,
    "createTime": null,
    "updateBy": null,
    "updateTime": null,
    "remark": null,
    "ids": null,
    "googleCode": null,
    "sortId": null,
    "waresId": 63704963,
    "sortName": null,
    "waresName": "Apple Watch Hermès Silver Stainless Steel Case with Single Tour\"",
    "waresPrice": 1249,
    "picUrl": "[\"/profile/waresPic/63704961.jpg\",\"/profile/waresPic/63704962.jpg\"]",
    "priority": null,
    "picUrlList": [
      "/profile/waresPic/63704961.jpg",
      "/profile/waresPic/63704962.jpg"
    ]
  },
  {
    "createBy": null,
    "createTime": null,
    "updateBy": null,
    "updateTime": null,
    "remark": null,
    "ids": null,
    "googleCode": null,
    "sortId": null,
    "waresId": 63704994,
    "sortName": null,
    "waresName": "iPhone 14 Pro 512GB 6.1-inch display",
    "waresPrice": 1299,
    "picUrl": "[\"/profile/waresPic/63704964.jpg\",\"/profile/waresPic/63704992.jpg\",\"/profile/waresPic/63704993.jpg\"]",
    "priority": null,
    "picUrlList": [
      "/profile/waresPic/63704964.jpg",
      "/profile/waresPic/63704992.jpg",
      "/profile/waresPic/63704993.jpg"
    ]
  },
  {
    "createBy": null,
    "createTime": null,
    "updateBy": null,
    "updateTime": null,
    "remark": null,
    "ids": null,
    "googleCode": null,
    "sortId": null,
    "waresId": 63705025,
    "sortName": null,
    "waresName": "iPhone 14 Pro 1TB 6.1-inch display",
    "waresPrice": 1499,
    "picUrl": "[\"/profile/waresPic/63704995.jpg\",\"/profile/waresPic/63704996.jpg\",\"/profile/waresPic/63705024.jpg\"]",
    "priority": null,
    "picUrlList": [
      "/profile/waresPic/63704995.jpg",
      "/profile/waresPic/63704996.jpg",
      "/profile/waresPic/63705024.jpg"
    ]
  }
];

const BASE_URL = 'https://app.tshoptai.vip';
const EXCEL_OUTPUT_PATH = 'c:\\\\Users\\\\ROG\\\\Desktop\\\\egg_mall_server\\\\.gf\\\\商品\\\\1-移动.xlsx';
const BASE_IMG_DIR = 'C:\\\\Users\\\\ROG\\\\Desktop\\\\egg_mall_server\\\\.gf\\\\商品\\\\1-移动';

async function downloadImage(url, dest) {
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 10000, // 10 seconds timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(dest);
      response.data.pipe(writer);
      let error = null;
      writer.on('error', err => {
        error = err;
        writer.close();
        reject(err);
      });
      writer.on('close', () => {
        if (!error) resolve(true);
      });
    });
  } catch (err) {
    console.error(`Failed to download ${url}: ${err.message}`);
    return false;
  }
}

async function main() {
  if (!fs.existsSync(BASE_IMG_DIR)) {
    fs.mkdirSync(BASE_IMG_DIR, { recursive: true });
  }

  // Load existing Excel file to append data
  let existingData = [];
  if (fs.existsSync(EXCEL_OUTPUT_PATH)) {
    try {
      const existingWorkbook = xlsx.readFile(EXCEL_OUTPUT_PATH);
      if (existingWorkbook.SheetNames.length > 0) {
        const existingSheetName = existingWorkbook.SheetNames[0];
        existingData = xlsx.utils.sheet_to_json(existingWorkbook.Sheets[existingSheetName]);
      }
    } catch (err) {
      console.log('Error reading Excel file, assuming it is empty:', err.message);
    }
  }

  const excelData = [];

  const startOffset = existingData.length;

  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i];
    const itemDirNumber = startOffset + i + 1;
    const itemDir = path.join(BASE_IMG_DIR, String(itemDirNumber));
    
    if (!fs.existsSync(itemDir)) {
      fs.mkdirSync(itemDir, { recursive: true });
    }

    console.log(`Processing item ${itemDirNumber}: ${item.waresName}`);

    // Download images
    if (item.picUrlList && item.picUrlList.length > 0) {
      for (const relativePath of item.picUrlList) {
        // Construct full URL (removing any duplicate slashes just in case)
        const fullUrl = BASE_URL + (relativePath.startsWith('/') ? relativePath : '/' + relativePath);
        const fileName = path.basename(relativePath);
        const destPath = path.join(itemDir, fileName);
        
        console.log(`  Downloading ${fullUrl} to ${destPath}...`);
        await downloadImage(fullUrl, destPath);
      }
    }

    // Add to Excel data array
    excelData.push({
      '商品名称': item.waresName,
      '价格': item.waresPrice,
      '分类': 1,
      '图片': itemDir
    });
  }

  // Combine existing data with new data
  const finalData = existingData.concat(excelData);

  // Create Excel file
  console.log('Writing Excel file...');
  
  // Ensure the target directory for excel exists
  const excelDir = path.dirname(EXCEL_OUTPUT_PATH);
  if (!fs.existsSync(excelDir)) {
    fs.mkdirSync(excelDir, { recursive: true });
  }

  const worksheet = xlsx.utils.json_to_sheet(finalData);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  
  xlsx.writeFile(workbook, EXCEL_OUTPUT_PATH);
  console.log(`Excel file saved to ${EXCEL_OUTPUT_PATH}`);
  console.log('All done!');
}

main();
