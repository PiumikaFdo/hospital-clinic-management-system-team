const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3308,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Mna19@dt',
  database: process.env.DB_NAME || 'hospital_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+05:30',
});

module.exports = pool;
