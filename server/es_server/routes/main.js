const express = require('express');
const fs = require('fs');
const postrequest = require('request');
const router = express.Router();

const es_address = 'http://localhost:9200'
const anlysis_server_address = 'http://localhost:5901'


router.get('/', (req, res) => {
    //다른 서버에 요청을 보낼 request form
    const form = {
        method: 'GET',
        uri: `${es_address}/bank`,
        // json: true
    }

    //도서 분석 요청
    postrequest.get(form, (err, httpResponse, response) => {
        if (err) {
            return console.error('response failed:', err);
        }
        // respone 는 string로 옮, json으로 변형시켜줘야함
        var result = JSON.parse(response)
        console.log(result)
        console.log(typeof (result))
        res.json(result)
    })

});

router.post('/save', (req, res) => {

    let title = req.body.title;
    let isbn = req.body.isbn;
    let fileurl = req.body.fileurl;

    //다른 서버에 요청을 보낼 request form
    const form = {
        method: 'POST',
        uri: `${anlysis_server_address}/es`,
        body: {
            'fileurl': fileurl,
        },
        json: true
    }

    const esform = {
        method: 'POST',
        uri: `${es_address}/red/book`,
        body: {
        },
        json: true
    }


    //도서 분석 요청
    postrequest.post(form, (err, httpResponse, response) => {
        if (err) {
            return console.error('response failed:', err);
        }
        esform.body.title = title;
        esform.body.isbn = isbn;
        esform.body.result = response.result;

        postrequest.post(esform, (err, httpResponse, response) => {
            res.json(response)
        })


    })
});

router.post('/search', (req, res) => {
    let fileurl = req.body.fileurl;

    //다른 서버에 요청을 보낼 request form
    const form = {
        method: 'POST',
        uri: `${anlysis_server_address}/es`,
        body: {
            'fileurl': fileurl,
        },
        json: true
    }

    //도서 분석 요청
    postrequest.post(form, (err, httpResponse, response) => {
        if (err) {
            return console.error('response failed:', err);
        }
        let strArray = response.result.split(' ')

        while (true) {
            var search = strArray.indexOf('');
            if (search != -1) {
                strArray.splice(search, 1);
            } else {
                break;
            }
        }

        const esform = {
            method: 'POST',
            uri: `${es_address}/red/book/_search`,
            body: {
            },
            json: true
        }

        const query = {
            query: {
                bool: {
                    should: []
                }
            }
        }
        for(var st in strArray){
            var form = {
                "wildcard": {
                    "result": {}
                }
            };
            
            form.wildcard.result.value = `*${strArray[st]}*`;

            query.query.bool.should.push(form)
        }

        esform.body = query

        postrequest.get(esform, (err, httpResponse, response) => {
            console.log(err)
            res.json(response)
        })
    })
});



module.exports = router;