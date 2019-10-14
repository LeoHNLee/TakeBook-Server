const redis = require('redis');
var config = require('../config/redis.json');

const redis_client = redis.createClient(6379,"takebook-account-ec.l8owth.ng.0001.apn2.cache.amazonaws.com");

module.exports = redis_client;