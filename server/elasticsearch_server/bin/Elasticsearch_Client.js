const elasticsearch = require('elasticsearch');

const config = require('../config/elasticsearch.json')

let Elasticsearch_Client = new elasticsearch.Client(config);

module.exports = Elasticsearch_Client;