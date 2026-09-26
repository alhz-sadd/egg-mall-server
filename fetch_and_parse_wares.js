const fs = require('fs');
const path = require('path');
const axios = require('axios');
const xlsx = require('xlsx');

// =============== 配置区域 ===============
// 替换为实际的图片服务器基础 URL，如果 picUrl 是完整的 URL，则不需要
const BASE_URL = 'https://jaspcf.ptaskl.vip'; 

// 定义目录路径
// const BASE_DIR = path.join(__dirname, '.gf', '商品');
// const TASK_WARES_DIR = path.join(BASE_DIR, '任务商品库');
// const EXCEL_FILE_PATH = path.join(BASE_DIR, 'all.xlsx');

// 数据源，这里放置你拉取到的 JSON 数据
const rawData = [
  // 第一页 10条数据
  {
    "waresId": 63696067,
    "waresName": "20000 mAh Mini Power Bank Large-Capacity PowerBank Fast Charging Transparent Comes With Cables",
    "waresPrice": 5,
    "picUrl": "[\"/profile/waresPic/63696064.jpg\",\"/profile/waresPic/63696065.jpg\",\"/profile/waresPic/63696066.jpg\"]"
  },
  {
    "waresId": 63696128,
    "waresName": "5000mAh Portable Charger Comaptible With iPhone Mini PowerBank Fast Charging With Type-C Cable",
    "waresPrice": 6,
    "picUrl": "[\"/profile/waresPic/63696096.jpg\",\"/profile/waresPic/63696097.jpg\",\"/profile/waresPic/63696098.jpg\"]"
  },
  {
    "waresId": 63725058,
    "waresName": "Sports Hula Hoop Removable Stainless Steel Elastic Thick Foam Bodybuilding Yoga Fitness Exercise",
    "waresPrice": 7,
    "picUrl": "[\"/profile/waresPic/63725024.jpg\",\"/profile/waresPic/63725056.jpg\",\"/profile/waresPic/63725057.jpg\"]"
  },
  {
    "waresId": 63707456,
    "waresName": "Generic Fryer 26 cm ",
    "waresPrice": 8,
    "picUrl": "[\"/profile/waresPic/63707424.jpg\"]"
  },
  {
    "waresId": 63707458,
    "waresName": "Generic Electric Kettle",
    "waresPrice": 9,
    "picUrl": "[\"/profile/waresPic/63707457.jpg\"]"
  },
  {
    "waresId": 63696160,
    "waresName": "SG STOCK Portable Button Mini Fan 360 Degree Flow With Silicone Clip",
    "waresPrice": 10,
    "picUrl": "[\"/profile/waresPic/63696129.jpg\",\"/profile/waresPic/63696130.jpg\",\"/profile/waresPic/63696131.jpg\"]"
  },
  {
    "waresId": 63718688,
    "waresName": "UGREEN Ethernet Extender Cable Cat 8 Extension Network Cable 40Gbps 2000MHz RJ45 Network Patch Cord Double Shielding Mal",
    "waresPrice": 10,
    "picUrl": "[\"/profile/waresPic/63718656.jpg\",\"/profile/waresPic/63718657.jpg\"]"
  },
  {
    "waresId": 63707462,
    "waresName": "4 Blades Portable Electric Juice Blender Fruit Juicer Cup USB Rechargeable Juice Maker Bottle Mixer",
    "waresPrice": 10,
    "picUrl": "[\"/profile/waresPic/63707459.jpg\",\"/profile/waresPic/63707460.jpg\",\"/profile/waresPic/63707461.jpg\"]"
  },
  {
    "waresId": 63725091,
    "waresName": "UTS Rope Skipping Cordless Skipping Rope Cordless Jumping Rope Ropeless Wireless Skipping Rope Sport Equipment",
    "waresPrice": 10.99,
    "picUrl": "[\"/profile/waresPic/63725088.jpg\",\"/profile/waresPic/63725089.jpg\",\"/profile/waresPic/63725090.jpg\"]"
  },
  {
    "waresId": 63696162,
    "waresName": "iProtect USB-C 20W Fast Charging Foldable Power Adapter Plug",
    "waresPrice": 13.4,
    "picUrl": "[\"/profile/waresPic/63696161.jpg\"]"
  },
  // 第二页 10条数据
  {
    "waresId": 63696192,
    "waresName": "Anvers Power Bank Mini Portable Charger Wireless Fast Charging Capsule Lightweight Small Cute PowerBank",
    "waresPrice": 15,
    "picUrl": "[\"/profile/waresPic/63696163.jpg\",\"/profile/waresPic/63696164.jpg\"]"
  },
  {
    "waresId": 108832736,
    "waresName": "Avatar Controls GU10 Smart Bulb 2 Pack, Alexa GU10 LED Light Bulb, 50W Halogen Equivalent Light Bulbs, 5W 2700K-6500K Dimmable Wi-Fi Track Light Bulbs Music Timer RGBCW Color Changing",
    "waresPrice": 15.19,
    "picUrl": "[\"/profile/waresPic/61hyTAx-TLL._AC_SX679_.jpg\"]"
  },
  {
    "waresId": 95416768,
    "waresName": "Yesesion 2 Pack Plastic Cord Organizer Box with 20 Wire Ties, Clear Cable Storage Case with 8 Compartments, Electronics Organizer for Office, Desk Accessories Storage for Stationery Supplies",
    "waresPrice": 16.99,
    "picUrl": "[\"/profile/waresPic/41-4FA2I7tL._AC_US40_.jpg\",\"/profile/waresPic/51vOb32na+S._AC_US40_.jpg\"]"
  },
  {
    "waresId": 63707489,
    "waresName": "Easy Ice Shaver / Ice Breaker /Portable Manual Handheld Snow ice shaver machine Ice Breaker kitchen",
    "waresPrice": 17.9,
    "picUrl": "[\"/profile/waresPic/63707463.jpg\",\"/profile/waresPic/63707464.jpg\",\"/profile/waresPic/63707488.jpg\"]"
  },
  {
    "waresId": 63696225,
    "waresName": "SanDisk Cruzer Blade USB 2.0 Flash Drive, Maximum Portability Thumb Drive, 32GB",
    "waresPrice": 19,
    "picUrl": "[\"/profile/waresPic/63696193.jpg\",\"/profile/waresPic/63696194.jpg\",\"/profile/waresPic/63696224.jpg\"]"
  },
  {
    "waresId": 95519104,
    "waresName": "Cup Holder Phone Mount for Car, Phone Cup Holder for Car iPhone with Expandable Base, Compatible with iPhone Samsung All Phones (1 Pack)",
    "waresPrice": 19.99,
    "picUrl": "[\"/profile/waresPic/51rianOO1rL._AC_SX679_.jpg\",\"/profile/waresPic/718-ofa4TCL._AC_SX679_.jpg\"]"
  },
  {
    "waresId": 63718692,
    "waresName": "UGREEN USB Type-C to RJ45 Console Cable RS232 Serial Adapter 1.5m Converter Network",
    "waresPrice": 20,
    "picUrl": "[\"/profile/waresPic/63718689.jpg\",\"/profile/waresPic/63718690.jpg\",\"/profile/waresPic/63718691.jpg\"]"
  },
  {
    "waresId": 170811392,
    "waresName": "IRWIN Utility Knife, Folding (2089100), Blue",
    "waresPrice": 20.01,
    "picUrl": "[\"/profile/waresPic/170811392.jpg\"]"
  },
  {
    "waresId": 170823042,
    "waresName": "ACDelco Gold GF952 Fuel Filter Kit",
    "waresPrice": 20.02,
    "picUrl": "[\"/profile/waresPic/170823042.jpg\"]"
  },
  {
    "waresId": 170815816,
    "waresName": "PowerA Twin Charging Station for Dualsense Wireless Controllers, Charge, Sony PlayStation, PS5, Officially Licensed",
    "waresPrice": 20.03,
    "picUrl": "[\"/profile/waresPic/170815816.jpg\"]"
  },
  // 第三页 10条数据
  {
    "waresId": 170817122,
    "waresName": "Mens Flip Flops, Plantar Fasciitis Flat Feet Heel Pain Relief Soft Comfort Non-Slip Slippers Indoor Outdoor Summer Holiday Beach Pool Sandals",
    "waresPrice": 20.08,
    "picUrl": "[\"/profile/waresPic/170817122.jpg\"]"
  },
  {
    "waresId": 170811553,
    "waresName": "Winnes Acupuncture Pen Electronic Accupressure Pen, USB Rechargeable Pain Relief Electric Meridians Energy Pen Massager Pen Pain Relief Massage Tool with 3 Massage Heads & 2 Massage Gel",
    "waresPrice": 20.1,
    "picUrl": "[\"/profile/waresPic/170811553.jpg\"]"
  },
  {
    "waresId": 108837536,
    "waresName": "Broadlink Smart Wi-Fi Bulb, RGB Multicolor Changing Dimmable LED Light, A19 E26 10W, Works with Alexa, Google Home, Siri and IFTTT, No Hub Required (2 Bulbs)",
    "waresPrice": 20.1,
    "picUrl": "[\"/profile/waresPic/51y-EfWrN9L._AC_SX679_.jpg\"]"
  },
  {
    "waresId": 170814952,
    "waresName": "BEMIS 400TTA 000 Economy Toilet Seat, Durable Enameled Wood, ROUND, White",
    "waresPrice": 20.14,
    "picUrl": "[\"/profile/waresPic/170814952.jpg\"]"
  },
  {
    "waresId": 170801061,
    "waresName": "Digital Coffee Scale with Timer, 3kg/0.1g High Precision Coffee Weight Scale with LCD Display, Pour Over Drip Espresso Scale, USB Charging Mini Food Electronic Scale, Pocket Cooking Scale",
    "waresPrice": 20.18,
    "picUrl": "[\"/profile/waresPic/170801061.jpg\"]"
  },
  {
    "waresId": 170811809,
    "waresName": "Uonlytech 4 pcs sink draining rack tray triangle sink basket storage basket colander basket sink basket Triangular Drain Basket Suction cup basket corner bracket wash basin drainer sponge",
    "waresPrice": 20.19,
    "picUrl": "[\"/profile/waresPic/170811809.jpg\"]"
  },
  {
    "waresId": 170822368,
    "waresName": "Prestige Medical Analog Stethoscope Watch",
    "waresPrice": 20.2,
    "picUrl": "[\"/profile/waresPic/170822368.jpg\"]"
  },
  {
    "waresId": 170816266,
    "waresName": "Bali Women's 3-Pack Solid Microfiber Full Brief Panty",
    "waresPrice": 20.23,
    "picUrl": "[\"/profile/waresPic/170816266.jpg\"]"
  },
  {
    "waresId": 170822858,
    "waresName": "V7425 Spark Plugs – Replacement of #3951 TR55 (8 Pack)",
    "waresPrice": 20.24,
    "picUrl": "[\"/profile/waresPic/170822858.jpg\"]"
  },
  {
    "waresId": 170813409,
    "waresName": "Finish Line Mineral Oil Brake Fluid Bottle, 16 oz",
    "waresPrice": 20.27,
    "picUrl": "[\"/profile/waresPic/170813409.jpg\"]"
  },
  // 第四页 10条数据
  {
    "waresId": 170811778,
    "waresName": "DOITOOL Japanese Rice Washing Bowl Stainless Steel Colander Bowl Kitchen Strainer Washer Drainer Basket Basin for Vegetable Fruits Pasta Salad Mixing Food Prep 28. 5cm",
    "waresPrice": 20.29,
    "picUrl": "[\"/profile/waresPic/170811778.jpg\"]"
  },
  {
    "waresId": 170819745,
    "waresName": "Purina Friskies Lil' Gravies Savory Salmon Flavor Cat Food Complement Lickable Cat Treats - (Pack of 16) 1.55 oz. Pouches",
    "waresPrice": 20.32,
    "picUrl": "[\"/profile/waresPic/170819745.jpg\"]"
  },
  {
    "waresId": 170798530,
    "waresName": "Hanes Womens Originals Seamless Stretch Rib Bikini Panties Pack, Assorted Colors, 6-Pack",
    "waresPrice": 20.33,
    "picUrl": "[\"/profile/waresPic/170798530.jpg\"]"
  },
  {
    "waresId": 170813824,
    "waresName": "Gabriel Cosmetics Lipstick (Aurora - Bronze/Neutral Pearl)",
    "waresPrice": 20.35,
    "picUrl": "[\"/profile/waresPic/170813824.jpg\"]"
  },
  {
    "waresId": 170823010,
    "waresName": "WIX Filters - 49146 Air Filter Panel, Pack of 1",
    "waresPrice": 20.36,
    "picUrl": "[\"/profile/waresPic/170823010.jpg\"]"
  },
  {
    "waresId": 170815969,
    "waresName": "80 pcs Mini Swim Rings Miniature Swimming Rings Float Swimming Rings Toy for Dollhouse Pool Accessories - Pink+Yellow",
    "waresPrice": 20.39,
    "picUrl": "[\"/profile/waresPic/170815969.jpg\"]"
  },
  {
    "waresId": 170816999,
    "waresName": "Amazon Essentials Men's Straight-Fit Jogger Pant",
    "waresPrice": 20.4,
    "picUrl": "[\"/profile/waresPic/170816999.jpg\"]"
  },
  {
    "waresId": 170822957,
    "waresName": "FRAM Extra Guard CA8755A Replacement Engine Air Filter for Select Cadillac, Chevrolet, and GMC Models, Provides Up to 12 Months or 12,000 Miles Filter Protection",
    "waresPrice": 20.44,
    "picUrl": "[\"/profile/waresPic/170822957.jpg\"]"
  },
  {
    "waresId": 170815368,
    "waresName": "Pierced Owl - 14GA CNC Set Lined CZ Cross F-136 Implant Grade Titanium Industrial Cartilage Barbell",
    "waresPrice": 20.45,
    "picUrl": "[\"/profile/waresPic/170815368.jpg\"]"
  },
  {
    "waresId": 170813796,
    "waresName": "M.A.C. LOVE ME LIPSTICK E FOR EFFORTLESS",
    "waresPrice": 20.49,
    "picUrl": "[\"/profile/waresPic/170813796.jpg\"]"
  },
  // 第五页 10条数据
  {
    "waresId": 170800227,
    "waresName": "Nueve&Five Electric Kettle with Digital Temperature Display(℉/℃), 1.7L Double Wall Electric Hot Water Kettle, Auto Shut Off, 1200W Seamless 304 Stainless Steel Electric Tea Kettle -Black…",
    "waresPrice": 20.5,
    "picUrl": "[\"/profile/waresPic/170800227.jpg\"]"
  },
  {
    "waresId": 170822958,
    "waresName": "FRAM Extra Guard CA12260 Replacement Engine Air Filter for Select Chevrolet Equinox and GMC Terrain (1.5L, 1.6L & 2.0L) Models, Provides Up to 12 Months or 12,000 Miles Filter Protection",
    "waresPrice": 20.52,
    "picUrl": "[\"/profile/waresPic/170822958.jpg\"]"
  },
  {
    "waresId": 170813026,
    "waresName": "PG Engine Air Filter PA9943  Fits 2022-17 Nissan Armada, 2023-14 INFINITI QX80, 2013-11 QX56",
    "waresPrice": 20.54,
    "picUrl": "[\"/profile/waresPic/170813026.jpg\"]"
  },
  {
    "waresId": 170812418,
    "waresName": "Round Tablecloth Fitted Table Cover,Lakeside Plank Pier Fall Foggy Forest Waterproof Table Cloth with Elastic Edge,Thanksgiving Autumn Washable Tablecloths for Kitchen Indoor Outdoor Party 36-44in",
    "waresPrice": 20.55,
    "picUrl": "[\"/profile/waresPic/170812418.jpg\"]"
  },
  {
    "waresId": 170822659,
    "waresName": "Abdominal, 3 in 1 Women Postpartum Recovery Waist Tummy Support Belt Hip Cincher Body Shaper Waist Slimming Belt XL Especially for After Birth Nude",
    "waresPrice": 20.57,
    "picUrl": "[\"/profile/waresPic/170822659.jpg\"]"
  },
  {
    "waresId": 170812322,
    "waresName": "Coastal Pier Elegant Women's Beach Swimsuit,Stylish One-Piece Bathing Suit for A Chic Beach Look",
    "waresPrice": 20.58,
    "picUrl": "[\"/profile/waresPic/170812322.jpg\"]"
  },
  {
    "waresId": 170807522,
    "waresName": "12 Pcs Christmas Elf Accessories Kits Inflatable Snow Tube Warm Ear Cozy Muffs Scarf for Boy or Girl Elves Doll",
    "waresPrice": 20.59,
    "picUrl": "[\"/profile/waresPic/170807522.jpg\"]"
  },
  {
    "waresId": 170813024,
    "waresName": "FRAM Extra Guard CA10261 Replacement Engine Air Filter for 2007-2022 Dodge Ram 2500-5500 (6.4L & 6.7L), Provides Up to 12 Months or 12,000 Miles Filter Protection",
    "waresPrice": 20.61,
    "picUrl": "[\"/profile/waresPic/170813024.jpg\"]"
  },
  {
    "waresId": 170811649,
    "waresName": "NDS 970 Square Grate Spee-D Catch Basin 6 in. Drain Pipes & Fittings, 9 in, Black Plastic",
    "waresPrice": 20.63,
    "picUrl": "[\"/profile/waresPic/170811649.jpg\"]"
  },
  {
    "waresId": 170823138,
    "waresName": "1080P Car Driving Recorder with G Sensor Loop Recording Dual Dash Cam 3in Front and Inside Large Screen Display for Safe Driving",
    "waresPrice": 20.68,
    "picUrl": "[\"/profile/waresPic/170823138.jpg\"]"
  },
  // 第六页 10条数据
  {
    "waresId": 170799202,
    "waresName": "for iPhone 7 Screen Replacement Kit: 4.7inch LCD Display and 3D Touch Digitizer Full Assembly, for A1660, A1778, A1779 and Full Repair Tools",
    "waresPrice": 20.69,
    "picUrl": "[\"/profile/waresPic/170799202.jpg\"]"
  },
  {
    "waresId": 170811138,
    "waresName": "New Balance Boys' Soft Cotton Tag Free Brief Underwear (5-Pack)",
    "waresPrice": 20.74,
    "picUrl": "[\"/profile/waresPic/170811138.jpg\"]"
  },
  {
    "waresId": 170804577,
    "waresName": "Guy Laroche For Men - Long Lasting Eau De Parfum Cologne For Men - Preferred Men's Fragrances Of Vanilla, Bergamot, Rosemary, Clary Sage, And Patchouli Oil - EDP Spray - 3.4 Oz",
    "waresPrice": 20.75,
    "picUrl": "[\"/profile/waresPic/170804577.jpg\"]"
  },
  {
    "waresId": 170798368,
    "waresName": "Fila Women's Calla Crop Mesh Tank",
    "waresPrice": 20.76,
    "picUrl": "[\"/profile/waresPic/170798368.jpg\"]"
  },
  {
    "waresId": 170822181,
    "waresName": "Lars Amadeus Striped Cropped Dress Pants for Men's Slim Fit Flat Front Office Business Trousers",
    "waresPrice": 20.77,
    "picUrl": "[\"/profile/waresPic/170822181.jpg\"]"
  },
  {
    "waresId": 170797441,
    "waresName": "Ekouaer Womens Silk Satin Tank Top 2 Pack V Neck Basic Camisole",
    "waresPrice": 20.78,
    "picUrl": "[\"/profile/waresPic/170797441.jpg\"]"
  },
  {
    "waresId": 170797952,
    "waresName": "Orders Long Sleeve Short Dress, Women's Printed Shirts Lightweight Round Neck Tops Bottoming Dresses for Women 2024 Midi Dress Wedding Guest Prom Gown Maxi (XXL, Gray)",
    "waresPrice": 20.79,
    "picUrl": "[\"/profile/waresPic/170797952.jpg\"]"
  },
  {
    "waresId": 170806593,
    "waresName": "Purina Fancy Feast Grilled Wet Cat Food Chicken Feast in Wet Cat Food Gravy - (Pack of 24) 3 oz. Cans",
    "waresPrice": 20.8,
    "picUrl": "[\"/profile/waresPic/170806593.jpg\"]"
  },
  {
    "waresId": 170823009,
    "waresName": "FRAM Extra Guard CA11010 Replacement Engine Air Filter for Select 2010-2013 Acura MDX/ZDX (3.7L) Models, Provides Up to 12 Months or 12,000 Miles Filter Protection",
    "waresPrice": 20.82,
    "picUrl": "[\"/profile/waresPic/170823009.jpg\"]"
  },
  {
    "waresId": 170822978,
    "waresName": "ACDelco GM Original Equipment A3176C Air Filter",
    "waresPrice": 20.83,
    "picUrl": "[\"/profile/waresPic/170822978.jpg\"]"
  },
  // 第七页 10条数据
  {
    "waresId": 170823074,
    "waresName": "CRP 8114117 X Nf Pentofrost Antiffre",
    "waresPrice": 20.84,
    "picUrl": "[\"/profile/waresPic/170823074.jpg\"]"
  },
  {
    "waresId": 170820802,
    "waresName": "Rucan For DJI Tello Quadcopter Drone Intelligent Flight Battery 1100 mAh 3.8V",
    "waresPrice": 20.85,
    "picUrl": "[\"/profile/waresPic/170820802.jpg\"]"
  },
  {
    "waresId": 170814241,
    "waresName": "Women's Crewneck Slim Fitted Short Sleeve T-Shirt Stretchy Bodycon Basic Tee Tops",
    "waresPrice": 20.86,
    "picUrl": "[\"/profile/waresPic/170814241.jpg\"]"
  },
  {
    "waresId": 170822756,
    "waresName": "AQUANEAT LED Aquarium Light Full Spectrum for 18 Inch to 24 Inch Fish Tank Light Fresh Water Light Multi-Color",
    "waresPrice": 20.88,
    "picUrl": "[\"/profile/waresPic/170822756.jpg\"]"
  },
  {
    "waresId": 170805600,
    "waresName": "Nutri-Vet Guard+ for Cats - Flea & Tick Prevention for Cats 1.5 lbs and Up - Waterproof - 30 Days of Protection - 3 Month Supply",
    "waresPrice": 20.89,
    "picUrl": "[\"/profile/waresPic/170805600.jpg\"]"
  },
  {
    "waresId": 170807521,
    "waresName": "Miabella Solid 18K Gold Over Sterling Silver Italian 5mm Diamond-Cut Figaro Chain Bracelet for Women Men, 925 Made in Italy",
    "waresPrice": 20.9,
    "picUrl": "[\"/profile/waresPic/170807521.jpg\"]"
  },
  {
    "waresId": 170813154,
    "waresName": "Purolator F65613 Fuel Filter",
    "waresPrice": 20.93,
    "picUrl": "[\"/profile/waresPic/170813154.jpg\"]"
  },
  {
    "waresId": 170805633,
    "waresName": "Seachem Prime Fresh and Saltwater Conditioner - Chemical Remover and Detoxifier 500 ml",
    "waresPrice": 20.94,
    "picUrl": "[\"/profile/waresPic/170805633.jpg\"]"
  },
  {
    "waresId": 170813280,
    "waresName": "BOSCH 6727 OE Fine Wire Platinum Spark Plug - Pack of 4",
    "waresPrice": 20.95,
    "picUrl": "[\"/profile/waresPic/170813280.jpg\"]"
  },
  {
    "waresId": 170808257,
    "waresName": "Nostalgia MyMini Cupcake Maker, Compact Size for Dorms, Apartments, Makes 7 Mini Cakes, Non-Stick Surface, Easy-To-Clean, Perfect for Dessert, Breakfast, or Snacks, Keto Friendly, Pink",
    "waresPrice": 20.96,
    "picUrl": "[\"/profile/waresPic/170808257.jpg\"]"
  },
  // 第八页 10条数据
  {
    "waresId": 170815010,
    "waresName": "Vintage Silver Knuckle Rings Set for Women Men, Chunky Rings Aesthetic Snake Grunge Stackable Gothic Ring Adjustable Y2K Punk Bulky Boho Finger Alt of Rings, Stacking Fairy Skull Frog Heart Star Flower Midi Ring Pack",
    "waresPrice": 20.97,
    "picUrl": "[\"/profile/waresPic/170815010.jpg\"]"
  },
  {
    "waresId": 170803170,
    "waresName": "Fluidmaster 400ARHRKP10 PerforMAX Universal High Performance All in One Repair Kit for 2-Inch Flush Valve Toilets, Easy Install",
    "waresPrice": 20.98,
    "picUrl": "[\"/profile/waresPic/170803170.jpg\"]"
  },
  {
    "waresId": 170797154,
    "waresName": "Linen Pants Women Summer Boho Floral Pants Hight Waist Drawstring Casual Loose Trousers with Pockets Waist Pant",
    "waresPrice": 20.99,
    "picUrl": "[\"/profile/waresPic/170797154.jpg\"]"
  },
  {
    "waresId": 170804835,
    "waresName": "Zuzu Luxe Lip Color Lipstick (Icon - Pinkish Purple/Cool Pearl), Natural Lipstick, Paraben Free, Vegan, Gluten-free, Cruelty-free, Non GMO, 0.13 oz",
    "waresPrice": 21,
    "picUrl": "[\"/profile/waresPic/170804835.jpg\"]"
  },
  {
    "waresId": 170802561,
    "waresName": "Robot Holocaust",
    "waresPrice": 21.03,
    "picUrl": "[\"/profile/waresPic/170802561.jpg\"]"
  },
  {
    "waresId": 170811201,
    "waresName": "The Children's Place Girl's Clog Sandals",
    "waresPrice": 21.08,
    "picUrl": "[\"/profile/waresPic/170811201.jpg\"]"
  },
  {
    "waresId": 170800963,
    "waresName": "PRITECH Beard Trimmer for Men, 3 in 1 Hair Clippers for Men Kit, Nose Hair Trimmer, Micro Shaver Mens Grooming Kit Cordless Electric Hair Trimmer LED Display IPX6 (Silver)",
    "waresPrice": 21.09,
    "picUrl": "[\"/profile/waresPic/170800963.jpg\"]"
  },
  {
    "waresId": 170804512,
    "waresName": "Editions de Parfums Frederic Malle Portrait of a Lady Parfum Sample Travel Spray#",
    "waresPrice": 21.12,
    "picUrl": "[\"/profile/waresPic/170804512.jpg\"]"
  },
  {
    "waresId": 170797921,
    "waresName": "Summer Women's Bottoming Dress Spring and Autumn Inner wear Mid Length Sleeveless Black Tank Top Dress(Green,XXL)",
    "waresPrice": 21.15,
    "picUrl": "[\"/profile/waresPic/170797921.jpg\"]"
  },
  {
    "waresId": 170812739,
    "waresName": "Dorman 76829 Temperature Control Knob Assortment Compatible with Select Chrysler/Dodge/Eagle Models, Black",
    "waresPrice": 21.18,
    "picUrl": "[\"/profile/waresPic/170812739.jpg\"]"
  },
  // 第九页 10条数据
  {
    "waresId": 170816866,
    "waresName": "Uonlytech 4 pcs sink draining rack tray triangle sink basket storage basket colander basket sink basket Triangular Drain Basket Suction cup basket corner bracket wash basin drainer sponge",
    "waresPrice": 21.19,
    "picUrl": "[\"/profile/waresPic/170816866.jpg\"]"
  },
  {
    "waresId": 170823049,
    "waresName": "Finish Line Mineral Oil Brake Fluid Bottle, 16 oz",
    "waresPrice": 21.27,
    "picUrl": "[\"/profile/waresPic/170823049.jpg\"]"
  },
  {
    "waresId": 170806466,
    "waresName": "Purina Friskies Dry Cat Food, Seafood Sensations - 22 lb. Bag",
    "waresPrice": 21.28,
    "picUrl": "[\"/profile/waresPic/170806466.jpg\"]"
  },
  {
    "waresId": 170816865,
    "waresName": "DOITOOL Japanese Rice Washing Bowl Stainless Steel Colander Bowl Kitchen Strainer Washer Drainer Basket Basin for Vegetable Fruits Pasta Salad Mixing Food Prep 28. 5cm",
    "waresPrice": 21.29,
    "picUrl": "[\"/profile/waresPic/170816865.jpg\"]"
  },
  {
    "waresId": 63696257,
    "waresName": "Samsung galaxy smart tag plus compatible ",
    "waresPrice": 21.3,
    "picUrl": "[\"/profile/waresPic/63696226.jpg\",\"/profile/waresPic/63696227.jpg\",\"/profile/waresPic/63696256.jpg\"]"
  },
  {
    "waresId": 170822242,
    "waresName": "Hanes Womens Originals Seamless Stretch Rib Bikini Panties Pack, Assorted Colors, 6-Pack",
    "waresPrice": 21.33,
    "picUrl": "[\"/profile/waresPic/170822242.jpg\"]"
  },
  {
    "waresId": 170797984,
    "waresName": "Summer Women's Bottoming Dress Spring and Autumn Inner wear Mid Length Sleeveless Black Tank Top Dress(Blue,XXL)",
    "waresPrice": 21.34,
    "picUrl": "[\"/profile/waresPic/170797984.jpg\"]"
  },
  {
    "waresId": 170804738,
    "waresName": "Rasasi Blue Eau De Toilette Spray for Men, 3.4 Ounce",
    "waresPrice": 21.36,
    "picUrl": "[\"/profile/waresPic/170804738.jpg\"]"
  },
  {
    "waresId": 170811808,
    "waresName": "Bathroom Sink Stopper,Basin Sink Drain Flip Popup Drainer Stopper Kitchen Bathroom Hardware Accessory Matte Black",
    "waresPrice": 21.37,
    "picUrl": "[\"/profile/waresPic/170811808.jpg\"]"
  },
  {
    "waresId": 170806114,
    "waresName": "Amazon Brand - Solimo Sweet Potato & Duck Jerky Dog Treats, 2 pounds",
    "waresPrice": 21.41,
    "picUrl": "[\"/profile/waresPic/170806114.jpg\"]"
  },
  // 第十页 10条数据
  {
    "waresId": 170797281,
    "waresName": "Women's Velvet High Waist Wide Leg Pants Casual Baggy Pants for Fall Winter",
    "waresPrice": 21.42,
    "picUrl": "[\"/profile/waresPic/170797281.jpg\"]"
  },
  {
    "waresId": 170803906,
    "waresName": "Kirkland Signature Stool Softener 100 mg., 400 Softgels (2 Pack)",
    "waresPrice": 21.46,
    "picUrl": "[\"/profile/waresPic/170803906.jpg\"]"
  },
  {
    "waresId": 170802657,
    "waresName": "Hot Wheels RC Toy Car, Remote-Control Nissan Z in 1:64 Scale with Controller & USB Cable, Works On & Off Track cc",
    "waresPrice": 21.49,
    "picUrl": "[\"/profile/waresPic/170802657.jpg\"]"
  },
  {
    "waresId": 170814508,
    "waresName": "Nueve&Five Electric Kettle with Digital Temperature Display(℉/℃), 1.7L Double Wall Electric Hot Water Kettle, Auto Shut Off, 1200W Seamless 304 Stainless Steel Electric Tea Kettle -Black…",
    "waresPrice": 21.5,
    "picUrl": "[\"/profile/waresPic/170814508.jpg\"]"
  },
  {
    "waresId": 170806049,
    "waresName": "Purina Beneful Small Breed Wet Dog Food Variety Pack, IncrediBites Pate - (2 Packs of 12) 3 oz. Cans",
    "waresPrice": 21.52,
    "picUrl": "[\"/profile/waresPic/170806049.jpg\"]"
  },
  {
    "waresId": 170822979,
    "waresName": "PG Engine Air Filter PA9943  Fits 2022-17 Nissan Armada, 2023-14 INFINITI QX80, 2013-11 QX56",
    "waresPrice": 21.54,
    "picUrl": "[\"/profile/waresPic/170822979.jpg\"]"
  },
  {
    "waresId": 170812866,
    "waresName": "Plasticolor 006695R01 Jeep Deluxe High Contrast Stitching Premium Steering Wheel Cover for Cars, Trucks & SUV",
    "waresPrice": 21.56,
    "picUrl": "[\"/profile/waresPic/170812866.jpg\"]"
  },
  {
    "waresId": 170812320,
    "waresName": "Round Fitted Tablecloths with Elastic Edge,Flip Flops Summer Pier Swimming Pool Waterproof Table Cover Frangipani Starfish Ocean Washable Table Cloth for Indoor Outdoor Kitchen 36-44in",
    "waresPrice": 21.57,
    "picUrl": "[\"/profile/waresPic/170812320.jpg\"]"
  },
  {
    "waresId": 170806402,
    "waresName": "3 Pack of Urinary Tract Support Feline Health Chews, 2.5 Ounces Each, Grain-Free, Made in The USA",
    "waresPrice": 21.58,
    "picUrl": "[\"/profile/waresPic/170806402.jpg\"]"
  },
  {
    "waresId": 170815970,
    "waresName": "12 Pcs Christmas Elf Accessories Kits Inflatable Snow Tube Warm Ear Cozy Muffs Scarf for Boy or Girl Elves Doll",
    "waresPrice": 21.59,
    "picUrl": "[\"/profile/waresPic/170815970.jpg\"]"
  },
  // 第十一页 10条数据
  {
    "waresId": 170810592,
    "waresName": "BLUEWEST Foldable Toilet Stool, Acacia Wood Poop Stool for Potty Training, 7 Inch Collapsible Bathroom Stool, Folding Stool for Adults with Non-Slip",
    "waresPrice": 21.6,
    "picUrl": "[\"/profile/waresPic/170810592.jpg\"]"
  },
  {
    "waresId": 170822976,
    "waresName": "FRAM Extra Guard CA10261 Replacement Engine Air Filter for 2007-2022 Dodge Ram 2500-5500 (6.4L & 6.7L), Provides Up to 12 Months or 12,000 Miles Filter Protection",
    "waresPrice": 21.61,
    "picUrl": "[\"/profile/waresPic/170822976.jpg\"]"
  },
  {
    "waresId": 170812833,
    "waresName": "Car Seat Cushion, Memory Foam Car Coccyx Seat Pad Pillow for Driving- Sciatica & Back Pain Relief, Heightening Wedge Cushions for Car Driver Office Lumbar Tailbone Support",
    "waresPrice": 21.62,
    "picUrl": "[\"/profile/waresPic/170812833.jpg\"]"
  },
  {
    "waresId": 170816264,
    "waresName": "New Balance Boys' Soft Cotton Tag Free Brief Underwear (5-Pack)",
    "waresPrice": 21.74,
    "picUrl": "[\"/profile/waresPic/170816264.jpg\"]"
  },
  {
    "waresId": 170814661,
    "waresName": "Crocon 1LB Green Jade tumbled stones and Crystals bulk 2000+ Carats natural Crystal Kit for Reiki Healing Crystal Polished, tumble stones, Chakra Balancing, Reiki Gift, Home Decor Size : 20mm",
    "waresPrice": 21.75,
    "picUrl": "[\"/profile/waresPic/170814661.jpg\"]"
  },
  {
    "waresId": 170815585,
    "waresName": "Fila Women's Calla Crop Mesh Tank",
    "waresPrice": 21.76,
    "picUrl": "[\"/profile/waresPic/170815585.jpg\"]"
  },
  {
    "waresId": 170814467,
    "waresName": "Ekouaer Womens Silk Satin Tank Top 2 Pack V Neck Basic Camisole",
    "waresPrice": 21.78,
    "picUrl": "[\"/profile/waresPic/170814467.jpg\"]"
  },
  {
    "waresId": 170805698,
    "waresName": "Blue Buffalo Blue's Stew Grain Free Natural Adult Wet Dog Food Variety Pack, 12.5 oz cans (6 Count- 3 of Each Flavor)",
    "waresPrice": 21.79,
    "picUrl": "[\"/profile/waresPic/170805698.jpg\"]"
  },
  {
    "waresId": 170813864,
    "waresName": "Purina Fancy Feast Grilled Wet Cat Food Chicken Feast in Wet Cat Food Gravy - (Pack of 24) 3 oz. Cans",
    "waresPrice": 21.8,
    "picUrl": "[\"/profile/waresPic/170813864.jpg\"]"
  },
  {
    "waresId": 170797152,
    "waresName": "Lola Jeans Women's Lola High Rise Culotte",
    "waresPrice": 21.84,
    "picUrl": "[\"/profile/waresPic/170797152.jpg\"]"
  },
  // 第十二页 10条数据
  {
    "waresId": 170800801,
    "waresName": "Holstein Housewares - Non-Stick Omelet & Frittata Maker, Stainless Steel - Makes 2 Individual Portions Quick & Easy (2 Section, Black)",
    "waresPrice": 21.85,
    "picUrl": "[\"/profile/waresPic/170800801.jpg\"]"
  },
  {
    "waresId": 170812673,
    "waresName": "VAGURFO Rubber Edge Trim,Car Weather Striping,Door Rubber Seal Strip Trim Seal,Automotive Weather Stripping Edge Guard for Cars, Boats, RVs, Trucks, and Home Applications (20 FT)",
    "waresPrice": 21.87,
    "picUrl": "[\"/profile/waresPic/170812673.jpg\"]"
  },
  {
    "waresId": 170810562,
    "waresName": "7 Inch Bamboo Toilet Stool, Foldable Poop Stool, Bathroom Step Stool Squat (Black)",
    "waresPrice": 21.88,
    "picUrl": "[\"/profile/waresPic/170810562.jpg\"]"
  },
  {
    "waresId": 170803297,
    "waresName": "YISURE White No Hook Needed Extra Long Shower Curtain Liner 96 Inches, PEVA Plastic Waterproof Heavy Duty Bathroom Curtain Hook Free Shower Liner 72x96''",
    "waresPrice": 21.89,
    "picUrl": "[\"/profile/waresPic/170803297.jpg\"]"
  },
  {
    "waresId": 170807424,
    "waresName": "Miabella 925 Sterling Silver or 18K Yellow Gold Over Silver Round Initial Pendant Necklace for Women 18 to 20 Inch Chain, Dainty Letter Necklace Made in Italy",
    "waresPrice": 21.9,
    "picUrl": "[\"/profile/waresPic/170807424.jpg\"]"
  },
  {
    "waresId": 170811168,
    "waresName": "The Children's Place Baby-Boy's Fisherman Sandals Slipper",
    "waresPrice": 21.91,
    "picUrl": "[\"/profile/waresPic/170811168.jpg\"]"
  },
  {
    "waresId": 170806915,
    "waresName": "Natural Jade Stone Necklace, Adjustable Rope Chain Length Lucky Protection Friendship Charm Pendant Necklace for Women Friends Gifts",
    "waresPrice": 21.93,
    "picUrl": "[\"/profile/waresPic/170806915.jpg\"]"
  },
  {
    "waresId": 170822755,
    "waresName": "Seachem Prime Fresh and Saltwater Conditioner - Chemical Remover and Detoxifier 500 ml",
    "waresPrice": 21.94,
    "picUrl": "[\"/profile/waresPic/170822755.jpg\"]"
  },
  {
    "waresId": 170804674,
    "waresName": "NovoGlow Verse Adonis Eau De Parfum for Men 3.4 Fl. Oz. 100ml Men's Perfume Refreshing Combination of Woody Floral & Fruity Scents - Masculine Scent Lasts All Day A Gift for Any Occasion",
    "waresPrice": 21.95,
    "picUrl": "[\"/profile/waresPic/170804674.jpg\"]"
  },
  {
    "waresId": 170803904,
    "waresName": "Kids Step Stool, Kindergarten Study Stools, Lightweight Footstools are Sturdy and Durable, Very Suitable for Use in The Kitchen, Bathroom and Bedroom (Red Wine)",
    "waresPrice": 21.96,
    "picUrl": "[\"/profile/waresPic/170803904.jpg\"]"
  },
  // 第十三页 10条数据
  {
    "waresId": 170806848,
    "waresName": "Fountain Water with Filter Panel for Pond",
    "waresPrice": 21.97,
    "picUrl": "[\"/profile/waresPic/170806848.jpg\"]"
  },
  {
    "waresId": 170800706,
    "waresName": "DASH 8” Express Electric Round Griddle for for Pancakes, Cookies, Burgers, Quesadillas, Eggs & other on the go Breakfast, Lunch & Snacks - Red",
    "waresPrice": 21.98,
    "picUrl": "[\"/profile/waresPic/170800706.jpg\"]"
  },
  {
    "waresId": 170797376,
    "waresName": "KANCY KOLE Women Paper Bag Pants High Waist with Pockets Tie Casual Cropped Trousers S-XXL",
    "waresPrice": 21.99,
    "picUrl": "[\"/profile/waresPic/170797376.jpg\"]"
  },
  {
    "waresId": 170804769,
    "waresName": "JF9 Black Cologne",
    "waresPrice": 22,
    "picUrl": "[\"/profile/waresPic/170804769.jpg\"]"
  },
  {
    "waresId": 170814889,
    "waresName": "Robot Holocaust",
    "waresPrice": 22.03,
    "picUrl": "[\"/profile/waresPic/170814889.jpg\"]"
  },
  {
    "waresId": 170812289,
    "waresName": "Bestway 58002 Swimming Pool Ground Cloth, 13 by 13-Feet",
    "waresPrice": 22.07,
    "picUrl": "[\"/profile/waresPic/170812289.jpg\"]"
  },
  {
    "waresId": 170814594,
    "waresName": "The Children's Place Girl's Clog Sandals",
    "waresPrice": 22.08,
    "picUrl": "[\"/profile/waresPic/170814594.jpg\"]"
  },
  {
    "waresId": 170815392,
    "waresName": "PRITECH Beard Trimmer for Men, 3 in 1 Hair Clippers for Men Kit, Nose Hair Trimmer, Micro Shaver Mens Grooming Kit Cordless Electric Hair Trimmer LED Display IPX6 (Silver)",
    "waresPrice": 22.09,
    "picUrl": "[\"/profile/waresPic/170815392.jpg\"]"
  },
  {
    "waresId": 170813888,
    "waresName": "Purina Fancy Feast Wet Senior Cat Food 7 Years Plus Chicken Feast Pate - (Pack of 24) 3 oz. Cans",
    "waresPrice": 22.12,
    "picUrl": "[\"/profile/waresPic/170813888.jpg\"]"
  },
  {
    "waresId": 170802593,
    "waresName": "Growsland 2024 Remote Control Car for Kids, RC Cars for Boys Kids 1:18 Electric Vehicle Toy Car Hobby Racing Car Toys with Lights & Controller, Birthday Gift for 3 4 5 6 7 8 9 Year Old Boys Girls",
    "waresPrice": 22.15,
    "picUrl": "[\"/profile/waresPic/170802593.jpg\"]"
  },
  // 第十四页 10条数据
  {
    "waresId": 170822954,
    "waresName": "Dorman 76829 Temperature Control Knob Assortment Compatible with Select Chrysler/Dodge/Eagle Models, Black",
    "waresPrice": 22.18,
    "picUrl": "[\"/profile/waresPic/170822954.jpg\"]"
  },
  {
    "waresId": 170813056,
    "waresName": "FRAM Extra Guard CA11257 Replacement Engine Air Filter for Select Chrysler and Dodge Models, Provides Up to 12 Months or 12,000 Miles Filter Protection",
    "waresPrice": 22.19,
    "picUrl": "[\"/profile/waresPic/170813056.jpg\"]"
  },
  {
    "waresId": 170799169,
    "waresName": "for iPhone 8/SE 2020 Screen Replacement White 4.7\" LCD Display 3D Touch Screen Digitizer Full Assembly with Repair Tools Magnetic Screws Pad Fix Kit for A1863 A1905 A1906 A2275 A2298 A2296",
    "waresPrice": 22.21,
    "picUrl": "[\"/profile/waresPic/170799169.jpg\"]"
  },
  {
    "waresId": 170813184,
    "waresName": "FRAM G7740 In-Line Fuel Filter",
    "waresPrice": 22.22,
    "picUrl": "[\"/profile/waresPic/170813184.jpg\"]"
  },
  {
    "waresId": 170811584,
    "waresName": "IDEAL Electrical 61-637 Single Range 24 to 600V AC NCVT w/Flashlight",
    "waresPrice": 22.23,
    "picUrl": "[\"/profile/waresPic/170811584.jpg\"]"
  },
  {
    "waresId": 170819810,
    "waresName": "LEXSION Felt Purse Bag Organizer Insert with zipper Bag Tote Shaper Fit Speedy Neverful PM MM 8021 Beige L",
    "waresPrice": 22.28,
    "picUrl": "[\"/profile/waresPic/170819810.jpg\"]"
  },
  {
    "waresId": 170811200,
    "waresName": "OshKosh B'Gosh unisex-child Aquatic Water Shoe",
    "waresPrice": 22.31,
    "picUrl": "[\"/profile/waresPic/170811200.jpg\"]"
  },
  {
    "waresId": 170800064,
    "waresName": "70019 Uniware 1.2 Liter Stainless Steel 304 Electric Cooker With Rotating Base",
    "waresPrice": 22.34,
    "picUrl": "[\"/profile/waresPic/170800064.jpg\"]"
  },
  {
    "waresId": 170813602,
    "waresName": "PEDIGREE CHOPPED GROUND DINNER Adult Canned Soft Wet Dog Food with Chicken, 13.2 oz. Cans (Pack of 12)",
    "waresPrice": 22.36,
    "picUrl": "[\"/profile/waresPic/170813602.jpg\"]"
  },
  {
    "waresId": 170813472,
    "waresName": "Mopar 10 Year/150,000 Mile Coolant Concentrate",
    "waresPrice": 22.4,
    "picUrl": "[\"/profile/waresPic/170813472.jpg\"]"
  },
  // 第十五页 10条数据
  {
    "waresId": 170822307,
    "waresName": "Amazon Brand - Solimo Sweet Potato & Duck Jerky Dog Treats, 2 pounds",
    "waresPrice": 22.41,
    "picUrl": "[\"/profile/waresPic/170822307.jpg\"]"
  },
  {
    "waresId": 170797536,
    "waresName": "PURE STYLE Girlfriends Women's Camilong",
    "waresPrice": 22.42,
    "picUrl": "[\"/profile/waresPic/170797536.jpg\"]"
  },
  {
    "waresId": 170817537,
    "waresName": "adidas Women's Future Icons Winners 3.0 Tee",
    "waresPrice": 22.43,
    "picUrl": "[\"/profile/waresPic/170817537.jpg\"]"
  },
  {
    "waresId": 170806882,
    "waresName": "Gold Diggers of 1933 [Blu-ray]",
    "waresPrice": 22.44,
    "picUrl": "[\"/profile/waresPic/170806882.jpg\"]"
  },
  {
    "waresId": 170815360,
    "waresName": "Kirkland Signature Stool Softener 100 mg., 400 Softgels (2 Pack)",
    "waresPrice": 22.46,
    "picUrl": "[\"/profile/waresPic/170815360.jpg\"]"
  },
  {
    "waresId": 170805792,
    "waresName": "Hill's Science Diet Small & Mini, Senior Adult 11+, Small & Mini Breeds Senior Premium Nutrition, Dry Dog Food, Chicken, Brown Rice & Barley, 4.5 lb Bag",
    "waresPrice": 22.49,
    "picUrl": "[\"/profile/waresPic/170805792.jpg\"]"
  },
  {
    "waresId": 170813153,
    "waresName": "Dorman 55242 Fuel Line Filter Kit Universal Fit",
    "waresPrice": 22.5,
    "picUrl": "[\"/profile/waresPic/170813153.jpg\"]"
  },
  {
    "waresId": 170811841,
    "waresName": "BWE Pop Up Drain Fits Bathroom Standard Sink Hole 1-1/2\" to 1-3/4\" Bathroom Faucet Vessel Vanity Sink Drain Stopper Without Overflow Oil Rubbed Bronze",
    "waresPrice": 22.52,
    "picUrl": "[\"/profile/waresPic/170811841.jpg\"]"
  },
  {
    "waresId": 170823169,
    "waresName": "Plasticolor 006695R01 Jeep Deluxe High Contrast Stitching Premium Steering Wheel Cover for Cars, Trucks & SUV",
    "waresPrice": 22.56,
    "picUrl": "[\"/profile/waresPic/170823169.jpg\"]"
  },
  {
    "waresId": 170815041,
    "waresName": "Round Fitted Tablecloths with Elastic Edge,Flip Flops Summer Pier Swimming Pool Waterproof Oil Proof Table Cover Frangipani Starfish Ocean Washable Table Cloth for Indoor Outdoor Kitchen 36-44in",
    "waresPrice": 22.57,
    "picUrl": "[\"/profile/waresPic/170815041.jpg\"]"
  },
  // 第十六页 10条数据
  {
    "waresId": 170822308,
    "waresName": "3 Pack of Urinary Tract Support Feline Health Chews, 2.5 Ounces Each, Grain-Free, Made in The USA",
    "waresPrice": 22.58,
    "picUrl": "[\"/profile/waresPic/170822308.jpg\"]"
  },
  {
    "waresId": 170797954,
    "waresName": "Women's Winter Dresses 2024 Turtleneck Sweater Dress Mid-Length Loose Pullover Long Sleeve Color Shirt, S-XL",
    "waresPrice": 22.59,
    "picUrl": "[\"/profile/waresPic/170797954.jpg\"]"
  },
  {
    "waresId": 170815778,
    "waresName": "BENGOO G9000 Stereo Gaming Headset for PS4 PC Xbox One PS5 Controller, Noise Cancelling Over Ear Headphones with Mic, LED Light, Bass Surround, Soft Memory Earmuffs (Blue)",
    "waresPrice": 22.6,
    "picUrl": "[\"/profile/waresPic/170815778.jpg\"]"
  },
  {
    "waresId": 170823146,
    "waresName": "Car Seat Cushion, Memory Foam Car Coccyx Seat Pad Pillow for Driving- Sciatica & Back Pain Relief, Heightening Wedge Cushions for Car Driver Office Lumbar Tailbone Support",
    "waresPrice": 22.62,
    "picUrl": "[\"/profile/waresPic/170823146.jpg\"]"
  },
  {
    "waresId": 170809313,
    "waresName": "Massage Flip Flops for Women,Indoor Outdoor Women's Flip-Flops, Beach Sandals for Women,Acupressure Slippers Outdoor Summer Beach Shoes",
    "waresPrice": 22.65,
    "picUrl": "[\"/profile/waresPic/170809313.jpg\"]"
  },
  {
    "waresId": 170805827,
    "waresName": "Purina ONE Plus Wet Puppy Food Classic Ground Healthy Puppy Lamb and Long Grain Rice Entree - (Pack of 12) 13 oz. Cans",
    "waresPrice": 22.68,
    "picUrl": "[\"/profile/waresPic/170805827.jpg\"]"
  },
  {
    "waresId": 170818369,
    "waresName": "Funny Alcohol Drinking Gift for Vodka Wine Addicts 11oz 15oz Black Coffee Mug",
    "waresPrice": 22.69,
    "picUrl": "[\"/profile/waresPic/170818369.jpg\"]"
  },
  {
    "waresId": 170798304,
    "waresName": "Fila Women's Performance Bike Short",
    "waresPrice": 22.73,
    "picUrl": "[\"/profile/waresPic/170798304.jpg\"]"
  },
  {
    "waresId": 170821664,
    "waresName": "Dixie Ultra, Large Paper Bowls, 20 Oz, 26 Count (Pack of 6), Microwave Safe, Compostable, Disposable Bowls Great For Breakfast, Lunch, And Dinner Meals",
    "waresPrice": 22.74,
    "picUrl": "[\"/profile/waresPic/170821664.jpg\"]"
  },
  {
        "waresId": 170822759,
        "waresName": "Studio Nova Premium 18/10 Stainless Steel Chopsticks (Four Pair)",
        "waresPrice": 22.76,
        "picUrl": "[\"/profile/waresPic/170822759.jpg\"]"
      },
      // 第19页 10条数据
      {
        "waresId": 170814950,
        "waresName": "Growsland 2024 Remote Control Car for Kids, RC Cars for Boys Kids 1:18 Electric Vehicle Toy Car Hobby Racing Car Toys with Lights & Controller, Birthday Gift for 3 4 5 6 7 8 9 Year Old Boys Girls",
        "waresPrice": 23.15,
        "picUrl": "[\"/profile/waresPic/170814950.jpg\"]"
      },
      {
        "waresId": 170812800,
        "waresName": "FH Group Trendy Elegance 3D Air Mesh Split Bench Car Seat Cover (Split Ready, Detachable Headrest Only) with Gift- Universal fit for Cars, auto, Trucks, SUV (Beige/Black) FB060012",
        "waresPrice": 23.16,
        "picUrl": "[\"/profile/waresPic/170812800.jpg\"]"
      },
      {
        "waresId": 170804704,
        "waresName": "Lomani Ab Spirit Millionaire By Lomani for Men - 6.6 Fl. Oz Edt Spray, Brown",
        "waresPrice": 23.17,
        "picUrl": "[\"/profile/waresPic/170804704.jpg\"]"
      },
      {
        "waresId": 170798624,
        "waresName": "Hanes Womens Originals Hi-Leg Bikini Underwear, Seamless Rib Bikini, Assorted Colors, 6-Pack",
        "waresPrice": 23.18,
        "picUrl": "[\"/profile/waresPic/170798624.jpg\"]"
      },
      {
        "waresId": 170823008,
        "waresName": "FRAM Extra Guard CA11257 Replacement Engine Air Filter for Select Chrysler and Dodge Models, Provides Up to 12 Months or 12,000 Miles Filter Protection",
        "waresPrice": 23.19,
        "picUrl": "[\"/profile/waresPic/170823008.jpg\"]"
      },
      {
        "waresId": 170816097,
        "waresName": "for iPhone 8/SE 2020 Screen Replacement White 4.7\" LCD Display 3D Touch Screen Digitizer Full Assembly with Repair Tools Magnetic Screws Pad Fix Kit for A1863 A1905 A1906 A2275 A2298 A2296",
        "waresPrice": 23.21,
        "picUrl": "[\"/profile/waresPic/170816097.jpg\"]"
      },
      {
        "waresId": 170823043,
        "waresName": "FRAM G7740 In-Line Fuel Filter",
        "waresPrice": 23.22,
        "picUrl": "[\"/profile/waresPic/170823043.jpg\"]"
      },
      {
        "waresId": 170813186,
        "waresName": "FRAM G6680 High Performance Replacement In-Line Fuel Filter for Optimal Engine Protection, Fits Select Hyundai, Kia, Lexus and Toyota Vehicle Model Years",
        "waresPrice": 23.28,
        "picUrl": "[\"/profile/waresPic/170813186.jpg\"]"
      },
      {
        "waresId": 170814593,
        "waresName": "OshKosh B'Gosh unisex-child Aquatic Water Shoe",
        "waresPrice": 23.31,
        "picUrl": "[\"/profile/waresPic/170814593.jpg\"]"
      },
      {
        "waresId": 170811648,
        "waresName": "SAMMART 10L (2.64 gallon) Collapsible Dishpan with Draining Plug - Foldable Washing Basin - Portable Dish Washing Tub - Space Saving Kitchen Storage Tray (Black/Alloy Grey)",
        "waresPrice": 23.32,
        "picUrl": "[\"/profile/waresPic/170811648.jpg\"]"
      },
      // 第20页 10条数据
      {
        "waresId": 170798210,
        "waresName": "Fila Women's Ekanta 1/4 Zip",
        "waresPrice": 23.34,
        "picUrl": "[\"/profile/waresPic/170798210.jpg\"]"
      },
      {
        "waresId": 170821634,
        "waresName": "Dixie Large Paper Plates, 10 Inch, 204 Count, 2X Stronger*, Microwave-Safe, Soak-Proof, Cut Resistant, Disposable Plates For Everyday Breakfast, Lunch, & Dinner Meals",
        "waresPrice": 23.36,
        "picUrl": "[\"/profile/waresPic/170821634.jpg\"]"
      },
      {
        "waresId": 170799170,
        "waresName": "for iPhone 12/12 PRO Screen Replacement Kit - Full HD LCD 6.1'' Display and 3D Touch Digitizer Assembly with Repair Tools Compatibility A2172, A2402, A2404 A2403, A2341, A2406, A2408, A2407",
        "waresPrice": 23.39,
        "picUrl": "[\"/profile/waresPic/170799170.jpg\"]"
      },
      {
        "waresId": 170811617,
        "waresName": "DMI Hair Washing Basin for Bedridden, Portable Inflatable Shampoo Bowl for Bedside and In Bed Hair Washing, Hair Cuts and Hair Coloring for the Elderly, Disabled, and Handicapped, 24x20, White",
        "waresPrice": 23.4,
        "picUrl": "[\"/profile/waresPic/170811617.jpg\"]"
      },
      {
        "waresId": 170814304,
        "waresName": "PURE STYLE Girlfriends Women's Camilong",
        "waresPrice": 23.42,
        "picUrl": "[\"/profile/waresPic/170814304.jpg\"]"
      },
      {
        "waresId": 170821990,
        "waresName": "adidas Women's Future Icons Winners 3.0 Tee",
        "waresPrice": 23.43,
        "picUrl": "[\"/profile/waresPic/170821990.jpg\"]"
      },
      {
        "waresId": 170797315,
        "waresName": "with Button Sets 2 Piece Outfits Flag Short Sleeve T Shirt And Shorts Set 4Th Of July Outfits Suit Fabrics for",
        "waresPrice": 23.45,
        "picUrl": "[\"/profile/waresPic/170797315.jpg\"]"
      },
      {
        "waresId": 170798241,
        "waresName": "Fila Women's Seamless Bra",
        "waresPrice": 23.46,
        "picUrl": "[\"/profile/waresPic/170798241.jpg\"]"
      },
      {
        "waresId": 170805825,
        "waresName": "Purina ONE Tender Cuts in Wet Dog Food Gravy Chicken and Brown Rice Entree - (Pack of 12) 13 oz. Cans",
        "waresPrice": 23.48,
        "picUrl": "[\"/profile/waresPic/170805825.jpg\"]"
      },
      {
        "waresId": 170810211,
        "waresName": "HONEYCAT Mood Ring in Gold, Rose Gold, or Silver  Size 4, 5, 6, 7, 8, 9, 10,11  Minimalist, Delicate Jewelry",
        "waresPrice": 23.49,
        "picUrl": "[\"/profile/waresPic/170810211.jpg\"]"
      }
];

