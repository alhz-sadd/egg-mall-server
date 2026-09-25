const IP2Region = require('ip2region').default;
const searcher = new IP2Region();
const result = searcher.search('104.28.69.135');
console.log('Result:', result);

let region = '未知';
if (typeof result === 'string') {
  region = result.split('|').filter(item => item && item !== '0').join(' ');
} else {
  const { country, province, city, isp } = result;
  const parts = [];
  
  if (country && country !== '0') {
    if (country === '中国' && (province || city)) {
    } else {
      parts.push(country);
    }
  }
  
  if (province && province !== '0') {
    parts.push(province);
  }
  
  if (city && city !== '0') {
    if (!province || (!province.includes(city) && !city.includes(province))) {
      parts.push(city);
    }
  }
  
  if (isp && isp !== '0') {
    parts.push(isp);
  }
  
  if (parts.length > 0) {
    region = parts.join(' ');
  }
}
console.log('Region:', region);
