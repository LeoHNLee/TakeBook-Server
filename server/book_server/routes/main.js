const express = require('express');
const fs = require('fs');
const postrequest = require('request');

const database = require('../bin/mysql_connetion');

const es_address = 'http://localhost:9200'
const anlysis_server_address = 'http://54.180.49.131:5901'

const router = express.Router();
database.connect();


router.get('/DetaillInfo', (req, res) => {

    let respone_form = {}

    let isbn = req.query.isbn;

    if(!isbn){
        //필수 파라미터 누락
        respone_form.Result_Code = "EC001";
        respone_form.Message = "invalid parameter error";
        res.json(respone_form)
        return;
    }

    let query = `SELECT * FROM book WHERE isbn=${isbn};`;

    database.query(query, (err, results, fields) => {

        if (err) {
            //db 오류
            console.log(err)
            respone_form.Result_Code = "ES011";
            respone_form.Message = "Book DataBase Server Error";
        }
        else{
            if (results.length) {

                respone_form.Result_Code = "RS000";
                respone_form.Message = "Response Success";
                respone_form.Response = {};
    
                for (let key in results[0]) {
                    respone_form.Response[key] = results[0][key];
                }

            }
            else{
                // 일치하는 isbn 없음.
                respone_form.Result_Code = "EC005";
                respone_form.Message = "Not Exist Parameter Info";
            }
        }
        res.send(respone_form)
 
    })

});

//internal

router.get('/Query', (req, res) => {

    let respone_form = {}

    let query = `SELECT isbn FROM innodb.book where published_date like '2017051%' limit 400;`;

    database.query(query, (err, results, fields) => {

        if (err) {
            //db 오류
            console.log(err)
            respone_form.Result_Code = "ES011";
            respone_form.Message = "Book DataBase Server Error";
        }
        else{
            if (results.length) {

                respone_form.Result_Code = "RS000";
                respone_form.Message = "Response Success";
                respone_form.Response = {};
                respone_form.Response.isbn = [];
    
                for (let key in results) {
                    respone_form.Response.isbn.push(results[key].isbn);
                }

            }
            else{
                // 일치하는 isbn 없음.
                respone_form.Result_Code = "EC005";
                respone_form.Message = "Not Exist Parameter Info";
            }
        }
        res.send(respone_form)
 
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



module.exports = router;
