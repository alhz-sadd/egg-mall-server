const xlsx = require('xlsx');
const fs = require('fs');

try {
  const workbook = xlsx.readFile('c:\\Users\\ROG\\Desktop\\egg_mall_server\\.gf\\商品\\商品-家电.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  const formattedData = data.map(row => {
    const keys = Object.keys(row);
    return {
      name: row[keys[0]],
      price: row[keys[1]],
      image1: row[keys[2]],
      image2: row[keys[3]],
      image3: row[keys[4]],
    }
  });
  console.log(JSON.stringify(formattedData, null, 2));
} catch (error) {
  console.error(error);
}
