const express = require('express');
const fs = require('fs');
const request = require('request');

const router = express.Router();

//set bin
const message = require('../bin/message');
const es_client = require('../bin/Elasticsearch_Client');


router.post('/SeacrhFeature', (req, res) => {

    let respone_body = {};

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
                    // kor: kor_text_feature,
                    // eng: eng_text_feature,
                    surf: image_feature
                }
            }
        }
    }

    es_client.search(query, (err, results)=>{
        
        if(err){
            console.log(err)
            message.set_result_message(respone_body, "ES003");
        }
        else{
            message.set_result_message(respone_body, "RS000");
            respone_body.Response = {
                isbn: results.hits.hits[0]._source.isbn,
                second_candidate: results.hits.hits[1]._source.isbn,
                third_candidate: results.hits.hits[2]._source.isbn,
                fourth_candidate: results.hits.hits[3]._source.isbn,
                fifth_candidate: results.hits.hits[4]._source.isbn
            };
            res.json(respone_body);
        }
        

    })

});

module.exports = router;