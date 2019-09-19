const mysql = require('mysql');
var config = require('../config/mysql.json');

const mysql_connection = mysql.createConnection(config);
mysql_connection.connect();

module.exports = mysql_connection;