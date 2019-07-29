const express = require('express');
const fs = require('fs');
const postrequest = require('request');
const mysql_connetion = require('../bin/mysql_connetion');

const router = express.Router();
const address = `http://127.0.0.1:5900`;
const ouheraddress = `http://127.0.0.1:5901`;

//mysql 연결
mysql_connetion.connect();

router.get('/', (req, res) => {
    res.render('fileinput.html');
});

router.get('/result', (req, res) => {
    res.send('success!')
});

router.post('/result', (req, res) => {
    let file_name = req.body.file_name

    let response_body ={};

    const form = {
        'file_name': file_name,
    }

    //도서 분석 요청
    postrequest.post(`${ouheraddress}/result`, {form},
        function optionalCallback(err, httpResponse, response) {
            if (err) {
                return console.error('response failed:', err);
            }
            // respone 는 string로 옮, json으로 변형시켜줘야함
            response = JSON.parse(response)

            let is_error = response.is_error;

            if(is_error){
                response_body.is_error = is_error
                response_body.error_code = response.error_code
                response_body.error_code = 1
                res.json(response_body)
            }else{
                response_body.is_error = is_error

                mysql_connetion.query(`SELECT * FROM book WHERE isbn=${9788928055760};`, (err, results,fields)=>{
                    if (err) {
                        console.log(err);
                    }

                    if(results.length){
                        for(let key in results[0]){
                            let upperkey = key.toLowerCase();
                            response_body[upperkey] = results[0][key];
                        }
                    }
                    res.json(response_body)  
                })
            }
        })
        
});

router.post('/test', (req,res)=>{
    let is_error = req.body.is_error;
    let file_name = req.body.file_name;
    let user_id = req.body.user_id;

    const form = {
        'is_error': true,
        'filename': 'test_title',
        'isbn':'1234567890123'
    }

    res.json(form)

})

module.exports = router;