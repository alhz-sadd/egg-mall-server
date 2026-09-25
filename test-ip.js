const geoip = require('geoip-lite');

const result = geoip.lookup('104.28.69.135');
console.log('Result:', result);

let region = '无法解析';
const parts = [];

if (result) {
  if (result.country) {
    try {
      const regionNames = new Intl.DisplayNames(['zh-CN'], { type: 'region' });
      const countryName = regionNames.of(result.country);
      if (countryName === '中国' && (result.region || result.city)) {
        // 省略
      } else {
        parts.push(countryName || result.country);
      }
    } catch (e) {
      parts.push(result.country);
    }
  }
  
  if (result.region) {
    parts.push(result.region);
  }
  
  if (result.city) {
    parts.push(result.city);
  }
  
  if (parts.length > 0) {
    region = parts.join(' ');
  }
}

console.log('Region:', region);