// =============== 工具函数 ===============
// 确保目录存在
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// 下载图片并保存
async function downloadImage(url, destPath) {
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            timeout: 10000,
        });
        const writer = fs.createWriteStream(destPath);
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error(`下载失败 [${url}]: ${error.message}`);
    }
}

// =============== 主逻辑 ===============
async function main() {
    ensureDir(TASK_WARES_DIR);

    const excelData = [];

    // 获取当前任务商品库下已经存在的最大文件夹编号
    let folderIndex = 1;
    if (fs.existsSync(TASK_WARES_DIR)) {
        const existingDirs = fs.readdirSync(TASK_WARES_DIR).filter(f => {
            return fs.statSync(path.join(TASK_WARES_DIR, f)).isDirectory();
        });
        if (existingDirs.length > 0) {
            const nums = existingDirs.map(Number).filter(n => !isNaN(n));
            if (nums.length > 0) {
                folderIndex = Math.max(...nums) + 1;
            }
        }
    }

    // 遍历商品数据
    for (const item of rawData) {
        const { waresName, waresPrice, picUrl } = item;
        
        let picUrls = [];
        try {
            picUrls = JSON.parse(picUrl);
        } catch (e) {
            console.error(`商品 [${waresName}] 的 picUrl 解析失败`);
            continue;
        }

        const currentFolderIndex = folderIndex++;
        const currentFolder = path.join(TASK_WARES_DIR, currentFolderIndex.toString());
        ensureDir(currentFolder);

        console.log(`\n正在处理商品: ${waresName}`);
        console.log(`分配文件夹: ${currentFolderIndex}`);

        // 下载图片
        for (let i = 0; i < picUrls.length; i++) {
            const url = picUrls[i];
            const fullUrl = url.startsWith('http') ? url : BASE_URL + url;
            // 简单推断扩展名，如果 URL 中没有后缀则默认为 .jpg
            const ext = path.extname(url).split('?')[0] || '.jpg';
            const fileName = `${i + 1}${ext}`;
            const destPath = path.join(currentFolder, fileName);
            
            console.log(`  -> 正在下载图片: ${fullUrl}`);
            await downloadImage(fullUrl, destPath);
        }

        // 构建存入 Excel 的相对路径（Windows 风格路径）
        const excelPicRef = `.gf\\商品\\任务商品库\\${currentFolderIndex}`;

        excelData.push({
            '商品名称': waresName,
            '商品价格': waresPrice,
            '商品图片': excelPicRef
        });
    }

    // 处理 Excel 文件（追加或新建）
    let wb;
    let ws;
    if (fs.existsSync(EXCEL_FILE_PATH)) {
        // 如果文件已存在，则追加数据
        wb = xlsx.readFile(EXCEL_FILE_PATH);
        const sheetName = wb.SheetNames[0];
        ws = wb.Sheets[sheetName];
        
        const existingData = xlsx.utils.sheet_to_json(ws);
        const newData = existingData.concat(excelData);
        
        // 重新生成 Sheet
        ws = xlsx.utils.json_to_sheet(newData);
        wb.Sheets[sheetName] = ws;
    } else {
        // 新建 Excel 文件
        wb = xlsx.utils.book_new();
        ws = xlsx.utils.json_to_sheet(excelData);
        xlsx.utils.book_append_sheet(wb, ws, 'all');
    }

    xlsx.writeFile(wb, EXCEL_FILE_PATH);
    console.log(`\n处理完成！数据已写入/追加到: ${EXCEL_FILE_PATH}`);
}

main().catch(console.error);
