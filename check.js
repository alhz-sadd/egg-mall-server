const sqlite3 = require('sqlite3'); 
const db = new sqlite3.Database('database/egg_mall_dev.sqlite'); 
db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='user_wallet'", (err, row) => console.log(row ? row.sql : 'No table')); 
db.all("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='user_wallet'", (err, rows) => console.log('user_wallet indexes:', rows));
db.all("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='user_wallet_log'", (err, rows) => console.log('user_wallet_log indexes:', rows));
