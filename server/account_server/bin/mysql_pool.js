const mysql = require('mysql');
var config = require('../config/mysql.json');

config.connectionLimit = 20;

const mysql_pool = mysql.createPool(config);

module.exports = mysql_pool;