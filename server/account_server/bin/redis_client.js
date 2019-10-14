const redis = require('redis');
var config = require('../config/redis.json');

const redis_client = redis.createClient(config.port, config.host);

redis_client.on('error', err =>{
    console.log('redis connect error')
});

module.exports = redis_client;