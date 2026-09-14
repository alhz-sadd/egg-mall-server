const http = require('http');
http.get('http://127.0.0.1:7001/api/mobile/recharge/sales-address', res => {
  console.log('Status Code:', res.statusCode);
  res.on('data', d => {
    process.stdout.write(d);
  });
}).on('error', e => {
  console.error('Error:', e.message);
});
