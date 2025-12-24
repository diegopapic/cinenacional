const crypto = require('crypto');

const ip = '190.230.91.42';
const salt = process.env.IP_HASH_SALT || 'cinenacional-analytics-2024';
const hash = crypto.createHash('sha256').update(ip + salt).digest('hex');

console.log('Tu IP hash es:', hash);