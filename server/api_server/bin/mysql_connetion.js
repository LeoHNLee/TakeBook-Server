const mysql = require('mysql');
var config = require('../config/mysql.json');

const mysql_connection = mysql.createConnection(config);

module.exports = mysql_connection;