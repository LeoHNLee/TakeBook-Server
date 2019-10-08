const express = require('express');
const fs = require('fs');
const request = require('request');
const aws = require('aws-sdk');
const uuidv4 = require('uuid/v4');
const moment = require('moment-timezone');

const mysql_connetion = require('../bin/mysql_connetion');
const message = require('../bin/message');
const host = require('../config/host');

const router = express.Router();

//aws region 설정, s3설정
aws.config.region = 'ap-northeast-2';
const logdb = new aws.DynamoDB.DocumentClient();
const log_table_name = "book_log"

//현재시간 표시
function current_time() {
    return moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss');
}

//로그 데이터 저장.
function recode_log(path, method, request, response) {

    // var params = {
    //     TableName: log_table_name,
    //     Item: {
    //         id: uuidv4(),
    //         path: path,
    //         method: method,
    //         request: request,
    //         response: response,
    //         log_date: current_time()
    //     }
    // };


    // logdb.put(params, function (err, data) {
    //     if (err) {
    //         // console.log("recode_log_fail"); // an error occurred
    //         console.log(err)
    //     }
    //     else console.log("recode_log_success");           // successful response
    // });
}


router.get('/Detail', (req, res) => {

    let response_body = {}

    let isbn = req.query.isbn;

    if (!isbn) {
        //필수 파라미터 누락
        message.set_result_message(response_body, "EC001");
        recode_log(req.route.path, req.method, req.query, response_body);
        res.json(response_body)
        return;
    }

    let query = `SELECT * FROM book WHERE isbn=${isbn};`;

    mysql_connetion.query(query, (err, results, fields) => {
        if (err) {
            //db 오류
            console.log(err)
            message.set_result_message(response_body, "ES011");
        }
        else {
            if (results.length) {
                message.set_result_message(response_body, "RS000");
                response_body.Response = {};

                for (let key in results[0]) {
                    response_body.Response[key] = results[0][key];
                }

            }
            else {
                // 일치하는 isbn 없음.
                message.set_result_message(response_body, "EC005");
            }
        }
        recode_log(req.route.path, req.method, req.query, response_body);
        res.send(response_body)
    })

});


//전체검색 미구현
router.get('/List', (req, res) => {

    let response_body = {}

    let keyword = (req.query.keyword) ? req.query.keyword : null;

    let category = (req.query.category) ? req.query.category : "title";
    let max_count = (req.query.max_count) ? req.query.max_count : null;
    let sort_key = (req.query.sort_key) ? req.query.sort_key : "title";
    let sort_method = (req.query.sort_method) ? req.query.sort_method : "asc";


    let query = `SELECT title, isbn, author, publisher FROM book WHERE `;

    if (keyword) {
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
    //         response_body.Result_Code = "ES011";
    //         response_body.Message = "Book DataBase Server Error";
    //     }
    //     else{
    //         if (results.length) {

    //             response_body.Result_Code = "RS000";
    //             response_body.Message = "Response Success";
    //             response_body.Response = {};

    //             for (let key in results[0]) {
    //                 response_body.Response[key] = results[0][key];
    //             }

    //         }
    //         else{
    //             // 일치하는 isbn 없음.
    //             response_body.Result_Code = "EC005";
    //             response_body.Message = "Not Exist Parameter Info";
    //         }
    //     }
    //     res.send(response_body)

    // })

});

//internal API


router.get('/SearchInISBN', (req, res) => {

    let response_body = {}

    let isbn_list = req.query.isbn_list;

    if (!isbn_list) {
        //필수 파라미터 누락
        message.set_result_message(response_body, "EC001");
        recode_log(req.route.path, req.method, req.query, response_body);
        res.json(response_body)
        return;
    }
    let keyword = (req.query.keyword) ? req.query.keyword : null;
    let category = (req.query.category) ? req.query.category : "title";
    let sort_key = (req.query.sort_key) ? req.query.sort_key : "title";
    let sort_method = (req.query.sort_method) ? req.query.sort_method : "asc";
    

    let query = `SELECT title, isbn, author, publisher, image_url FROM book WHERE `;

    if (keyword) {
        if (category === 'isbn') {
            query += `${category} = '${keyword}' and `
        } else {
            query += `${category} like '%${keyword}%' and `
        }
    }

    let search_isbn_list = []
    //string 으로 변환
    for (let i in isbn_list) {
        search_isbn_list.push(JSON.stringify(isbn_list[i]));
    }

    query += `isbn in (${search_isbn_list.join()}) `

    query += `order by ${sort_key} ${sort_method} `

    mysql_connetion.query(query, (err, results, fields) => {

        if (err) {
            //db 오류
            console.log(err)
            message.set_result_message(response_body, "ES011");
        }
        else {
            message.set_result_message(response_body, "RS000");
            response_body.Response = {
                count: results.length,
                item: []
            };

            for (let i in results) {
                response_body.Response.item.push(results[i])
            }

        }
        recode_log(req.route.path, req.method, req.query, response_body);
        res.send(response_body)

    })

});

router.get('/CheckISBNExists', (req, res) => {

    let response_body = {};

    let isbn = req.query.isbn;

    if (isbn) {
        let query = `select isbn from book where isbn = ?;`;
        mysql_connetion.query(query, [isbn], (err, results, fields) => {
            let result_code = "";
            if (err) {
                //db 오류
                console.log(err)
                result_code = "ES011";
            }
            else {
                if (results.length) {
                    //동일 isbn 존제
                    result_code = "RS000";
                } else {
                    //사용 가능한 아이디
                    result_code = "EC005";
                }
            }
            message.set_result_message(response_body, result_code);
            recode_log(req.route.path, req.method, req.query, response_body);
            res.send(response_body)
        })
    } else {
        //필수 파라미터 누락
        message.set_result_message(response_body, "EC001");
        recode_log(req.route.path, req.method, req.query, response_body);
        res.json(response_body)
    }

});




module.exports = router;
