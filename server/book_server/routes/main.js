const express = require('express');
const fs = require('fs');
const postrequest = require('request');

const mysql_connetion = require('../bin/mysql_connetion');

const es_address = 'http://localhost:9200'
const anlysis_server_address = 'http://54.180.49.131:5901'

const router = express.Router();


router.get('/DetaillInfo', (req, res) => {

    let respone_form = {}

    let isbn = req.query.isbn;

    if (!isbn) {
        //필수 파라미터 누락
        respone_form.Result_Code = "EC001";
        respone_form.Message = "invalid parameter error";
        res.json(respone_form)
        return;
    }

    let query = `SELECT * FROM book WHERE isbn=${isbn};`;

    mysql_connetion.query(query, (err, results, fields) => {

        if (err) {
            //db 오류
            console.log(err)
            respone_form.Result_Code = "ES011";
            respone_form.Message = "Book DataBase Server Error";
        }
        else {
            if (results.length) {

                respone_form.Result_Code = "RS000";
                respone_form.Message = "Response Success";
                respone_form.Response = {};

                for (let key in results[0]) {
                    respone_form.Response[key] = results[0][key];
                }

            }
            else {
                // 일치하는 isbn 없음.
                respone_form.Result_Code = "EC005";
                respone_form.Message = "Not Exist Parameter Info";
            }
        }
        res.send(respone_form)

    })

});


router.get('/List', (req, res) => {

    let respone_form = {}

    let keyword = (req.query.keyword) ? req.query.keyword : null;
    // if (!keyword) {
    //     //필수 파라미터 누락
    //     respone_form.Result_Code = "EC001";
    //     respone_form.Message = "invalid parameter error";
    //     res.json(respone_form)
    //     return;
    // }
    let category = (req.query.category) ? req.query.category : "title";
    let max_count = (req.query.max_count) ? req.query.max_count : null;
    let sort_key = (req.query.sort_key) ? req.query.sort_key : "title";
    let sort_method = (req.query.sort_method) ? req.query.sort_method : "asc";

    //     "keyword: string
    // category: string
    //   - default: ""title""
    //   - list:
    //     - ""title"", ""isbn"", ""author""
    //     - ""publisher""
    // maxcount: int
    //   - default: all
    // sort_key: string
    //   - default: title
    //   - list:
    //     - ""title"", ""isbn"", ""author""
    //     - ""publisher"", ""registration_date""
    // sort_method: string
    //   - default: asc
    //   - list:
    //     - """"asc"""", """"desc"""""""

    let query = `SELECT title, isbn, author, publisher FROM book WHERE `;

    if(keyword){
        if (category === 'isbn') {
            query += `${category} = '${keyword}' or`
        } else {
            query += `${category} like '%${keyword}%' or`
        }
    }

    
    //string 으로 변환
    for (let i in keyword) {
        keyword[i] = JSON.stringify(keyword[i]);
    }

    query += `isbn in (${keyword.join()})`

    query += `order by ${sort_key} ${sort_method}`

    if (max_count) {
        query += `limit ${maxcount}`
    }
    res.send(query)

    // database.query(query, (err, results, fields) => {

    //     if (err) {
    //         //db 오류
    //         console.log(err)
    //         respone_form.Result_Code = "ES011";
    //         respone_form.Message = "Book DataBase Server Error";
    //     }
    //     else{
    //         if (results.length) {

    //             respone_form.Result_Code = "RS000";
    //             respone_form.Message = "Response Success";
    //             respone_form.Response = {};

    //             for (let key in results[0]) {
    //                 respone_form.Response[key] = results[0][key];
    //             }

    //         }
    //         else{
    //             // 일치하는 isbn 없음.
    //             respone_form.Result_Code = "EC005";
    //             respone_form.Message = "Not Exist Parameter Info";
    //         }
    //     }
    //     res.send(respone_form)

    // })

});

//internal API


router.get('/SearchInISBN', (req, res) => {

    let respone_form = {}

    let isbn_list = req.query.isbn_list;
    
    if (!isbn_list) {
        //필수 파라미터 누락
        respone_form.Result_Code = "EC001";
        respone_form.Message = "invalid parameter error";
        res.json(respone_form)
        return;
    }
    let keyword = (req.query.keyword) ? req.query.keyword : null;
    let category = (req.query.category) ? req.query.category : "title";
    let max_count = (req.query.max_count) ? req.query.max_count : null;
    let sort_key = (req.query.sort_key) ? req.query.sort_key : "title";
    let sort_method = (req.query.sort_method) ? req.query.sort_method : "asc";


    let query = `SELECT title, isbn, author, publisher FROM book WHERE `;

    if(keyword){
        if (category === 'isbn') {
            query += `${category} = '${keyword}' and `
        } else {
            query += `${category} like '%${keyword}%' and `
        }
    }

    //string 으로 변환
    for (let i in isbn_list) {
        isbn_list[i] = JSON.stringify(isbn_list[i]);
    }

    query += `isbn in (${isbn_list.join()}) `

    query += `order by ${sort_key} ${sort_method} `

    if (max_count) {
        query += `limit ${max_count}`
    }
    console.log(query)

    mysql_connetion.query(query, (err, results, fields) => {

        if (err) {
            //db 오류
            console.log(err)
            respone_form.Result_Code = "ES011";
            respone_form.Message = "Book DataBase Server Error";
        }
        else{
            respone_form.Result_Code = "RS000";
            respone_form.Message = "Response Success";
            respone_form.Response = {
                count: results.length,
                item: []
            };
            
            for(let i in results){
                respone_form.Response.item.push(results[i])
            }

        }
        res.send(respone_form)

    })

});


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
        else {
            if (results.length) {

                respone_form.Result_Code = "RS000";
                respone_form.Message = "Response Success";
                respone_form.Response = {};
                respone_form.Response.isbn = [];

                for (let key in results) {
                    respone_form.Response.isbn.push(results[key].isbn);
                }

            }
            else {
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
