const express = require('express');
const fs = require('fs');
const request = require('request');

const router = express.Router();

//set bin
const message = require('../bin/message');
const es_client = require('../bin/Elasticsearch_Client');


router.post('/SeacrhFeature', (req, res) => {

    let image_feature = req.body.image_feature;
    let kor_text_feature = req.body.kor_text_feature;
    let eng_text_feature = req.body.eng_text_feature;

    let query = {
        index: "takebook",
        body: {
            from: 0,
            size: 5,
            query: {
                match: {
                    kor: kor_text_feature,
                    eng: eng_text_feature,
                    surf: image_feature
                }
            }
        }
    }

    es_client.search(query, (results, err)=>{
        console.log(err);
        console.log(results);
        res.json(results);
    })

});

module.exports = router;