const fs = require('fs');
const path = require('path');
const { Reader } = require('@maxmind/geoip2-node');

const dbPath = path.join(process.cwd(), 'GeoLite2-City.mmdb');
if (!fs.existsSync(dbPath)) {
  console.error(`Please download GeoLite2-City.mmdb from MaxMind and place it at ${dbPath}`);
  process.exit(1);
}

const dbBuffer = fs.readFileSync(dbPath);
const reader = Reader.openBuffer(dbBuffer);

const ip = '104.28.69.135'; // 替换为你想测试的 IP
try {
  const response = reader.city(ip);
  console.log('Result:', JSON.stringify(response, null, 2));

  let region = '无法解析';
  const parts = [];

  if (response) {
    const country = response.country?.names?.['zh-CN'] || response.country?.names?.en;
    const province = response.subdivisions?.[0]?.names?.['zh-CN'] || response.subdivisions?.[0]?.names?.en;
    const city = response.city?.names?.['zh-CN'] || response.city?.names?.en;
    
    if (country) {
      if (country === '中国' && (province || city)) {
        // 省略
      } else {
        parts.push(country);
      }
    }
    
    if (province) {
      parts.push(province);
    }
    
    if (city) {
      parts.push(city);
    }
    
    if (parts.length > 0) {
      region = parts.join(' ');
    }
  }

  console.log('Region:', region);
} catch (err) {
  if (err.name === 'AddressNotFoundError') {
    console.log('Region: 未知 (未在数据库中找到)');
  } else {
    console.error('Error:', err.message);
  }
}
